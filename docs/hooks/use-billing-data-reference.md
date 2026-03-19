---
id: use-billing-data-reference
title: useBillingData Hook Reference
sidebar_label: useBillingData
sidebar_position: 65
---

# useBillingData

## Overview

`useBillingData` is a React hook for fetching and managing billing data, including subscription information and payment history. It runs two parallel React Query queries and provides granular refresh capabilities, cache management, and mutation states. The module also exports `useOptimisticSubscriptionUpdate` for optimistic UI updates and `usePrefetchBillingData` for pre-loading billing data before navigation.

**Source:** `template/hooks/use-billing-data.ts`

## Signature

```typescript
function useBillingData(): UseBillingDataReturn
```

### Parameters

This hook takes no parameters. It reads the current user from `useCurrentUser()` and only fetches data when a user is authenticated.

## Return Values

### Data

| Property | Type | Description |
|---|---|---|
| `subscription` | `SubscriptionInfo \| null` | The user's subscription information, or `null` if not loaded. |
| `payments` | `PaymentHistoryItem[]` | Array of payment history items. Defaults to `[]`. |

### State

| Property | Type | Description |
|---|---|---|
| `loading` | `boolean` | `true` while either the subscription or payments query is loading. |
| `error` | `string \| null` | Error message from whichever query failed first, or `null`. |
| `lastUpdated` | `Date \| null` | Timestamp of the most recent data update. |
| `isStale` | `boolean` | `true` if either query's data is considered stale. |

### Individual Query States

| Property | Type | Description |
|---|---|---|
| `subscriptionQuery` | `UseQueryResult` | The raw React Query result for the subscription query. |
| `paymentsQuery` | `UseQueryResult` | The raw React Query result for the payments query. |

### Refresh Actions

| Property | Type | Description |
|---|---|---|
| `refresh` | `() => Promise<void>` | Refresh both subscription and payments data simultaneously. |
| `refreshSubscription` | `() => Promise<void>` | Refresh only subscription data. |
| `refreshPayments` | `() => Promise<void>` | Refresh only payment history data. |

### Cache Management

| Property | Type | Description |
|---|---|---|
| `clearCache` | `() => void` | Remove all billing-related data from the cache. |
| `invalidateCache` | `() => void` | Mark all billing-related cache as stale and trigger refetch. |

### Mutation States

| Property | Type | Description |
|---|---|---|
| `isRefreshing` | `boolean` | `true` while both subscription and payments are being refreshed. |
| `isRefreshingSubscription` | `boolean` | `true` while only subscription data is being refreshed. |
| `isRefreshingPayments` | `boolean` | `true` while only payment history is being refreshed. |

## Type Definitions

### PaymentHistoryItem

```typescript
interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  plan: string;
  planId: string;
  status: string;
  billingInterval: string;
  paymentProvider: string;
  subscriptionId: string;
  description: string;
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
}
```

### SubscriptionInfo

```typescript
interface SubscriptionInfo {
  hasActiveSubscription: boolean;
  currentSubscription?: {
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    nextBillingDate: string;
    paymentProvider: string;
    subscriptionId: string;
    amount: number;
    currency: string;
    billingInterval: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
  };
  subscriptionHistory?: Array<{
    id: string;
    planId: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: string;
    currentPeriodEnd?: string;
    currentPeriodStart?: string;
  }>;
}
```

## Implementation Details

- **Query Keys:** Organized via `billingQueryKeys` factory:
  - `['billing']` -- All billing data
  - `['billing', 'subscription']` -- Subscription query
  - `['billing', 'payments']` -- Payments query
  - `['billing', 'user', userId]` -- User-specific billing data
- **Subscription Query:** Stale time 5 minutes, GC time 10 minutes, 3 retries with exponential backoff (max 30 seconds)
- **Payments Query:** Stale time 10 minutes, GC time 15 minutes, 3 retries with exponential backoff (max 30 seconds)
- **Enabled:** Both queries are only enabled when a user is authenticated (`!!user`)
- **Refresh Mutations:** The hook uses `useMutation` for refresh operations. On success, mutation results are written directly into the query cache with `setQueryData`.
- **API Endpoints:**
  - `GET /api/user/subscription` -- Fetch subscription data
  - `GET /api/user/payments` -- Fetch payment history

## Companion Hooks

### useOptimisticSubscriptionUpdate

Provides functions for optimistic cache updates when subscription changes occur externally.

```typescript
function useOptimisticSubscriptionUpdate(): {
  updateSubscriptionOptimistically: (updates: Partial<SubscriptionInfo>) => void;
  revertSubscriptionUpdate: () => void;
}
```

### usePrefetchBillingData

Utility hook for pre-loading billing data before navigation.

```typescript
function usePrefetchBillingData(): {
  prefetchSubscription: () => void;
  prefetchPayments: () => void;
  prefetchAll: () => void;
}
```

## Usage Examples

### Billing Dashboard

```tsx
import { useBillingData } from '@/hooks/use-billing-data';

function BillingDashboard() {
  const {
    subscription,
    payments,
    loading,
    error,
    refresh,
    isRefreshing
  } = useBillingData();

  if (loading) return <Skeleton />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div>
      <button onClick={refresh} disabled={isRefreshing}>
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>

      {subscription?.hasActiveSubscription && (
        <SubscriptionCard subscription={subscription.currentSubscription} />
      )}

      <h2>Payment History</h2>
      <PaymentHistoryTable payments={payments} />
    </div>
  );
}
```

### Prefetching on Hover

```tsx
import { usePrefetchBillingData } from '@/hooks/use-billing-data';

function BillingLink() {
  const { prefetchAll } = usePrefetchBillingData();

  return (
    <Link href="/settings/billing" onMouseEnter={prefetchAll}>
      View Billing
    </Link>
  );
}
```

### Optimistic Subscription Update

```tsx
import { useOptimisticSubscriptionUpdate } from '@/hooks/use-billing-data';

function CancelButton({ subscriptionId }: { subscriptionId: string }) {
  const { updateSubscriptionOptimistically, revertSubscriptionUpdate } =
    useOptimisticSubscriptionUpdate();

  const handleCancel = async () => {
    // Optimistically update the UI
    updateSubscriptionOptimistically({ hasActiveSubscription: false });

    try {
      await cancelSubscriptionApi(subscriptionId);
    } catch {
      // Revert on failure
      revertSubscriptionUpdate();
    }
  };

  return <button onClick={handleCancel}>Cancel Subscription</button>;
}
```

## Related Hooks

- [`usePlanStatus`](./use-plan-status-reference.md) -- Access plan status with expiration awareness.
- [`useAutoRenewal`](./use-auto-renewal-reference.md) -- Manage subscription auto-renewal.
- [`usePaymentMethods`](./use-payment-methods-reference.md) -- Manage stored payment methods.
- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Create Stripe checkout sessions.
