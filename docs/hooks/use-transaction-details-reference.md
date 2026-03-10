---
id: use-transaction-details-reference
title: useTransactionDetails Hook Reference
sidebar_label: useTransactionDetails
sidebar_position: 85
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useTransactionDetails

A React Query hook that fetches and manages transaction details after a successful checkout. Supports both Stripe session lookups and free plan submissions, with automatic caching, retry logic, and cache management utilities.

**Source file:** `template/hooks/use-transaction-details.ts`

## Overview

`useTransactionDetails` is the primary hook used on the post-checkout success page. Given a Stripe session ID or a free plan submission ID, it fetches the transaction details from the API, normalizes the response into a `TransactionDetails` object, and provides loading, error, and refresh capabilities. The hook automatically determines the query strategy based on which parameters are provided.

The file also exports two utility hooks: `useTransactionCache` for cache management and `useTransactionDetailsSync` for synchronous cache reads.

This is a client component hook (marked with `'use client'`).

## Signature

```ts
function useTransactionDetails(options: UseTransactionDetailsOptions): UseTransactionDetailsReturn
```

## Parameters

### UseTransactionDetailsOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sessionId` | `string \| null` | `undefined` | Stripe checkout session ID. When provided, fetches from the Stripe checkout API. |
| `planType` | `PaymentPlan \| null` | `undefined` | The payment plan type. Required for free plan flows (use `'free'`). |
| `submissionId` | `string \| null` | `undefined` | Submission ID for free plan transactions. Used with `planType: 'free'`. |
| `enabled` | `boolean` | `true` | Whether to enable the query. Set `false` to defer fetching. |
| `autoRefresh` | `boolean` | `false` | Whether to flag the transaction as auto-refreshing. Also true if status is `'pending_review'`. |

## Return Value

### UseTransactionDetailsReturn

| Property | Type | Description |
|----------|------|-------------|
| `transactionDetails` | `TransactionDetails \| null` | The fetched transaction details, or `null` if not yet loaded |
| `isLoading` | `boolean` | Whether the query is currently fetching |
| `error` | `string \| null` | Error message string if the query failed |
| `isError` | `boolean` | Whether the query is in an error state |
| `refetch` | `() => void` | Manually trigger a refetch of the transaction details |
| `invalidateCache` | `() => Promise<void>` | Invalidate all `['transaction-details']` queries in the cache |
| `isAutoRefreshing` | `boolean` | `true` when `autoRefresh` is enabled or the transaction status is `'pending_review'` |

## Types

### TransactionDetails

```ts
interface TransactionDetails {
  id: string;
  planType: 'free' | 'pro' | 'premium';
  planName: string;
  price: number;
  paymentType: 'subscription' | 'submission';
  status: 'pending_review' | 'active' | 'approved' | 'published';
  customerEmail: string;
  submissionTitle: string;
  submissionsRemaining?: number;
  nextPaymentDate?: number;
}
```

### StripeSessionData

```ts
interface StripeSessionData {
  session: {
    id: string;
    amount_total: number;
    metadata?: {
      planType?: string;
      planName?: string;
      paymentType?: string;
      submissionTitle?: string;
    };
    customer_details?: {
      email?: string;
    };
  };
  subscription?: {
    status?: string;
  };
}
```

### PaymentPlan

```ts
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

## Implementation Details

### Query Strategy

The hook determines its query strategy based on the provided parameters:

| Condition | Query Key | Data Source |
|-----------|-----------|-------------|
| `sessionId` is provided | `['transaction-details', 'stripe', sessionId]` | Fetches from `/api/stripe/checkout?session_id={sessionId}` |
| `planType === 'free'` and `submissionId` is provided | `['transaction-details', 'free', submissionId]` | Returns a synthetic `TransactionDetails` with `price: 0` and `status: 'pending_review'` |
| Neither condition met | `['transaction-details', 'invalid']` | Query throws an error |

### Query Activation

The query is enabled when `enabled === true` AND at least one valid identifier is present (`sessionId` is not null, or `planType === 'free'` with a valid `submissionId`).

### Caching Strategy

| Setting | Value | Purpose |
|---------|-------|---------|
| `staleTime` | 5 minutes | Avoids redundant refetches for the same session |
| `gcTime` | 30 minutes | Keeps data in cache for back-navigation scenarios |

### Retry Strategy

- Errors containing `'INVALID_TRANSACTION_DETAILS'` are not retried (permanent failures).
- Other errors are retried up to 2 times with exponential backoff (1s, 2s, capped at 10s).

### Stripe Response Normalization

The Stripe session data is normalized to `TransactionDetails`:
- `price` is converted from cents to dollars (`amount_total / 100`)
- `planType`, `planName`, `paymentType`, and `submissionTitle` are extracted from `session.metadata`
- `status` falls back to `'pending_review'` when no subscription status is available
- `customerEmail` falls back to `'N/A'` when not available

### Free Plan Handling

For free plans, the hook creates a synthetic `TransactionDetails` object without making an API call, using predefined values (`price: 0`, `planName: 'Free Plan'`, `status: 'pending_review'`).

## Usage Examples

### Success page with Stripe session

```tsx
import { useTransactionDetails } from '@/hooks/use-transaction-details';
import { useSearchParams } from 'next/navigation';

function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('checkout_id');

  const { transactionDetails, isLoading, error } = useTransactionDetails({
    sessionId,
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!transactionDetails) return <p>No transaction found.</p>;

  return (
    <div>
      <h1>Payment Successful</h1>
      <p>Plan: {transactionDetails.planName}</p>
      <p>Amount: ${transactionDetails.price.toFixed(2)}</p>
      <p>Status: {transactionDetails.status}</p>
      <p>Email: {transactionDetails.customerEmail}</p>
    </div>
  );
}
```

### Free plan submission success

```tsx
import { useTransactionDetails } from '@/hooks/use-transaction-details';

function FreeSubmissionSuccess({ submissionId }) {
  const { transactionDetails, isLoading } = useTransactionDetails({
    planType: 'free',
    submissionId,
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Submission Received</h1>
      <p>Your listing "{transactionDetails?.submissionTitle}" is pending review.</p>
      <p>Plan: {transactionDetails?.planName}</p>
    </div>
  );
}
```

### With auto-refresh for pending reviews

```tsx
function PendingReviewStatus({ sessionId }) {
  const { transactionDetails, isAutoRefreshing, refetch } = useTransactionDetails({
    sessionId,
    autoRefresh: true,
  });

  return (
    <div>
      <p>Status: {transactionDetails?.status}</p>
      {isAutoRefreshing && (
        <p className="text-sm text-muted">Checking for updates...</p>
      )}
      <button onClick={refetch}>Check Now</button>
    </div>
  );
}
```

### Using the cache management utility

```tsx
import { useTransactionCache } from '@/hooks/use-transaction-details';

function AdminTransactionActions() {
  const { invalidateTransactionCache, clearTransactionCache, prefetchTransaction } =
    useTransactionCache();

  return (
    <div className="space-x-2">
      <button onClick={invalidateTransactionCache}>
        Refresh All Transactions
      </button>
      <button onClick={clearTransactionCache}>
        Clear Transaction Cache
      </button>
      <button onClick={() => prefetchTransaction('cs_test_abc123')}>
        Prefetch Session
      </button>
    </div>
  );
}
```

### Synchronous cache read

```tsx
import { useTransactionDetailsSync } from '@/hooks/use-transaction-details';

function TransactionBadge({ sessionId }) {
  const details = useTransactionDetailsSync(sessionId);

  if (!details) return null;

  return (
    <span className={`badge badge-${details.status}`}>
      {details.planName} - {details.status}
    </span>
  );
}
```

## Exported Functions

| Export | Description |
|--------|-------------|
| `useTransactionDetails` | Primary hook for fetching transaction details with React Query |
| `useTransactionCache` | Utility hook for invalidating, clearing, and prefetching transaction cache |
| `useTransactionDetailsSync` | Synchronous cache read for already-fetched transaction data |

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery`, `useMutation`, `useQueryClient` for data fetching and caching |
| `@/lib/api/server-api-client` | `serverClient.get` and `apiUtils` for Stripe API requests |
| `next-intl` | `useTranslations` for localized error messages |
| `@/lib/constants` | `PaymentPlan` enum |

## Related Hooks

- [`useSuccessPageFeatures`](/template/hooks/use-success-page-features-reference) -- Full success page logic that consumes transaction details
- [`useBillingData`](/template/hooks/use-billing-data-reference) -- Historical billing data
- [`useSubscription`](/template/hooks/use-subscription-reference) -- Active subscription state
- [`useCheckout`](/template/hooks/use-checkout-reference) -- Checkout session creation
