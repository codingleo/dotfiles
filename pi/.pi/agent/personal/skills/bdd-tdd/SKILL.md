---
name: bdd-tdd
description: >
  Cross-project BDD → TDD workflow for Pi: Example Mapping, Gherkin/acceptance
  scenarios, red-green-refactor, mutation checks, and handoff evidence. Use when
  the user wants behavior-driven or test-driven development, Example Maps,
  Gherkin, failing tests first, or /skill:bdd-tdd. Pairs with the bdd-mode
  extension (/bdd, bdd_* tools).
---

# BDD → TDD (cross-project)

This skill is **project-agnostic**. It uses the **bdd-mode** Pi extension for hard
gates and discovers each repo’s runners via `.pi/bdd.json` or `package.json` scripts.

**Operator cheatsheet (read anytime):**
`docs/bdd-fleet-cheatsheet.md` (next to this package) — phases, why green/verify need red, fleet gates, troubleshooting.

Roadmap / design locks: `docs/agentic-bdd-roadmap.md`.

## When to load

- User asks for BDD, TDD, Example Map, Gherkin, red-green-refactor, or acceptance tests
- Implementing a behavior-changing story/bugfix
- `/example-map`, `/formulate`, `/tdd`, `/green`, `/handoff` prompts

## Non-negotiables

1. **Discovery before formulation** — Example Map (Rules / Examples / Questions) before scenarios or production code when the change is behavior-shaped.
2. **Formulation before implementation** — acceptance scenarios and/or unit tests exist first.
3. **Red before green** — prove failure with `bdd_assert_red` before `/bdd green` or any implementation. The machine **blocks** `green` and `verify` until red evidence exists.
4. **Green minimum** — smallest change that passes; `bdd_assert_green` must **cover** the red command (`strictGreenCoversRed` default on).
5. **Handoff evidence** — red command/reason, green command/result, acceptance path or N/A + reason, mutation note when acceptance changed, CRAP notes for new branches.

## Extension API (use these tools)

| Tool / command | Purpose |
|---|---|
| `/bdd status` / `bdd_status` | Phase, config, evidence |
| `/bdd init` | Write `.pi/bdd.json` template for this repo |
| `/bdd discovery\|formulation\|red\|green\|refactor\|verify` | Set phase |
| `/bdd bypass <reason>` | Emergency path-gate skip (logged) |
| `bdd_set_phase` | Same as phase commands from the model |
| `bdd_assert_red` | Run tests; **must fail**; store evidence |
| `bdd_assert_green` | Run tests; **must pass**; store evidence |
| `bdd_assert_mutation` | Optional failCmd→passCmd mutation (parent edits) |
| `bdd_record_evidence` | Example Map, acceptance, mutation, CRAP, fleet synthesis |
| `bdd_handoff` | Completeness checklist; `asPr` / `/bdd handoff pr` for PR body |
| `agentic_doctor` | `/agentic doctor` — config/auth/RPC diagnostics |
| skill `ship` | Full discovery→verify fleet→handoff recipe |

Path gates block `edit`/`write` by phase (e.g. no `src/**` in red).

## Phase playbook

### 0. Project bootstrap (once per repo)

```text
/bdd init          # creates .pi/bdd.json from inferred package scripts
# edit patterns/commands if the defaults are wrong
/bdd on            # or /bdd discovery
```

Config search order: `.pi/bdd.json` → `bdd.json` → `.bdd-tdd.json` → infer from `package.json`.

### 1. Discovery

- Identify actor + goal + behavior change.
- Write **Rules (R#)**, **Examples (R#-E#)**, **Questions (Q#)**.
- Prefer the tracking issue body; else `docs/bdd/` or a short markdown note.
- `bdd_record_evidence` with `exampleMapRef`, rule/example counts.
- `/bdd formulation` when examples are concrete.

Skip a formal map only for tiny pure-tech fixes; still record acceptance N/A reason later.

### 2. Formulation

- Turn examples into acceptance scenarios (Gherkin `.feature` if the project uses it).
- Follow **project-local** conventions when present (`docs/bdd/gherkin-conventions.md`, `tests/features/**`, etc.).
- If no Gherkin harness: write clear acceptance tests in the project’s E2E/unit style and tag them to the example ids in comments.
- Add unit/integration tests that will fail for the right reason.
- Do **not** implement production behavior yet.
- `/bdd red`

### 3. Red

- Finish failing tests.
- `bdd_assert_red` with focused command (use `append` for a file path).
- Confirm the failure message matches the intended missing behavior (not compile noise from unrelated breakage).
- `/bdd green` only after red evidence is stored.

### 4. Green

- Implement **minimum** production code.
- `bdd_assert_green` on the same focus (then broader suite if needed).
- Run acceptance command from config when user-visible (`acceptanceTest` in bdd.json).

### 5. Refactor (optional)

- `/bdd refactor` — structure only; re-assert green if risky.

### 6. Verify + handoff

- `/bdd verify`
- Mutation/sensitivity: briefly break the new behavior or remove the assertion, show fail, restore; `bdd_record_evidence` mutationProven=true.
- `bdd_handoff` — fix any missing fields before claiming done.

## Handoff template (must fill)

```markdown
## BDD/TDD Handoff Evidence
- Focus: …
- Example Map: … (R#/E#/Q#)
- Red: `command` → exit N — reason
- Green: `command` → exit 0 — result
- Acceptance: path | N/A — reason
- Mutation: proven | n/a — note
- CRAP: branches/errors/permissions covered or simplified
```

## Project adapters (learn once per repo)

At session start, quickly detect:

| Signal | Adapter |
|---|---|
| `gherkin:test` / `tests/features/**/*.feature` | Gherkin acceptance; run generate/check if scripts exist |
| `playwright` / `e2e/` | Map scenarios to e2e specs; name specs after examples |
| `bun:test` / `vitest` / `jest` | Unit runner from package.json |
| `docs/bdd/example-mapping.md` | Prefer that Example Map format |
| Issue tracker + “Example Map” section | Keep map on the issue |

Never invent a second test stack. **Wrap what the repo already runs.**

## Anti-patterns

- Implementing first, then adding tests (“tests after”)
- Green assert without a prior failing red assert
- Broadening scope mid-green
- Acceptance N/A without reason
- Using `/bdd bypass` to avoid writing tests
- Ignoring project Gherkin tag/layout rules when they exist

## Related prompts

- `/example-map` — start discovery
- `/formulate` — scenarios from the map
- `/tdd` — enter red with focus
- `/green` — minimum implementation
- `/handoff` — evidence block

## Optional reading in-repo

Load only if present:

- `docs/bdd/example-mapping.md`
- `docs/bdd/gherkin-conventions.md`
- `AGENTS.md` testing section
- `.pi/bdd.json`
