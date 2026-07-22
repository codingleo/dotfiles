/**
 * Agentic fleet dispatcher — large multi-agent fanout on top of pi-subagents.
 *
 * - /fleet research|review|ux <count> <topic>
 * - tools: fleet_plan, fleet_dispatch, fleet_status
 * - Raises pi-subagents parallel caps for agentic-heavy work
 * - Spawns via subagents RPC (async) when available; always returns a
 *   copy-pasteable subagent() payload the parent can run/synthesize
 */
import { homedir } from "node:os";
import { join } from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { defineTool, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import {
	ensureSubagentCaps,
	loadFleetUserConfig,
	loadFleetUserConfigDetailed,
	resolveCaps,
	type FleetUserConfig,
} from "../lib/fleet/config.ts";
import { maybeTransformForFleet } from "../lib/fleet/intent.ts";
import { loadModelResolveContext } from "../lib/fleet/model-resolve.ts";
import {
	buildFleetPlan,
	formatPlanSummary,
	type FleetModelPolicy,
	type FleetPlan,
} from "../lib/fleet/plan.ts";
import type { FleetKind } from "../lib/fleet/personas.ts";
import { callSubagentRpc } from "../lib/fleet/rpc.ts";

const FLEET_GUIDELINES = [
	"When the user asks to dispatch many sub-agents (research swarm, multi-perspective code review, UX persona panel), use fleet_plan / fleet_dispatch or /fleet — do not manually invent 10 identical tasks.",
	"After a fleet returns, synthesize: agreements, disagreements, top blockers, and recommended next actions. Do not dump raw child output only.",
	"Fleet children are read-only by default (fleet-researcher, fleet-reviewer, fleet-ux). Keep one writer in the parent (or a single worker) unless worktrees were requested.",
	"Inspect live runs with /subagents-fleet or Ctrl+Alt+F.",
];

function parseKind(raw: string): FleetKind | undefined {
	const k = raw.trim().toLowerCase();
	if (k === "research" || k === "researchers" || k === "res") return "research";
	if (k === "review" || k === "reviews" || k === "code-review" || k === "cr") return "review";
	if (k === "ux" || k === "ui" || k === "product") return "ux";
	if (k === "custom") return "custom";
	return undefined;
}

function modelPolicyFromUser(user: FleetUserConfig): FleetModelPolicy | undefined {
	const models = user.models;
	if (!models) return undefined;
	return {
		defaultModel: models.default,
		pool: models.pool,
		byKind: {
			research: models.research,
			review: models.review,
			ux: models.ux,
		},
		explicitOverride: false,
	};
}

function ensureCaps(
	user: FleetUserConfig,
	opts?: { allowWrite?: boolean },
): {
	maxTasks: number;
	maxConcurrency: number;
	note?: string;
} {
	const caps = resolveCaps(user);
	const allowWrite = opts?.allowWrite ?? user.autoRaiseCaps === true;
	const result = ensureSubagentCaps(caps, undefined, {}, { allowWrite });
	const notes: string[] = [];
	if (result.error) notes.push(result.error);
	if (result.wrote) {
		notes.push(
			`Wrote raised caps to ${result.path}. /reload required before pi-subagents enforces the new maxTasks.`,
		);
	} else if (result.needsRaise && result.skippedWriteReason) {
		notes.push(`Caps note: ${result.skippedWriteReason}`);
	}
	// Use on-disk effective caps for clamping (what runtime actually has pre-reload)
	return {
		maxTasks: result.effectiveMaxTasks,
		maxConcurrency: result.effectiveConcurrency,
		note: notes.length ? notes.join(" ") : undefined,
	};
}

function buildPlanFromArgs(options: {
	kind: FleetKind;
	count: number;
	topic: string;
	scope?: string;
	agent?: string;
	model?: string;
	models?: string[];
	concurrency?: number;
	extra?: string;
	user: FleetUserConfig;
}): FleetPlan {
	const { maxTasks, maxConcurrency, note } = ensureCaps(options.user);
	let policy = modelPolicyFromUser(options.user);
	// Explicit tool overrides are exclusive — never merge with pool/kind
	if (options.models?.length) {
		policy = { models: options.models, explicitOverride: true };
	} else if (options.model?.trim()) {
		policy = { model: options.model.trim(), explicitOverride: true };
	}

	const plan = buildFleetPlan({
		kind: options.kind,
		topic: options.topic,
		count: options.count,
		agent: options.agent,
		scope: options.scope,
		extraInstructions: options.extra,
		concurrency: options.concurrency ?? options.user.defaultConcurrency,
		maxConcurrency,
		maxTasks,
		async: true,
		modelPolicy: policy,
		outputDir: ".pi/fleet-runs",
		// Always try anthropic / openai-codex / xai before OpenRouter
		preferNativeProviders: true,
		modelResolveContext: loadModelResolveContext(),
	});
	if (note) plan.warnings.push(note);
	const loaded = loadFleetUserConfigDetailed();
	if (loaded.parseError) {
		plan.warnings.push(`fleet.json parse issue: ${loaded.parseError}`);
	}
	return plan;
}

async function dispatchPlan(
	pi: ExtensionAPI,
	plan: FleetPlan,
): Promise<{ ok: boolean; text: string; details: Record<string, unknown> }> {
	const reply = await callSubagentRpc(pi.events, "spawn", plan.subagentParams, {
		timeoutMs: 60_000,
		source: "agentic-fleet",
	});

	if (!reply.success) {
		const msg =
			reply.error?.message ??
			"Fleet RPC spawn failed. Is `npm:pi-subagents` installed and loaded? You can still call the `subagent` tool with the payload below.";
		return {
			ok: false,
			text: [
				`## Fleet dispatch failed`,
				msg,
				``,
				formatPlanSummary(plan),
				``,
				`### subagent() payload`,
				"```json",
				JSON.stringify(plan.subagentParams, null, 2),
				"```",
				``,
				`Call the **subagent** tool with that object (omit wrapping). Then synthesize results.`,
			].join("\n"),
			details: { ok: false, error: reply.error, plan },
		};
	}

	const data = reply.data as { text?: string; details?: Record<string, unknown> } | undefined;
	const runHint =
		typeof data?.text === "string" && data.text.trim()
			? data.text.trim()
			: "Async fleet launched. Use /subagents-fleet or subagent({ action:\"status\", view:\"fleet\" }).";

	return {
		ok: true,
		text: [
			`## Fleet dispatched — ${plan.kind} × ${plan.count}`,
			``,
			runHint,
			``,
			formatPlanSummary(plan),
			``,
			`### Parent job (required when fleet finishes)`,
			`Synthesize into:`,
			`1. **Agreements** across agents`,
			`2. **Disagreements** (do not smooth over)`,
			`3. **Blockers** worth fixing now`,
			`4. **Actions** (ordered)`,
			`5. **Residual risks**`,
			`Watch: /subagents-fleet or Ctrl+Alt+F. Outputs under .pi/fleet-runs/.`,
		].join("\n"),
		details: { ok: true, rpc: data, plan },
	};
}

export default function agenticFleetExtension(pi: ExtensionAPI): void {
	let lastCtx: ExtensionContext | undefined;

	pi.on("session_start", async (_e, ctx) => {
		lastCtx = ctx;
		// Warn-only caps check by default (no silent config rewrite)
		try {
			const user = loadFleetUserConfig();
			ensureCaps(user, { allowWrite: false });
		} catch {
			// never break session_start
		}
		const active = new Set(pi.getActiveTools());
		for (const name of ["fleet_plan", "fleet_dispatch", "fleet_status"]) active.add(name);
		pi.setActiveTools([...active]);
	});

	const planTool = defineTool({
		name: "fleet_plan",
		label: "Fleet Plan",
		description:
			"Build a multi-agent fleet plan (research / code-review / UX personas) with optional model rotation. " +
			"Does not launch. Use fleet_dispatch to spawn, or pass the returned payload to the subagent tool.",
		promptSnippet: "Plan large multi-agent fleets (N researchers/reviewers/UX personas)",
		promptGuidelines: FLEET_GUIDELINES,
		parameters: Type.Object({
			kind: Type.String({ description: "research | review | ux | custom" }),
			topic: Type.String({ description: "Subject, question, or review target description" }),
			count: Type.Integer({ minimum: 1, description: "How many agents to launch" }),
			scope: Type.Optional(Type.String({ description: "PR URL, paths, or diff scope" })),
			agent: Type.Optional(Type.String({ description: "Override agent name for all children" })),
			model: Type.Optional(Type.String({ description: "Single model for all children" })),
			models: Type.Optional(
				Type.Array(Type.String(), { description: "Rotate these models across children" }),
			),
			concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
			extraInstructions: Type.Optional(Type.String()),
		}),
		renderCall(args, theme) {
			const kind = String(args?.kind ?? "?");
			const count = args?.count ?? "?";
			return new Text(
				`${theme.fg("accent", "🚀")} ${theme.bold("Fleet plan")} ${theme.fg("dim", `${kind}×${count}`)}`,
				0,
				0,
			);
		},
		async execute(_id, params) {
			const kind = parseKind(String(params.kind));
			if (!kind) {
				return {
					content: [{ type: "text", text: `Unknown kind "${params.kind}". Use research|review|ux|custom.` }],
					details: { ok: false },
				};
			}
			const user = loadFleetUserConfig();
			try {
				const plan = buildPlanFromArgs({
					kind,
					count: Number(params.count),
					topic: String(params.topic),
					scope: params.scope ? String(params.scope) : undefined,
					agent: params.agent ? String(params.agent) : undefined,
					model: params.model ? String(params.model) : undefined,
					models: Array.isArray(params.models) ? params.models.map(String) : undefined,
					concurrency: params.concurrency != null ? Number(params.concurrency) : undefined,
					extra: params.extraInstructions ? String(params.extraInstructions) : undefined,
					user,
				});
				const text = [
					formatPlanSummary(plan),
					``,
					`### subagent() payload`,
					"```json",
					JSON.stringify(plan.subagentParams, null, 2),
					"```",
				].join("\n");
				return { content: [{ type: "text", text }], details: { ok: true, plan } };
			} catch (err) {
				return {
					content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
					details: { ok: false },
				};
			}
		},
	});

	const dispatchTool = defineTool({
		name: "fleet_dispatch",
		label: "Fleet Dispatch",
		description:
			"Plan and launch a multi-agent fleet via pi-subagents (async parallel). " +
			"Kinds: research, review, ux. Use when the user wants N agents with distinct personas/models.",
		promptSnippet: "Dispatch N sub-agents (research/review/UX fleets)",
		promptGuidelines: FLEET_GUIDELINES,
		parameters: Type.Object({
			kind: Type.String({ description: "research | review | ux | custom" }),
			topic: Type.String({ description: "Subject or review target" }),
			count: Type.Integer({ minimum: 1, description: "Number of agents" }),
			scope: Type.Optional(Type.String()),
			agent: Type.Optional(Type.String()),
			model: Type.Optional(Type.String()),
			models: Type.Optional(Type.Array(Type.String())),
			concurrency: Type.Optional(Type.Integer({ minimum: 1 })),
			extraInstructions: Type.Optional(Type.String()),
			planOnly: Type.Optional(
				Type.Boolean({ description: "If true, only plan (same as fleet_plan)" }),
			),
		}),
		renderCall(args, theme) {
			const kind = String(args?.kind ?? "?");
			const count = args?.count ?? "?";
			return new Text(
				`${theme.fg("accent", "🚀")} ${theme.bold("Fleet dispatch")} ${theme.fg("dim", `${kind}×${count}`)}`,
				0,
				0,
			);
		},
		async execute(_id, params) {
			const kind = parseKind(String(params.kind));
			if (!kind) {
				return {
					content: [{ type: "text", text: `Unknown kind "${params.kind}". Use research|review|ux|custom.` }],
					details: { ok: false },
				};
			}
			const user = loadFleetUserConfig();
			let plan: FleetPlan;
			try {
				plan = buildPlanFromArgs({
					kind,
					count: Number(params.count),
					topic: String(params.topic),
					scope: params.scope ? String(params.scope) : undefined,
					agent: params.agent ? String(params.agent) : undefined,
					model: params.model ? String(params.model) : undefined,
					models: Array.isArray(params.models) ? params.models.map(String) : undefined,
					concurrency: params.concurrency != null ? Number(params.concurrency) : undefined,
					extra: params.extraInstructions ? String(params.extraInstructions) : undefined,
					user,
				});
			} catch (err) {
				return {
					content: [{ type: "text", text: err instanceof Error ? err.message : String(err) }],
					details: { ok: false },
				};
			}

			if (params.planOnly) {
				return {
					content: [
						{
							type: "text",
							text: `${formatPlanSummary(plan)}\n\n\`\`\`json\n${JSON.stringify(plan.subagentParams, null, 2)}\n\`\`\``,
						},
					],
					details: { ok: true, plan },
				};
			}

			const result = await dispatchPlan(pi, plan);
			if (lastCtx?.hasUI) {
				lastCtx.ui.notify(
					result.ok ? `Fleet ${plan.kind}×${plan.count} launched` : `Fleet launch issue`,
					result.ok ? "info" : "warning",
				);
			}
			return {
				content: [{ type: "text", text: result.text }],
				details: result.details,
			};
		},
	});

	const statusTool = defineTool({
		name: "fleet_status",
		label: "Fleet Status",
		description: "Show fleet caps, config path, and pi-subagents fleet view hint.",
		parameters: Type.Object({}),
		async execute() {
			const user = loadFleetUserConfig();
			const { maxTasks, note } = ensureCaps(user);
			const caps = resolveCaps(user);
			const text = [
				`# Agentic fleet status`,
				``,
				`- Desired maxTasks: ${caps.maxTasks}`,
				`- Desired concurrency: ${caps.concurrency}`,
				`- Effective maxTasks (config): ${maxTasks}`,
				`- User config: ${join(homedir(), ".pi/agent/fleet.json")} (optional)`,
				`- Models: ${JSON.stringify(user.models ?? {}, null, 0)}`,
				note ? `- Note: ${note}` : undefined,
				``,
				`Commands: \`/fleet research 10 <topic>\`, \`/fleet review 8 <scope>\`, \`/fleet ux 10 <target>\``,
				`Live UI: \`/subagents-fleet\` or Ctrl+Alt+F`,
				`Agents: fleet-researcher, fleet-reviewer, fleet-ux (personal package)`,
			]
				.filter(Boolean)
				.join("\n");
			return { content: [{ type: "text", text }], details: { caps, user, maxTasks } };
		},
	});

	pi.registerTool(planTool);
	pi.registerTool(dispatchTool);
	pi.registerTool(statusTool);

	pi.registerCommand("fleet", {
		description:
			"Agentic fleet: research|review|ux <count> <topic> | status | plan …",
		getArgumentCompletions: (prefix) => {
			const opts = ["research", "review", "ux", "status", "plan", "dispatch"];
			return opts
				.filter((o) => o.startsWith(prefix.trim().split(/\s+/)[0] ?? ""))
				.map((value) => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			lastCtx = ctx;
			const raw = args.trim();
			if (raw === "init-caps") {
				const user = loadFleetUserConfig();
				const caps = resolveCaps(user);
				const result = ensureSubagentCaps(caps, undefined, {}, { allowWrite: true });
				const msg = result.wrote
					? `Wrote caps to ${result.path}. Run /reload so pi-subagents picks them up.`
					: result.error || result.skippedWriteReason || "No cap write needed.";
				ctx.ui.notify(msg, result.wrote ? "info" : "warning");
				return;
			}

			if (!raw || raw === "status" || raw === "help") {
				const user = loadFleetUserConfig();
				const { maxTasks } = ensureCaps(user);
				const msg = [
					`Agentic fleet — effective maxTasks≈${maxTasks}`,
					`/fleet research 10 <topic>`,
					`/fleet review 8 <diff or paths>`,
					`/fleet ux 10 <screen or flow>`,
					`/fleet plan research 10 <topic>`,
					`/fleet init-caps  # optional: write raised caps (then /reload)`,
					`Optional ~/.pi/agent/fleet.json for model pools`,
				].join("\n");
				ctx.ui.notify(msg, "info");
				pi.sendMessage({ customType: "fleet-help", content: msg, display: true }, { triggerTurn: false });
				return;
			}

			// /fleet [plan|dispatch] research|review|ux <count> <topic...>
			const parts = raw.split(/\s+/);
			let mode: "plan" | "run" = "run";
			let idx = 0;
			if (parts[0] === "plan" || parts[0] === "dispatch") {
				mode = parts[0] === "plan" ? "plan" : "run";
				idx = 1;
			}
			const kind = parseKind(parts[idx] ?? "");
			if (!kind) {
				ctx.ui.notify(`Unknown fleet kind. Try research|review|ux`, "warning");
				return;
			}
			const count = Number(parts[idx + 1]);
			if (!Number.isInteger(count) || count < 1) {
				ctx.ui.notify(`Usage: /fleet ${kind} <count> <topic>`, "warning");
				return;
			}
			const topic = parts.slice(idx + 2).join(" ").trim();
			if (!topic) {
				ctx.ui.notify(`Usage: /fleet ${kind} ${count} <topic>`, "warning");
				return;
			}

			const user = loadFleetUserConfig();
			const plan = buildPlanFromArgs({ kind, count, topic, user });

			if (mode === "plan") {
				const text = formatPlanSummary(plan);
				pi.sendMessage({ customType: "fleet-plan", content: text, display: true }, { triggerTurn: false });
				return;
			}

			ctx.ui.notify(`Dispatching ${kind}×${count}…`, "info");
			const result = await dispatchPlan(pi, plan);
			pi.sendMessage(
				{ customType: "fleet-dispatch", content: result.text, display: true },
				{ triggerTurn: false },
			);
			// Trigger a parent turn so synthesis is not fire-and-forget
			pi.sendMessage(
				{
					customType: "fleet-parent-brief",
					content:
						`[Fleet parent] A ${kind} fleet ×${count} was launched for: ${topic}\n` +
						`Watch with /subagents-fleet (Ctrl+Alt+F). When children complete, synthesize:\n` +
						`Agreements / Disagreements / Blockers / Actions / Residual risks.\n` +
						`Do not dump raw child output only. Artifacts: .pi/fleet-runs/`,
					display: true,
				},
				{ triggerTurn: true },
			);
		},
	});

	// Natural language nudge (Pi requires action:"transform")
	pi.on("input", async (event) => {
		if (typeof event.text !== "string") return;
		const { matched, text } = maybeTransformForFleet(event.text);
		if (!matched) return;
		return { action: "transform" as const, text };
	});
}
