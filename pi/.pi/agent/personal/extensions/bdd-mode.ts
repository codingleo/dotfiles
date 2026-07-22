/**
 * BDD/TDD mode for Pi — cross-project.
 *
 * Enforces Example Map → Gherkin/scenarios → red → green → refactor → verify
 * with path gates and recorded red/green evidence.
 *
 * Per-project config (optional): `.pi/bdd.json`, `bdd.json`, or `.bdd-tdd.json`
 * When missing, commands are inferred from package.json scripts.
 *
 * Commands: /bdd …
 * Tools: bdd_status, bdd_set_phase, bdd_assert_red, bdd_assert_green,
 *        bdd_record_evidence, bdd_handoff
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { configTemplate, loadConfigFromCwd } from "../lib/bdd/config.ts";
import {
	BDD_PROMPT_SNIPPET,
	buildGuidelines,
	buildPhaseMessage,
	statusText,
} from "../lib/bdd/guidelines.ts";
import { maybeTransformForBdd } from "../lib/bdd/intent.ts";
import { isLikelyMutatingBash } from "../lib/bdd/bash-gate.ts";
import {
	assertFleetAllowed,
	assertSubagentLaunchAllowed,
	normalizeFleetKind,
} from "../lib/bdd/fleet-gate.ts";
import { evaluatePathGate } from "../lib/bdd/paths.ts";
import { BDD_STATE_CUSTOM_TYPE } from "../lib/bdd/session-state.ts";
import {
	collectFleetRunsFromBranch,
	mergeEvidenceFleetRuns,
	mergeFleetRuns,
} from "../lib/fleet/run-ledger.ts";
import {
	canTransition,
	clearCycleEvidence,
	formatHandoff,
	greenIsStale,
	handoffComplete,
	parsePhase,
	phaseLabel,
	suggestedNextPhase,
} from "../lib/bdd/phases.ts";
import {
	greenCoversRed,
	runCommand,
	validateGreenResult,
	validateRedResult,
} from "../lib/bdd/run-command.ts";
import type { BddConfig, BddEvidence, BddPhase, BddState } from "../lib/bdd/types.ts";

const CUSTOM_TYPE = BDD_STATE_CUSTOM_TYPE;
const CONTEXT_TYPE = "bdd-mode-context";

function nowIso(): string {
	return new Date().toISOString();
}

function cwdOf(ctx?: ExtensionContext): string {
	return ctx?.cwd ?? process.cwd();
}

function hasRedEvidence(evidence: BddEvidence): boolean {
	return Boolean(evidence.red && evidence.red.exitCode !== 0);
}

function initialState(): BddState {
	return {
		enabled: false,
		phase: "off",
		evidence: {},
		source: "default",
	};
}

export default function bddModeExtension(pi: ExtensionAPI): void {
	let state: BddState = initialState();
	let config: BddConfig = loadConfigFromCwd(process.cwd()).config;

	function reloadConfig(cwd: string): void {
		try {
			const loaded = loadConfigFromCwd(cwd);
			config = loaded.config;
			state.configPath = loaded.path;
			state.source = loaded.source;
		} catch (err) {
			// keep previous config; surface later via status
			state.configPath = `error: ${err instanceof Error ? err.message : String(err)}`;
		}
	}

	function persist(): void {
		pi.appendEntry(CUSTOM_TYPE, { ...state });
	}

	function syncFleetRunsFromBranch(ctx: ExtensionContext): void {
		try {
			const branch = ctx.sessionManager.getBranch() as Array<{
				type?: string;
				customType?: string;
				data?: unknown;
			}>;
			const fromLedger = collectFleetRunsFromBranch(branch);
			state.evidence.fleetRuns = mergeEvidenceFleetRuns(state.evidence.fleetRuns, fromLedger);
		} catch {
			// ignore
		}
	}

	function restoreFromBranch(ctx: ExtensionContext): void {
		reloadConfig(cwdOf(ctx));
		const branch = ctx.sessionManager.getBranch();
		let restored: BddState | undefined;
		for (const entry of branch) {
			if (entry.type === "custom" && entry.customType === CUSTOM_TYPE) {
				restored = entry.data as BddState;
			}
		}
		if (restored) {
			state = {
				...initialState(),
				...restored,
				evidence: { ...restored.evidence },
			};
		} else if (config.enabledByDefault && state.source === "file") {
			state.enabled = true;
			state.phase = "discovery";
		}
		syncFleetRunsFromBranch(ctx);
		updateStatus(ctx);
	}

	function updateStatus(ctx: ExtensionContext): void {
		if (!ctx.hasUI) return;
		if (!state.enabled || state.phase === "off") {
			ctx.ui.setStatus("bdd-mode", undefined);
			ctx.ui.setWidget("bdd-evidence", undefined);
			return;
		}
		const glyph =
			state.phase === "red"
				? "🔴"
				: state.phase === "green"
					? "🟢"
					: state.phase === "verify"
						? "✅"
						: state.phase === "discovery"
							? "🗺️"
							: state.phase === "formulation"
								? "📝"
								: "🧪";
		const bypass = state.bypassUntilPhaseChange ? "!" : "";
		ctx.ui.setStatus(
			"bdd-mode",
			ctx.ui.theme.fg("accent", `${glyph} bdd:${state.phase}${bypass}`),
		);

		const ev = state.evidence;
		const lines = [
			ctx.ui.theme.fg("muted", `phase ${phaseLabel(state.phase)}`),
			ev.focus ? `focus: ${ev.focus}` : undefined,
			ev.red ? `red: exit ${ev.red.exitCode}` : "red: —",
			ev.green ? `green: exit ${ev.green.exitCode}` : "green: —",
			ev.acceptance ? `acc: ${ev.acceptance.ref}` : "acc: —",
		].filter(Boolean) as string[];
		ctx.ui.setWidget("bdd-evidence", lines);
	}

	function setEnabled(ctx: ExtensionContext, enabled: boolean, phase?: BddPhase): void {
		reloadConfig(cwdOf(ctx));
		state.enabled = enabled;
		if (!enabled) {
			state.phase = "off";
			state.bypassUntilPhaseChange = false;
			state.fleetBypassUntilPhaseChange = false;
		} else {
			state.phase = phase ?? (state.phase === "off" ? "discovery" : state.phase);
		}
		persist();
		updateStatus(ctx);
	}

	function trySetPhase(
		ctx: ExtensionContext,
		phase: BddPhase,
		opts?: { focus?: string },
	): { ok: boolean; message: string } {
		reloadConfig(cwdOf(ctx));
		if (phase === "off") {
			setEnabled(ctx, false);
			return { ok: true, message: "BDD mode disabled." };
		}
		const gate = canTransition(state.enabled ? state.phase : "off", phase, state.evidence);
		if (!gate.ok) {
			return { ok: false, message: gate.reason ?? "Transition blocked" };
		}
		const prev = state.phase;
		const prevFocus = state.evidence.focus;
		state.enabled = true;
		state.phase = phase;
		if (opts?.focus !== undefined) {
			const nextFocus = opts.focus.trim();
			if (nextFocus && prevFocus && nextFocus !== prevFocus) {
				state.evidence = clearCycleEvidence({ ...state.evidence, focus: nextFocus });
			} else if (nextFocus) {
				state.evidence.focus = nextFocus;
			}
		}
		// New discovery cycle clears red/green so handoffs can't reuse prior story evidence
		if (phase === "discovery" && prev !== "discovery" && prev !== "off") {
			state.evidence = clearCycleEvidence(state.evidence);
		}
		if (prev !== phase) {
			state.bypassUntilPhaseChange = false;
			state.fleetBypassUntilPhaseChange = false;
		}
		persist();
		updateStatus(ctx);
		const next = suggestedNextPhase(phase);
		return {
			ok: true,
			message: `BDD phase → ${phaseLabel(phase)}${next ? ` (next: ${next})` : ""}`,
		};
	}

	// --- tools ---

	const statusTool = defineTool({
		name: "bdd_status",
		label: "BDD Status",
		description:
			"Show BDD/TDD mode phase, path-gate rules, project commands, and recorded red/green/acceptance evidence.",
		promptSnippet: BDD_PROMPT_SNIPPET,
		promptGuidelines: buildGuidelines(state),
		parameters: Type.Object({}),
		renderCall(_args, theme) {
			return new Text(`${theme.fg("accent", "🧪")} ${theme.bold("BDD status")}`, 0, 0);
		},
		async execute(_id, _params, _signal, _onUpdate, ctx) {
			reloadConfig(cwdOf(ctx as ExtensionContext));
			const text = statusText(state, config);
			return {
				content: [{ type: "text", text }],
				details: { phase: state.phase, enabled: state.enabled },
			};
		},
	});

	const setPhaseTool = defineTool({
		name: "bdd_set_phase",
		label: "BDD Set Phase",
		description:
			"Enable BDD mode and set phase: discovery | formulation | red | green | refactor | verify | off. " +
			"Forward transitions to green/verify require recorded evidence.",
		parameters: Type.Object({
			phase: Type.String({
				description: "Target phase (discovery, formulation, red, green, refactor, verify, off)",
			}),
			focus: Type.Optional(
				Type.String({ description: "Optional story/issue focus label" }),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const phase = parsePhase(String(params.phase ?? ""));
			if (!phase) {
				return {
					content: [
						{
							type: "text",
							text: `Unknown phase "${params.phase}". Use discovery|formulation|red|green|refactor|verify|off`,
						},
					],
					details: { ok: false },
				};
			}
			const result = trySetPhase(ctx as ExtensionContext, phase, {
				focus: params.focus ? String(params.focus) : undefined,
			});
			return {
				content: [{ type: "text", text: result.message }],
				details: { ok: result.ok, phase: state.phase },
			};
		},
	});

	const assertRedTool = defineTool({
		name: "bdd_assert_red",
		label: "BDD Assert Red",
		description:
			"Run a test command that MUST fail (non-zero exit) and record it as red evidence. " +
			"Required before implementation (green). Default command comes from project bdd config / package.json.",
		parameters: Type.Object({
			command: Type.Optional(
				Type.String({
					description: "Test command to run (default: project unitTest command, optionally with path args)",
				}),
			),
			append: Type.Optional(
				Type.String({
					description: "Extra args appended to the default unitTest command (e.g. a file path)",
				}),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const extCtx = ctx as ExtensionContext;
			reloadConfig(cwdOf(extCtx));
			const base = String(params.command ?? config.commands.unitTest);
			const command = params.append ? `${base} ${params.append}` : base;
			const result = await runCommand({ cwd: cwdOf(extCtx), command });
			const check = validateRedResult(result);
			if (!check.ok) {
				return {
					content: [{ type: "text", text: check.reason }],
					details: { ok: false, exitCode: result.exitCode, command },
				};
			}
			// Only advance phase after successful red
			state.enabled = true;
			state.phase = "red";
			// New red invalidates prior green
			delete state.evidence.green;
			state.evidence.red = {
				command,
				exitCode: result.exitCode,
				summary: result.summary,
				at: nowIso(),
			};
			persist();
			updateStatus(extCtx);
			return {
				content: [
					{
						type: "text",
						text: `Red evidence recorded.\nCommand: ${command}\n${result.summary}\nYou may /bdd green and implement the minimum fix.`,
					},
				],
				details: { ok: true, exitCode: result.exitCode, command, summary: result.summary },
			};
		},
	});

	const assertGreenTool = defineTool({
		name: "bdd_assert_green",
		label: "BDD Assert Green",
		description:
			"Run a test command that MUST pass (exit 0) and record it as green evidence. " +
			"Use after minimum implementation.",
		parameters: Type.Object({
			command: Type.Optional(
				Type.String({ description: "Test command (default: project unitTest)" }),
			),
			append: Type.Optional(
				Type.String({ description: "Extra args appended to default unitTest command" }),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const extCtx = ctx as ExtensionContext;
			reloadConfig(cwdOf(extCtx));
			if (!hasRedEvidence(state.evidence)) {
				return {
					content: [
						{
							type: "text",
							text: "No red evidence yet. Run bdd_assert_red on a failing test before claiming green.",
						},
					],
					details: { ok: false },
				};
			}
			const base = String(params.command ?? state.evidence.red?.command ?? config.commands.unitTest);
			const command = params.append ? `${base} ${params.append}` : base;
			const result = await runCommand({ cwd: cwdOf(extCtx), command });
			const check = validateGreenResult(result);
			if (!check.ok) {
				return {
					content: [{ type: "text", text: check.reason }],
					details: { ok: false, exitCode: result.exitCode, command },
				};
			}
			const redCmd = state.evidence.red?.command ?? "";
			const covers = greenCoversRed(redCmd, command);
			const strict = config.strictGreenCoversRed !== false;
			if (strict && !covers) {
				return {
					content: [
						{
							type: "text",
							text:
								`Green rejected: command does not cover red under strictGreenCoversRed.\n` +
								`Red:  \`${redCmd}\`\n` +
								`Green: \`${command}\`\n` +
								`Use the same failing command, a broader suite of the same runner, or set strictGreenCoversRed:false in .pi/bdd.json.`,
						},
					],
					details: { ok: false, coversRed: false, command },
				};
			}
			const staleNote = greenIsStale(state.evidence)
				? "\nWarning: prior green was older than red — replaced."
				: "";
			const coverNote = covers
				? ""
				: `\nWarning: green command differs from red (\`${redCmd}\`).`;
			state.evidence.green = {
				command,
				exitCode: result.exitCode,
				summary: result.summary,
				at: nowIso(),
			};
			state.phase = "green";
			state.enabled = true;
			persist();
			updateStatus(extCtx);
			return {
				content: [
					{
						type: "text",
						text: `Green evidence recorded.\nCommand: ${command}\n${result.summary}${coverNote}${staleNote}\nNext: refactor (optional) → verify + bdd_handoff.`,
					},
				],
				details: { ok: true, exitCode: result.exitCode, command, summary: result.summary, coversRed: covers },
			};
		},
	});

	const recordEvidenceTool = defineTool({
		name: "bdd_record_evidence",
		label: "BDD Record Evidence",
		description:
			"Record Example Map, acceptance coverage, mutation check, or CRAP notes without running tests.",
		parameters: Type.Object({
			focus: Type.Optional(Type.String()),
			exampleMapRef: Type.Optional(
				Type.String({ description: "Issue number/URL or path to example map" }),
			),
			exampleMapRules: Type.Optional(Type.Number()),
			exampleMapExamples: Type.Optional(Type.Number()),
			exampleMapQuestions: Type.Optional(Type.Number()),
			acceptanceRef: Type.Optional(
				Type.String({ description: "Feature path or the literal N/A" }),
			),
			acceptanceReason: Type.Optional(
				Type.String({ description: "Required when acceptanceRef is N/A" }),
			),
			mutationProven: Type.Optional(Type.Boolean()),
			mutationNote: Type.Optional(Type.String()),
			crap: Type.Optional(Type.String({ description: "CRAP-risk mitigation notes" })),
			fleetRunId: Type.Optional(
				Type.String({ description: "Fleet runId to attach synthesis path (from dispatch ledger)" }),
			),
			fleetSynthesisPath: Type.Optional(
				Type.String({
					description:
						"Path to synthesis.md for that run (required before handoff after review/ux fleets)",
				}),
			),
		}),
		async execute(_id, params, _signal, _onUpdate, ctx) {
			const extCtx = ctx as ExtensionContext;
			syncFleetRunsFromBranch(extCtx);
			if (params.focus) state.evidence.focus = String(params.focus);
			if (params.exampleMapRef) {
				state.evidence.exampleMap = {
					ref: String(params.exampleMapRef),
					rules: Number(params.exampleMapRules ?? 0),
					examples: Number(params.exampleMapExamples ?? 0),
					questions:
						params.exampleMapQuestions != null
							? Number(params.exampleMapQuestions)
							: undefined,
					at: nowIso(),
				};
			}
			if (params.acceptanceRef) {
				const ref = String(params.acceptanceRef);
				if (ref.toUpperCase() === "N/A" && !params.acceptanceReason) {
					return {
						content: [
							{
								type: "text",
								text: "acceptanceRef N/A requires acceptanceReason explaining why acceptance tests are not applicable.",
							},
						],
						details: { ok: false },
					};
				}
				state.evidence.acceptance = {
					ref,
					reason: params.acceptanceReason ? String(params.acceptanceReason) : undefined,
					at: nowIso(),
				};
			}
			if (params.mutationProven != null || params.mutationNote) {
				state.evidence.mutation = {
					proven: Boolean(params.mutationProven),
					note: String(params.mutationNote ?? ""),
					at: nowIso(),
				};
			}
			if (params.crap) state.evidence.crap = String(params.crap);
			if (params.fleetRunId && params.fleetSynthesisPath) {
				const runId = String(params.fleetRunId);
				const synthesisPath = String(params.fleetSynthesisPath);
				const base = (state.evidence.fleetRuns ?? []).find((r) => r.runId === runId) ?? {
					runId,
					kind: "review",
					expectedCount: 0,
					at: nowIso(),
				};
				state.evidence.fleetRuns = mergeFleetRuns(state.evidence.fleetRuns, {
					...base,
					synthesisPath,
				});
			}
			persist();
			updateStatus(extCtx);
			return {
				content: [{ type: "text", text: formatHandoff(state.evidence, state.phase) }],
				details: { ok: true, evidence: state.evidence },
			};
		},
	});

	const handoffTool = defineTool({
		name: "bdd_handoff",
		label: "BDD Handoff",
		description:
			"Produce the required BDD/TDD handoff evidence block (red/green/acceptance/mutation/CRAP/fleet). " +
			"Reports missing fields. Review fleets require synthesisPath per runId.",
		parameters: Type.Object({}),
		async execute(_id, _params, _signal, _onUpdate, ctx) {
			syncFleetRunsFromBranch(ctx as ExtensionContext);
			const { ok, missing } = handoffComplete(state.evidence);
			const body = formatHandoff(state.evidence, state.phase);
			const fleetLines =
				(state.evidence.fleetRuns ?? [])
					.map(
						(r) =>
							`- fleet ${r.kind} \`${r.runId}\` synthesis=${r.synthesisPath ?? "(missing)"}`,
					)
					.join("\n") || "- (no fleet runs)";
			const text = ok
				? `${body}\n### Fleet runs\n${fleetLines}\n`
				: `${body}\n### Fleet runs\n${fleetLines}\n\n**Missing:** ${missing.join(", ")}\n`;
			return {
				content: [{ type: "text", text }],
				details: { ok, missing, evidence: state.evidence },
			};
		},
	});

	pi.registerTool(statusTool);
	pi.registerTool(setPhaseTool);
	pi.registerTool(assertRedTool);
	pi.registerTool(assertGreenTool);
	pi.registerTool(recordEvidenceTool);
	pi.registerTool(handoffTool);

	// Keep tools active
	pi.on("session_start", async (_e, ctx) => {
		restoreFromBranch(ctx);
		const active = new Set(pi.getActiveTools());
		for (const name of [
			"bdd_status",
			"bdd_set_phase",
			"bdd_assert_red",
			"bdd_assert_green",
			"bdd_record_evidence",
			"bdd_handoff",
		]) {
			active.add(name);
		}
		pi.setActiveTools([...active]);
	});

	pi.on("session_shutdown", () => {
		persist();
	});

	// Path gates + fleet/subagent phase gates
	pi.on("tool_call", async (event, ctx) => {
		if (!state.enabled || state.phase === "off") return;

		// --- Fleet launch gates (independent of path bypass) ---
		if (event.toolName === "fleet_dispatch") {
			const kind = normalizeFleetKind((event.input as { kind?: string }).kind);
			const gate = assertFleetAllowed({
				phase: state.phase,
				enabled: state.enabled,
				kind,
				fleetBypass: state.fleetBypassUntilPhaseChange,
				planningOnly: false,
			});
			if (!gate.allowed) {
				if (ctx.hasUI) ctx.ui.notify(gate.reason ?? "Fleet blocked", "warning");
				return { block: true, reason: gate.reason ?? "Fleet blocked by BDD phase" };
			}
			return;
		}

		if (event.toolName === "subagent") {
			const gate = assertSubagentLaunchAllowed({
				phase: state.phase,
				enabled: state.enabled,
				fleetBypass: state.fleetBypassUntilPhaseChange,
				params: event.input,
			});
			if (!gate.allowed) {
				if (ctx.hasUI) ctx.ui.notify(gate.reason ?? "Subagent fanout blocked", "warning");
				return { block: true, reason: gate.reason ?? "Subagent fanout blocked by BDD phase" };
			}
			return;
		}

		// Path/bash gates honor path bypass only
		if (state.bypassUntilPhaseChange) return;

		if (event.toolName === "bash") {
			const command = String((event.input as { command?: string }).command ?? "");
			if (
				(state.phase === "discovery" ||
					state.phase === "formulation" ||
					state.phase === "red") &&
				isLikelyMutatingBash(command)
			) {
				const reason =
					`BDD ${state.phase}: mutating bash blocked. Use edit/write only on allowed test/docs paths, or /bdd bypass <reason>.\nCommand: ${command}`;
				if (ctx.hasUI) ctx.ui.notify(reason, "warning");
				return { block: true, reason };
			}
			return;
		}

		if (event.toolName !== "write" && event.toolName !== "edit") return;

		const path = String((event.input as { path?: string }).path ?? "");
		if (!path) return;

		const gate = evaluatePathGate({
			path,
			phase: state.phase,
			config,
			enabled: state.enabled,
			bypass: state.bypassUntilPhaseChange,
			hasRedEvidence: hasRedEvidence(state.evidence),
		});

		if (gate.allowed) return;

		if (ctx.hasUI) {
			ctx.ui.notify(gate.reason ?? "BDD path blocked", "warning");
		}
		return { block: true, reason: gate.reason ?? "BDD path blocked" };
	});

	// Inject phase contract
	pi.on("before_agent_start", async () => {
		const message = buildPhaseMessage(state, config);
		if (!message) return;
		return {
			message: {
				customType: CONTEXT_TYPE,
				content: message,
				display: false,
			},
		};
	});

	// Drop stale context when off
	pi.on("context", async (event) => {
		if (state.enabled && state.phase !== "off") return;
		return {
			messages: event.messages.filter((m) => {
				const msg = m as { customType?: string };
				return msg.customType !== CONTEXT_TYPE;
			}),
		};
	});

	// Auto-remind on BDD intent (Pi requires action:"transform")
	pi.on("input", async (event) => {
		if (typeof event.text !== "string") return;
		const { matched, text } = maybeTransformForBdd(event.text);
		if (!matched) return;
		return { action: "transform" as const, text };
	});

	// /bdd command
	pi.registerCommand("bdd", {
		description:
			"BDD/TDD mode: status|on|off|discovery|formulation|red|green|refactor|verify|handoff|init|bypass",
		getArgumentCompletions: (prefix) => {
			const opts = [
				"status",
				"on",
				"off",
				"discovery",
				"formulation",
				"red",
				"green",
				"refactor",
				"verify",
				"handoff",
				"init",
				"bypass",
				"fleet-bypass",
				"next",
			];
			return opts
				.filter((o) => o.startsWith(prefix.trim()))
				.map((value) => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			const raw = args.trim();
			const [head, ...rest] = raw.split(/\s+/);
			const cmd = (head || "status").toLowerCase();
			const tail = rest.join(" ").trim();

			if (cmd === "status" || cmd === "") {
				reloadConfig(cwdOf(ctx));
				const text = statusText(state, config);
				if (ctx.hasUI) ctx.ui.notify(text.slice(0, 500), "info");
				pi.sendMessage(
					{ customType: "bdd-status", content: text, display: true },
					{ triggerTurn: false },
				);
				return;
			}

			if (cmd === "on") {
				const r = trySetPhase(ctx, state.phase === "off" ? "discovery" : state.phase);
				ctx.ui.notify(r.message, r.ok ? "info" : "warning");
				return;
			}

			if (cmd === "off") {
				setEnabled(ctx, false);
				ctx.ui.notify("BDD mode off", "info");
				return;
			}

			if (cmd === "next") {
				// From off, first step is discovery (not formulation)
				const next =
					state.phase === "off" || !state.enabled
						? "discovery"
						: suggestedNextPhase(state.phase);
				if (!next) {
					ctx.ui.notify("No next phase", "info");
					return;
				}
				const r = trySetPhase(ctx, next);
				ctx.ui.notify(r.message, r.ok ? "info" : "warning");
				return;
			}

			if (cmd === "handoff") {
				syncFleetRunsFromBranch(ctx);
				const { ok, missing } = handoffComplete(state.evidence);
				const body = formatHandoff(state.evidence, state.phase);
				const text = ok ? body : `${body}\nMissing: ${missing.join(", ")}`;
				pi.sendMessage(
					{ customType: "bdd-handoff", content: text, display: true },
					{ triggerTurn: false },
				);
				return;
			}

			if (cmd === "init") {
				const cwd = cwdOf(ctx);
				reloadConfig(cwd);
				const target = join(cwd, ".pi", "bdd.json");
				mkdirSync(dirname(target), { recursive: true });
				writeFileSync(
					target,
					configTemplate({
						unitTest: config.commands.unitTest,
						acceptanceTest: config.commands.acceptanceTest,
						acceptanceGenerate: config.commands.acceptanceGenerate,
						typecheck: config.commands.typecheck,
					}),
					"utf8",
				);
				reloadConfig(cwd);
				ctx.ui.notify(`Wrote ${target}`, "info");
				pi.sendMessage(
					{
						customType: "bdd-init",
						content: `Created \`${target}\`. Edit path patterns/commands for this repo, then \`/bdd on\`.`,
						display: true,
					},
					{ triggerTurn: false },
				);
				return;
			}

			if (cmd === "bypass") {
				if (!tail) {
					ctx.ui.notify("Usage: /bdd bypass <reason>  (path/bash only; fleets: /bdd fleet-bypass)", "warning");
					return;
				}
				state.enabled = true;
				if (state.phase === "off") state.phase = "discovery";
				state.bypassUntilPhaseChange = true;
				state.evidence.bypass = { reason: tail, at: nowIso() };
				persist();
				updateStatus(ctx);
				ctx.ui.notify(`BDD path/bash gates bypassed: ${tail}`, "warning");
				return;
			}

			if (cmd === "fleet-bypass") {
				if (!tail) {
					ctx.ui.notify("Usage: /bdd fleet-bypass <reason>", "warning");
					return;
				}
				state.enabled = true;
				if (state.phase === "off") state.phase = "discovery";
				state.fleetBypassUntilPhaseChange = true;
				state.evidence.fleetBypass = { reason: tail, at: nowIso() };
				persist();
				updateStatus(ctx);
				ctx.ui.notify(`BDD fleet launch gates bypassed: ${tail}`, "warning");
				return;
			}

			const phase = parsePhase(cmd);
			if (phase) {
				const r = trySetPhase(ctx, phase, { focus: tail || undefined });
				ctx.ui.notify(r.message, r.ok ? "info" : "warning");
				if (!r.ok) {
					pi.sendMessage(
						{ customType: "bdd-gate", content: r.message, display: true },
						{ triggerTurn: false },
					);
				}
				return;
			}

			ctx.ui.notify(
				`Unknown /bdd args. Try: status|on|off|discovery|formulation|red|green|refactor|verify|handoff|init|bypass`,
				"warning",
			);
		},
	});
}
