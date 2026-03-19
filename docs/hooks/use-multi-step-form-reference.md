---
id: use-multi-step-form-reference
title: useMultiStepForm
sidebar_label: useMultiStepForm
sidebar_position: 32
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useMultiStepForm

A React hook for managing multi-step form navigation, step completion tracking, and progress calculation. It provides a headless state machine for wizard-style forms without imposing any UI constraints.

## Import

```typescript
import { useMultiStepForm } from '@/hooks/use-multi-step-form';
import type { UseMultiStepFormOptions, UseMultiStepFormReturn } from '@/hooks/use-multi-step-form';
```

## API Reference

### Parameters

```typescript
function useMultiStepForm(options: UseMultiStepFormOptions): UseMultiStepFormReturn;
```

#### `UseMultiStepFormOptions`

| Property | Type | Default | Description |
|---|---|---|---|
| `totalSteps` | `number` | *required* | The total number of steps in the form. |
| `initialStep` | `number` | `1` | The step to start on (1-indexed). |
| `onStepChange` | `(step: number) => void` | `undefined` | Callback invoked whenever the active step changes. |
| `onComplete` | `() => void` | `undefined` | Callback invoked when `goToNext()` is called on the last step. |

### Return Value

#### `UseMultiStepFormReturn`

| Property | Type | Description |
|---|---|---|
| `currentStep` | `number` | The currently active step (1-indexed). |
| `isFirstStep` | `boolean` | `true` if the current step is step 1. |
| `isLastStep` | `boolean` | `true` if the current step equals `totalSteps`. |
| `completedSteps` | `Set<number>` | Set of step numbers that have been marked as completed. |
| `progress` | `number` | Completion percentage from `0` to `100`, calculated as `(currentStep / totalSteps) * 100`. |
| `goToNext` | `() => boolean` | Advances to the next step. Returns `true` if navigation succeeded, `false` if already on the last step (triggers `onComplete` instead). |
| `goToPrevious` | `() => boolean` | Goes back to the previous step. Returns `true` if navigation succeeded, `false` if already on step 1. |
| `goToStep` | `(step: number) => boolean` | Jumps to a specific step. Returns `false` if the step is out of range. |
| `markStepAsCompleted` | `(step: number) => void` | Adds a step number to the `completedSteps` set. |
| `markStepAsIncomplete` | `(step: number) => void` | Removes a step number from the `completedSteps` set. |
| `reset` | `() => void` | Resets to `initialStep` and clears all completed steps. |

## Usage Examples

### Basic Wizard Form

```tsx
function OnboardingWizard() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    progress,
    goToNext,
    goToPrevious,
    markStepAsCompleted,
  } = useMultiStepForm({
    totalSteps: 3,
    onComplete: () => console.log('Onboarding complete!'),
  });

  const handleNext = () => {
    markStepAsCompleted(currentStep);
    goToNext();
  };

  return (
    <div>
      <div className="w-full bg-gray-200 rounded">
        <div className="bg-blue-500 h-2 rounded" style={{ width: `${progress}%` }} />
      </div>
      <p>Step {currentStep} of 3</p>

      {currentStep === 1 && <ProfileStep />}
      {currentStep === 2 && <PreferencesStep />}
      {currentStep === 3 && <ConfirmationStep />}

      <div className="flex gap-2 mt-4">
        {!isFirstStep && <button onClick={goToPrevious}>Back</button>}
        <button onClick={handleNext}>
          {isLastStep ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
```

### With Per-Step Validation

```tsx
function ValidatedForm() {
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const form = useMultiStepForm({
    totalSteps: 4,
    onStepChange: (step) => console.log(`Navigated to step ${step}`),
  });

  const validateAndProceed = async () => {
    const isValid = await validateStep(form.currentStep);
    if (isValid) {
      form.markStepAsCompleted(form.currentStep);
      setStepErrors((prev) => { const copy = { ...prev }; delete copy[form.currentStep]; return copy; });
      form.goToNext();
    } else {
      setStepErrors((prev) => ({ ...prev, [form.currentStep]: 'Please fill in all required fields.' }));
    }
  };

  return (
    <div>
      <StepIndicator
        totalSteps={4}
        currentStep={form.currentStep}
        completedSteps={form.completedSteps}
      />
      {stepErrors[form.currentStep] && (
        <p className="text-red-500">{stepErrors[form.currentStep]}</p>
      )}
      <StepContent step={form.currentStep} />
      <button onClick={validateAndProceed}>
        {form.isLastStep ? 'Submit' : 'Continue'}
      </button>
    </div>
  );
}
```

### Step Indicator Component

```tsx
function StepIndicator({ totalSteps, currentStep, completedSteps }: {
  totalSteps: number;
  currentStep: number;
  completedSteps: Set<number>;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === currentStep
              ? 'bg-blue-500 text-white'
              : completedSteps.has(step)
              ? 'bg-green-500 text-white'
              : 'bg-gray-200'
          }`}
        >
          {completedSteps.has(step) ? '✓' : step}
        </div>
      ))}
    </div>
  );
}
```

## Configuration

This hook is entirely client-side and requires no server configuration or providers. It is a `"use client"` component.

### Integration with Form Libraries

The hook manages step navigation only. Combine it with `react-hook-form` for field-level validation:

```tsx
const form = useForm();
const stepper = useMultiStepForm({ totalSteps: 3 });

const handleNext = async () => {
  const fieldsForStep = stepFieldMap[stepper.currentStep];
  const isValid = await form.trigger(fieldsForStep);
  if (isValid) stepper.goToNext();
};
```

## Edge Cases and Gotchas

- **1-Indexed Steps**: Steps are 1-indexed, not 0-indexed. Step 1 is the first step, and `totalSteps` is the last.
- **goToNext on Last Step**: Calling `goToNext()` on the last step does not advance. It calls `onComplete` instead and returns `false`.
- **goToPrevious on First Step**: Calling `goToPrevious()` on step 1 is a no-op and returns `false`.
- **goToStep Bounds Checking**: `goToStep(0)` and `goToStep(totalSteps + 1)` both return `false`. Always check the return value if you need to know whether navigation succeeded.
- **Progress Calculation**: Progress is based on `currentStep`, not `completedSteps`. A user on step 2 of 4 shows 50% progress regardless of which steps are marked complete.
- **completedSteps Persistence**: The `completedSteps` set is in-memory only. If you need persistence across page loads, serialize and restore it separately, then use `markStepAsCompleted` on mount.
- **Reset Behavior**: `reset()` clears all completed steps and returns to `initialStep`. It does not trigger `onStepChange`.

## Related Hooks

- [useToast](./use-toast-reference.md) -- Show toast notifications on step validation errors or form completion.
- [useCheckoutButton](./use-checkout-reference.md) -- Use as the final step in a multi-step checkout wizard.
