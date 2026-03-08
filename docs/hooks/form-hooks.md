---
id: form-hooks
title: Form & Validation Hooks
sidebar_label: Form & Validation Hooks
sidebar_position: 5
---

# Form & Validation Hooks

Hooks for managing form state, multi-step form flows, detail forms with validation, and debounced search/input values.

## useMultiStepForm

Manages navigation and progress tracking for multi-step form wizards.

```
useMultiStepForm(options: UseMultiStepFormOptions): UseMultiStepFormReturn
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `totalSteps` | `number` | -- | Total number of steps in the form (required) |
| `initialStep` | `number` | `1` | Starting step number |
| `onStepChange` | `(step: number) => void` | -- | Callback fired when the step changes |
| `onComplete` | `() => void` | -- | Callback fired when `goToNext` is called on the last step |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `currentStep` | `number` | The current step number (1-based) |
| `isFirstStep` | `boolean` | Whether the current step is the first |
| `isLastStep` | `boolean` | Whether the current step is the last |
| `completedSteps` | `Set<number>` | Set of step numbers marked complete |
| `progress` | `number` | Completion percentage (0-100) |
| `goToNext` | `() => boolean` | Advance to next step; returns `false` if on last step |
| `goToPrevious` | `() => boolean` | Go to previous step; returns `false` if on first step |
| `goToStep` | `(step: number) => boolean` | Jump to a specific step; returns `false` if out of range |
| `markStepAsCompleted` | `(step: number) => void` | Mark a step as completed |
| `markStepAsIncomplete` | `(step: number) => void` | Remove a step from the completed set |
| `reset` | `() => void` | Reset to `initialStep` and clear all completed steps |

```tsx
import { useMultiStepForm } from '@/hooks/use-multi-step-form';

function Wizard() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    goToNext,
    goToPrevious,
    markStepAsCompleted,
    reset,
  } = useMultiStepForm({
    totalSteps: 4,
    onComplete: () => console.log('Form completed!'),
  });

  const handleNext = () => {
    markStepAsCompleted(currentStep);
    goToNext();
  };

  return (
    <div>
      <ProgressBar value={progress} />
      <StepContent step={currentStep} />
      {!isFirstStep && <button onClick={goToPrevious}>Back</button>}
      <button onClick={handleNext}>
        {isLastStep ? 'Submit' : 'Next'}
      </button>
    </div>
  );
}
```

---

## useDetailForm

A comprehensive hook for the item submission/editing form. Manages form state, link management, tag toggling, step validation, and progress calculation.

```
useDetailForm(
  initialData: Partial<FormData>,
  onSubmit: (data: FormData) => void
): UseDetailFormReturn
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialData` | `Partial<FormData>` | Pre-populated form values |
| `onSubmit` | `(data: FormData) => void` | Handler called on form submission |

### FormData Shape

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Item name |
| `link` | `string` | Main website URL (synced with links array) |
| `links` | `ProductLink[]` | Array of links with `id`, `url`, `label`, `type`, `icon` |
| `category` | `string \| null` | Selected category |
| `tags` | `string[]` | Selected tags |
| `description` | `string` | Item description |
| `introduction` | `string` | Short introduction text |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `currentStep` | `number` | Current form step (1-4) |
| `formData` | `FormData` | Current form state |
| `focusedField` | `string \| null` | Currently focused field name |
| `completedFields` | `Set<string>` | Set of fields with values |
| `animatingLinkId` | `string \| null` | Link ID currently animating |
| `handleInputChange` | `(e: ChangeEvent) => void` | Generic input change handler |
| `handleLinkChange` | `(id, field, value) => void` | Update a specific link's URL or label |
| `addLink` | `() => void` | Add a new secondary link |
| `removeLink` | `(id: string) => void` | Remove a link (main link cannot be removed) |
| `handleTagToggle` | `(tag: string) => void` | Toggle a tag selection |
| `handleSubmit` | `(e: FormEvent) => void` | Form submission handler |
| `nextStep` / `prevStep` | `() => void` | Step navigation (validates before advancing) |
| `validateStep` | `(step: number) => boolean` | Check if a step's required fields are valid |
| `progressPercentage` | `number` | Overall form completion (0-100) |
| `completedRequiredFields` | `number` | Count of filled required fields |
| `requiredFieldsCount` | `number` | Total number of required fields |
| `setFormData` | `Dispatch` | Direct state setter for programmatic updates |

```tsx
import { useDetailForm } from '@/hooks/use-detail-form';

function ItemForm({ initialData, onSubmit }) {
  const {
    formData,
    handleInputChange,
    handleSubmit,
    nextStep,
    prevStep,
    currentStep,
    progressPercentage,
    validateStep,
  } = useDetailForm(initialData, onSubmit);

  return (
    <form onSubmit={handleSubmit}>
      <ProgressBar value={progressPercentage} />
      {currentStep === 1 && (
        <input name="name" value={formData.name} onChange={handleInputChange} />
      )}
      <button disabled={!validateStep(currentStep)} onClick={nextStep}>
        Next
      </button>
    </form>
  );
}
```

---

## useDebounceValue

Debounces any value, delaying updates until input has settled. Useful for search inputs, filter controls, and preventing excessive re-renders.

```
useDebounceValue<T>(value: T, delay?: number): T
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `value` | `T` | -- | The value to debounce |
| `delay` | `number` | `300` | Debounce delay in milliseconds |

**Returns:** `T` -- The debounced value (updates after `delay` ms of no change).

```tsx
import { useDebounceValue } from '@/hooks/use-debounced-value';

function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounceValue(query, 500);

  useEffect(() => {
    if (debouncedQuery) fetchResults(debouncedQuery);
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

---

## useDebounceSearch

A higher-level debounced search hook that wraps `useDebounceValue` and adds searching state tracking and an `onSearch` callback.

```
useDebounceSearch(props: UseDebounceSearchProps): UseDebounceSearchReturn
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `searchValue` | `string` | -- | Current raw search input value |
| `delay` | `number` | `300` | Debounce delay in milliseconds |
| `onSearch` | `(value: string) => void \| Promise<void>` | -- | Callback invoked with the debounced value |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `debouncedValue` | `string` | The debounced search string |
| `isSearching` | `boolean` | `true` while waiting for debounce or during async `onSearch` |
| `clearSearch` | `() => void` | Reset search state |

```tsx
import { useDebounceSearch } from '@/hooks/use-debounced-search';

function SearchableList() {
  const [query, setQuery] = useState('');

  const { debouncedValue, isSearching } = useDebounceSearch({
    searchValue: query,
    delay: 400,
    onSearch: async (value) => {
      await fetchFilteredItems(value);
    },
  });

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isSearching && <Spinner />}
    </div>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useMultiStepForm` | Multi-step wizard navigation and progress | `use-multi-step-form.ts` |
| `useDetailForm` | Item detail form with validation, links, tags | `use-detail-form.ts` |
| `useDebounceValue` | Generic value debouncing | `use-debounced-value.ts` |
| `useDebounceSearch` | Debounced search with loading state | `use-debounced-search.ts` |
