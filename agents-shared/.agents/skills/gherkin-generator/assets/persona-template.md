# Persona template

Copy one block per persona into `TARGET_PUBLIC.md`. **Every field is required** unless marked optional. Write in concrete language a PM and a Gherkin author can use without more research.

---

## Persona block

```markdown
### <ID> — <Given name> (<short segment label>) <optional ⭐ primary>

| Field | Content |
|-------|---------|
| **ID** | Stable letter or code used in feature headers (e.g. `B`, `E`, `P1`) |
| **Name** | Human first name for role-play |
| **Segment** | One-line market segment |
| **Primary?** | `yes` / `no` — at most two primaries for the product |
| **Age range** | e.g. 25–40 |
| **Locale / language** | e.g. pt-BR mobile, en-US desktop |
| **Geography** | Country/region that shapes payment, slang, platforms |
| **Occupation / hustle** | How they make money or pursue status |
| **Income / willingness to pay** | Budget band + what “expensive” means to them |
| **Devices** | Primary device + secondary (phone-first?) |
| **Core platforms** | Where their audience lives (IG, TikTok, …) |
| **Tech / product IQ** | See scale below — **required** |
| **Patience budget** | Minutes they’ll fight the UI before churn/WhatsApp support |
| **Job to be done (JTBD)** | When… I want… so I can… |
| **Pain points** | 4–8 bullets — daily friction (emotional + practical) |
| **Challenges** | 3–6 structural constraints (skills, money, time, team, tools, regulation) |
| **Dreams** | 3–5 success-state bullets in *their* voice |
| **Triggers to seek a tool** | Moments that spark signup or upgrade |
| **Current workaround stack** | Apps/people they use today |
| **Competitor gravity** | Which rivals they already know / almost chose |
| **Fears in-product** | What makes them hesitate to click (cost, looking dumb, breaking live page) |
| **Success signals** | How they know it “worked” without us telling them |
| **Confusion risks** | Likely misunderstandings of *this* product |
| **Gherkin implications** | Scenario classes this persona forces (empty, gate, mobile, i18n, …) |
| **Accessibility / constraints** | Optional: motor, vision, low bandwidth, shared device |
| **Quotes** | 1–3 fictional but realistic first-person lines |
| **Anti-persona note** | Optional: who this is *not* |

#### Narrative (8–15 sentences)

Prose portrait: day-in-the-life, how they found the category, what would make them churn, what “professional” means to them.

#### Desired vs shipped gaps

| They want | We ship today? | Gherkin stance |
|-----------|----------------|----------------|
| … | yes / partial / no | assert success / honest gate / out of scope |
```

---

## Tech / product IQ scale

Use this scale in the **Tech / product IQ** field. It measures **product literacy + patience**, not human worth or education.

| Level | Label | Behavior | UI / Gherkin consequences |
|-------|-------|----------|---------------------------|
| **1** | Minimal | Taps the biggest button; skips settings; treats errors as “broken app” | One primary CTA; no jargon; huge targets; recovery in plain language |
| **2** | Low | Can follow a 3-step happy path if labeled; abandons dense forms | Empty states with examples; progressive disclosure; no hover-only meaning |
| **3** | Medium | Learns one new pattern per session; compares 2–3 tools | Clear gates before dead-ends; honest plan limits; medium density OK |
| **4** | High | Wants shortcuts, filters, batch; reads error codes if actionable | Power paths allowed **without** breaking level 1–2 defaults |
| **5** | Expert | Integrates APIs/webhooks; custom workflows | Advanced surfaces; still need permission/quota scenarios |

When two personas conflict, **design and write scenarios for the lower IQ level**, then add non-breaking power affordances if needed.

---

## Pain / challenge / dream quality bar

**Weak:** “Wants more engagement.”  
**Strong:** “Posts three times for a weekend promo and still gets ‘link in bio?’ DMs because the offer is buried under 12 links.”

**Weak:** “Not technical.”  
**Strong:** “IQ 2 — will not open ‘developer settings’; if OAuth fails twice, pays a nephew or churns.”

**Weak:** “Grow the brand.”  
**Strong:** “Dream: look as polished as the coach who sold out a cohort—without hiring a designer at R$200/hour.”

---

## Feature header snippet

After personas exist, feature files should cite them:

```gherkin
# Personas: B Camila (solopreneur, desktop en), E Rafael (MEI, mobile pt-BR)
# Confusion covered: empty library, plan wall, partial publish failure
```
