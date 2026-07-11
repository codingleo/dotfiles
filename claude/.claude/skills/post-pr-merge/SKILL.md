---
name: post-pr-merge
description: >
  Post-PR-merged cleanup: stop feature-related local servers/processes, check out
  the PR base branch, pull latest, then remove stale local branches, worktrees,
  stashes, and throwaway artifacts. Use when the user says "post PR merge",
  "PR was merged", "cleanup after merge", "clean branches and worktrees",
  "back to develop and clean up", "reset workspace after merge", "post-merge
  cleanup", or runs /post-pr-merge. After a successful merge (or when they want
  the same cleanup without a PR number).
---

# Post-PR-Merge Cleanup

Return the local workspace to a clean base branch after a PR is merged (or when
the user wants the same reset). Run the steps in order. Prefer evidence over
assumptions: inspect state before deleting anything.

## Goals

1. Stop processes started for the feature work (dev server, tunnels, browser
   automation, worktree installs) — not the whole machine.
2. Check out the **base branch** (usually `develop`).
3. Pull latest from origin.
4. Remove stale **local** branches, worktrees, optional stashes, and throwaway
   untracked files from the feature session.

## Non-negotiables

- **Never** force-push, amend published history, or delete **remote** branches
  unless the user explicitly asks (remotes are often already deleted on merge).
- **Never** delete protected local branches: `develop`, `main`, `master`,
  `staging`, or the detected base branch.
- **Never** `rm -rf` a worktree path without `git worktree remove` first (or
  `git worktree remove --force` if dirty and the user wants a hard clean).
- Do **not** kill Docker Desktop, Mongo, Redis, or unrelated user processes.
  Only target processes clearly tied to this repo / feature session.
- Discard uncommitted work only when it is clearly throwaway (screenshots,
  `tmp/`, beads local noise) **or** the user asked for a hard clean. If
  uncommitted product code looks real, stash or ask before wiping.
- Confirm with the user before deleting a local branch that is **not** merged
  into the base and still has unique commits.

## Inputs (optional)

Resolve from the invocation when present:

| Input | How to use |
|-------|------------|
| PR number / URL | `gh pr view <n> --json baseRefName,headRefName,state,mergedAt` |
| Base branch name | Override default (`develop` if it exists, else `main`) |
| Feature branch name | Prefer for process/worktree matching |

If no PR is given, infer from current branch, recent conversation, or
`git branch --show-current` before switching.

## Workflow

### 0. Snapshot state

Run from the **main** repo root (not inside a nested worktree if avoidable):

```bash
git rev-parse --show-toplevel
git status -sb
git branch -vv
git worktree list
git stash list
git remote -v
```

If a PR number is known:

```bash
gh pr view <n> --json number,title,state,mergedAt,baseRefName,headRefName,url
```

Record:

- `BASE` = PR `baseRefName`, else `develop` if present, else `main`
- `FEATURE` = PR `headRefName` or current feature branch
- Paths of any extra worktrees (especially under `.claude/worktrees/`,
  `.grok/worktrees/`, `../worktrees/`)

If the PR is **not** merged and the user thought it was, stop and report —
do not treat open PR cleanup the same as post-merge unless they insist.

### 1. Kill feature-related processes

Stop only what this session / feature likely started. Prefer graceful signals.

**Discover (adapt patterns to the repo):**

```bash
# Repo-scoped candidates (paths containing the repo root are safest)
REPO="$(git rev-parse --show-toplevel)"
pgrep -fl "next dev|next-server|vite|webpack-dev-server" || true
pgrep -fl "cloudflared tunnel|megazord" || true
pgrep -fl "playwright|dev-browser|agent-browser" || true
pgrep -fl "bun.*(dev|test|storybook)|node.*$REPO" || true
lsof -nP -iTCP:3000 -sTCP:LISTEN 2>/dev/null || true
lsof -nP -iTCP:3001 -sTCP:LISTEN 2>/dev/null || true
```

**Kill rules:**

| Target | Action |
|--------|--------|
| `next dev` / app dev server for **this** repo | `kill` then `kill -9` if needed |
| Storybook / vitest watch for this repo | same |
| `dev-browser` / Playwright / agent-browser left from visual QA | kill those PIDs |
| Tunnel **only if** this skill (or the user) started it for the feature and no other work needs it | kill tunnel PID; if unsure, **leave it running** and say so |
| Docker mongo/redis / Docker Desktop | **leave alone** |
| IDE, system agents, unrelated terminals | **leave alone** |

If a process is ambiguous (shared port, unclear cwd), list it and skip rather
than killing blindly.

Optional: if the repo has a known stop script (`bun run stop`, `make stop`),
prefer that.

### 2. Clean the working tree enough to switch branches

```bash
git status
```

- **Tracked junk** (e.g. local-only `.beads/metadata.json` noise): `git restore -- <paths>` when safe.
- **Untracked throwaways**: screenshots (`*.png` from visual QA), `tmp/`, `.playwright-mcp/`, local debug dumps — remove with explicit paths or `git clean -fd -- <paths>`. Prefer path-scoped clean over `git clean -fdx`.
- **Real WIP**: `git stash push -u -m "post-pr-merge: WIP before cleanup $(date +%Y%m%d)"` **or** ask the user. Do not silently delete product code.

If the current directory is a **linked worktree** for the feature branch, finish
process kill there, then operate worktree removal from the main checkout (step 4).

### 3. Check out base and pull latest

```bash
git fetch origin --prune
git checkout "$BASE"
git pull --ff-only origin "$BASE"
```

If `--ff-only` fails, stop and report divergence — do not hard-reset unless the
user explicitly asks for a hard reset of the base branch.

Confirm:

```bash
git status -sb   # should be clean and tracking origin/$BASE
```

### 4. Remove stale worktrees

```bash
git worktree list
```

For each worktree that is **not** the main checkout:

1. If it checked out `FEATURE` or a review/fix branch for the merged PR →
   remove it:
   ```bash
   git worktree remove [--force] <path>
   ```
2. If the path is gone but still registered → `git worktree prune`
3. Empty parent dirs like `.claude/worktrees/` can stay.

Use `--force` only when the worktree is dirty with throwaway state or the user
wants a hard clean.

### 5. Delete stale local branches

```bash
git fetch origin --prune
git branch --merged "$BASE"
git branch -vv
```

**Delete when:**

- Branch tip is merged into `$BASE` / `origin/$BASE`, **or**
- Remote tracking branch is gone (`[gone]`) **and** the branch was the merged
  feature / PR head, **or**
- Explicitly named as the merged PR head (`FEATURE`)

```bash
git branch -d <branch>          # prefer safe delete
# only if merged-equivalent but -d refuses and user wants cleanup:
git branch -D <branch>
```

**Keep:**

- `$BASE`, `main`, `master`, `staging`
- Any branch with unique unmerged commits the user may still need (ask)

Also prune remote-tracking refs already handled by `git fetch --prune`.

### 6. Optional stash cleanup

```bash
git stash list
```

Drop stashes that are clearly local noise from the session (e.g. "beads
metadata local", empty WIP from this merge cleanup). Keep anything that looks
like real work unless the user asked for a full wipe:

```bash
git stash drop stash@{n}
```

### 7. Final verification report

```bash
git status -sb
git branch -vv
git worktree list
git stash list
```

Report a short table:

| Item | Result |
|------|--------|
| Processes stopped | PIDs/patterns killed, or "none / left running (why)" |
| Branch | `$BASE` @ `<sha>` matching `origin/$BASE` |
| Pull | ff / already up to date |
| Worktrees removed | paths |
| Branches deleted | names |
| Stashes dropped | ids or none |
| Leftovers | anything still dirty or kept on purpose |

Working tree should be clean on `$BASE` with only intentional long-lived
branches remaining.

## Default base-branch heuristic

```text
if PR baseRefName known → use it
else if local/remote develop exists → develop
else if main exists → main
else → ask
```

For olhaminha.bio / lookmybio monorepos, default **base is `develop`**.

## Anti-patterns

- `git clean -fdx` from repo root without path filters (wipes env, builds, secrets).
- Deleting `staging` / `main` because they look "unused".
- Killing every `node` process on the machine.
- Hard-resetting `develop` to "fix" divergence without asking.
- Removing a worktree that still has unpushed commits the user needs.
- Claiming cleanup is done without showing `git status` + `git worktree list`.

## Related skills

- **`pr-review-loop`** — fix review comments while the PR is still open
- **`issue-to-pr`** — implement an issue through to an open PR
- **`local-visual-test`** / **`test-feature`** — start (not stop) the local stack for verification
