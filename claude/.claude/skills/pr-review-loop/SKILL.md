---
name: pr-review-loop
description: Address open PR review feedback end-to-end and verify the PR is mergeable — fetch all human + bot review comments, classify by severity, fix in an isolated worktree, run tests/typecheck/lint, push, verify the push landed, reply inline to every thread, resolve threads via GraphQL, then check CI and loop until reviewers and CI are both happy. Use when the user says "check PR comments", "address PR review feedback", "fix all the review comments on PR #N", "verify PR #N is ready", "is CI passing on PR #N", "loop until reviewers happy", or pastes a github.com PR URL and asks you to fix the feedback. NOT for performing a code review yourself — for that, use `pr-review-toolkit:review-pr` or `code-review:code-review`.
---

# PR Review Loop

End-to-end workflow for closing out an open PR: fix every actionable comment, ship, reply, resolve, and confirm CI is green. The loop terminates only when (a) every review thread is resolved, (b) the user-visible CI checks pass, and (c) the local push is verified to have landed on the remote.

## When to invoke

User-facing triggers (from the description) all map to one of two intents:

1. **"Fix the comments"** — humans + bots have left review feedback. Address each one, push, reply, resolve.
2. **"Is this ready to merge?"** — verify CI is green and there are no unresolved threads.

Either path runs the same loop. Stop only when both conditions are met.

## The loop (overview)

```
1. Discover    → fetch PR meta + every review thread + CI checks
2. Classify    → severity per comment, group by file, dedupe overlapping requests
3. Plan        → present a short triage summary; ask the user before fixing if scope is non-trivial
4. Implement   → in an isolated worktree, write code + tests, run verification
5. Push & verify → push, then `git ls-remote` to confirm the remote tip matches local HEAD
6. Reply & resolve → one inline reply per thread referencing the fix commit, then resolve via GraphQL
7. CI check    → poll `gh pr checks`; if anything fails, GOTO 1 with the failures as new comments
```

Run discovery + CI check in parallel where possible — they're independent.

## Phase 1: Discover

Use `scripts/pr-state.sh <pr-number>` to fetch everything in one shot — it returns PR metadata, every unresolved review thread (with thread IDs ready for the resolve mutation), the inline comments, the issue-level comments, and the current CI status.

If the script is unavailable, fall back to the raw commands in [`references/gh-commands.md`](references/gh-commands.md). Do not skip threads even if they look stale — closed/resolved threads are filtered server-side.

For each thread, capture:
- `databaseId` (numeric, used for replies)
- thread `id` (`PRRT_*`, used for the resolve mutation)
- `author.login` (humans vs bots — see [`references/triage.md`](references/triage.md))
- `body` (the actual feedback)
- `path` + `line` (so you know which file to open)
- `isResolved` (skip if already true)

## Phase 2: Classify

Read [`references/triage.md`](references/triage.md) for the full taxonomy. Quick rules:

- **Blocker / P0 / `[issue]`** — must fix before merge.
- **Suggestion / P1 / `[suggestion]`** — fix unless there's a strong reason not to.
- **Nit / P2 / `[nit]`** — fix if cheap; defer with a follow-up issue if not.
- **Question / P3 / `[question]`** — answer in a reply; only edit code if the answer requires it.

Bots speak in their own dialect (Codex P0–P3 badges, Copilot category prefixes). Treat their findings on the same severity ladder, but discount confidence: bots produce more false positives.

**Dedupe before fixing.** Two reviewers often flag the same line. One fix → multiple replies citing the same commit.

## Phase 3: Plan (only if scope warrants it)

For ≤2 trivial fixes, just go. For ≥3 fixes or any blocker, post a one-paragraph triage summary back to the user before editing — list each thread, its severity, and the proposed fix. Wait for confirmation if any fix is non-obvious or touches a sensitive surface (auth, billing, migrations).

## Phase 4: Implement

**Always work in an isolated worktree** — never mutate the user's current checkout for someone else's PR branch. See `superpowers:using-git-worktrees` if creating one from scratch; common pattern:

```bash
git worktree add .claude/worktrees/<pr-N>-fixes <pr-branch>
cd .claude/worktrees/<pr-N>-fixes
bun install   # or the project's package manager
```

Implement each fix. After every logical group of edits, run the project's verification triad:

- **tests** (`bun test`, `pnpm test`, `npm test`, `pytest`, etc. — look at `package.json` scripts or repo conventions)
- **typecheck** (`bunx tsc --noEmit`, `tsc --noEmit`, `pyright`, `mypy`)
- **lint** (`biome check`, `eslint`, `ruff`)

If the project has a pre-push hook that runs the same checks, you'll catch it twice — but pre-push runs against ALL files and can be slow; running incrementally during implementation is faster feedback.

**Never claim a fix is done without running the relevant test.** Evidence before assertions.

## Phase 5: Push and verify

`git push origin <branch>` is **not** sufficient confirmation. Pre-push hooks can exit 0 without actually pushing in pathological cases (especially when verbose hook output is captured by a backgrounded shell). Always:

```bash
git ls-remote origin <branch>
```

…and confirm the printed SHA matches your local `HEAD`. Only then is the push verified.

## Phase 6: Reply and resolve

For each thread, post one inline reply that:
1. Confirms the fix landed (cite the commit SHA, e.g. `Fixed in 5b6d7253e.`)
2. States *what* changed in one sentence
3. Adds *why* if the user proposed an alternative you didn't take

Use `gh api -X POST repos/{owner}/{repo}/pulls/{pr}/comments/{comment_id}/replies -f body='…'`. Run replies in parallel — they're independent (`&` + `wait`).

Then resolve every replied-to thread:

```bash
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id="$THREAD_ID"
```

A loop over the captured `PRRT_*` IDs is enough. Confirm `isResolved: true` in each response.

`scripts/resolve-threads.sh` wraps the loop if you have a list of thread IDs.

## Phase 7: CI check

```bash
gh pr checks <pr-number>
```

If everything is green, the PR is ready. If anything is `pending`, wait (use `gh pr checks --watch` or sleep + re-poll — pick wait time based on typical run length, not arbitrary 5-min sleeps; see [`references/ci-debugging.md`](references/ci-debugging.md)).

If a check **failed**:

1. Identify the failing run: `gh run view <run-id> --log-failed | tail -200`
2. Reproduce locally if possible. Don't speculate about the failure cause from the title alone.
3. Treat the failure as a new "review comment" — go back to Phase 4, fix, push, then re-poll Phase 7.
4. The loop terminates when `gh pr checks` reports all required checks passed AND every thread is resolved.

For deep debugging of CI failures (matrix builds, flake detection, log spelunking), see [`references/ci-debugging.md`](references/ci-debugging.md).

## Termination criteria

Both must hold:

- `gh api graphql … reviewThreads … isResolved: false` returns an empty list (or only contains threads the user explicitly chose to defer).
- `gh pr checks <pr>` reports all required checks pass.

If either fails after 3 fix-and-push cycles, stop the loop and brief the user. A bug you can't reproduce locally or a reviewer who keeps moving goalposts both deserve a human conversation, not more autonomous attempts.

## Anti-patterns

- **Replying without committing the fix first.** Reviewers see "fixed in <sha>" and click — if the SHA isn't on the branch yet, you've lied.
- **Resolving without replying.** Reviewers can't tell if a resolved thread was addressed or dismissed. Always reply *then* resolve.
- **Skipping `git ls-remote`.** A successful-looking `git push` plus a backgrounded pre-push hook is the most common way to ship "I pushed it" claims that aren't true.
- **Marking a comment "won't fix" without a reason.** If you're declining a suggestion, the reply must say *why* (link to a rule, an incident, or a constraint). Otherwise the thread reopens.
- **Treating bot comments as gospel.** Codex/Copilot generate confident-sounding false positives. Read the actual code before fixing.
- **Skipping CI verification.** "All threads resolved" ≠ "ready to merge". CI is the second leg.
