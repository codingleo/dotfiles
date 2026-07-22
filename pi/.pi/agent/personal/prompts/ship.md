---
description: Run full BDD→TDD→verify fleet ship recipe
argument-hint: "[issue-or-focus]"
---

Run the **/ship** orchestration for: ${1:-the current task}

1. Load skill `ship` (and `bdd-tdd` / `agentic-fleet` as needed).
2. Follow the skill pipeline exactly: discovery → formulation → red → green → verify → fleet review (default 3) → collect → synthesis → handoff.
3. Stop on any failed bdd_assert_*; do not skip red evidence.
4. End with `bdd_handoff` (asPr=true when opening a PR).
