---
id: use-lemonsqueezy-subscription-reference
title: useLemonSqueezySubscription Hook Reference
sidebar_label: useLemonSqueezySubscription
sidebar_position: 69
---

# useSubscriptionActions (LemonSqueezy)

## Overview

`useSubscriptionActions` is a React hook providing mutation-based actions for managing LemonSqueezy subscriptions. It supports updating subscription plans, canceling, pausing, resuming, and reactivating subscriptions. Each action automatically invalidates related query caches on success to keep the UI consistent.

**Source:** `template/hooks/use-lemonsqueezy-subscription.ts`

## Signature

```typescript
function useSubscriptionActions(): UseSubscriptionActionsReturn
```

### Parameters

This hook takes no parameters. It uses `useQueryClient` internally for cache invalidation.

## Return Values

The hook returns an object containing five TanStack React Query mutation objects:

| Property | Type | Description |
|---|---|---|
| `updatePlan` | `UseMutationResult<any, Error, UpdateSubscriptionPlanData>` | Mutation for changing the subscription plan/variant. |
| `cancelSubscription` | `UseMutationResult<any, Error, CancelSubscriptionData>` | Mutation for canceling a subscription. |
| `pauseSubscription` | `UseMutationResult<any, Error, PauseSubscriptionData>` | Mutation for pausing a subscription. |
| `resumeSubscription` | `UseMutationResult<any, Error, ResumeSubscriptionData>` | Mutation for resuming a paused subscription. |
| `reactivateSubscription` | `UseMutationResult<any, Error, ReactivateSubscriptionData>` | Mutation for reactivating a canceled subscription. |

Each mutation object provides the standard TanStack React Query mutation properties including `mutate`, `mutateAsync`, `isPending`, `isError`, `error`, `isSuccess`, `data`, and `reset`.

## Type Definitions

### UpdateSubscriptionPlanData

```typescript
interface UpdateSubscriptionPlanData {
  subscriptionId: string;
  variantId: number;
  proration?: 'immediate' | 'next_period';
  invoiceImmediately?: boolean;
  disableProrations?: boolean;
  billingAnchor?: number;
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `subscriptionId` | `string` | Yes | The LemonSqueezy subscription ID. |
| `variantId` | `number` | Yes | The new LemonSqueezy product variant ID. |
| `proration` | `'immediate' \| 'next_period'` | No | When to apply the proration. |
| `invoiceImmediately` | `boolean` | No | Whether to invoice the customer immediately. |
| `disableProrations` | `boolean` | No | Whether to disable proration entirely. |
| `billingAnchor` | `number` | No | Day of the month for billing alignment. |

### CancelSubscriptionData

```typescript
interface CancelSubscriptionData {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `subscriptionId` | `string` | Yes | The LemonSqueezy subscription ID. |
| `cancelAtPeriodEnd` | `boolean` | No | If `true`, cancels at the end of the current billing period instead of immediately. |

### PauseSubscriptionData

```typescript
interface PauseSubscriptionData {
  subscriptionId: string;
  pauseMode?: 'void' | 'free';
  pauseUntil?: string;
}
```

| Property | Type | Required | Description |
|---|---|---|---|
| `subscriptionId` | `string` | Yes | The LemonSqueezy subscription ID. |
| `pauseMode` | `'void' \| 'free'` | No | Pause behavior: `'void'` stops service, `'free'` continues service without charge. |
| `pauseUntil` | `string` | No | ISO date string for when to automatically resume. |

### ResumeSubscriptionData

```typescript
interface ResumeSubscriptionData {
  subscriptionId: string;
}
```

### ReactivateSubscriptionData

```typescript
interface ReactivateSubscriptionData {
  subscriptionId: string;
}
```

## Implementation Details

- **Cache Invalidation:** Every mutation invalidates `['lemonsqueezy-subscriptions']` and `['lemonsqueezy-stats']` query keys on success.
- **API Endpoints:**
  - `POST /api/lemonsqueezy/update-plan` -- Update subscription plan
  - `POST /api/lemonsqueezy/cancel` -- Cancel subscription
  - `POST /api/lemonsqueezy/pause` -- Pause subscription
  - `POST /api/lemonsqueezy/resume` -- Resume subscription
  - `POST /api/lemonsqueezy/reactivate` -- Reactivate subscription
- **API Client:** Uses `serverClient` from `@/lib/api/server-api-client` for all requests.

## Usage Examples

### Plan Upgrade/Downgrade

```tsx
import { useSubscriptionActions } from '@/hooks/use-lemonsqueezy-subscription';

function PlanSwitcher({ subscriptionId }: { subscriptionId: string }) {
  const { updatePlan } = useSubscriptionActions();

  const handleUpgrade = () => {
    updatePlan.mutate({
      subscriptionId,
      variantId: 98765,
      proration: 'immediate',
      invoiceImmediately: true
    });
  };

  return (
    <button onClick={handleUpgrade} disabled={updatePlan.isPending}>
      {updatePlan.isPending ? 'Upgrading...' : 'Upgrade to Premium'}
    </button>
  );
}
```

### Cancel Subscription

```tsx
function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const { cancelSubscription } = useSubscriptionActions();

  const handleCancel = () => {
    cancelSubscription.mutate({
      subscriptionId,
      cancelAtPeriodEnd: true
    });
  };

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={cancelSubscription.isPending}
      >
        {cancelSubscription.isPending ? 'Canceling...' : 'Cancel Subscription'}
      </button>
      {cancelSubscription.isError && (
        <p className="text-red-500">{cancelSubscription.error?.message}</p>
      )}
      {cancelSubscription.isSuccess && (
        <p className="text-green-500">Subscription will cancel at period end.</p>
      )}
    </div>
  );
}
```

### Pause and Resume

```tsx
function PauseResumeControls({ subscriptionId, isPaused }: {
  subscriptionId: string;
  isPaused: boolean;
}) {
  const { pauseSubscription, resumeSubscription } = useSubscriptionActions();

  if (isPaused) {
    return (
      <button
        onClick={() => resumeSubscription.mutate({ subscriptionId })}
        disabled={resumeSubscription.isPending}
      >
        {resumeSubscription.isPending ? 'Resuming...' : 'Resume'}
      </button>
    );
  }

  return (
    <button
      onClick={() => pauseSubscription.mutate({
        subscriptionId,
        pauseMode: 'void',
        pauseUntil: '2026-04-01T00:00:00Z'
      })}
      disabled={pauseSubscription.isPending}
    >
      {pauseSubscription.isPending ? 'Pausing...' : 'Pause Subscription'}
    </button>
  );
}
```

### Complete Subscription Management

```tsx
function SubscriptionManager({ subscriptionId, status }: {
  subscriptionId: string;
  status: 'active' | 'paused' | 'canceled';
}) {
  const {
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    reactivateSubscription
  } = useSubscriptionActions();

  return (
    <div className="flex gap-2">
      {status === 'active' && (
        <>
          <button onClick={() => pauseSubscription.mutate({ subscriptionId })}>
            Pause
          </button>
          <button onClick={() => cancelSubscription.mutate({
            subscriptionId,
            cancelAtPeriodEnd: true
          })}>
            Cancel
          </button>
        </>
      )}
      {status === 'paused' && (
        <button onClick={() => resumeSubscription.mutate({ subscriptionId })}>
          Resume
        </button>
      )}
      {status === 'canceled' && (
        <button onClick={() => reactivateSubscription.mutate({ subscriptionId })}>
          Reactivate
        </button>
      )}
    </div>
  );
}
```

## Related Hooks

- [`useCheckoutButton`](./use-checkout-button-reference.md) -- LemonSqueezy checkout button with redirect and embedded modes.
- [`useAutoRenewal`](./use-auto-renewal-reference.md) -- Manage subscription auto-renewal across providers.
- [`useBillingData`](./use-billing-data-reference.md) -- Fetch subscription and payment history.
- [`usePlanStatus`](./use-plan-status-reference.md) -- Access the user's current plan status.
- [`usePaymentAvailability`](./use-payment-availability-reference.md) -- Check payment provider configuration.
