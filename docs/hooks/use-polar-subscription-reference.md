---
id: use-polar-subscription-reference
title: usePolarSubscription Hook Reference
sidebar_label: usePolarSubscription
sidebar_position: 81
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePolarSubscription

A client-side hook for managing Polar subscription lifecycle actions: cancellation and reactivation. Provides separate mutations with independent loading, error, and success states, plus convenience wrappers for direct use.

**Source file:** `template/hooks/use-polar-subscription.ts`

## Overview

`usePolarSubscription` exposes two React Query mutations -- one for cancelling a Polar subscription and one for reactivating it. Each mutation calls the corresponding Polar API endpoint, handles retries with exponential backoff, invalidates billing-related query caches on success, and displays toast notifications for user feedback.

The file also exports `useCancelPolarSubscription`, a simplified wrapper for components that only need cancellation.

This is a client component hook (marked with `'use client'`).

## Signature

```ts
function usePolarSubscription(): {
  // Mutation functions
  cancel: (subscriptionId: string, cancelAtPeriodEnd?: boolean) => Promise<PolarSubscriptionResponse>;
  cancelSubscription: UseMutationResult<...>;
  reactivate: (subscriptionId: string) => Promise<PolarSubscriptionResponse>;
  reactivateSubscription: UseMutationResult<...>;

  // Loading states
  isCancelling: boolean;
  isReactivating: boolean;
  isLoading: boolean;

  // Error states
  error: Error | null;
  cancelError: Error | null;
  reactivateError: Error | null;
  errorMessage: string | null;
  isError: boolean;

  // Success states
  isSuccess: boolean;
  isCancelSuccess: boolean;
  isReactivateSuccess: boolean;

  // Data
  data: PolarSubscriptionResponse | undefined;

  // Reset functions
  reset: () => void;
  resetCancel: () => void;
  resetReactivate: () => void;
}
```

## Parameters

None. This hook takes no arguments.

## Return Value

### Mutation Functions

| Property | Type | Description |
|----------|------|-------------|
| `cancel` | `(subscriptionId: string, cancelAtPeriodEnd?: boolean) => Promise<PolarSubscriptionResponse>` | Cancel a subscription. Defaults to cancelling at period end. |
| `cancelSubscription` | `UseMutationResult` | The raw React Query mutation object for cancellation |
| `reactivate` | `(subscriptionId: string) => Promise<PolarSubscriptionResponse>` | Reactivate a previously cancelled subscription |
| `reactivateSubscription` | `UseMutationResult` | The raw React Query mutation object for reactivation |

### Loading States

| Property | Type | Description |
|----------|------|-------------|
| `isCancelling` | `boolean` | Whether a cancellation is in progress |
| `isReactivating` | `boolean` | Whether a reactivation is in progress |
| `isLoading` | `boolean` | `true` if either mutation is pending |

### Error States

| Property | Type | Description |
|----------|------|-------------|
| `error` | `Error \| null` | First available error from either mutation |
| `cancelError` | `Error \| null` | Error from the cancel mutation specifically |
| `reactivateError` | `Error \| null` | Error from the reactivate mutation specifically |
| `errorMessage` | `string \| null` | Human-readable error message string |
| `isError` | `boolean` | `true` if either mutation is in an error state |

### Success States

| Property | Type | Description |
|----------|------|-------------|
| `isSuccess` | `boolean` | `true` if either mutation succeeded |
| `isCancelSuccess` | `boolean` | `true` if the cancel mutation succeeded |
| `isReactivateSuccess` | `boolean` | `true` if the reactivate mutation succeeded |

### Data and Reset

| Property | Type | Description |
|----------|------|-------------|
| `data` | `PolarSubscriptionResponse \| undefined` | Response data from whichever mutation last succeeded |
| `reset` | `() => void` | Reset the cancel mutation state |
| `resetCancel` | `() => void` | Reset the cancel mutation state |
| `resetReactivate` | `() => void` | Reset the reactivate mutation state |

## Types

### CancelPolarSubscriptionData

```ts
interface CancelPolarSubscriptionData {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}
```

### ReactivatePolarSubscriptionData

```ts
interface ReactivatePolarSubscriptionData {
  subscriptionId: string;
}
```

### PolarSubscriptionResponse

```ts
interface PolarSubscriptionResponse {
  success: boolean;
  data: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd?: number | null;
    priceId?: string;
    customerId?: string;
  };
  message: string;
}
```

## Implementation Details

### API Endpoints

- **Cancel**: `POST /api/polar/subscription/{subscriptionId}/cancel` with `{ cancelAtPeriodEnd }` payload
- **Reactivate**: `POST /api/polar/subscription/{subscriptionId}/reactivate` with empty payload

### Retry Strategy

Both mutations share the same retry logic:
- Authentication errors (messages containing `'Unauthorized'`) are not retried.
- Other errors are retried up to 2 times with exponential backoff (1s, 2s, capped at 30s).

### Cache Invalidation

On success, both mutations invalidate three query keys:
- `['subscriptions']`
- `['user-subscription']`
- `['billing']`

This ensures all billing-related UI components reflect the updated subscription state.

### Error Handling

Errors are handled through the `PolarSubscriptionError` class. All errors are logged to the console and displayed to the user via `toast.error`. Success messages come from the API response `message` field with sensible fallbacks.

## Usage Examples

### Cancel subscription with confirmation

```tsx
import { usePolarSubscription } from '@/hooks/use-polar-subscription';

function CancelSubscriptionButton({ subscriptionId }) {
  const { cancel, isCancelling } = usePolarSubscription();

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You will retain access until the end of the billing period.')) {
      return;
    }
    await cancel(subscriptionId, true); // cancelAtPeriodEnd = true
  };

  return (
    <button onClick={handleCancel} disabled={isCancelling}>
      {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
    </button>
  );
}
```

### Reactivate a cancelled subscription

```tsx
import { usePolarSubscription } from '@/hooks/use-polar-subscription';

function ReactivateButton({ subscriptionId }) {
  const { reactivate, isReactivating } = usePolarSubscription();

  return (
    <button
      onClick={() => reactivate(subscriptionId)}
      disabled={isReactivating}
    >
      {isReactivating ? 'Reactivating...' : 'Reactivate Subscription'}
    </button>
  );
}
```

### Full subscription management panel

```tsx
import { usePolarSubscription } from '@/hooks/use-polar-subscription';

function SubscriptionManagement({ subscription }) {
  const {
    cancel,
    reactivate,
    isCancelling,
    isReactivating,
    isError,
    errorMessage,
    isCancelSuccess,
    isReactivateSuccess,
  } = usePolarSubscription();

  const isCancelled = subscription.cancelAtPeriodEnd;

  return (
    <div className="space-y-4">
      <div>
        <p>Status: {subscription.status}</p>
        {isCancelled && <p className="text-amber-500">Cancels at period end</p>}
      </div>

      {isCancelled ? (
        <button
          onClick={() => reactivate(subscription.id)}
          disabled={isReactivating}
          className="btn-primary"
        >
          {isReactivating ? 'Reactivating...' : 'Resume Subscription'}
        </button>
      ) : (
        <button
          onClick={() => cancel(subscription.id)}
          disabled={isCancelling}
          className="btn-danger"
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
        </button>
      )}

      {isError && <p className="text-red-500">{errorMessage}</p>}
      {isCancelSuccess && <p className="text-green-500">Subscription cancelled.</p>}
      {isReactivateSuccess && <p className="text-green-500">Subscription reactivated.</p>}
    </div>
  );
}
```

### Using the simplified cancel-only hook

```tsx
import { useCancelPolarSubscription } from '@/hooks/use-polar-subscription';

function QuickCancelButton({ subscriptionId }) {
  const { cancelSubscription, isCancelling, isSuccess, reset } =
    useCancelPolarSubscription();

  if (isSuccess) {
    return (
      <div>
        <p>Subscription cancelled.</p>
        <button onClick={reset}>Dismiss</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => cancelSubscription(subscriptionId)}
      disabled={isCancelling}
    >
      {isCancelling ? 'Cancelling...' : 'Cancel'}
    </button>
  );
}
```

## Exported Functions

This file exports two hooks:

| Export | Description |
|--------|-------------|
| `usePolarSubscription` | Full hook with cancel and reactivate mutations |
| `useCancelPolarSubscription` | Simplified wrapper exposing only `cancelSubscription`, `isCancelling`, `error`, `isSuccess`, and `reset` |

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useMutation` and `useQueryClient` for mutations and cache management |
| `@/lib/api/server-api-client` | `serverClient.post` and `apiUtils` for API requests |
| `sonner` | `toast` for success and error notifications |

## Related Hooks

- [`usePolarCheckout`](/template/hooks/use-polar-checkout-reference) -- Create Polar checkout sessions
- [`useSubscription`](/template/hooks/use-subscription-reference) -- Generic subscription management across providers
- [`useLemonSqueezySubscription`](/template/hooks/use-lemonsqueezy-subscription-reference) -- LemonSqueezy equivalent of this hook
- [`useBillingData`](/template/hooks/use-billing-data-reference) -- Fetches subscription and payment history
- [`useAutoRenewal`](/template/hooks/use-auto-renewal-reference) -- Manages auto-renewal toggle state
