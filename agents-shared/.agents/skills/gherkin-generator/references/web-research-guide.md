# Web research guide (before `TARGET_PUBLIC.md`)

Personas without market context become fan fiction. Run this pass **before** filling persona templates when generating or major-refreshing `TARGET_PUBLIC.md`.

## Goals

1. Know the **category job** buyers hire.
2. Know **who competitors say they serve** (and who actually shows up in their examples).
3. Know **how** competitors solve pains (features, templates, AI, marketplace, viral loops).
4. Capture **price and packaging** signals (free tiers, seats, % take rates).
5. Note **geo skew** (e.g. US creator tools vs Brazil MEI / Instagram-commerce).
6. Leave **citations** the next agent can re-check.

## Method

### A. Identify competitors from the repo first

```bash
# common locations
ls marketing/reference/competitors.md docs/**/competitors* 2>/dev/null
rg -n -i 'competitor|linktree|vs\.|alternative' README.md marketing docs --glob '!**/node_modules/**' | head -40
```

### B. Live web pass (required)

For each of 3–6 rivals + the category:

| Query patterns | What to extract |
|----------------|-----------------|
| `<competitor> pricing` | Free limits, paid tiers, gotchas |
| `<competitor> for creators` / `for small business` | Stated ICP |
| `<category> market` / `state of <category>` | Size, growth, buyer split (directional) |
| `<competitor> vs <competitor>` | Differentiation language |
| `<geo> <category>` (e.g. `Brazil link in bio`, `MEI Instagram vendas`) | Local buyer reality |
| `<competitor> AI` / `scheduling` / job-specific terms | How they solve the job |

Prefer:

- Official pricing/positioning pages
- Recent (≤18 months) analyst or platform reports
- Multiple sources when numbers disagree — **flag the disagreement**

Avoid:

- Invented statistics
- Copying a competitor’s capability list into **our** Gherkin as if we ship it
- Undated screenshots with no URL

### C. Landing-page pain mining

From each competitor homepage/hero/pricing:

- Headline job promise
- 5 repeated pain phrases
- Social proof archetype (creator, SMB, enterprise)
- Primary CTA and free-tier hook
- Footer/viral loops (“powered by…”) if any

### D. Map research → personas

| Research signal | Persona field |
|-----------------|---------------|
| Repeated “can’t afford a designer” | Pain + WTP |
| Free tier with aggressive upsell | Challenges + triggers |
| Mobile screenshots only | Devices + IQ implications |
| pt-BR or local payment | Locale persona required |
| AI as add-on vs core | Dreams + desired-vs-shipped |
| Multi-product suite | Workaround stack |

### E. Document in `TARGET_PUBLIC.md`

- Fill **§2 Competitive landscape** table completely
- Add **Sources** with URL + access date
- Confidence note when data is vendor-adjacent

## Output quality bar

**Fail:** “Creators who want to grow.”  
**Pass:** “Nano creators (1K–50K) already on Linktree free; churn when Pro raises price and AI creative still requires Canva + CapCut + a scheduler.”

**Fail:** “Competitors are Linktree etc.”  
**Pass:** table rows with positioning, ICP, mechanism, price signal, acquisition engine, citations.

## Refresh policy

- New product line or geo → full research pass
- Minor feature Gherkin with existing solid `TARGET_PUBLIC.md` → skim sources; only refresh if >~6 months stale or pricing clearly moved
- Never skip research on **first** creation of `TARGET_PUBLIC.md`
