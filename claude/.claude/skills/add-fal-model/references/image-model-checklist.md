# Image Model Registration Checklist

## Files to Create

### 1. Domain Interface
**Path**: `src/domain/ai/services/image-generation/models/{model-name}.interface.ts`

```typescript
import type {
  IBaseImageGenerationInput,
  IBaseImageGenerationOutput,
  ImageGenerationSize,
} from '../image-generation.service.interface'
import type { ImageGenerationModel } from '../image-generation-models.enum'

export interface I{ModelName}Input extends IBaseImageGenerationInput {
  model_id: ImageGenerationModel.{ENUM_KEY}
  // Add ALL fields from FAL.ai input schema (except prompt/seed which are in base)
  // Use optional (?) for non-required fields
}

export interface I{ModelName}Output extends IBaseImageGenerationOutput {
  // Add extra output fields from FAL.ai output schema
  // images/timings/seed/requestId are in base already
}
```

### 2. Infrastructure Model Class
**Path**: `src/infrastructure/services/ai/image-generation/models/{model-name}-image.model.ts`

```typescript
import { injectable } from 'tsyringe'
import type { I{ModelName}Input, I{ModelName}Output } from '@/domain/ai/services/image-generation/models/{model-name}.interface'
import { BaseFalImageModel } from './base-fal.model'

@injectable()
export class {ModelName}ImageModel extends BaseFalImageModel<I{ModelName}Input, I{ModelName}Output> {
  protected override sanitizeInput(input: I{ModelName}Input): Record<string, unknown> {
    const { model_id: _, ...rest } = input
    return {
      prompt: rest.prompt,
      // Map each optional field conditionally:
      // ...(rest.field_name && { field_name: rest.field_name }),
    }
  }

  protected createOutput(requestId: string): I{ModelName}Output {
    return { images: [], requestId }
  }
}
```

### 3. (If edit variant) Domain Edit Interface
**Path**: `src/domain/ai/services/image-generation/models/{model-name}-edit.interface.ts`

Same pattern but with `image_url` required and edit-specific fields.

### 4. (If edit variant) Infrastructure Edit Model Class
**Path**: `src/infrastructure/services/ai/image-generation/models/{model-name}-edit-image.model.ts`

Same pattern extending `BaseFalImageModel`.

## Files to Modify

### 5. Enum — Add model ID(s)
**File**: `src/domain/ai/services/image-generation/image-generation-models.enum.ts`

```typescript
// {Model Name}
{ENUM_KEY} = 'fal-ai/{model-path}',
// If edit variant:
{ENUM_KEY}_EDIT = 'fal-ai/{model-path}/edit',
```

### 6. Union Types — Add to input/output unions
**File**: `src/domain/ai/services/image-generation/image-generation.service.interface.ts`

- Add `import type { I{ModelName}Input, I{ModelName}Output } from './models/{model-name}.interface'`
- Add `| I{ModelName}Input` to `IImageGenerationInput` union
- Add `| I{ModelName}Output` to `IImageGenerationOutput` union

### 7. Generation Service — Add injection + switch case
**File**: `src/infrastructure/services/ai/image-generation/image-generation.service.ts`

- Add import for interface type and model class
- Add `@inject({ModelName}ImageModel) private readonly {modelName}Model: {ModelName}ImageModel` to constructor
- Add `case ImageGenerationModel.{ENUM_KEY}: return this.{modelName}Model.generate(input as I{ModelName}Input)` to switch

### 8. Credit Costs — Add pricing entries
**File**: `src/config/credit-costs.ts`

- Add to `CREDIT_COSTS.image_generation`:
  ```typescript
  [ImageGenerationModelEnum.{ENUM_KEY}]: {calculated_credits},
  ```
- Add to `MODEL_PRICING_FALLBACK`:
  ```typescript
  [ImageGenerationModelEnum.{ENUM_KEY}]: { unitPrice: {price_per_unit}, unit: '{unit}' },
  ```
- If edit variant, add to both `CREDIT_COSTS.image_edit` and `MODEL_PRICING_FALLBACK` too

### 9. UI Model Metadata
**File**: `src/app/_components/ai/floating-prompt-input/model-config.ts`

- If new family, add family string to `ModelMetadata.family` union type
- Add entry to `MODELS_METADATA`:
  ```typescript
  {
    id: ImageGenerationModel.{ENUM_KEY},
    name: '{camelCaseName}',
    descriptionKey: '{camelCaseName}',
    category: 'generation',
    family: '{family-name}',
  },
  ```

### 10. UI Settings — Add conditional rendering block
**File**: `src/app/_components/ai/floating-prompt-input/prompt-input-settings.tsx`

Add a conditional block for the new model family's unique parameters:
```tsx
{effectiveFamily === '{family-name}' && (
  <div className="space-y-6">
    {/* Render controls for each model-specific parameter */}
    {/* Use Slider for numeric ranges, Switch for booleans, buttons for enums */}
  </div>
)}
```

If the model shares parameters with an existing family (e.g., guidance_scale like nano-banana/flux),
add the family to the existing condition instead:
```tsx
{(effectiveFamily === 'nano-banana' || effectiveFamily === 'flux' || effectiveFamily === '{family-name}') && (
```

### 11. UI State Context — Add state variables (if new parameter types)
**File**: `src/app/_components/ai/floating-prompt-input/context/model-context.tsx`

Only needed if the model has parameters not already in the context. Existing parameters:
- `guidanceScale`, `inferenceSteps`, `negativePrompt`, `safetyChecker`
- `quality`, `style`, `strength`, `resolution`
- `webSearch`, `safetyTolerance`, `promptExpansion`, `background`, `inputFidelity`

If a new parameter is needed, add `useState` + expose via context.

### 12. UI Generation Context — Map params to submission
**File**: `src/app/_components/ai/floating-prompt-input/context/generation-context.tsx`

If new state variables were added, include them in the options object assembled during submission.

### 13. Translations
**File**: `messages/en-us/domains/ai/components.json`

Add translation keys for any new UI labels under `floatingPromptInput.settings`.

## Credit Calculation Formula

```
CREDITS_PER_DOLLAR = 250
credits = Math.ceil(unitPrice_USD * CREDITS_PER_DOLLAR)
```

| Unit Type | Calculation |
|-----------|-------------|
| `image` | `unitPrice * num_images * 250` |
| `megapixel` | `unitPrice * (width*height/1_000_000) * 250` |
| `second` | `unitPrice * duration_seconds * 250` |
| `video` | `unitPrice * 1 * 250` |

The `CREDIT_COSTS` value is the default for a single standard generation (1 image, default size).
