# Discovery → Gherkin Generation

Replace "just write a feature file" with a **product-grounded** discovery pipeline. Dispatch the **three discovery agents in one message** so they run concurrently, then synthesize and write acceptance features.

These agents produce **inputs** for formulation. They do **not** write feature files themselves — the orchestrator (or a dedicated generator pass) does that after reconciliation.

This skill is **app-agnostic**. Every prompt must be grounded in the **current repository’s** product, audience, and stack (from the Step 0 conventions card), not a hard-coded product.

## Shared inputs to paste into every discovery agent

Build these from the open repo before dispatching:

- The issue text (tracker CLI / `gh issue view`) including acceptance criteria, Example Map (if any), and comments.
- **Product brief (discovered)** — 3–8 bullets: what the product is, primary value prop, major surfaces (web/mobile/API/admin). Sources: README, marketing/docs, app routes, package names. Do **not** invent a product category.
- **Audience clues (discovered)** — who the README/docs/pricing/onboarding copy addresses. If thin, say so and let the Target Users agent infer carefully from the issue + UI.
- **Ubiquitous language seed** — glossary from project BDD/docs if present; otherwise key domain nouns from the issue and code (entities, roles, statuses). Instruct agents to **respect** existing terms and flag collisions.
- Relevant product surfaces/paths the issue likely touches (routes, screens, APIs) if known.
- Feature-file / acceptance conventions from the project (paths, tags, harness names) — or “none; use project’s preferred acceptance format.”
- Instruction: return **structured, actionable** output only — no prose approval, no implementation design.

## Lens A — Target Users (who cares, and why)

> You are a product researcher. Ground everything in **this product’s real audience** (see product brief + audience clues) — not generic “users,” and not an unrelated app.
>
> Infer audience families from the product brief, docs, roles in the codebase (e.g. admin vs member vs public visitor), and the issue. Typical families to *consider when evidence supports them* (drop all that do not apply):
> - End customers / consumers of the core product
> - Power users or operators who use advanced workflows
> - Team / multi-seat collaborators with distinct roles
> - Admins or org owners (billing, permissions, settings)
> - Public or unauthenticated visitors (if the feature is outward-facing)
> - Internal operators (support, ops) only if the issue touches internal tools
>
> For **this issue only**, return:
> 1. `primary_personas[]` — 1–3 personas who benefit most: `{ name, role, goal, skill_level, plan_or_access_context, why_this_feature_matters }`
> 2. `secondary_personas[]` — who is affected but not the main actor
> 3. `jobs_to_be_done[]` — concrete JTBD: "When … I want to … so I can …"
> 4. `pain_points[]` — what breaks or frustrates them today without this behavior
> 5. `success_signals[]` — **observable** outcomes each persona would notice (UI copy, state change, email, public page, API response contract) — never implementation details
> 6. `anti_personas[]` — who should **not** be able to do this (permissions, plan gates, roles)
> 7. `open_questions[]` — persona assumptions the issue does not answer
>
> Do **not** invent product claims that contradict the issue or the discovered brief. Prefer project docs when vocabulary is needed.

## Lens B — Workflows (real journeys around this feature)

> You are a UX workflow analyst. Map the **actual end-to-end journeys** a user of **this product** takes around the behavior in this issue — not isolated button clicks, and not journeys from another product.
>
> Read the issue and, when paths are named, skim the relevant UI routes/screens/APIs so journeys match the codebase.
>
> Return:
> 1. `primary_flow` — the happy-path journey as ordered steps:
>    `{ actor, entry_point, steps[{ action, system_response, data_needed }], success_end_state }`
> 2. `setup_preconditions` — what must already be true (auth, selected context/tenant/workspace, plan tier, connected integrations, existing data)
> 3. `adjacent_flows[]` — journeys that **touch** this feature (before: onboarding/setup; after: share, notify, report; recovery: undo, retry, restore)
> 4. `branch_flows[]` — meaningful alternatives: first-time vs returning, empty vs populated, single vs multi-context, role A vs role B, free vs paid gate (only if the product has those)
> 5. `failure_flows[]` — realistic failure journeys with **user-visible** recovery: validation errors, permission denied, expired auth/integration, network/provider failure, concurrent edit
> 6. `cross_surface_impacts[]` — other surfaces that must stay consistent (list vs detail, public vs authenticated, mobile vs web, worker/async status)
> 7. `scenario_seeds[]` — for each flow worth testing, a miniature Given/When/Then in **this product’s** language (not final feature-file format yet), tagged `happy | edge | permission | empty | recovery`
>
> Prefer fewer, high-signal journeys over exhaustive click trees. Every seed must name an **observable** outcome.

## Lens C — UX Affordance Research (what to replicate)

> You are a UX researcher. Find **proven affordances** in comparable products that we should consider when specifying acceptance behavior for this issue.
>
> Process:
> 1. Infer the **interaction class** from the issue (e.g. soft-delete/archive, scheduling, multi-select, checkout/credits, empty state, permission gate, async job progress, OAuth connect, search/filter, onboarding).
> 2. Infer the **product category** from the brief (e.g. B2B SaaS admin, consumer social, fintech, creator tools, devtools) and search the web for how **strong products in that category** (and general UX leaders for the interaction class) handle it.
> 3. Prefer primary product docs, public help centers, and well-known design systems over random blog spam.
> 4. Extract **affordances**, not full clone specs.
>
> Return:
> 1. `interaction_class` — one-line label
> 2. `product_category` — as inferred from this repo
> 3. `comparables[]` — `{ product, surface_url_or_doc, pattern_observed, why_relevant }` (3–6 max)
> 4. `affordances_to_consider[]` — each:
>    `{ name, description, user_visible_behavior, source_product, adopt|adapt|reject, rationale, scenario_seed? }`
> 5. `anti_patterns[]` — common UX mistakes for this interaction class to explicitly avoid in scenarios
> 6. `accessibility_affordances[]` — focus, labels, error association, disabled-vs-hidden, confirm destructive actions
> 7. `out_of_scope` — patterns that are nice but **not** justified by this issue (do not expand scope)
>
> Rules:
> - Cite sources (URL or product+feature name). No invented "studies".
> - Prefer behaviors we can assert in acceptance tests (visible text, enabled/disabled control, navigation, list membership, URL/state, API-visible outcome) over pure aesthetics.
> - If research conflicts with an explicit issue decision, the **issue wins** — note the conflict, do not override.

## Reconciliation → Example Map → features

After all three lenses return:

1. **Merge** into a working Example Map (even if the issue already has one — extend it, don't discard):
   - **Rules** from issue AC + persona anti-cases + plan/permission gates + critical affordances marked `adopt`.
   - **Examples** from workflow `scenario_seeds` + persona success/failure signals + affordance scenario seeds.
   - **Questions** — only keep unresolved ones; if a red question blocks formulation, stop and ask the user (or file a tracker item) rather than inventing.
2. **Collapse** equivalent examples into Scenario Outline / table-driven rows when the project supports them (one row per equivalence class; avoid combinatorial explosion).
3. **Layer hint** each scenario when the project has harness tags or test-layer conventions (unit vs integration vs E2E / use-case / domain). Default to the project’s documented default.
4. **Write** acceptance files where **this repo** expects them:
   - If Gherkin: follow project conventions (often `tests/features/<domain>/<name>.feature` or similar). Scenario titles name behavior + outcome, not implementation. `Then` steps assert **observable** outcomes. Trace `R1-E2`-style IDs when useful.
   - If no Gherkin: write the project’s preferred acceptance form (Playwright specs, pytest-bdd, Request specs, etc.) with the same scenario intent.
5. Run the project’s generate/compile step for acceptance artifacts **if it exists** (e.g. `gherkin:generate`); otherwise skip.
6. Hand the written features + the reconciled Example Map to **Step 2** (validation in `gherkin-validation.md`).

## Quality bar before leaving Step 1

- [ ] At least one happy-path scenario per primary persona JTBD
- [ ] At least one permission / anti-persona denial if the feature is gated
- [ ] Empty / first-run path if the feature has a zero-state
- [ ] At least one realistic failure + recovery path when the issue implies external deps (auth providers, payments, third-party APIs, async jobs)
- [ ] No scenario asserts pure implementation details (function names, DB columns, DI tokens, private types)
- [ ] Affordances marked `reject` or `out_of_scope` did **not** sneak into features
- [ ] Ubiquitous language from **this** product is respected
