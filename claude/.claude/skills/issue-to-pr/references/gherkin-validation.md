# Three-Lens Acceptance Validation

Dispatch these **three agents in one message** so they run concurrently. Give each the same inputs, a different lens. Then reconcile.

App-agnostic: judge against **this issue**, **this codebase**, and the **Example Map from discovery** — not a fixed architecture or product.

## Shared inputs to paste into every agent prompt

- The issue text and its acceptance criteria / Example Map.
- The full contents of the acceptance feature file(s) just written (paste them, or give exact paths).
- The reconciled discovery summary (personas, workflows, adopted affordances) when available.
- The relevant source files/dirs the feature touches (paths).
- Project test-layer conventions (if any): where unit vs integration vs E2E/acceptance live.
- Instruction to **read the actual code** before judging, and to return **structured, actionable** findings — not prose approval.

Ask each agent to return, as a list:
`{severity: blocker|major|minor, scenario/line, problem, concrete fix}` plus any **missing scenario** it would add (with Given/When/Then or the project’s equivalent).

## Lens 1 — Business Analyst (acceptance completeness)

> You are a business analyst reviewing acceptance features against an issue (and its Example Map if present). Verify every acceptance criterion maps to at least one scenario, and every scenario’s outcome asserts an **observable user- or externally-visible result** (not an implementation detail). Flag: criteria with no scenario, scenarios asserting the wrong outcome, vague/untestable steps, compound steps that hide two behaviors, and any scenario that doesn’t trace back to the issue or map. List missing happy-path or empty/first-run scenarios. Read the linked code only to confirm the described behavior matches product intent — do not redesign the product.

## Lens 2 — QA / Edge-Case Hunter

> You are a QA engineer hunting for missing edge cases in these acceptance features. Walk every branch and boundary relevant to **this** feature: invalid/empty/oversized input, missing/expired auth and permission denials, boundary values (0, 1, max, off-by-one), concurrency and idempotency/retry, out-of-order events, network/dependency failure, and error-message assertions. For each gap, provide a concrete scenario to add. Be orthogonal to acceptance completeness — focus only on unhandled conditions, not whether the happy path matches the issue.

## Lens 3 — Architect (technical feasibility)

> You are the system architect for **this** codebase. Judge whether each acceptance step is technically feasible and correctly placed. Read the relevant modules first. Flag: steps that assume data/endpoints/events that don’t exist, scenarios that can’t be reached through the real architecture, assertions that would require leaking implementation details, and any behavior better tested at a different layer (e.g. a unit invariant masquerading as an E2E step). Recommend the correct test layer (unit vs integration vs E2E/acceptance) for each scenario using **this project’s** conventions. Note existing services/modules/APIs the implementation should reuse rather than rebuild. Do **not** assume a particular architecture (DDD, MVC, etc.) unless the code shows it.

## Reconciliation rubric

1. Collect all findings. **Blockers and majors must be resolved** before Red tests; minors are judgment calls — apply or note why not.
2. Where lenses conflict (e.g. BA wants an E2E scenario the architect says belongs in a unit test), prefer the architect’s **layer** recommendation but keep the BA’s **outcome** as the assertion.
3. Deduplicate overlapping “missing scenario” suggestions.
4. Revise the feature files; re-run the project’s acceptance generate/compile step **if it exists**.
5. If the revision changed the feature set materially, re-dispatch **only the affected lens** once to confirm closure. Do not loop the full panel more than twice.
