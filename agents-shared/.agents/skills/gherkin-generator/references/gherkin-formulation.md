# Gherkin formulation checklist

## Before typing `Feature:`

- [ ] `TARGET_PUBLIC.md` loaded; 1–2 personas chosen
- [ ] Role-play notes captured
- [ ] Example Map rules/examples exist (or N/A documented)
- [ ] Product-truth / capability limits checked
- [ ] Project `docs/bdd/gherkin-conventions.md` read when present

## Style

- **Title** = behavior + outcome users can observe  
  - Good: `Archiving is rejected for a non-owner`  
  - Bad: `assertPostTargetOwnership throws`
- **As / I want / so that** rooted in persona language
- **Background** only for givens shared by *every* scenario (~≤3 steps)
- **Scenario Outline** = equivalence classes, not every data nub
- Prefer **DataTables** for structured rows when the harness supports them
- Avoid **DocString** / **Rule:** if the project compiler rejects them

## Header comments (required by this skill)

```gherkin
# Personas: B Camila (desktop), E Rafael (mobile pt-BR)
# Confusion covered: empty, plan wall, partial failure
# Example Map: GH #1234 — R1, R2, R4-E1
```

## Traceability

| Map | Feature |
|-----|---------|
| `R#` | Comment above scenario group or in coverage notes |
| `R#-E#` | One scenario or one Outline row |
| Unmapped scenario | Either add to map or delete |

## Tags (project-specific)

If the repo documents a **closed tag vocabulary**, only use those tags.  
lookmybio.com example: `@use-case`, `@domain`, `@orpc`, `@quarantine`.

## Layout (lookmybio.com / similar)

```text
tests/features/<domain>/<name>.feature
tests/features/_steps/<scope>/*.steps.ts   # if new steps needed
tests/features/_generated/**               # generated — don't hand-edit
```

## Commands (when available)

```bash
bun run gherkin:generate
bun run gherkin:check
bun run gherkin:test --tags '<expr>'
```

## Sensitivity / mutation

For new acceptance scenarios on projects that require it:

1. Run scenario against missing or deliberately wrong behavior → **must fail**
2. Restore correct behavior → **must pass**
3. Note the red/green commands in the handoff

## Product-truth anti-patterns

- Asserting Free-tier social publish/scheduling when limits are 0 / Creator+
- Asserting in-app checkout/storefront when the product only deep-links out
- Asserting coming-soon platforms as available
- Locale-blind copy for a bilingual product
