# Confusion → scenario catalog

Map persona confusions to Gherkin intents. Prefer **preventing** confusion in the product; still lock behavior with scenarios when the edge is real.

| Confusion class | Scenario intent | Example outcome-level `Then` |
|-----------------|-----------------|------------------------------|
| **Empty / first run** | Zero data, new account | Clear empty CTA—not a blank grid or clipped pager |
| **Plan / tier wall** | Free or lower tier lacks capability | Action gated with **honest** reason + upgrade path |
| **Quota / credits** | Zero credits, cap hit | Blocked with remaining/reason in **text**, not color-only |
| **Wrong mental model** | Thinks feature does X when it does Y | UI doesn’t imply fake capability; copy matches product-truth |
| **Jargon / density** | Too many controls bury the job | Primary job reachable; density doesn’t hide CTA |
| **Hover-only meaning** | Meta only on hover | Same info on focus/touch paths |
| **Language / locale** | Wrong language strings | User-visible path covered for active locale |
| **Mobile thumb** | Tiny targets, scroll traps | Full list scrollable; primary targets usable |
| **Partial failure** | One channel failed | Failure visible at rest; retry without hover |
| **Idempotent re-entry** | Double submit, refresh mid-flight | No duplicates; clear in-progress state |
| **Permission** | Non-owner / shared role | Forbidden with clear ownership outcome |
| **Recovery** | OAuth expired, missing media | Actionable next step, not raw exception |
| **Adjacent regression** | Neighbor surfaces must still work | Smoke scenario or explicit coverage note |

Not every row every time—only classes **reachable** for the issue. Silence on a reachable class is a gap.

## Simplify vs scenario

| Prefer | When |
|--------|------|
| **Simplify the product** | Structural confusion; many personas hit it |
| **Scenario for guidance/recovery** | Real edge (quota, authz) must stay explicit |
| **Both** | Happy path simplified **and** hard gate tested |

Gherkin that only documents a confusing UI is a smell—fix the intended UX, then encode the improved behavior.
