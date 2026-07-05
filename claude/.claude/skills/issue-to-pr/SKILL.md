---
name: issue-to-pr
description: End-to-end workflow that turns a single GitHub or beads issue into a merged-ready pull request using strict BDD+TDD discipline. Given an issue reference (a beads id like olhaminha.bio-xxx, or a GitHub issue number/#/URL), it writes Gherkin acceptance features for the happy path and edge cases, validates them with three parallel expert lenses (business-analyst, QA/edge-case, architect), writes failing unit/integration/E2E tests (red), implements the minimum code to make them pass (green), runs a visual check via /visual-app-verify, loops on any failure, then commits logically, pushes, verifies the push, opens a PR (confirming the base branch with the user), and hands off a summary with browser test steps. Use when the user says "solve this issue", "issue-to-pr", "take issue X to a PR", "implement issue #N", "resolve beads issue", or points at an issue and asks for a full TDD implementation-to-PR pass.
---

# issue-to-pr

Drive one issue from intake to an open PR without skipping the project's Red → Green → Refactor + Gherkin acceptance gates. Claude orchestrates; sub-agents do parallel validation.

## Non-negotiables (this repo)

Read `references/project-conventions.md` **before starting** — it holds the exact commands, URLs, credentials, and gotchas. The load-bearing ones:

- **Branch off `develop`, never commit to `develop`/`main`.** PRs target `develop` by default.
- **Behavior change ⇒ failing test FIRST.** Confirm it fails for the *right reason* before implementing. Tests-after is not acceptable.
- **Browser/E2E URL is `megazord.olhaminha.bio`, never `localhost:3000`.** Don't restart the user's dev server; ask them to.
- **Never `git add -A`** (sweeps the user's WIP). Stage named files only.
- **Never leak local filesystem paths** into commits/PRs/generated files.
- Runtime is **Bun**: `bun test`, `bun run typecheck`, `bun run gherkin:generate`.
- Generated Gherkin under `tests/features/_generated/**` **is committed**.

## Workflow

Track the run with beads: at intake create/claim the issue and set `in_progress`; at the end `bd sync`. Use a TodoWrite/Task list mirroring the steps below so progress is visible.

### Step 0 — Intake & branch

1. Resolve the issue reference from the invocation args:
   - Matches `olhaminha.bio-*` → beads: `bd show <id>`.
   - A bare number / `#N` / GitHub URL → `gh issue view <n> --comments`.
   - If ambiguous, ask which source.
2. Extract the **user-visible behavior**, acceptance criteria, and any constraints. If the issue is thin, investigate the cited code before proceeding (dispatch an `Explore` agent for anything more than a couple of files).
3. Ensure a beads issue tracks the work (create one referencing the GH issue if needed) and mark it `in_progress`.
4. Create the branch: `git checkout develop && git pull --ff-only && git checkout -b <type>/<kebab-slug>` (type ∈ feat|fix|hotfix|chore). Confirm you are **not** on `develop`/`main`.

### Step 1 — Gherkin features (happy path + edge cases)

1. Write `.feature` files under `tests/features/**` capturing:
   - the **happy path** scenario(s), and
   - **edge/error/permission** scenarios (invalid input, missing auth, boundary values, idempotency/retry, empty states).
2. Run `bun run gherkin:generate` to produce the committed generated artifacts.
3. If the behavior is genuinely not user-visible, record why (this substitutes for acceptance coverage in the handoff) and skip to Step 3.

### Step 2 — Three-lens validation (parallel)

Dispatch **three agents in a single message** (so they run concurrently), each with a distinct lens. Full prompts and the reconciliation rubric are in `references/gherkin-validation.md`:

- **Business Analyst** — acceptance completeness vs. the issue; missing scenarios, wrong outcomes, untestable "and/but" clauses.
- **QA / Edge-Case Hunter** — boundaries, error paths, concurrency, idempotency, data-shape gaps the features miss.
- **Architect** — technical feasibility of each step against the actual codebase (DDD layers, existing services, whether a step is even reachable).

Reconcile the findings, revise the `.feature` files, re-run `bun run gherkin:generate`. If revisions were substantial, re-run the affected lens once. Then proceed. (Base-branch-only checkpointing: **do not** pause for user approval here — decide and move on.)

### Step 3 — Red: failing tests (unit + integration + E2E)

Write tests **first**, matching the validated scenarios. Cover every new branch/error path/validator/permission (keep CRAP risk low):

- **Unit** — `bun test <path>`; mock at package boundaries (see cross-platform mocking gotchas in conventions).
- **Integration** — repository/service tests via the Mongo harness (`RUN_MONGO_TESTS=1 …`).
- **E2E** — Playwright against `megazord.olhaminha.bio` with the test credentials, for user-visible flows.

Run them and **confirm they fail for the right reason** (assertion failure, not import/compile/setup error). A red test that errors out is not a valid red. This is the mutation/sensitivity gate — prove the test detects the missing behavior.

### Step 4 — Green: implement the minimum

1. Implement the smallest change that satisfies the tests, respecting DDD layers (Domain → Application → Infrastructure → UI) and existing services/DI tokens.
2. Loop: run the failing tests until green, then run the **full** relevant suites + `bun run typecheck` + lint. All must pass.
3. Refactor for clarity while keeping green.

### Step 5 — Visual verification

Invoke the **`/visual-app-verify`** skill against `megazord.olhaminha.bio` (not localhost) to confirm the change renders and behaves correctly in the running app. Capture what was checked.

### Step 6 — Loop on failure

If any gate fails — validation surfaces a real gap, a red test can't be made to fail correctly, green is unreachable, or the visual check reveals a defect — **return to the earliest affected step** and repeat. Use `superpowers:systematic-debugging` for stubborn failures rather than guessing. Bound the loop: after ~3 unproductive cycles on the same gate, stop and surface the blocker to the user with what you tried.

### Step 7 — Commit, push, PR

1. Stage **named files** (never `git add -A`). Make logically-grouped commits (e.g. features+generated, tests, implementation) with clear messages. `bd sync` to persist beads state.
2. Push the branch. **Verify the push landed** with `git ls-remote origin <branch>` (a backgrounded push can exit 0 without pushing).
3. **Confirm the PR base branch with the user** — default `develop`; ask before targeting anything else. This is the one required checkpoint.
4. Open the PR with `gh pr create --base <confirmed> --head <branch>`. Body: what/why, linked issue (`Closes #N`), test evidence. No local paths.

### Step 8 — Handoff summary

Report, per the project's mandatory handoff format:

- **Red**: the command + the failure it produced.
- **Green**: the command + the passing result.
- **Acceptance coverage**: the `.feature` scenarios (or the N/A reason from Step 1).
- **CRAP-risk mitigation**: which new branches/error paths got direct tests.
- **PR link** and the **beads/GH issue** closed.
- **Browser test steps for the user**: exact URL (`megazord.olhaminha.bio/...`), login (`test@e2e.example.com` / `test-password-dev-123` if applicable), and the click-path to observe the new behavior.

Then run the session-close protocol (git status → staged → `bd sync` → committed → pushed).

## References

- `references/project-conventions.md` — exact commands, URLs, credentials, branch/test/CI gotchas. Read at Step 0.
- `references/gherkin-validation.md` — the three validator agent prompts + reconciliation rubric. Read at Step 2.
