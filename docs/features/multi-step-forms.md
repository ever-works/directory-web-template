---
id: multi-step-forms
title: Multi-Step Forms
sidebar_label: Multi-Step Forms
sidebar_position: 20
---

# Multi-Step Forms

The Ever Works Template includes a generic multi-step form system with step tracking, progress calculation, validation management, and a concrete implementation for item creation/editing. The system splits complex forms into manageable steps with navigation controls, a visual step indicator, and conditional step rendering.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `useMultiStepForm` | `hooks/use-multi-step-form.ts` | Generic multi-step form state management hook |
| `MultiStepItemForm` | `components/admin/items/multi-step-item-form.tsx` | Item form implementation using the multi-step hook |
| `StepIndicator` | `components/ui/multi-step-form.tsx` | Visual step progress indicator |
| `StepNavigation` | `components/ui/multi-step-form.tsx` | Previous/Next/Submit navigation buttons |
| Form Steps | `components/admin/items/form-steps/` | Individual step components (BasicInfo, MediaLinks, etc.) |

## The `useMultiStepForm` Hook

A generic, reusable hook for managing multi-step form state:

### Interface

```tsx
interface UseMultiStepFormOptions {
  totalSteps: number;        // Total number of steps
  initialStep?: number;      // Starting step (default: 1)
  onStepChange?: (step: number) => void;  // Callback on step change
  onComplete?: () => void;   // Callback when form is completed
}

interface UseMultiStepFormReturn {
  currentStep: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  completedSteps: Set<number>;
  progress: number;          // Percentage (0-100)
  goToNext: () => boolean;
  goToPrevious: () => boolean;
  goToStep: (step: number) => boolean;
  markStepAsCompleted: (step: number) => void;
  markStepAsIncomplete: (step: number) => void;
  reset: () => void;
}
```

### Usage

```tsx
import { useMultiStepForm } from '@/hooks/use-multi-step-form';

function MyWizard() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    completedSteps,
    progress,
    goToNext,
    goToPrevious,
    goToStep,
    markStepAsCompleted
  } = useMultiStepForm({
    totalSteps: 4,
    initialStep: 1,
    onStepChange: (step) => console.log('Now on step:', step),
    onComplete: () => console.log('Form completed!')
  });

  return (
    <div>
      <p>Step {currentStep} of 4 ({progress}% complete)</p>
      <button onClick={goToPrevious} disabled={isFirstStep}>Back</button>
      <button onClick={goToNext} disabled={isLastStep}>Next</button>
    </div>
  );
}
```

### Navigation Methods

| Method | Returns | Description |
|---|---|---|
| `goToNext()` | `boolean` | Advances to next step; calls `onComplete` if on last step; returns `false` if cannot advance |
| `goToPrevious()` | `boolean` | Returns to previous step; returns `false` if on first step |
| `goToStep(step)` | `boolean` | Jumps to a specific step; returns `false` if step is out of bounds |
| `markStepAsCompleted(step)` | `void` | Adds step to the completed set |
| `markStepAsIncomplete(step)` | `void` | Removes step from the completed set |
| `reset()` | `void` | Resets to initial step and clears all completed steps |

### Progress Calculation

Progress is calculated as a percentage based on the current step:

```tsx
const progress = (currentStep / totalSteps) * 100;
```

### Boundary Guards

The hook includes guards to prevent invalid navigation:

```tsx
const goToStep = (step: number): boolean => {
  if (step < 1 || step > totalSteps) {
    return false;  // Out of bounds
  }
  setCurrentStep(step);
  onStepChange?.(step);
  return true;
};

const goToNext = (): boolean => {
  if (isLastStep) {
    onComplete?.();
    return false;  // Already at last step
  }
  return goToStep(currentStep + 1);
};
```

## Multi-Step Item Form

The `MultiStepItemForm` is a concrete implementation that uses `useMultiStepForm` for creating and editing items:

```tsx
import { MultiStepItemForm } from '@/components/admin/items/multi-step-item-form';

<MultiStepItemForm
  item={existingItem}        // null for create mode
  mode="create"              // 'create' | 'edit'
  onSubmit={(data) => handleSubmit(data)}
  onCancel={() => router.back()}
  isLoading={false}
/>
```

### Form Steps

The form consists of up to 5 steps, with the Location step being conditional:

| Step | Component | Data Type | Description |
|---|---|---|---|
| 1 | `BasicInfoStep` | `BasicInfoData` | Item name, slug, and description |
| 2 | `MediaLinksStep` | `MediaLinksData` | Icon URL and source URL |
| 3 | `ClassificationStep` | `ClassificationData` | Category and tags arrays |
| 4 (conditional) | `LocationStep` | `LocationStepData` | Address, coordinates, service area |
| 4 or 5 | `ReviewStep` | `ReviewData` | Featured status and item status |

### Conditional Location Step

The Location step is conditionally included based on location settings:

```tsx
const { settings: locationSettings } = useLocationSettings();
const locationEnabled = locationSettings.enabled;

const FORM_STEPS = useMemo(() => {
  const steps = [
    { id: 'basic-info', title: t('STEPS.BASIC_INFO.TITLE'), description: '...' },
    { id: 'media-links', title: t('STEPS.MEDIA_LINKS.TITLE'), description: '...' },
    { id: 'classification', title: t('STEPS.CLASSIFICATION.TITLE'), description: '...' },
  ];

  if (locationEnabled) {
    steps.push({ id: 'location', title: t('STEPS.LOCATION.TITLE'), description: '...' });
  }

  steps.push({ id: 'review', title: t('STEPS.REVIEW.TITLE'), description: '...' });

  return steps;
}, [t, locationEnabled]);
```

### Form Data Structure

```tsx
interface FormData {
  basicInfo: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  mediaLinks: {
    icon_url: string;
    source_url: string;
  };
  classification: {
    category: string[];
    tags: string[];
  };
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    service_area?: string;
    is_remote?: boolean;
    geocoded_by?: string;
  };
  review: {
    featured: boolean;
    status: string;
  };
}
```

### Step Validation

Each step component reports its validation state through a callback:

```tsx
const handleStepValidation = (step: number, isValid: boolean) => {
  setStepValidation(prev => ({ ...prev, [step]: isValid }));

  if (isValid) {
    markStepAsCompleted(step);
  } else {
    markStepAsIncomplete(step);
  }
};
```

Navigation to the next step is only allowed when the current step is valid:

```tsx
const handleNext = () => {
  if (stepValidation[currentStep]) {
    goToNext();
  }
};
```

### Step Click Navigation

Users can click on completed steps to navigate back:

```tsx
const handleStepClick = (step: number) => {
  const canNavigate = completedSteps.has(step);
  if (canNavigate) {
    goToStep(step);
  }
};
```

### Form Submission

On the final step, all form data sections are combined into a single request object:

```tsx
function handleFormSubmit() {
  const combinedData = {
    ...formData.basicInfo,
    ...formData.mediaLinks,
    ...formData.classification,
    ...formData.review,
    ...(locationEnabled && hasLocationData(formData.location)
      ? { location: formData.location }
      : {}),
  };
  onSubmit(combinedData);
}
```

### Edit Mode Data Population

When editing an existing item, form data is populated from the item prop:

```tsx
useEffect(() => {
  if (item && mode === 'edit') {
    setFormData({
      basicInfo: { id: item.id, name: item.name, slug: item.slug, description: item.description },
      mediaLinks: { icon_url: item.icon_url || '', source_url: item.source_url },
      classification: {
        category: Array.isArray(item.category) ? item.category : [],
        tags: Array.isArray(item.tags) ? item.tags : []
      },
      location: { /* ...mapped from item.location */ },
      review: { featured: item.featured || false, status: item.status }
    });
  }
}, [item, mode]);
```

## UI Components

### Step Indicator

Displays a visual progress bar with step circles:

```tsx
<StepIndicator
  steps={FORM_STEPS}
  currentStep={currentStep}
  completedSteps={completedSteps}
  onStepClick={handleStepClick}
  className="mb-8"
/>
```

### Step Navigation

Renders Previous, Next, Submit, and Cancel buttons:

```tsx
<StepNavigation
  currentStep={currentStep}
  totalSteps={FORM_STEPS.length}
  isFirstStep={isFirstStep}
  isLastStep={isLastStep}
  canGoNext={canGoNext}
  canGoPrevious={canGoPrevious}
  isSubmitting={isLoading}
  onNext={handleNext}
  onPrevious={handlePrevious}
  onCancel={onCancel}
  nextLabel={t('NAVIGATION.NEXT')}
  previousLabel={t('NAVIGATION.PREVIOUS')}
  submitLabel={mode === 'create' ? t('NAVIGATION.CREATE') : t('NAVIGATION.UPDATE')}
  cancelLabel={t('NAVIGATION.CANCEL')}
  stepCounterLabel={t('NAVIGATION.STEP_COUNTER', { current: currentStep, total: FORM_STEPS.length })}
/>
```

## Internationalization

All form labels and step descriptions use `next-intl` under the `admin.ITEM_FORM` namespace:

| Key | Usage |
|---|---|
| `STEPS.BASIC_INFO.TITLE` | Step 1 title |
| `STEPS.MEDIA_LINKS.TITLE` | Step 2 title |
| `STEPS.CLASSIFICATION.TITLE` | Step 3 title |
| `STEPS.LOCATION.TITLE` | Step 4 title (conditional) |
| `STEPS.REVIEW.TITLE` | Final step title |
| `NAVIGATION.NEXT` | Next button label |
| `NAVIGATION.PREVIOUS` | Previous button label |
| `NAVIGATION.CREATE` | Submit button label (create mode) |
| `NAVIGATION.UPDATE` | Submit button label (edit mode) |

## Key Files

| File | Path |
|---|---|
| Multi-Step Form Hook | `hooks/use-multi-step-form.ts` |
| Multi-Step Item Form | `components/admin/items/multi-step-item-form.tsx` |
| Step UI Components | `components/ui/multi-step-form.tsx` |
| Form Step Components | `components/admin/items/form-steps/` |
