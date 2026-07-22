---
name: ship
description: >
  End-to-end BDD→TDD→verify fleet recipe for Pi. Use when the user says /ship,
  ship this story, or wants discovery through handoff in one orchestration.
  Skill-only — does not replace bdd-mode or agentic-fleet tools.
---

# /ship — parent orchestration recipe

**Not a second phase engine.** Call existing tools; stop on failed asserts.

## Preconditions

1. `/reload` if package just updated  
2. Optional: `agentic_doctor` or `/bdd doctor` — fix fails first  
3. Focus: issue number or short title  

## Pipeline

### 1. Discovery
```text
/bdd discovery
# Write Example Map (Rules / Examples / Questions) on the issue or docs/
bdd_record_evidence exampleMapRef=... exampleMapRules=N exampleMapExamples=N
```
Optional: `/fleet research 3 <open questions>` if unknowns remain.

### 2. Formulation
```text
/bdd formulation
# Gherkin and/or unit test skeletons only — no production impl
```

### 3. Red
```text
/bdd red
bdd_assert_red   # must FAIL (not timeout/127)
```

### 4. Green
```text
/bdd green
# minimum implementation
bdd_assert_green   # must PASS and cover red
```

### 5. Verify + small review fleet
```text
/bdd verify
fleet_dispatch kind=review topic="<focus / diff>"   # default count=3
# wait for fleet
fleet_collect runId=...
# write .pi/fleet-runs/<runId>/synthesis.md
bdd_record_evidence fleetRunId=... fleetSynthesisPath=...
```

### 6. Optional mutation
```text
# Parent breaks an assertion, then:
bdd_assert_mutation failCommand="bun test ..." passCommand="bun test ..."
# Parent restores between fail and pass runs
```

### 7. Handoff
```text
bdd_handoff asPr=true title="<PR title>"
# or /bdd handoff pr
```

## Stop rules

- Red assert fails validation → fix tests, do not green  
- Green fails cover check → same command as red  
- Fleet blocked in green → you skipped verify  
- Handoff missing synthesis → finish collect + synthesis.md  

## Defaults

- Review fleet **N=3** unless user asks larger  
- One writer only  
- See `docs/bdd-fleet-cheatsheet.md`
