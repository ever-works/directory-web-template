---
id: use-detail-form-reference
title: useDetailForm Hook Reference
sidebar_label: useDetailForm
sidebar_position: 77
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useDetailForm

Manages the complete multi-step form state for item submission and editing. Handles form data, field validation, step navigation, link management, tag toggling, and progress tracking. Integrates with feature flags for categories, tags, and location requirements.

**Source:** `template/hooks/use-detail-form.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useDetailForm` | Full multi-step form state management for item details |

## Exported Types and Constants

```ts
interface ProductLink {
  id: string;
  url: string;
  label: string;
  type: 'main' | 'secondary';
  icon?: string;
}

interface FormData {
  name: string;
  link: string;
  links: ProductLink[];
  category: string | null;
  tags: string[];
  description: string;
  introduction: string;
  [key: string]: any;
}

export interface DetailsFormProps {
  initialData?: Partial<FormData>;
  selectedPlan: PaymentPlan | null;
  onSubmit: (data: FormData) => void;
  onBack: () => void;
}
```

### Step Definitions

```ts
export const STEPS = [
  { id: 1, title: 'BASIC_INFO',      fields: ['name', 'mainLink'],  icon: Type     },
  { id: 2, title: 'CATEGORY_TAGS',   fields: ['category'],          icon: Tag      },
  { id: 3, title: 'DESCRIPTION',     fields: ['description'],       icon: FileText },
  { id: 4, title: 'REVIEW',          fields: [],                    icon: Eye      },
];
```

### Preset Options

```ts
export const CATEGORIES = [
  'AI Tools', 'Analytics', 'API', 'Automation', 'Business', 'Content',
  'Design', 'Development', 'E-commerce', 'Education', 'Finance', 'Health',
  'Marketing', 'Productivity', 'Security', 'Social', 'Other',
];

export const TAGS = [
  'Free', 'Paid', 'Open Source', 'SaaS', 'Mobile', 'Desktop', 'Web',
  'API', 'AI', 'Machine Learning', 'Automation', 'No-Code', 'Low-Code',
  'Developer Tools', 'Business Tools',
];
```

---

## Signature

```ts
function useDetailForm(
  initialData: Partial<FormData>,
  onSubmit: (data: FormData) => void,
): UseDetailFormReturn;
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialData` | `Partial<FormData>` | Initial values to pre-populate the form. Merged with defaults. |
| `onSubmit` | `(data: FormData) => void` | Callback invoked on successful form submission. |

---

## Return Values

```ts
const {
  // Step navigation
  currentStep,                // number -- Current step (1-based)
  setCurrentStep,             // (step: number) => void -- Jump to a step directly
  nextStep,                   // () => void -- Advance to next step (validates current first)
  prevStep,                   // () => void -- Go back one step (min: 1)
  validateStep,               // (step: number) => boolean -- Check if a step is valid

  // Form data
  formData,                   // FormData -- Current form values
  setFormData,                // React.Dispatch<SetStateAction<FormData>>

  // Field tracking
  focusedField,               // string | null -- Currently focused field name
  setFocusedField,            // (field: string | null) => void
  completedFields,            // Set<string> -- Fields that have been filled
  animatingLinkId,            // string | null -- Link ID currently animating
  setAnimatingLinkId,         // (id: string | null) => void

  // Input handlers
  handleInputChange,          // (e: ChangeEvent) => void -- Standard input handler
  handleLinkChange,           // (id: string, field: 'url' | 'label', value: string) => void
  handleTagToggle,            // (tag: string) => void -- Toggle a tag on/off
  handleSubmit,               // (e: FormEvent) => void -- Form submission handler

  // Link management
  addLink,                    // () => void -- Add a new secondary link
  removeLink,                 // (id: string) => void -- Remove a link by ID (not main)

  // Progress
  progressPercentage,         // number -- 0-100 completion percentage
  completedRequiredFields,    // number -- Count of filled required fields
  requiredFieldsCount,        // number -- Total required fields count
  requiredFields,             // string[] -- List of required field names

  // Utility
  getIconComponent,           // () => LucideIcon -- Returns Globe icon component
} = useDetailForm(initialData, onSubmit);
```

---

## Implementation Details

### Initial Data Merging

When `initialData` is provided, the hook merges it with default values:

```ts
const defaultData = {
  name: '',
  link: '',
  links: [{ id: 'main-link', url: '', label: 'Main Website', type: 'main', icon: 'Globe' }],
  category: '',
  tags: [],
  description: '',
  introduction: '',
};
```

If `initialData.link` is provided, it is synced to the main link's URL. The `link` field always mirrors the main link's URL for backward compatibility.

### Link Synchronization

The `link` field and the `links[0].url` (main link) are always kept in sync:
- `handleLinkChange` updates both the link in the `links` array and the top-level `link` field.
- On submission, the `link` field is explicitly set to the main link's URL.

### Completed Fields Auto-Sync

A `useEffect` watches key form fields and automatically maintains the `completedFields` Set:

| Field | Tracked When |
|-------|-------------|
| `name` | Non-empty after trim |
| `link` | Main link URL is non-empty |
| `description` | Non-empty after trim |
| `introduction` | Non-empty after trim |
| `tags` | Array has at least one element |
| `category` | Non-empty after trim |
| `selectedPlan` | Non-empty after trim |

### Step Validation

`validateStep(step)` uses the `STEP_DEFINITIONS` from the validation module. For step 1, it additionally checks location data when `requireLocationOnSubmit` is enabled -- requiring either `is_remote: true` or valid coordinates.

### Feature Flag Integration

- **Categories:** When `categoriesEnabled` is `false`, the `category` field is set to `null` on submission and excluded from required fields.
- **Tags:** When `tagsEnabled` is `false`, the `tags` array is emptied on submission.
- **Location:** When `locationSettings.enabled && locationSettings.requireLocationOnSubmit` is `true`, location becomes a required field for step 1 validation and progress calculation.

### Progress Calculation

Required fields are dynamically determined based on feature flags:

| Flag State | Required Fields |
|-----------|----------------|
| Categories enabled | `name`, `link`, `category`, `description` |
| Categories disabled | `name`, `link`, `description` |
| Location required | Above + `location` |

`progressPercentage` is calculated as `(completedRequiredFields / requiredFieldsCount) * 100`.

### Link Animation

- `addLink()` sets `animatingLinkId` to the new link's ID and clears it after 500ms.
- `removeLink(id)` sets `animatingLinkId` to the target ID, then removes the link after 300ms for exit animation.
- The main link (type `'main'`) cannot be removed.

---

## Usage: Multi-Step Form

```tsx
function ItemSubmissionForm({ initialData, onSubmit, onBack }) {
  const form = useDetailForm(initialData || {}, onSubmit);

  return (
    <form onSubmit={form.handleSubmit}>
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded">
        <div
          className="h-full bg-blue-500 rounded transition-all"
          style={{ width: `${form.progressPercentage}%` }}
        />
      </div>
      <p>{form.completedRequiredFields} / {form.requiredFieldsCount} required fields</p>

      {/* Step content */}
      {form.currentStep === 1 && (
        <div>
          <input
            name="name"
            value={form.formData.name}
            onChange={form.handleInputChange}
            placeholder="Item name"
          />
          {form.formData.links.map((link) => (
            <input
              key={link.id}
              value={link.url}
              onChange={(e) => form.handleLinkChange(link.id, 'url', e.target.value)}
              placeholder={link.label}
            />
          ))}
          <button type="button" onClick={form.addLink}>Add Link</button>
        </div>
      )}

      {form.currentStep === 2 && (
        <div>
          <select
            name="category"
            value={form.formData.category || ''}
            onChange={form.handleInputChange}
          >
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => form.handleTagToggle(tag)}
                className={form.formData.tags.includes(tag) ? 'bg-blue-100' : ''}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.currentStep === 3 && (
        <textarea
          name="description"
          value={form.formData.description}
          onChange={form.handleInputChange}
          placeholder="Describe this item..."
        />
      )}

      {form.currentStep === 4 && (
        <div>
          <h3>Review your submission</h3>
          <p>Name: {form.formData.name}</p>
          <p>Category: {form.formData.category}</p>
          <p>Tags: {form.formData.tags.join(', ')}</p>
          <p>Description: {form.formData.description}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 mt-4">
        {form.currentStep > 1 && (
          <button type="button" onClick={form.prevStep}>Back</button>
        )}
        {form.currentStep < 4 ? (
          <button
            type="button"
            onClick={form.nextStep}
            disabled={!form.validateStep(form.currentStep)}
          >
            Next
          </button>
        ) : (
          <button type="submit">Submit</button>
        )}
      </div>
    </form>
  );
}
```

## Usage: Link Management

```tsx
function LinksSection({ form }) {
  return (
    <div>
      {form.formData.links.map((link) => (
        <div
          key={link.id}
          className={form.animatingLinkId === link.id ? 'animate-fade-in' : ''}
        >
          <input
            value={link.url}
            onChange={(e) => form.handleLinkChange(link.id, 'url', e.target.value)}
          />
          <input
            value={link.label}
            onChange={(e) => form.handleLinkChange(link.id, 'label', e.target.value)}
          />
          {link.type !== 'main' && (
            <button onClick={() => form.removeLink(link.id)}>Remove</button>
          )}
        </div>
      ))}
      <button onClick={form.addLink}>Add Another Link</button>
    </div>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `react` | `useState`, `useCallback`, `useMemo`, `useEffect` for state management |
| `@/lib/constants` | `PaymentPlan` type definition |
| `@/hooks/use-categories-enabled` | `useCategoriesEnabled` for category feature flag |
| `@/hooks/use-tags-enabled` | `useTagsEnabled` for tags feature flag |
| `@/hooks/use-location-settings` | `useLocationSettings` for location requirement settings |
| `@/components/directory/details-form/validation/form-validators` | `STEP_DEFINITIONS` for step validation rules |
| `lucide-react` | Icon components for step definitions |

## Related Hooks

- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Item listing (form submits create or update items)
- [`useClientItemDetails`](/docs/template/hooks/use-client-item-details-reference) -- Provides `initialData` when editing
- [`useClientItemFilters`](/docs/template/hooks/use-client-item-filters-reference) -- Filter state for item lists
- [`useMultiStepForm`](/docs/template/hooks/use-multi-step-form-reference) -- Generic multi-step form utility
