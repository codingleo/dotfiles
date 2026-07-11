---
name: issue-to-pr
description: >
  End-to-end, app-agnostic workflow that turns a single tracker issue (GitHub, beads,
  or similar) into a merge-ready pull request using strict BDD+TDD discipline. Discovers
  the current repo’s conventions, runs a product-grounded Gherkin/acceptance discovery
  pipeline (parallel sub-agents for target users/personas, real feature workflows, and
  web UX-affordance research), generates acceptance features from that synthesis, validates
  them with three expert lenses (business-analyst, QA/edge-case, architect), writes failing
  tests (red), implements the minimum to pass (green), optionally runs project visual
  verification, loops on failure, then commits logically, pushes, verifies the push, opens
  a PR (confirming the base branch with the user), and hands off a summary with manual
  test steps. Use when the user says "solve this issue", "issue-to-pr", "take issue X to a
  PR", "implement issue #N", "resolve beads issue", or points at an issue and asks for a
  full TDD implementation-to-PR pass.
---

# issue-to-pr

Drive one issue from intake to an open PR without skipping Red → Green → Refactor and acceptance gates. Works in **any** application repository: discover stack, product, and conventions first; never assume a specific product, runtime, or architecture.

Orchestrator coordinates; sub-agents run parallel discovery and validation.

## Non-negotiables

Read `references/project-conventions.md` at **Step 0** and build a **session conventions card** from *this* repo. Universal rules (always):

- **Behavior change ⇒ failing test FIRST.** Confirm it fails for the *right reason* before implementing.
- **Never `git add -A` / `git add .`** — stage named paths only.
- **Never leak absolute local filesystem paths** into commits/PRs/generated files.
- **Never commit on the protected default branch** — branch first; PRs target the repo default (confirm with user).
- **After push, verify it landed.**
- **Do not invent product decisions** the issue leaves open — ask or file a follow-up.
- Runtime, test commands, E2E URL, Gherkin paths, architecture, and credentials come from the **discovered** conventions card — not from memory of another app.

## Workflow

Track progress with a TodoWrite/Task list mirroring the steps below. If the project uses a local tracker (e.g. beads), claim/sync issues with that tool; otherwise use GitHub (or whatever the user pointed at).

### Step 0 — Intake, conventions & branch

1. **Discover project conventions** per `references/project-conventions.md` (package manager, test/lint commands, base branch, acceptance layout, E2E base URL, architecture, ubiquitous language sources). Write the session conventions card and keep it for every later step.
2. Resolve the issue reference from the invocation args (tracker id, `#N`, URL). If ambiguous, ask which source. Load full issue text + comments + any Example Map.
3. Extract the **user-visible behavior**, acceptance criteria, and constraints. If the issue is thin, investigate cited code (Explore agent for anything more than a couple of files).
4. Ensure tracking is `in_progress` when the project’s tracker supports it.
5. Create a work branch from the **discovered** default/base branch (`git pull --ff-only`, then `git checkout -b <type>/<kebab-slug>` with the project’s naming pattern). Confirm you are **not** on a protected branch.

### Step 1 — Discovery → acceptance generation

Do **not** jump straight to writing feature files, and do **not** use generic “write some Gherkin” agents. Ground scenarios in **this product’s** users, real journeys, and researched UX patterns.

If the behavior is genuinely **not** user-visible, record why (substitutes for acceptance coverage in the handoff) and skip to Step 3.

Otherwise follow `references/gherkin-generation.md` end-to-end:

1. **Dispatch three discovery sub-agents in a single message** (concurrent). Shared inputs must include the **discovered product brief + audience clues** from Step 0 (not a hard-coded product). Full prompts live in the reference:
   - **Target Users** — personas who care about this issue for *this* app; JTBD, pain points, success signals, anti-personas / permission gates.
   - **Workflows** — actual end-to-end journeys (entry → success, preconditions, empty/first-run, roles, plan gates, failure + recovery, cross-surface impacts). Scenario seeds in product language.
   - **UX Affordance Research** — web research on comparable products for this interaction class *and product category*; affordances to adopt/adapt/reject (with sources), a11y, explicit out-of-scope.
2. **Reconcile** into an Example Map (Rules / Examples / Questions), extending any map already on the issue. Blocking red questions → ask the user or file a follow-up; do not invent.
3. **Generate all acceptance files** where this repo expects them (Gherkin `*.feature` and/or the project’s preferred form) — happy path **and** edge/error/permission/empty/recovery justified by discovery. Follow project BDD/conventions docs when present.
4. Run the project’s acceptance generate/compile command **if it exists**.
5. Keep the Example Map + discovery notes for Step 2 and the handoff.

Quality bar: see `references/gherkin-generation.md`.

### Step 2 — Three-lens validation (parallel)

After features exist, dispatch **three validation agents in one message** (concurrent). Prompts + rubric: `references/gherkin-validation.md`. Feed issue, features, Example Map, and relevant source paths:

- **Business Analyst** — completeness vs issue + map; observable outcomes.
- **QA / Edge-Case Hunter** — boundaries, errors, concurrency, idempotency.
- **Architect** — feasibility and correct test layer **in this codebase**.

Reconcile, revise features, re-run generate/compile if applicable. Substantial revisions → re-run only the affected lens once. Do **not** pause for user approval here unless a product decision is blocked.

### Step 3 — Red: failing tests

Write tests **first**, matching validated scenarios. Prefer the project’s layout (unit / integration / E2E). Cover new branches, error paths, validators, and permissions when complexity warrants (or when project gates require it).

Run them with the **discovered** test commands and **confirm failure for the right reason** (assertion, not import/compile/setup). That is the mutation/sensitivity gate.

### Step 4 — Green: implement the minimum

1. Smallest change that satisfies the tests, matching **this** repo’s architecture and existing modules/services.
2. Loop until green, then run the full relevant suites + typecheck + lint from the conventions card.
3. Refactor for clarity while staying green.

### Step 5 — Visual verification (if applicable)

If the project documents a browser base URL and/or a visual-verify skill (e.g. `/visual-app-verify`), run it against that URL — never invent a host. If there is no UI surface or no local preview path, record N/A.

### Step 6 — Loop on failure

On any gate failure, return to the earliest affected step. Prefer systematic debugging over guessing. After ~3 unproductive cycles on the same gate, stop and surface the blocker with what you tried.

### Step 7 — Commit, push, PR

1. Stage **named files** only. Logically grouped commits. Sync tracker if used.
2. Push; **verify** with `git ls-remote` (or equivalent).
3. **Confirm PR base branch with the user** (default = discovered default branch).
4. Open the PR (`gh pr create` or project equivalent). Body: what/why, linked issue, test evidence. No local paths.

### Step 8 — Handoff summary

- **Red**: command + failure.
- **Green**: command + pass.
- **Acceptance coverage**: scenarios (or N/A reason) + one-liner on discovery lenses (personas / workflows / UX affordances adopted).
- **Risk mitigation**: which new branches/error paths got direct tests.
- **PR link** + issue closed/linked.
- **Manual test steps**: exact URL (from conventions), credentials **only if documented for E2E**, and the click-path / API path to observe the behavior.

Session-close: status → named stage → tracker sync → commit → push → verify.

## References

- `references/project-conventions.md` — how to discover stack, commands, URLs, and universal git/TDD rules. Read at Step 0.
- `references/gherkin-generation.md` — Target Users / Workflows / UX Affordance Research prompts + quality bar. Read at Step 1.
- `references/gherkin-validation.md` — BA / QA / Architect validation prompts + reconciliation. Read at Step 2.
