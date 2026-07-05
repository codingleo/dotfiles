---
name: add-fal-model
description: Register a new FAL.ai model (image or video) into the olhaminha.bio codebase. Use when the user says "add fal model", "add new model from fal", "register fal model", "/add-fal-model", or provides a FAL.ai model name/path to integrate. Handles domain interfaces, infrastructure model classes, pricing/credits, DI wiring, UI metadata, and FloatingInput settings UI.
---

# Add FAL.ai Model

## Workflow

### Step 1 — Research the model at FAL.ai

Fetch the model's documentation page to extract:
- **Input schema**: all parameters, their types, defaults, and which are required
- **Output schema**: response structure
- **Pricing**: USD cost per unit (per image, per megapixel, per second, per video)

Use `WebFetch` on `https://fal.ai/models/{model-path}` and/or `https://fal.ai/models/{model-path}/api` to get the schemas.

### Step 2 — Determine model type and classify

| Type | Enum file | Checklist |
|------|-----------|-----------|
| Image generation | `image-generation-models.enum.ts` | [image-model-checklist.md](references/image-model-checklist.md) |
| Image edit | `image-generation-models.enum.ts` | [image-model-checklist.md](references/image-model-checklist.md) |
| Video (T2V/I2V/V2V/effects) | `video-generation-models.enum.ts` | [video-model-checklist.md](references/video-model-checklist.md) |

Read the appropriate checklist reference for the full file-by-file implementation guide.

### Step 3 — Calculate credits

```
CREDITS_PER_DOLLAR = 250
credits = Math.ceil(unitPrice_USD * CREDITS_PER_DOLLAR)
```

For the `CREDIT_COSTS` entry, calculate the default cost for a single standard generation:
- **Image (per-image pricing)**: `Math.ceil(unitPrice * 250)` for 1 image
- **Image (per-megapixel)**: `Math.ceil(unitPrice * 1.05 * 250)` for ~1 megapixel default
- **Video (per-second)**: `Math.ceil(unitPrice * defaultDuration * 250)`

### Step 4 — Implement following the checklist

Follow the checklist from Step 2 exactly. Key rules:

1. **Input schema fidelity**: The domain interface MUST include ALL fields from the FAL.ai input schema (except `prompt`/`seed` which are in `IBaseImageGenerationInput`). Use TypeScript optional (`?`) for non-required fields.

2. **Output schema fidelity**: The domain output interface MUST include any extra fields beyond `IBaseImageGenerationOutput` (images, timings, seed, requestId).

3. **sanitizeInput**: Only forward fields the model actually accepts. Use conditional spread:
   ```typescript
   ...(rest.field && { field: rest.field })
   ```

4. **UI Settings**: For the model's unique parameters, add conditional rendering in `prompt-input-settings.tsx`:
   - If parameters match an existing family (guidance_scale, negative_prompt, etc.), add to existing condition
   - If truly new parameters, add new state in `model-context.tsx` + new UI block + wire to `generation-context.tsx`
   - Image models: conditional blocks use `effectiveFamily === '{family}'`
   - Video models: mostly metadata-driven (set flags in `VideoModelMetadata`)

5. **Translations**: Add keys to `messages/en-us/domains/ai/components.json` for model name, description, and any new setting labels.

### Step 5 — Verify

Run `bun run typecheck` to confirm no type errors.

## Naming Conventions

| Concept | Convention | Example |
|---------|-----------|---------|
| Enum key | `SCREAMING_SNAKE` | `NANO_BANANA_PRO` |
| Enum value | `'fal-ai/{path}'` | `'fal-ai/nano-banana-pro'` |
| Interface | `I{PascalCase}Input/Output` | `INanoBananaInput` |
| Model class | `{PascalCase}ImageModel` | `NanoBananaImageModel` |
| Interface file | `{kebab-case}.interface.ts` | `nano-banana.interface.ts` |
| Model class file | `{kebab-case}-image.model.ts` | `nano-banana-image.model.ts` |
| UI family | `'{kebab-case}'` | `'nano-banana'` |
| UI name | `camelCase` | `'nanoBananaPro'` |
| UI descriptionKey | `camelCase` | `'nanoBananaPro'` |
