# Persona role-play → scenario candidates

Use after `TARGET_PUBLIC.md` is loaded. Stay in **first person** as the persona.

Example: *“I'm Camila, coach, laptop + phone, need this week’s funnel live without looking amateur.”*

## Walkthrough prompts

For the issue’s main job **and** each important side path:

1. **Arrive** — Where do I land? Is the job obvious in &lt;3 seconds?
2. **Orient** — What do chips/tabs/cards mean? What would I confuse?
3. **Act** — Single next action? What do I fear if I tap it (cost, audience-facing mistake)?
4. **Wait** — Loading, credits, queues—do I understand time and money?
5. **Outcome** — Can I verify success myself? On failure, do I know why and what next?
6. **Wrong turn** — Adjacent nav / wrong tier / wrong locale—am I safe?
7. **Leave and return** — Drafts, scroll, sticky chrome, session—still coherent?

Write every “I would get stuck / message support / churn” moment as a **scenario candidate**.

## Promote to Example Map

| Walkthrough note | Map entry |
|------------------|-----------|
| Hard business constraint | Rule `R#` |
| Concrete path with real values | Example `R#-E#` |
| Nobody knows | Question `Q#` + owner |

Rules without examples are not ready for Gherkin.

## Persona conflict rule

If primary personas disagree (e.g. IQ 2 vs IQ 4):

1. Happy path and copy target the **lower** IQ
2. Add separate scenarios for power-user affordances only if they don’t regress the lower path
3. Note the decision in the feature header comment
