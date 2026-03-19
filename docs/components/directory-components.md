---
id: directory-components
title: Directory Listing Components
sidebar_label: Directory Listing
sidebar_position: 1
---

# Directory Listing Components

The directory components handle the submission form for adding new listings to the directory. This includes a multi-step form with basic information, payment plan selection, review and submission, along with location support and link management.

## Architecture Overview

```
template/components/directory/
  details-form.tsx           # Main multi-step form orchestrator
  details-form/
    components/
      form-navigation.tsx    # Step navigation buttons (back/next/submit)
      link-input.tsx         # Product link manager sub-component
      step-indicator.tsx     # Visual step progress indicator
    steps/
      basic-info-step.tsx    # Step 1: Name, links, category, tags, description
      payment-step.tsx       # Step 2: Plan selection (Free/Standard/Premium)
      review-step.tsx        # Step 3: Review all data before submission
    validation/
      form-validators.ts     # Step definitions and validation logic
  input-link.tsx             # Standalone link input component
  location-fields.tsx        # Location picker integration
  review-section.tsx         # Full review UI with plan summary
  type.ts                    # Shared TypeScript types
```

## Core Types

### FormData

The primary form data shape used across all steps:

```typescript
interface FormData {
  name: string;
  link: string;
  links: ProductLink[];
  category: string | null;
  tags: string[];
  description: string;
  introduction: string;
  selectedPlan?: string;
  [key: string]: any;
}
```

### ProductLink

Represents a single link entry in the form:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `url` | `string` | Full URL value |
| `label` | `string` | Display label for the link |
| `type` | `"main" \| "secondary"` | Primary vs additional link |
| `icon` | `string` (optional) | Icon identifier |

## DetailsForm

The main form component that orchestrates the three-step submission flow. It uses the `useDetailForm` hook for state management and `useEditorFieldSync` for rich-text editor integration.

```tsx
import { DetailsForm } from '@/components/directory/details-form';

<DetailsForm
  initialData={{ name: 'My Product' }}
  onSubmit={handleSubmit}
  onBack={handleBack}
  listingProps={{ categories, tags, items }}
  isSubmitting={false}
/>
```

### DetailsFormProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialData` | `Partial<FormData>` | `{}` | Pre-fill form fields |
| `onSubmit` | `(data: FormData) => void` | required | Form submission handler |
| `onBack` | `() => void` | required | Back navigation handler |
| `listingProps` | `ListingProps` | - | Categories, tags, and items for selectors |
| `isSubmitting` | `boolean` | `false` | Disable controls during submission |

### ListingProps

| Property | Type | Description |
|----------|------|-------------|
| `categories` | `Category[]` | Available categories for selection |
| `tags` | `TagType[]` | Available tags for multi-select |
| `items` | `ItemData[]` | Existing items for reference |

## Form Steps

### Step 1: BasicInfoStep

Collects the primary listing information:

- **Product Name** - Text input with validation
- **Product Links** - Dynamic list with primary and secondary links
- **Category** - Single-select from available categories
- **Tags** - Multi-select tag picker
- **Description** - Short text description
- **Introduction** - Rich text editor (synced via `useEditorFieldSync`)
- **Location** - Optional location picker (when enabled in settings)

### Step 2: PaymentStep

Presents the available payment plans:

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | Basic listing, manual review (1-2 days) |
| Standard | $10 one-time | Standard features, faster review |
| Premium | $20/week | Premium features, instant publishing |

### Step 3: ReviewStep

Displays a comprehensive summary of all entered data including product name, category, links, tags, description, selected plan with pricing, and publication status.

## Sub-Components

### StepIndicator

Visual progress bar showing current step, completed steps, and remaining steps. Supports click navigation to completed steps.

```tsx
<StepIndicator
  currentStep={2}
  onStepClick={setCurrentStep}
  completedFields={completedFields}
/>
```

### FormNavigation

Navigation controls at the bottom of each step with conditional rendering:

- Step 1: "Back" + "Next Step" (disabled until validation passes)
- Step 2: "Previous" + "Next Step"
- Step 3: "Back to Edit" + "Submit Listing"

Shows a progress indicator: "X of Y required fields completed."

```tsx
<FormNavigation
  currentStep={currentStep}
  canProceed={canProceed}
  completedRequiredFields={5}
  requiredFieldsCount={7}
  onPrevious={prevStep}
  onNext={nextStep}
  onBack={onBack}
  isSubmitting={false}
/>
```

### InputLink

The link management component allows adding multiple product links. The first link is always the "main" link (marked with a Primary badge and required). Additional secondary links can be added and removed dynamically.

#### InputLinkProps

| Prop | Type | Description |
|------|------|-------------|
| `formData` | `FormData` | Current form state |
| `setFormData` | `Dispatch<SetStateAction<FormData>>` | Form state setter |
| `animatingLinkId` | `string \| null` | Link currently being animated |
| `handleLinkChange` | `(id, field, value) => void` | Update a link field |
| `addLink` | `() => void` | Add new secondary link |
| `removeLink` | `(id: string) => void` | Remove a secondary link |

Features:
- URL validation with visual feedback (green check for valid, amber warning for invalid)
- Hover effects with gradient overlays
- Animated entry/removal transitions

### LocationFields

Integrates the `LocationPicker` component into the directory form, handling conversion between the form's `ItemLocationData` (snake_case) format and the picker's `LocationPickerValue` (camelCase) format.

```tsx
<LocationFields
  location={formData.location}
  onLocationChange={(loc) => setFormData(prev => ({ ...prev, location: loc }))}
/>
```

Only renders when location is enabled in site settings (`useLocationSettings`). Shows an "(Optional)" label when `requireLocationOnSubmit` is false.

### ReviewSection

A standalone review component used outside the multi-step form context. Displays plan summary, product information, publication status, and action buttons.

#### ReviewSectionProps

| Prop | Type | Description |
|------|------|-------------|
| `formData` | `FormData` | Complete form data to review |
| `selectedPlan` | `PaymentPlan \| null` | Chosen payment plan |
| `onSubmit` | `() => void` | Submit action callback |
| `onBack` | `() => void` | Back navigation callback |

Status determination logic:
- **Free Plan**: Status is "Pending Review" with 1-2 business day processing
- **Paid Plans**: Status is "Ready to Publish" with instant publishing

## Styling Approach

The directory components use a consistent glass-morphism design with:

- Backdrop blur effects (`backdrop-blur-xl`)
- Semi-transparent backgrounds (`bg-white/95`)
- Gradient accent borders and overlays
- Animated floating gradient orbs for visual depth
- Full dark mode support via `dark:` Tailwind variants
- Staggered entrance animations using `animationDelay`

## Integration with Editor

The `DetailsForm` component integrates with the project's rich text editor through:

```tsx
const editor = useEditor();
useEditorFieldSync(editor, formData, 'introduction', setFormData, {
  fieldName: 'introduction',
  enableLogging: true,
});
```

This keeps the `introduction` field in sync between the form state and the editor content, supporting real-time preview and bidirectional updates.
