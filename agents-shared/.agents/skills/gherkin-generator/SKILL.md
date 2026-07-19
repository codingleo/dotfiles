---
name: gherkin-generator
description: >
  Generate persona-driven Gherkin acceptance features (.feature files) and, when
  missing, a project TARGET_PUBLIC.md of richly described user personas. Use when
  the user asks to write Gherkin, formulate BDD scenarios, create feature files,
  build TARGET_PUBLIC / target audience personas, or run /skill:gherkin-generator.
  Always locate or create TARGET_PUBLIC.md first; web-research competitors before
  inventing personas; follow project gherkin conventions when present.
---

# Gherkin Generator

Produce **acceptance Gherkin** that a real target user would care about—not engineer happy paths alone.

Hard gate: **no `.feature` file until `TARGET_PUBLIC.md` is available** (found or deliberately created with user consent).

## Inputs the user may give

- Issue / story / Example Map / PRD slice
- Domain or path hint (`tests/features/<domain>/…`)
- Optional: existing `TARGET_PUBLIC.md`, audience docs, competitor notes

## Phase 0 — Locate `TARGET_PUBLIC.md`

Search the repo (and parents up to git root), in order:

1. `TARGET_PUBLIC.md` (repo root)
2. `docs/TARGET_PUBLIC.md`
3. `docs/bdd/TARGET_PUBLIC.md`
4. `docs/product/TARGET_PUBLIC.md`
5. `marketing/reference/TARGET_PUBLIC.md`
6. `marketing/TARGET_PUBLIC.md`
7. `.agents/TARGET_PUBLIC.md`
8. Any path the user names
9. Fallback related sources (do **not** treat as a substitute until user agrees):
   - `marketing/reference/audiences.md`
   - `docs/**/audiences*.md`, `docs/**/personas*.md`

```bash
# from repo root
find . -name 'TARGET_PUBLIC.md' \
  -not -path './node_modules/*' -not -path './.git/*' 2>/dev/null
```

### If found

- Read it fully.
- Validate it has **≥2 personas** using required fields from [assets/persona-template.md](assets/persona-template.md).
- If thin/missing IQ, pains, dreams: offer to enrich (with research) before Gherkin.

### If NOT found — stop and ask (required)

Do **not** invent personas silently. Ask:

> I couldn't find `TARGET_PUBLIC.md`. How should we proceed?
> 1. **You provide** the target public (paste or path), or
> 2. **I generate** `TARGET_PUBLIC.md` by analyzing this project **and** researching competitors on the web.

Only after an explicit choice, continue.

---

## Phase 1 — Create or refresh `TARGET_PUBLIC.md` (when needed)

Use templates:

- Whole file: [assets/target-public-template.md](assets/target-public-template.md)
- Each persona: [assets/persona-template.md](assets/persona-template.md)

### 1A — Project analysis (always, when generating)

Gather product truth from the repo (prefer primary sources over marketing hype):

| Look for | Examples |
|----------|----------|
| What it is | README, landing copy, `package.json` description |
| Who it claims to serve | marketing/*, docs/product, onboarding copy |
| What it actually does | capability matrices, plan limits, feature flags, code |
| Pricing / tiers | pricing docs, Stripe plan config |
| Locales | i18n folders, pt-BR/en splits |
| Existing audience work | `audiences.md`, `competitors.md`, brand voice |

**Honesty rule:** personas may *want* unshipped things; Gherkin must not assert fake capabilities. Note “desired vs shipped” gaps in each persona.

### 1B — Web research (mandatory before writing personas)

Research **current** competition and category buyers. Follow [references/web-research-guide.md](references/web-research-guide.md).

Minimum research pack:

1. **Category** — what job users hire this class of product for
2. **3–6 competitors** — positioning, pricing signal, who they target, how they solve the job
3. **Acquisition / messaging** — what pains their landing pages hammer
4. **Geography / language** — if the product is localized (e.g. Brazil), research that market too
5. **Cite sources** with URLs and access date in `TARGET_PUBLIC.md`

If the project already has `marketing/reference/competitors.md` / `audiences.md`, **read them and still refresh** with a live web pass for drift (prices and claims move).

### 1C — Write personas

- Prefer **4–7 personas** (enough coverage, not a novel).
- Mark **1–2 primary** personas for default Gherkin focus.
- Every persona must fill the template, especially:
  - **Pain points** (daily friction)
  - **Challenges** (structural constraints: money, time, skills, tools)
  - **Dreams** (success state in their words)
  - **IQ / fluency** — product literacy + patience budget, **not** a slur on intelligence (see template scale)
- Give each a memorable **name + ID** (e.g. `B — Camila`, `E — Rafael`).
- Include **confusion risks** and **Gherkin implications** so formulation is mechanical later.

Default write path (ask if unsure):

```text
docs/bdd/TARGET_PUBLIC.md
```

Also acceptable: repo-root `TARGET_PUBLIC.md` if the user prefers.

Show a short summary and get confirmation before bulk Gherkin if the file was newly generated.

---

## Phase 2 — Discovery before Gherkin

Do not jump straight to `Scenario:`.

1. **Pick 1–2 personas** from `TARGET_PUBLIC.md` for this change (name them in the feature header).
2. **Role-play** each primary through the job (arrive → orient → act → wait → outcome → wrong turn → return). See [references/persona-roleplay.md](references/persona-roleplay.md).
3. **Example Map** (if behavior-changing and project uses BDD intake):
   - Rules `R#`
   - Examples `R#-E#` with real values
   - Questions `Q#` with owners
   - Prefer updating the GitHub issue when one exists
4. Map confusions → scenario intents via [references/confusion-catalog.md](references/confusion-catalog.md).

If the repo has `docs/bdd/example-mapping.md` / issue templates, follow those over this skill’s defaults.

---

## Phase 3 — Formulate Gherkin

### Project conventions (when present)

If these exist, **they win**:

- `docs/bdd/gherkin-conventions.md`
- `docs/bdd/example-mapping.md`
- Existing features under `tests/features/**` as style references
- Product truth files (e.g. `marketing/reference/product-truth.md`) — no false capability claims

**lookmybio.com / olhaminha.bio defaults** (when detected):

| Topic | Default |
|-------|---------|
| Path | `tests/features/<domain>/<name>.feature` (one domain folder level) |
| Tags | closed set: `@use-case`, `@domain`, `@orpc`, `@quarantine` |
| Unsupported | `DocString`, `Rule:` |
| Outline rows | prefer ≤ ~8 equivalence classes |
| Generate | `bun run gherkin:generate` then commit `_generated` with the feature |
| Sensitivity | prove new scenarios fail against wrong/missing behavior, then green |
| Trace | scenarios ↔ Example Map `R#` / `R#-E#` |

Portable fallback (generic repos): put features where the project already keeps them; otherwise propose `tests/features/<domain>/<name>.feature` and match nearby style.

### Feature file shape

```gherkin
# Personas: <ID name> (<device/locale>), <ID name> (...)
# Confusion covered: <classes from catalog>
# Example Map: <issue url or R# list>
Feature: <observable capability>
  As a <persona-rooted role>
  I want <job>
  so that <outcome in their words>

  # Coverage notes:
  # - Unit/component elsewhere: ...
  # - Out of scope: ...

  Background:
    Given ...

  Scenario: <behavior and outcome — not implementation>
    Given ...
    When ...
    Then ...
```

Rules of thumb:

- One scenario title = one user-observable outcome
- Prefer outcome language over method names
- Include empty/first-run, gate/quota, and recovery paths when reachable
- Design for the **lower fluency** persona when two primaries conflict
- Collapse equivalents into `Scenario Outline` rows
- No hover-only meaning locked as the only path (if UI)
- **Simplify product** when confusion is structural; Gherkin locks the *improved* behavior

Details: [references/gherkin-formulation.md](references/gherkin-formulation.md).

---

## Phase 4 — Verify

Project-dependent:

```bash
# olhaminha.bio / similar
bun run gherkin:generate
bun run gherkin:check
# optional focused run
bun run gherkin:test --tags '@domain and not @quarantine'
```

Mutation/sensitivity (when project requires it): temporarily break or omit behavior → scenario red → restore → green.

---

## Outputs checklist

- [ ] `TARGET_PUBLIC.md` located or created (with user choice + web research if created)
- [ ] Personas complete vs [assets/persona-template.md](assets/persona-template.md)
- [ ] Sources cited for competitive research
- [ ] Example Map / rules traced (or N/A reason)
- [ ] `.feature` file(s) with persona + confusion header comments
- [ ] Conventions respected (tags, paths, no DocString/Rule if forbidden)
- [ ] Generate/check commands run when available
- [ ] No scenarios asserting unshipped product claims

## Anti-patterns

- Writing Gherkin before resolving `TARGET_PUBLIC.md`
- Personas that are only demographics (no pains/dreams/IQ)
- Skipping web research and cloning the last project’s audience
- Engineer-only happy paths with no empty/gate/recovery
- Titling scenarios after functions (`assertX throws`)
- Inventing Free-tier publishing/scheduling/storefront when product-truth forbids it
