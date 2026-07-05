# Project Conventions (lookmybio.com / repo: olhaminha.bio)

Exact commands, URLs, and gotchas. Verify a command still exists (`package.json` scripts) if one errors — this file mirrors the repo but the repo wins.

## Runtime & commands

Runtime is **Bun** (not npm/yarn).

| Purpose | Command |
|---|---|
| Gherkin generate (committed artifacts) | `bun run gherkin:generate` |
| Unit + all suites | `bun test <path>` |
| Integration only | `bun run test:integration` (preloads Mongo harness) |
| E2E / Playwright | `bun run test:playwright` (or `:headed`, `:ui`, `:debug`) |
| Typecheck | `bun run typecheck` (`tsc --build`) |
| Lint | `bun run lint` (biome) |

Integration tests need Mongo — some are gated behind `RUN_MONGO_TESTS`; standalone Mongo has no transactions. If a repo test silently passes without connecting, check the harness is actually initializing the DB.

## Issue sources

- Beads: `bd show <id>`, claim with `bd update <id> --status=in_progress`, persist with `bd sync`.
- GitHub: `gh issue view <n> --comments`, close via PR body `Closes #<n>`.
- Labels worth applying to a new tracking issue: `bug`, `payments`, `backend`, `socials`, `ai`, `testing`.

## Git / branch / PR

- **All work branches off `develop`; PRs target `develop`.** `main` only receives merges from `develop` via staging. Never commit directly to `develop`/`main`.
- Branch name: `<feat|fix|hotfix|chore>/<kebab-slug>`.
- **Never `git add -A`** — it sweeps the user's uncommitted WIP into your commit. Stage named files.
- After push, **verify it landed**: `git ls-remote origin <branch>` — a backgrounded push with a verbose pre-push hook can exit 0 without pushing.
- **Never write local filesystem paths** (`/Users/...`) into commits, PR bodies, or generated files. Use repo-relative paths.
- PR: `gh pr create --base develop --head <branch>` (confirm base with the user first).

## Local environment (browser / E2E)

- **Base URL is `megazord.olhaminha.bio`** (a tunnel) — **never `localhost:3000`**. If the tunnel is down, wait and retry.
- Test credentials (skip Google OAuth): `test@e2e.example.com` / `test-password-dev-123`.
- **Do not kill/restart the user's dev server** — they run it behind the tunnel. If a restart is needed, ask them.
- Turbopack can serve stale SSR after editing client components; the fix (kill server + `rm -rf apps/web/.next` + restart) is the **user's** to run — ask.

## Testing rules (CLAUDE.md gates)

- Behavior change ⇒ **failing test first**, confirmed failing for the right reason (assertion, not import/setup error), before implementing.
- User-visible behavior ⇒ Gherkin acceptance in `tests/features/**` unless there's a stated N/A reason. New/changed features need a **mutation/sensitivity check** (prove the scenario fails against missing/wrong behavior).
- Keep **CRAP risk** low: every new branch, error path, permission check, validator boundary, queue/retry state needs a direct test — or simplify the code.
- `tests/features/_generated/**` **is committed** (regression/PR-review artifact), not gitignored.

## Cross-platform test gotchas (Bun: Linux CI vs macOS)

- `mock.module` with `@/` aliases **fails silently on Linux Bun** — mock never applies. Mock package names, or mock in `test-setup.ts` preload.
- `globalThis` and module-level vars are **not shared across modules** on Linux Bun.
- For mocking a browser API inside a React hook under `renderHook` on Linux Bun — use **E2E instead**, unit mocking won't hold.
- `bun install --frozen-lockfile` fails CI on lockfile drift unrelated to your change; if CI dies at install, run `bun install` and commit the `bun.lock` diff.

## Session-close protocol

Before declaring done: `git status` → stage named files → `bd sync` → commit → `bd sync` → push → verify push landed. Work isn't done until pushed.

## Architecture quick facts

- DDD layers: **Domain → Application → Infrastructure → UI**. Workers (`apps/workers/`) **cannot import from `apps/web/`** (compile-time + CI enforced). Use constructor `@inject` via DI tokens, never `container.resolve()`.
- Shared services live in `packages/services`; domain in `packages/domain` (`@olhaminha/domain`); shared DI tokens in `packages/di-tokens` (`@olhaminha/di-tokens`).
