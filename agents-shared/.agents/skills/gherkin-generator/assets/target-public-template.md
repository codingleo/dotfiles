# TARGET_PUBLIC.md template

Save as `TARGET_PUBLIC.md` (preferred: `docs/bdd/TARGET_PUBLIC.md` or repo root).  
Fill every section. Delete this instructional callout when publishing the real file.

---

# Target public — \<Product name\>

| Meta | Value |
|------|-------|
| **Product** | |
| **One-line positioning** | |
| **Primary geos / languages** | |
| **Document owner** | |
| **Last updated** | YYYY-MM-DD |
| **Research pass date** | YYYY-MM-DD |
| **Confidence** | high / medium / low — why |

## 1. Product job (category)

- **Category:** e.g. link-in-bio, scheduling, AI creative, vertical SaaS…
- **Job statement:** When \_, people want \_, so they can \_.
- **Non-jobs (out of scope):** what we are *not* hiring for

## 2. Competitive landscape (research required)

Summarize **3–6 competitors** after a live web pass. Be specific.

| Competitor | Positioning | Who they target | How they solve the job | Price signal | Acquisition engine | Source URLs |
|------------|-------------|-----------------|------------------------|--------------|--------------------|-------------|
| | | | | | | |

### Category insights

- What pains do competitor landings hammer?
- Where is the market converging?
- What wedge does **this** product own (honestly)?
- Risks of copying competitor claims our product does not ship

### Sources

- [Title](url) — accessed YYYY-MM-DD — note

## 3. Market constraints

- Budget reality of buyers
- Platform dependency (IG/TikTok/etc.)
- Locale/regulatory notes
- Mobile vs desktop skew

## 4. Persona set

> Copy blocks from `assets/persona-template.md` in the gherkin-generator skill.  
> Mark ⭐ on 1–2 primaries.

### Summary table

| ID | Name | Segment | IQ (1–5) | Primary? | Default JTBD lens |
|----|------|---------|----------|----------|-------------------|
| | | | | | |

### Personas

<!-- Paste full persona blocks here -->

## 5. Fluency defaults for Gherkin

| When writing… | Design for persona IQ | Notes |
|---------------|----------------------|-------|
| Empty / onboarding | min(primary IQs) | |
| Plan / paywall | primary buyer | Honest gates only |
| Power / batch | highest primary | Must not break lower IQ |
| Locale-specific | matching locale persona | |

**Rule:** IQ is product literacy + patience budget—not a judgment of intelligence.

## 6. Confusion classes to prefer

List the top confusion classes this product creates (see skill `references/confusion-catalog.md`). Example:

- Empty / first run
- Plan wall
- Quota / credits
- Wrong mental model
- Language / locale
- Partial failure
- Mobile thumb

## 7. Product-truth guardrails

Link or paste hard limits the Gherkin author must not violate (pricing tiers, free limits, coming-soon platforms, “storefront” vs outbound links, etc.).

- …
- …

## 8. Open questions

| ID | Question | Owner | Status |
|----|----------|-------|--------|
| Q1 | | | open / decided |

## 9. Changelog

| Date | Change |
|------|--------|
| YYYY-MM-DD | Initial research + personas |
