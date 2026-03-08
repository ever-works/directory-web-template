---
id: use-lemonsqueezy-update-reference
title: useUpdateSubscription Hook Reference
sidebar_label: useUpdateSubscription (LemonSqueezy)
sidebar_position: 111
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useUpdateSubscription

Manages LemonSqueezy subscription update mutations -- cancel, reactivate, change plan, pause, and resume. Built on `@tanstack/react-query` mutations with automatic cache invalidation of subscription and checkout data after successful updates.

**Source:** `template/hooks/use-lemonsqueezy-update.ts`

## Exported Members

| Export | Kind | Purpose |
|--------|------|---------|
| `useUpdateSubscription` | Hook | Mutation hook for updating a LemonSqueezy subscription |
| `subscriptionUpdateUtils` | Object | Helper functions that build common `UpdateSubscriptionRequest` payloads |
| `UpdateSubscriptionOptions` | Type | Options for lifecycle callbacks |
| `UseUpdateSubscriptionReturn` | Type | Return type of the hook |

## Signature

```ts
function useUpdateSubscription(
  options?: UpdateSubscriptionOptions
): UseUpdateSubscriptionReturn;
```

## Parameters

```ts
interface UpdateSubscriptionOptions {
  onSuccess?: (data: any) => void;   // Called after a successful update
  onError?: (error: Error) => void;  // Called when the update fails
  onSettled?: () => void;            // Called after the mutation finishes (success or error)
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | `UpdateSubscriptionOptions` | `{}` | Optional lifecycle callbacks |

### UpdateSubscriptionRequest

The request payload sent to `POST /api/lemonsqueezy/update`:

```ts
interface UpdateSubscriptionRequest {
  subscriptionId: string;                                                           // Required
  status?: 'active' | 'cancelled' | 'expired' | 'on_trial' | 'past_due' | 'paused' | 'unpaid';
  cancelAtPeriodEnd?: boolean;
  priceId?: string;
  metadata?: Record<string, any>;
}
```

## Return Value

```ts
const {
  updateSubscription,  // (params: UpdateSubscriptionRequest) => Promise<any> -- Trigger the update
  isUpdating,          // boolean -- True while the mutation is in flight
  isSuccess,           // boolean -- True after a successful update (until reset)
  isError,             // boolean -- True after a failed update (until reset)
  error,               // Error | null -- The error object if the mutation failed
  data,                // any -- The response data from the last successful update
  reset,               // () => void -- Reset mutation state and clear data/error
} = useUpdateSubscription();
```

## Implementation Details

1. **API call** -- Posts to `/api/lemonsqueezy/update` via the shared `serverClient`.
2. **Cache invalidation** -- On success, both `['lemonsqueezy', 'subscriptions']` and `['lemonsqueezy', 'checkouts']` query caches are invalidated to keep the UI in sync.
3. **State management** -- Tracks `data` and `error` in local state alongside TanStack Query's mutation state so consumers can access both.
4. **Reset** -- The `reset` function clears the underlying mutation state plus local `data` and `error` state, allowing the UI to return to an idle state.

## subscriptionUpdateUtils

A collection of factory functions that produce correctly-shaped `UpdateSubscriptionRequest` objects for common operations:

```ts
const subscriptionUpdateUtils = {
  cancelAtPeriodEnd: (subscriptionId: string) => UpdateSubscriptionRequest;
  reactivate:        (subscriptionId: string) => UpdateSubscriptionRequest;
  changePlan:        (subscriptionId: string, newPriceId: string) => UpdateSubscriptionRequest;
  pause:             (subscriptionId: string) => UpdateSubscriptionRequest;
  resume:            (subscriptionId: string) => UpdateSubscriptionRequest;
};
```

| Utility | Resulting Payload |
|---------|-------------------|
| `cancelAtPeriodEnd(id)` | `{ subscriptionId, cancelAtPeriodEnd: true }` |
| `reactivate(id)` | `{ subscriptionId, cancelAtPeriodEnd: false }` |
| `changePlan(id, priceId)` | `{ subscriptionId, priceId }` |
| `pause(id)` | `{ subscriptionId, status: 'paused' }` |
| `resume(id)` | `{ subscriptionId, status: 'active' }` |

## Usage Examples

### Cancel Subscription

```tsx
import { useUpdateSubscription, subscriptionUpdateUtils } from '@/hooks/use-lemonsqueezy-update';

function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const { updateSubscription, isUpdating } = useUpdateSubscription({
    onSuccess: () => toast.success('Subscription will cancel at end of billing period'),
    onError: (err) => toast.error(err.message),
  });

  const handleCancel = () => {
    updateSubscription(subscriptionUpdateUtils.cancelAtPeriodEnd(subscriptionId));
  };

  return (
    <button onClick={handleCancel} disabled={isUpdating}>
      {isUpdating ? 'Cancelling...' : 'Cancel Subscription'}
    </button>
  );
}
```

### Change Plan

```tsx
function PlanSwitcher({ subscriptionId, plans }: Props) {
  const { updateSubscription, isUpdating, isSuccess, reset } = useUpdateSubscription();

  const handleSwitch = async (newPriceId: string) => {
    try {
      await updateSubscription(
        subscriptionUpdateUtils.changePlan(subscriptionId, newPriceId)
      );
    } catch {
      // Error is available via the hook's error state
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('Plan updated successfully');
      reset();
    }
  }, [isSuccess, reset]);

  return (
    <div>
      {plans.map((plan) => (
        <button
          key={plan.priceId}
          onClick={() => handleSwitch(plan.priceId)}
          disabled={isUpdating}
        >
          Switch to {plan.name}
        </button>
      ))}
    </div>
  );
}
```

### Pause and Resume

```tsx
function PauseResumeToggle({ subscriptionId, isPaused }: Props) {
  const { updateSubscription, isUpdating } = useUpdateSubscription();

  const handleToggle = () => {
    const params = isPaused
      ? subscriptionUpdateUtils.resume(subscriptionId)
      : subscriptionUpdateUtils.pause(subscriptionId);
    updateSubscription(params);
  };

  return (
    <button onClick={handleToggle} disabled={isUpdating}>
      {isPaused ? 'Resume' : 'Pause'} Subscription
    </button>
  );
}
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useMutation` and `useQueryClient` for mutation and cache management |
| `@/lib/api/server-api-client` | `serverClient` for API communication, `apiUtils` for response validation |

## Related Hooks

- [`useLemonSqueezySubscription`](/docs/template/hooks/use-lemonsqueezy-subscription-reference) -- Fetches current LemonSqueezy subscription data
- [`useSubscription`](/docs/template/hooks/use-subscription-reference) -- Generic subscription management (Stripe-oriented)
- [`useCheckout`](/docs/template/hooks/use-checkout-reference) -- Checkout session creation
- [`useCreateCheckout`](/docs/template/hooks/use-create-checkout-reference) -- LemonSqueezy checkout creation
