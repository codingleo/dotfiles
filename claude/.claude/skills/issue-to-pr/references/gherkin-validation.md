# Three-Lens Gherkin Validation

Dispatch these **three agents in one message** so they run concurrently. Give each the same inputs, a different lens. Then reconcile.

## Shared inputs to paste into every agent prompt

- The issue text (from `bd show` / `gh issue view`) and its acceptance criteria.
- The full contents of the `.feature` file(s) just written (paste them, or give exact paths).
- The relevant source files/dirs the feature touches (paths).
- Instruction to **read the actual code** before judging, and to return **structured, actionable** findings — not prose approval.

Ask each agent to return, as a list:
`{severity: blocker|major|minor, scenario/line, problem, concrete fix}` plus any **missing scenario** it would add (with Given/When/Then).

## Lens 1 — Business Analyst (acceptance completeness)

> You are a business analyst reviewing Gherkin acceptance features against an issue. Verify every acceptance criterion in the issue maps to at least one scenario, and every scenario's Then asserts an **observable user-visible outcome** (not an implementation detail). Flag: criteria with no scenario, scenarios asserting the wrong outcome, vague/untestable steps, compound `And`/`But` that hide two behaviors, and any scenario that doesn't trace back to the issue. List missing happy-path or empty/first-run scenarios. Read the linked code to confirm the described behavior is what the product actually intends.

## Lens 2 — QA / Edge-Case Hunter

> You are a QA engineer hunting for missing edge cases in these Gherkin features. Walk every branch and boundary: invalid/empty/oversized input, missing/expired auth and permission denials, boundary values (0, 1, max, off-by-one), concurrency and idempotency/retry, out-of-order events, network/dependency failure, and error-message assertions. For each gap, provide a concrete Given/When/Then scenario to add. Be orthogonal to acceptance completeness — focus only on unhandled conditions, not whether the happy path matches the issue.

## Lens 3 — Architect (technical feasibility)

> You are the system architect. Judge whether each Gherkin step is technically feasible and correctly placed against THIS codebase. Read the relevant modules first. Flag: steps that assume data/endpoints/events that don't exist, scenarios that can't be reached through the real DDD layers (Domain → Application → Infrastructure → UI), assertions that would require leaking implementation details, and any behavior better tested at a different layer (e.g. a unit invariant masquerading as an E2E step). Recommend the correct test layer (unit vs integration vs E2E) for each scenario. Note any existing service/use-case/DI token the implementation should reuse rather than rebuild.

## Reconciliation rubric

1. Collect all findings. **Blockers and majors must be resolved** before Step 3; minors are judgment calls — apply or note why not.
2. Where lenses conflict (e.g. BA wants an E2E scenario the architect says belongs in a unit test), prefer the architect's **layer** recommendation but keep the BA's **outcome** as the assertion.
3. Deduplicate overlapping "missing scenario" suggestions.
4. Revise the `.feature` files, re-run `bun run gherkin:generate`.
5. If the revision changed the feature set materially, re-dispatch **only the affected lens** once to confirm closure. Do not loop the full panel more than twice.
