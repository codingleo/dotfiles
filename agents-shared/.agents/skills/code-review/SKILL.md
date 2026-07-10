---
name: code-review
description: >-
  Review code changes with six independent specialist subagents and synthesize
  only verified, actionable findings. Use when asked to review a branch, pull
  request, commit, patch, diff, or implementation; to perform another
  multi-agent or expert code review; or to assess performance, simplicity,
  design patterns, QA and test coverage, code quality, and React composition.
---
# Code Review

Run a read-only, evidence-first review. Preserve the requested scope and do not implement fixes unless the user explicitly asks for them.

## Workflow

1. Establish the review target.
   - Read the repository instructions before inspecting the change.
   - Use the user-specified pull request, branch, commit, range, or files. Otherwise resolve the base from pull-request metadata or the repository's configured merge target. Ask when multiple bases are plausible; never silently assume a default branch.
   - Record the exact reviewed range or file set. For a branch review, compute the merge base with the resolved target and include relevant tracked and untracked worktree changes.
   - Inspect the changed files, their callers, tests, and runtime or configuration paths needed to understand behavior. Do not judge the diff in isolation.
   - Record unrelated pre-existing worktree changes and leave them untouched.

2. Prepare a neutral evidence packet.
   - Include the user intent, review range or baseline, raw diff or changed paths, applicable repository instructions, and relevant validation commands.
   - Give every reviewer the same scope and enough repository access to trace behavior.
   - Do not include suspected defects, expected answers, or conclusions from another reviewer.

3. Dispatch the specialist panel.
   - Read [references/reviewers.md](references/reviewers.md) before delegating.
   - Start one fresh subagent for each of the six lenses: performance, simplicity, design patterns, QA, code quality, and React composition. Use a clean, non-inherited context such as `fork_turns=none`, passing only the neutral evidence packet and role instructions.
   - Use parallel waves when concurrency is limited. Collect all six responses before synthesizing the review.
   - Ask reviewers to inspect and report only; do not let them edit files.
   - Require each reviewer to return findings or explicitly say that no findings survived scrutiny. Let the React reviewer mark the lens not applicable when no React code or component API is involved.
   - If subagents are unavailable, disclose that limitation and apply the same six lenses sequentially.

4. Verify every candidate finding.
   - Reproduce the relevant code path and independently confirm the claim against the actual change.
   - Compare with the baseline so pre-existing behavior is not attributed to the patch.
   - Run focused, non-mutating tests or diagnostics when they materially strengthen or disprove a claim.
   - Reject speculative concerns, style preferences, duplicate findings, and recommendations without a concrete failure mode or maintainability cost.
   - Resolve reviewer disagreement through source evidence. Never decide by vote.

5. Report the review.
   - Put findings first, ordered by severity and then confidence.
   - For each finding, include a severity (`P0` through `P3`), the narrowest useful file and line reference, the triggering conditions, the impact, the verifying source evidence or reproducible counterexample, and a concise direction for correction.
   - Keep one root cause per finding. Merge duplicates across reviewers and credit the strongest evidence, not the number of reviewers.
   - Add open questions or residual risks only when they are material.
   - State the exact reviewed range or file set and which tests or diagnostics ran. If no findings remain, say so explicitly and identify any validation gap.

## Review Standard

- Prioritize correctness, regressions, security, data loss, broken contracts, and user-visible behavior.
- Use `P0` for release-blocking catastrophic impact, `P1` for high-impact defects, `P2` for ordinary actionable defects, and `P3` for concrete low-impact or maintainability problems.
- Treat missing tests as a finding only when the patch creates a specific unprotected behavior or regression risk.
- Keep summaries short. A review is useful because its findings are precise, not because it is long.
