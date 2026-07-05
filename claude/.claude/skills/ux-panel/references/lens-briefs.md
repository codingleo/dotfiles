# Lens briefs

Prompt templates for the five panelists and the round-2 cross-examination. Fill every `{…}` slot from Phase 0 grounding. Spawn with `subagent_type: "general-purpose"` and `name:` set to the lens id.

## Shared brief skeleton (prepend to every lens prompt)

```
You are a {LENS TITLE} on a 5-person UX panel critiquing {SURFACE NAME}. Your
position will be debated by 4 peers ({THE OTHER FOUR LENSES}) — commit to
defensible calls with reasoning, not hedges.

## The surface under review ({THEME/SIZE/CONTEXT ONE-LINER})
{TOP-TO-BOTTOM TEXT DESCRIPTION OF THE UI — every row/element, states, copy}

## Ground truth (read the code before judging)
{EXACT FILE PATHS: component, primitives, container, siblings for pattern
comparison, tokens/theme CSS}
Implementation facts: {latency, persistence, keyboard semantics, framework
behaviors already verified}
Product context: {domain vocabulary, duplication candidates elsewhere,
recent decisions that constrain the redesign, fixed vs open constraints}

## Deliver
(a) your top 3 problems ranked with severity, (b) your concrete redesign
prescription (exact, not directional), (c) one position you'd defend against
{PEER A} ("{their likely objection}") and {PEER B} ("{their likely objection}").
Ground every claim in the actual code/tokens, not assumptions.
Send your full position to "main" via SendMessage.
```

The pre-emptive defenses in (c) are load-bearing: naming the likely objection primes real disagreement instead of five overlapping reviews.

## Lens 1 — `ux-ia` (information architecture)

Focus areas to include in the task section:

- Grouping logic and order: are action clusters / preferences / navigation / destructive exits grouped and sequenced right (serial-position, Gestalt proximity/common-region)?
- Label clarity and term collisions: words bound to two referents in this domain; labels that over- or under-promise their destination (verify against what the route/page ACTUALLY does — read it).
- Redundancy vs. disambiguation: repeated strings/identities — noise, or load-bearing distinction between different objects that happen to share a name?
- Scent of navigation: is it evident which items act in place vs navigate away vs open externally?
- Whether each element belongs on THIS surface at all vs a settings/detail page.
- Typical defenses to assign: vs minimalist ("cut it entirely"), vs interaction ("the control is fine where it is").

## Lens 2 — `ux-interaction` (motor efficiency, feedback, input ergonomics)

Focus areas:

- Target sizes and spacing vs. the platform floors (WCAG 2.5.8 24px, 44pt/48dp coarse-pointer); inter-target gaps (Fitts: small target + zero gap = errors). The surface renders on mobile too unless stated otherwise.
- System-status feedback: every async action must change something within ~100ms (Doherty threshold, Nielsen H1). Hunt for dead-click windows: tap → nothing → delayed global change. Check whether adjacent controls with the identical gesture have inconsistent feedback timing.
- Affordances: cursor semantics (interactive controls with `cursor-default` is backwards), hover/press states, what signals "click = act + close" vs "stateful control that persists".
- Idiom collisions: stateful widgets embedded in menus/dialogs — do they break the container's mental model, and is that resolved by feedback or by restructuring?
- Optimistic vs pessimistic updates: prefer optimistic for reversible low-risk toggles; specify the rollback story.
- Typical defenses: vs visual ("don't add chrome/spinners"), vs IA ("move it to a settings page").

## Lens 3 — `ux-visual` (typography, rhythm, visual system)

Focus areas:

- Density and vertical rhythm: mixed row heights, separator count, group-label overhead — does it read as one system or assembled parts? Radius/spacing token languages in conflict (count the distinct radii).
- Visual mass vs importance: do heavy marks (filled tracks, big controls) land on secondary content while primary actions read lighter?
- State contrast as SURFACE distinction, not just text: selected-vs-unselected adjacency in BOTH themes (this is WCAG 1.4.11 territory — 3:1 non-text; flag for the a11y agent to compute).
- Separators: rule-vs-whitespace grouping; hairlines sharing a fill with content surfaces.
- Emphasis honesty: destructive items — danger tint only for irreversible actions; position/isolation as the default separator.
- Prescriptions must be grounded in the existing token vocabulary (read the theme CSS), with exact class/spacing values.
- Typical defenses: vs interaction ("add spinners"), vs minimalist ("collapse the control").

## Lens 4 — `ux-a11y` (WCAG + ARIA patterns)

Focus areas — and REQUIRE computation, not eyeballing:

- Compute contrast ratios from the actual theme tokens for text (1.4.3) AND non-text state indication (1.4.11), both themes. Report numbers; explicitly clear the items that PASS so peers don't pile on by reflex.
- Accessible-name computation: captions/suffixes nested in interactive elements bloat names (2.4.6); duplicated visible-label + aria-label drift; prescribe `aria-labelledby`/`aria-describedby` wiring.
- Target sizes vs 2.5.8 with the measured px.
- Focus integrity across async updates: what happens to roving focus / SR context when the tree re-renders; live-region requirements (4.1.3); never `pointer-events-none` mid-focus.
- Role masking: composed primitives stamping roles over anchors (`menuitem` over `<a target="_blank">`) — 3.2.5 new-tab warnings, sr-only text requirements.
- Keyboard model of the composed widget: roving focus scope, typeahead collisions (check in EVERY supported locale), whether embedded controls are reachable at all.
- Typical defenses: vs visual ("the small text looks right"), vs interaction (usually an ALLY on widget choice — say so explicitly when true).

## Lens 5 — `ux-minimal` (product minimalism / jobs-to-be-done)

Bias statement to include verbatim: "every element must earn its place; the best {surface} is the one users never think about."

Focus areas:

- Interrogate each element's right to exist HERE: frequency of the job (once-ever vs daily) vs permanence of the real estate; the worst ratio is the first cut candidate.
- Duplication: check whether each entry already has a canonical home elsewhere (READ the sidebar/nav/editor code — cite the line). Distinguish "moved here" (consolidation) from "duplicated into here" (accretion).
- Context match: where does the intent actually form? An entry serving a "might as well" instinct instead of a job is noise.
- The ONE thing this surface must do instantly — does current height/scan cost tax it?
- Distinguish REMOVE from DEMOTE; when a recent product decision constrains cuts, propose demote-with-telemetry (instrument click-through; cut next cycle if <2–3% of the canonical home's traffic).
- Typical defenses: vs IA ("consolidation was the point"), vs a11y ("in-place is more discoverable").

## Round-2 template (send via SendMessage to each panelist)

```
ROUND 2 — cross-examination. The panel's positions conflict on {N} points.
Attack at least 2 peer claims with reasoning, concede where genuinely
convinced, then give your FINAL vote on each point (≤400 words total).

THE {N} CONTESTED POINTS + who said what:
1. {point} — YOU: {their claim}; {PEER}: {conflicting claim}; {PEER}: {…}
   {If their premise is checkable: "Your premise may be factually wrong — verify against {file} and respond."}
2. …

{Targeted verification asks, e.g.:
- "A11Y: VISUAL's concern is about SURFACE contrast (1.4.11, 3:1), not text —
  run that check against the real tokens."
- "Note {framework} behavior: {claim one peer made} — confirm or refute it
  from the docs/source before voting."}

Also react to: {cross-cutting proposals not yet voted on, e.g. renames}.
Send your final round-2 position to "main".
```

Tailor per recipient: lead each agent's digest with the points where THEY are under attack. Same numbered points for everyone, so votes tally cleanly.
