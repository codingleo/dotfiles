---
name: ux-panel
description: Adversarial 5-agent UX panel review of a UI surface (a menu, dialog, page, flow, or component). Five sub-agents with distinct lenses — information architecture, interaction design, visual craft, accessibility, product minimalism/JTBD — independently critique the surface grounded in the real code, then cross-examine each other's positions until they converge; the orchestrator adjudicates and synthesizes a ranked verdict. Use when the user asks to "analyze this UI with multiple agents", "run a UX panel/debate", "have UX agents discuss and question each other", "make this screen awesome/simpler", or wants a deep multi-perspective design critique of an existing surface (screenshot and/or code). Not for building new UI from scratch or single-lens quick reviews.
---

# UX Panel

Run a five-lens adversarial design review: independent critique → cross-examination → converged verdict. The panel's value comes from grounding (agents read real code, compute real numbers) and from forced disagreement (each agent must attack peers before converging). Expect ~10 sub-agent turns total; tell the user it takes several minutes.

## Phase 0 — Ground the panel (orchestrator, before spawning)

Collect and verify. Ungrounded panels produce plausible-sounding fiction; the best findings in practice come from agents reading code, not the screenshot.

1. **The surface**: a precise text description of the UI, top-to-bottom (from the user's screenshot or a live snapshot). Include dimensions, states, and copy.
2. **Real code paths**: the component file(s), their primitives (e.g. the Radix wrappers), sibling components for pattern comparison, the container that wires handlers, design tokens/theme CSS. List exact paths in every brief.
3. **Product context**: domain vocabulary (e.g. "profile ≠ user account"), what already exists elsewhere (duplication candidates), recent product decisions that constrain the redesign (link the issue/PR), and known implementation facts (latency, persistence, keyboard semantics).
4. **Constraints**: anything already decided that the panel must treat as fixed vs. open.

## Phase 1 — Independent positions (5 agents in parallel)

Spawn five **named** agents in one message (`Agent` tool with `name:` so round 2 can address them): `ux-ia`, `ux-interaction`, `ux-visual`, `ux-a11y`, `ux-minimal`. Build each brief from [references/lens-briefs.md](references/lens-briefs.md) — it holds the per-lens prompt templates and the shared brief skeleton.

Non-negotiables in every brief:

- Name the four other lenses and warn the position will be debated — demand committed, defensible calls, not hedges.
- Require reading the listed code before judging; claims must cite file/line or computed numbers (contrast ratios, target sizes, timing).
- Demand the fixed output shape: (a) top-3 problems ranked with severity, (b) concrete redesign prescription, (c) pre-emptive defenses against two named peers' likely objections.
- Ask each agent to send its position to `main` via SendMessage.

**Choreography gotcha**: agents sometimes go idle without posting. When an idle notification arrives with no position, nudge via SendMessage ("post your round-1 position to main as briefed"). Wait until all five positions are in before round 2.

## Phase 2 — Cross-examination (round 2)

1. Read all five positions and extract the **contested points**: every place two lenses disagree, plus any factual claim one agent made that contradicts another (or the code). Number them (typically 4–8).
2. Send each agent a round-2 brief via SendMessage (template in [references/lens-briefs.md](references/lens-briefs.md), section "Round-2 template"): the numbered conflict digest with who-said-what per point, tailored per recipient (lead with the attacks on *their* claims), requiring: attack ≥2 peer claims with reasoning, concede where genuinely convinced, and a FINAL vote on every numbered point, word-capped (~400 words).
3. Where a peer's claim is checkable, tell the specific agent to check it (e.g. ask the a11y agent to run the contrast math the visual agent asserted; ask anyone whose premise depends on what a page/route actually does to read it). Concessions and reversals triggered by code facts are the panel's best output.

## Phase 3 — Adjudicate and synthesize (orchestrator)

Tally final votes per contested point, then decide with these rules, in order:

1. **Code facts beat opinions.** If an agent verified behavior in the source (what a route edits, what a framework actually does), that finding overrides any vote cast on the false premise — even the majority's.
2. **Measured numbers beat vibes.** Computed contrast ratios, px targets, and timing decide; adjectives don't.
3. **Hard accessibility constraints are vetoes**, not votes (WCAG floors, focus integrity, accessible names).
4. **Reconcile before voting.** Many "conflicts" are compatible (e.g. "demote the section" + "keep it a separator away from the destructive action" → both). Merge, don't pick.
5. Remaining taste calls: majority wins; record the minority position.

Deliver to the user, in this order:

- Any **reframing discovery** first (the fact that changed the debate).
- A **converged blueprint** of the redesigned surface (ASCII sketch).
- **Ranked change list** (by impact, with the standard/number that justifies each).
- **What the panel refused to change** and why (defended items are as valuable as changes).
- **Minority holdouts** and follow-ups (telemetry to settle data-decidable disputes, product gaps discovered).
- Offer implementation.

## Quality bar

- A panel where all five agents agree in round 1 is a failed panel — the briefs weren't opinionated enough or the lenses overlapped. Re-brief with sharper biases.
- At least one round-2 concession or reversal should be traceable to a code/number check. If none occurred, ask the two most-conflicting agents one more targeted verification question before synthesizing.
- Never present the synthesis until all five round-2 finals are in.
