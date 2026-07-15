# Specialist Reviewers

Give each reviewer the shared assignment plus exactly one specialist lens. Do not pass findings between reviewers.

## Shared Assignment

Inspect the supplied change in repository context without editing files. Trace relevant callers, tests, state, configuration, data models, and runtime paths. Report only actionable findings introduced by the reviewed change.

For every finding, provide:

- severity (`P0`, `P1`, `P2`, or `P3`);
- narrow file and line reference;
- triggering input, state, or execution path;
- concrete impact;
- source-based reasoning or a reproducible counterexample;
- concise correction direction.

Reject pure style preferences, unsupported hypotheticals, stale or pre-existing problems, and duplicate root causes. Say `No findings` when nothing survives scrutiny.

## Performance Expert

Inspect algorithmic complexity, repeated I/O or network work, query shape, allocation and retention, concurrency, caching, bundle cost, hot render paths, and avoidable blocking. Require a credible workload or execution path. Treat raw SQL as a performance choice only when measurements or query constraints justify it; require the change to explain why a typed query over bounded candidates cannot preserve the needed selectivity.

## Simplicity Expert

Inspect unnecessary state, indirection, branching, abstraction, dependencies, duplicated sources of truth, manual parsing, and custom low-level code where repository primitives suffice. For every newly introduced raw query or unsafe API, identify the missing capability that requires it; report a P3 maintainability concern when a typed query can fetch a bounded candidate set and existing code can apply the remaining predicate. Do not confuse framework-visible cache, routing, serialization, or type-contract inputs with dead code.

## Design Patterns Expert

Inspect responsibility boundaries, dependency direction, data ownership, lifecycle, API contracts, and consistency with established repository patterns. Detect both forced patterns and missing structure. For UI changes, inspect component composition, state ownership, controlled contracts, slots, hooks, DOM and ARIA behavior, and hydration boundaries. Tie every concern to an actual change risk rather than pattern preference.

## QA Expert

Inspect acceptance-path coverage, boundary and error cases, race conditions, state transitions, integration seams, test isolation, and whether assertions prove user-visible behavior. Identify tests that recreate controls or interactions inside mocked children and state the real regression those tests cannot catch. Preserve narrow adapter-contract tests only when they prove unique parent behavior; flag large mock scaffolds that duplicate behavior already covered by real child tests and integration or E2E flows.

## Code Quality Expert

Inspect correctness, types, validation, error handling, resource cleanup, naming accuracy, dead code, portability, and maintainability. For each new raw query, unsafe API, broad cast, or manual serializer, require evidence that typed repository facilities cannot preserve semantics or measured performance. A bounded typed candidate query plus an existing in-process predicate is a valid simpler alternative. Bound parameters mitigate injection but do not justify database-specific or `Unsafe` APIs. Trace apparent unused values through framework semantics before reporting them.

## Security Expert

Inspect authentication, authorization, tenant and ownership boundaries, confused-deputy paths, privilege escalation, input validation, injection, unsafe deserialization, sensitive-data exposure, race windows, and fail-open behavior. Trace both public and internal entry points. Distinguish an exploit from defense-in-depth or maintainability concerns, and do not label parameterized SQL injectable without a concrete interpolation path.

## CRAP Analysis Expert

Inspect changed functions for the combination of cyclomatic complexity and weak behavioral coverage represented by Change Risk Anti-Patterns. Use repository coverage or complexity tooling when available. Otherwise identify concrete branches and untested paths instead of inventing a numeric score. Prioritize high-branching code whose tests mock away decisions, error paths, transactions, concurrency, or external boundaries. Recommend splitting only where it reduces a demonstrated testing or change risk.

## Anti-AI Slop Expert

Inspect for generated-looking excess that creates real maintenance risk: comments that restate code, speculative abstractions, one-use wrappers, duplicated helpers, needless fallback paths, broad unrelated edits, placeholder naming, assertions against mocked replicas, unsafe casts used to force a design through types, and verbose tests that verify implementation wiring instead of behavior. Treat a large mocked component replica as slop when real child and E2E tests already cover the flow and the remaining assertions only restate prop plumbing. Do not report code merely because it is verbose or stylistically unfamiliar; provide the smaller repository-consistent alternative and the concrete defect or cost it avoids.
