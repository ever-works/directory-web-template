---
id: use-payment-flow-reference
title: usePaymentFlow Hook Reference
sidebar_label: usePaymentFlow
sidebar_position: 82
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePaymentFlow

A state management hook for controlling the payment flow selection in multi-step submission forms. Manages flow selection (pay-at-start vs. pay-at-end), computes active wizard steps, tracks submission status, and provides animation helpers for flow transitions.

**Source file:** `template/hooks/use-payment-flow.ts`

## Overview

`usePaymentFlow` handles the logic for choosing between two payment flows in the item submission process:

- **Pay at Start**: User pays immediately and gets instant publication.
- **Pay at End**: User submits details first and pays after admin approval.

The hook integrates with `localStorage` for persistence across sessions (via `usePaymentFlowStorage`), computes which wizard steps should be active based on the selected flow, and manages a `submissionStatus` state machine that governs whether the user can proceed through the wizard.

## Signature

```ts
function usePaymentFlow(options?: UsePaymentFlowOptions): UsePaymentFlowReturn
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | `UsePaymentFlowOptions` | `{}` | Optional configuration for the hook |

### UsePaymentFlowOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `initialFlow` | `PaymentFlow` | `PaymentFlow.PAY_AT_END` | The default flow when no stored selection exists |
| `enableAnimations` | `boolean` | `true` | Whether to enable transition animations when switching flows |
| `autoSave` | `boolean` | `true` | Whether to persist the selected flow to `localStorage` |

## Return Value

### State

| Property | Type | Description |
|----------|------|-------------|
| `selectedFlow` | `PaymentFlow` | The currently selected payment flow |
| `flowConfig` | `PaymentFlowConfig` | Full configuration object for the selected flow (title, description, features, benefits, colors) |
| `submissionStatus` | `SubmissionStatus` | Current status of the submission in the flow |
| `isAnimating` | `boolean` | Whether a flow switch animation is in progress |
| `isSelecting` | `boolean` | Whether a flow selection is being processed (includes animation delay) |

### Actions

| Property | Type | Description |
|----------|------|-------------|
| `setSelectedFlow` | `(flow: PaymentFlow) => void` | Directly set the selected flow (with optional auto-save) |
| `selectFlow` | `(flow: PaymentFlow) => Promise<void>` | Select a flow with animation delay and status reset. No-ops if already selecting. |
| `resetFlow` | `() => void` | Reset to the initial flow, clear submission status, and stop all animations |

### Computed Values

| Property | Type | Description |
|----------|------|-------------|
| `isPayAtStart` | `boolean` | Whether the selected flow is `PAY_AT_START` |
| `isPayAtEnd` | `boolean` | Whether the selected flow is `PAY_AT_END` |
| `shouldShowPaymentStep` | `boolean` | Whether the payment step should be visible given the current flow and submission status |
| `activeSteps` | `number[]` | Array of active step numbers for the wizard UI |
| `canProceed` | `boolean` | Whether the user is allowed to move forward based on submission status and selected flow |

### Animation Helpers

| Property | Type | Description |
|----------|------|-------------|
| `triggerAnimation` | `() => void` | Manually trigger a 500ms animation cycle. No-ops if animations are disabled. |
| `getAnimationDelay` | `(index: number) => number` | Returns `index * 100` ms delay for staggered list animations. Returns `0` when animations are disabled. |

## Types

### PaymentFlow

```ts
enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}
```

### SubmissionStatus

```ts
enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

### PaymentFlowConfig

```ts
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  darkBgColor: string;
  darkBorderColor: string;
  features: string[];
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;
  isDefault?: boolean;
}
```

## Implementation Details

### Step Computation

The `activeSteps` array is computed based on the selected flow:

- **Both flows**: Steps 1 (choose flow) and 2 (details) are always active, plus step 4 (review).
- **Pay at Start**: Adds step 3 (payment before review).
- **Pay at End**: Adds step 5 (payment after review/approval).

### canProceed State Machine

The `canProceed` value follows this logic:

| SubmissionStatus | canProceed |
|------------------|------------|
| `DRAFT` | `true` |
| `PENDING_PAYMENT` | `true` (either flow) |
| `PAID` | `true` only for `PAY_AT_START` |
| `PUBLISHED` | `true` only for `PAY_AT_END` |
| `REJECTED` | `false` |

### shouldShowPaymentStep Logic

- **Pay at Start**: Shows payment when status is `DRAFT` or `PENDING_PAYMENT`.
- **Pay at End**: Shows payment when status is `PAID` (meaning review is complete, payment pending).

### SSR Hydration Safety

The hook initializes with `initialFlow` on the server and synchronizes with the `localStorage` value after client-side hydration via a `useEffect`. The `isHydrated` flag prevents `localStorage` writes during server rendering.

### Flow Selection with Animation

The `selectFlow` function is debounced -- it returns early if `isSelecting` is already `true`. When animations are enabled, it introduces a 150ms delay for a smoother UX before committing the selection.

## Usage Examples

### Flow selection UI

```tsx
import { usePaymentFlow } from '@/hooks/use-payment-flow';
import { PaymentFlow } from '@/lib/payment/types/payment';

function FlowSelector() {
  const {
    selectedFlow,
    selectFlow,
    flowConfig,
    isSelecting,
    getAnimationDelay,
  } = usePaymentFlow();

  return (
    <div className="grid grid-cols-2 gap-4">
      {(['pay_at_start', 'pay_at_end'] as PaymentFlow[]).map((flow, i) => (
        <button
          key={flow}
          onClick={() => selectFlow(flow)}
          disabled={isSelecting}
          className={selectedFlow === flow ? 'ring-2 ring-primary' : ''}
          style={{ animationDelay: `${getAnimationDelay(i)}ms` }}
        >
          {flow === 'pay_at_start' ? 'Pay First' : 'Pay Later'}
        </button>
      ))}

      <div className="col-span-2 mt-4">
        <h3>{flowConfig.title}</h3>
        <p>{flowConfig.description}</p>
        <ul>
          {flowConfig.features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

### Multi-step wizard integration

```tsx
import { usePaymentFlow } from '@/hooks/use-payment-flow';

function SubmissionWizard() {
  const {
    selectedFlow,
    activeSteps,
    canProceed,
    shouldShowPaymentStep,
    isPayAtStart,
    submissionStatus,
  } = usePaymentFlow();

  return (
    <div>
      <StepIndicator steps={activeSteps} />

      <Step1FlowSelection />
      <Step2DetailsForm />

      {isPayAtStart && shouldShowPaymentStep && (
        <Step3Payment />
      )}

      <Step4Review />

      {!isPayAtStart && shouldShowPaymentStep && (
        <Step5Payment />
      )}

      <button disabled={!canProceed}>
        {submissionStatus === 'draft' ? 'Continue' : 'Submit'}
      </button>
    </div>
  );
}
```

### Disabling animations and auto-save

```tsx
function SimplifiedFlowPicker() {
  const { selectedFlow, setSelectedFlow, flowConfig } = usePaymentFlow({
    enableAnimations: false,
    autoSave: false,
    initialFlow: PaymentFlow.PAY_AT_START,
  });

  return (
    <select
      value={selectedFlow}
      onChange={(e) => setSelectedFlow(e.target.value as PaymentFlow)}
    >
      <option value="pay_at_start">Pay First</option>
      <option value="pay_at_end">Pay Later</option>
    </select>
  );
}
```

### Resetting the flow

```tsx
function ResetableFlow() {
  const { resetFlow, selectedFlow, submissionStatus } = usePaymentFlow();

  return (
    <div>
      <p>Flow: {selectedFlow} | Status: {submissionStatus}</p>
      <button onClick={resetFlow}>Start Over</button>
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `react` | `useState`, `useCallback`, `useMemo`, `useEffect` |
| `@/lib/payment/types/payment` | `PaymentFlow` and `SubmissionStatus` enums |
| `@/lib/config/payment-flows` | `getPaymentFlowConfig` for flow configuration lookup |
| `./use-local-storage` | `usePaymentFlowStorage` for persisting the selection |

## Related Hooks

- [`useCheckoutButton`](/docs/template/hooks/use-checkout-button-reference) -- Checkout button logic that consumes the flow selection
- [`useMultiStepForm`](/docs/template/hooks/use-multi-step-form-reference) -- Generic multi-step form state management
- [`useDetailForm`](/docs/template/hooks/use-detail-form-reference) -- Manages the details step of the submission wizard
- [`useLocalStorage`](/docs/template/hooks/use-local-storage-reference) -- Underlying storage hook used for persistence
