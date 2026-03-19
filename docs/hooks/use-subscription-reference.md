---
id: use-subscription-reference
title: useSubscription Hook Reference
sidebar_label: useSubscription
sidebar_position: 30
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSubscription

Manages subscription lifecycle operations including creation, updating, cancellation, reactivation, and billing portal access. Supports multiple payment providers (Stripe, Polar) with automatic provider detection.

**Source:** `template/hooks/use-subscription.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useSubscription` | Mutation-based subscription management (create, update, cancel, reactivate, billing portal) |
| `useUserSubscription` | Query hook to fetch the current user's active subscription |
| `useSubscriptionById` | Query hook to fetch a specific subscription by ID |
| `useSubscriptionManager` | Higher-level manager with optimistic update support |

## useSubscription

### Return Values

```ts
const {
  // Mutations (TanStack Query UseMutationResult objects)
  createSubscription,        // UseMutation<SubscriptionData, Error, CreateSubscriptionRequest>
  updateSubscription,        // UseMutation<SubscriptionData, Error, UpdateSubscriptionRequest>
  updateSubscriptionById,    // UseMutation<SubscriptionData, Error, UpdateSubscriptionRequest>
  cancelSubscription,        // UseMutation<SubscriptionData, Error, CancelSubscriptionRequest>
  cancelSubscriptionById,    // UseMutation<SubscriptionData, Error, CancelSubscriptionRequest>
  reactivateSubscription,    // UseMutation<SubscriptionData, Error, ReactivateSubscriptionRequest>
  createBillingPortalSession,// UseMutation<BillingPortalResponse, Error, void>

  // Loading states (boolean)
  isCreating, isUpdating, isUpdatingById,
  isCancelling, isCancellingById, isReactivating,

  // Error states (Error | null)
  createError, updateError, updateByIdError,
  cancelError, cancelByIdError, reactivateError,

  // Success states (boolean)
  isCreateSuccess, isUpdateSuccess, isUpdateByIdSuccess,
  isCancelSuccess, isCancelByIdSuccess, isReactivateSuccess,

  // Billing portal states
  isCreateBillingPortalSessionPending,
  isCreateBillingPortalSessionSuccess,
  isCreateBillingPortalSessionError,

  // Reset functions
  resetCreate, resetUpdate, resetUpdateById,
  resetCancel, resetCancelById, resetReactivate,
} = useSubscription();
```

### Types

```ts
interface SubscriptionData {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, any>;
}

interface CreateSubscriptionRequest {
  priceId: string;
  paymentMethodId: string;
  trialPeriodDays?: number;
}

interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  billingInterval?: string;
  planId?: string;
}

interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

interface ReactivateSubscriptionRequest {
  subscriptionId: string;
}
```

### Usage: Creating a Subscription

```tsx
function CheckoutButton({ priceId, paymentMethodId }) {
  const { createSubscription, isCreating, createError } = useSubscription();

  const handleSubscribe = () => {
    createSubscription.mutate({
      priceId,
      paymentMethodId,
      trialPeriodDays: 14,
    });
  };

  return (
    <button onClick={handleSubscribe} disabled={isCreating}>
      {isCreating ? 'Processing...' : 'Subscribe'}
    </button>
  );
}
```

### Usage: Billing Portal

```tsx
function ManageBillingButton() {
  const { createBillingPortalSession, isCreateBillingPortalSessionPending } = useSubscription();

  const handleManageBilling = async () => {
    createBillingPortalSession.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.data.url;
      },
    });
  };

  return (
    <button onClick={handleManageBilling} disabled={isCreateBillingPortalSessionPending}>
      Manage Billing
    </button>
  );
}
```

## useUserSubscription

Fetches the current user's active subscription data. Returns a standard TanStack Query result.

```tsx
function SubscriptionStatus() {
  const { data: subscription, isLoading, isError } = useUserSubscription();

  if (isLoading) return <Skeleton />;
  if (!subscription) return <p>No active subscription</p>;

  return (
    <div>
      <p>Status: {subscription.status}</p>
      <p>Renews: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
    </div>
  );
}
```

**Cache configuration:** `staleTime: 5 min`, `gcTime: 10 min`. Query key: `['user-subscription']`.

## useSubscriptionById

Fetches a specific subscription by its ID. The query is disabled when `subscriptionId` is empty.

```tsx
const { data, isLoading } = useSubscriptionById('sub_abc123');
```

**Query key:** `['subscription', subscriptionId]`.

## useSubscriptionManager

Wraps `useSubscription` with optimistic update support for subscription creation. On `mutate`, the cache is immediately updated with a temporary subscription object; on error, the previous value is restored.

```tsx
function SubscriptionFlow() {
  const { createSubscription, isCreating, createError } = useSubscriptionManager();

  const handleCreate = (request: CreateSubscriptionRequest) => {
    createSubscription.mutate(request);
  };

  // UI updates instantly via optimistic cache, then reconciles with server
}
```

## Payment Provider Awareness

The hook automatically detects the active payment provider using `useSelectedCheckoutProvider` and `usePaymentProvider`. The billing portal endpoint adapts accordingly:

- **Stripe:** `POST /api/stripe/subscription/portal`
- **Polar:** `POST /api/polar/subscription/portal`

## Cache Invalidation

All mutations invalidate the following query keys on success:

| Query Key | Purpose |
|-----------|---------|
| `['subscriptions']` | List of all subscriptions |
| `['user-subscription']` | Current user's subscription |
| `['billing']` | Billing-related data |

## Error Handling

Errors are captured per-mutation. Access them via `createError`, `updateError`, etc. Each mutation also exposes a `reset` function to clear error state:

```tsx
const { createError, resetCreate } = useSubscription();

if (createError) {
  return (
    <div>
      <p>Error: {createError.message}</p>
      <button onClick={resetCreate}>Try Again</button>
    </div>
  );
}
```

## Related Hooks

- [`usePlanStatus`](/template/hooks/subscription-hooks) - Check current plan tier
- [`usePlanGuard`](/template/hooks/subscription-hooks) - Gate features by plan
- [`usePaymentFlow`](/template/hooks/payment-hooks) - Complete checkout flow
- [`useCreateCheckout`](/template/hooks/payment-hooks) - Create checkout sessions
- [`useBillingData`](/template/hooks/payment-hooks) - Billing history and invoices
