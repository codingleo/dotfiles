/**
 * Phase machine + transition gates for BDD/TDD workflow.
 */

import type { BddEvidence, BddPhase, PhaseTransitionResult } from "./types.ts";
import { BDD_PHASES } from "./types.ts";

export function isBddPhase(value: string): value is BddPhase {
	return (BDD_PHASES as readonly string[]).includes(value);
}

export function parsePhase(value: string): BddPhase | undefined {
	const v = value.trim().toLowerCase();
	// aliases
	if (v === "formulate") return "formulation";
	if (v === "map" || v === "discover") return "discovery";
	if (v === "impl" || v === "implement") return "green";
	if (v === "done" || v === "check") return "verify";
	if (isBddPhase(v)) return v;
	return undefined;
}

export const PHASE_ORDER: BddPhase[] = [
	"discovery",
	"formulation",
	"red",
	"green",
	"refactor",
	"verify",
];

export function phaseIndex(phase: BddPhase): number {
	if (phase === "off") return -1;
	return PHASE_ORDER.indexOf(phase);
}

export function phaseLabel(phase: BddPhase): string {
	switch (phase) {
		case "off":
			return "off";
		case "discovery":
			return "discovery (Example Map)";
		case "formulation":
			return "formulation (Gherkin / scenarios)";
		case "red":
			return "red (failing tests)";
		case "green":
			return "green (minimum implementation)";
		case "refactor":
			return "refactor (keep green)";
		case "verify":
			return "verify (regression + handoff)";
	}
}

/**
 * Can we move from `from` to `to` given current evidence?
 * Moving backward is always allowed (re-open red, etc.).
 * `off` toggles are handled separately.
 */
export function canTransition(
	from: BddPhase,
	to: BddPhase,
	evidence: BddEvidence,
): PhaseTransitionResult {
	if (to === "off") return { ok: true };
	if (from === to) return { ok: true };

	// Turning on / jumping into discovery is always fine
	if (to === "discovery") return { ok: true };

	const fromIdx = phaseIndex(from === "off" ? "discovery" : from);
	const toIdx = phaseIndex(to);

	// Backward or same-band moves are fine
	if (toIdx <= fromIdx) return { ok: true };

	// Forward gates — hard-block green without red (formulation stays soft)
	if (to === "green" || to === "refactor" || to === "verify") {
		if (!evidence.red || evidence.red.exitCode === 0) {
			return {
				ok: false,
				reason:
					`Cannot enter ${to} without red evidence (a failing test run). ` +
					`Stay in red, run the failing suite, call bdd_assert_red.`,
			};
		}
	}

	if (to === "verify") {
		if (!evidence.green || evidence.green.exitCode !== 0) {
			return {
				ok: false,
				reason:
					`Cannot enter verify without green evidence (passing test run). ` +
					`Call bdd_assert_green after implementation.`,
			};
		}
	}

	if (to === "refactor") {
		// Prefer green first, but allow refactor if green recorded
		if (!evidence.green || evidence.green.exitCode !== 0) {
			return {
				ok: false,
				reason: "Cannot enter refactor without a passing green run (bdd_assert_green).",
			};
		}
	}

	return { ok: true };
}

export function suggestedNextPhase(phase: BddPhase): BddPhase | undefined {
	if (phase === "off") return "discovery";
	const idx = phaseIndex(phase);
	if (idx < 0 || idx >= PHASE_ORDER.length - 1) return undefined;
	return PHASE_ORDER[idx + 1];
}

export function formatHandoff(evidence: BddEvidence, phase: BddPhase): string {
	const lines: string[] = [
		"## BDD/TDD Handoff Evidence",
		"",
		`- **Phase:** ${phaseLabel(phase)}`,
	];
	if (evidence.focus) lines.push(`- **Focus:** ${evidence.focus}`);
	if (evidence.exampleMap) {
		lines.push(
			`- **Example Map:** ${evidence.exampleMap.ref} ` +
				`(R${evidence.exampleMap.rules}/E${evidence.exampleMap.examples}` +
				`${evidence.exampleMap.questions != null ? `/Q${evidence.exampleMap.questions}` : ""})`,
		);
	} else {
		lines.push("- **Example Map:** _(not recorded)_");
	}
	if (evidence.red) {
		lines.push(
			`- **Red:** \`${evidence.red.command}\` → exit ${evidence.red.exitCode} — ${evidence.red.summary}`,
		);
	} else {
		lines.push("- **Red:** _(missing)_");
	}
	if (evidence.green) {
		lines.push(
			`- **Green:** \`${evidence.green.command}\` → exit ${evidence.green.exitCode} — ${evidence.green.summary}`,
		);
	} else {
		lines.push("- **Green:** _(missing)_");
	}
	if (evidence.mutation) {
		lines.push(
			`- **Mutation check:** ${evidence.mutation.proven ? "proven" : "NOT proven"} — ${evidence.mutation.note}`,
		);
	} else {
		lines.push("- **Mutation check:** _(not recorded)_");
	}
	if (evidence.acceptance) {
		lines.push(
			`- **Acceptance:** ${evidence.acceptance.ref}` +
				(evidence.acceptance.reason ? ` — ${evidence.acceptance.reason}` : ""),
		);
	} else {
		lines.push("- **Acceptance:** _(not recorded — set path or N/A + reason)_");
	}
	if (evidence.crap) lines.push(`- **CRAP mitigation:** ${evidence.crap}`);
	if (evidence.bypass) {
		lines.push(`- **Bypass used:** ${evidence.bypass.reason} @ ${evidence.bypass.at}`);
	}
	lines.push("");
	return lines.join("\n");
}

export function handoffComplete(evidence: BddEvidence): { ok: boolean; missing: string[] } {
	const missing: string[] = [];
	if (!evidence.red || evidence.red.exitCode === 0) missing.push("red (failing run)");
	if (!evidence.green || evidence.green.exitCode !== 0) missing.push("green (passing run)");
	if (!evidence.acceptance) {
		missing.push("acceptance (path or N/A)");
	} else if (
		evidence.acceptance.ref.toUpperCase() === "N/A" &&
		!evidence.acceptance.reason?.trim()
	) {
		missing.push("acceptance N/A reason");
	}
	// Soft requirements — listed but do not fail ok for tiny tech fixes
	const soft: string[] = [];
	if (!evidence.mutation) soft.push("mutation (recommended)");
	if (!evidence.exampleMap) soft.push("exampleMap (recommended for behavior changes)");
	if (!evidence.crap) soft.push("CRAP notes (recommended when adding branches)");
	return { ok: missing.length === 0, missing: [...missing, ...soft.map((s) => `(soft) ${s}`)] };
}

/** Clear run evidence when starting a new focus/cycle (keep bypass logs). */
export function clearCycleEvidence(evidence: BddEvidence): BddEvidence {
	return {
		focus: evidence.focus,
		bypass: evidence.bypass,
		fleetBypass: evidence.fleetBypass,
		// drop fleetRuns so a new cycle cannot inherit prior synthesis obligations
	};
}

/** True when green evidence is stale relative to a newer red. */
export function greenIsStale(evidence: BddEvidence): boolean {
	if (!evidence.red || !evidence.green) return false;
	return evidence.green.at < evidence.red.at;
}
