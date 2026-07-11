# Project Conventions — Discovery Checklist

This skill is **app-agnostic**. Do **not** assume Bun, Mongo, DDD, beads, or a particular product. At **Step 0**, discover how *this* repository works and treat those findings as the session conventions. Prefer project files over guesses; if something critical is missing, ask the user once.

## 1. Load project guidance (in order)

1. Root / package agent files: `AGENTS.md`, `Claude.md`, `CLAUDE.md`, `.cursorrules`, `CONTRIBUTING.md`, `README.md`.
2. Nested conventions if the issue lives under a package/app (monorepo).
3. Testing / BDD docs if present: `docs/bdd/**`, `docs/testing/**`, `**/*testing*SKILL*`, `tests/README*`.
4. Product / audience docs if present: `docs/**`, product brief, support knowledge, marketing site copy — only as needed for discovery agents.
5. CI config (`.github/workflows/**`, etc.) for the real check commands.

Repo-local skills (e.g. `.agents/skills/`, `.grok/skills/`) that describe testing or visual verify **override** generic defaults below.

## 2. Build a session conventions card

Fill this (omit rows that do not apply):

| Slot | How to discover |
|---|---|
| **Package manager / runtime** | lockfile + scripts: `package.json` / `bun.lock*` / `pnpm-lock.yaml` / `Cargo.toml` / `go.mod` / `pyproject.toml` / `Makefile` |
| **Unit test command** | `test` / `test:unit` scripts, or language defaults (`bun test`, `npm test`, `pytest`, `go test`, …) |
| **Integration / E2E command** | scripts named integration, e2e, playwright, cypress, detox |
| **Typecheck / lint** | `typecheck`, `lint`, `check` scripts or CI steps |
| **Gherkin / acceptance** | presence of `*.feature`, `gherkin:*` scripts, Cucumber, Behave, SpecFlow — path layout from project docs |
| **Default base branch** | `git remote show origin` / GH default branch; common: `main` or `develop` |
| **Branch name pattern** | CONTRIBUTING / recent branches |
| **Issue tracker** | beads (`bd`), GitHub Issues, Linear, Jira — use what the user invoked |
| **Browser / E2E base URL** | Playwright/Cypress config, env samples (`.env.example`), project skills — **never invent a tunnel host** |
| **Test credentials** | documented E2E users only; never hardcode secrets from memory |
| **Architecture style** | DDD layers, MVC, clean arch, simple app — from docs/code, not assumed |
| **Ubiquitous language** | domain glossary in docs/BDD; else extract from issue + code names |

Cache this card for the rest of the run. Re-read package scripts if a command fails.

## 3. Universal non-negotiables (always)

These apply in **every** repo unless the user explicitly overrides:

- **Behavior change ⇒ failing test first.** Confirm failure for the *right reason* (assertion, not import/setup error) before implementing.
- **Never `git add -A` / `git add .`** — stage named paths only (avoids sweeping unrelated WIP).
- **Never write absolute local filesystem paths** into commits, PR bodies, or generated fixtures. Use repo-relative paths.
- **Never commit to the default protected branch** (`main` / `master` / `develop` as configured). Branch first.
- **After push, verify it landed** (`git ls-remote origin <branch>` or `gh` view) — backgrounded pushes can exit 0 without uploading.
- **Confirm PR base branch with the user** before `gh pr create` (default = repo default branch).
- **Do not kill/restart the user's long-running dev servers** without asking.
- **Do not invent product decisions** when the issue is silent — ask or file a follow-up.

## 4. Conditional practices (only if the project uses them)

| Practice | When to apply |
|---|---|
| Gherkin under `tests/features/**` + `gherkin:generate` | Scripts/docs say so; generated paths may be committed — follow the repo |
| Mutation / sensitivity check on new acceptance tests | Project quality gates require it |
| Beads (`bd show` / `bd sync`) | `bd` is available and issues use that id scheme |
| CRAP-risk: direct tests for new branches/error/permission paths | Project testing rules mention it, or complexity warrants it |
| Visual verify skill / tunnel URL | Project has a visual-app-verify (or similar) skill and documents a base URL |
| Cross-platform mock gotchas | Runtime is Bun (or project docs call them out) |

If the project has **no** Gherkin/Cucumber stack, still write acceptance as the repo prefers (Jest/Playwright describe blocks, pytest BDD, etc.) or document N/A for non-user-visible work.

## 5. Issue resolution patterns

| Input shape | Resolve with |
|---|---|
| Tracker prefix id (e.g. `project-abc`, beads-style) | Project tracker CLI if present (`bd show`), else ask |
| `#N` / bare number / GitHub URL | `gh issue view <n> --comments` |
| Linear/Jira key | That tracker’s CLI or MCP; else ask |
| Ambiguous | Ask which source |

## 6. Session-close protocol

Before declaring done: `git status` → stage **named** files → tracker sync if used → commit → push → **verify push** → PR (after base confirmation). Work is not done until pushed (unless the user asked to stop earlier).
