---
id: use-provider-payment-reference
title: useProviderPayment Hook Reference
sidebar_label: useProviderPayment
sidebar_position: 83
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useProviderPayment

A data aggregation hook that combines payment history and subscription data from multiple payment providers (Stripe and LemonSqueezy) into a unified interface. Routes data through the configured payment provider and computes billing statistics.

**Source file:** `template/hooks/use-provider-payment.ts`

## Overview

`useProviderPayment` reads the active payment provider from the application configuration, then fetches and merges data from `useBillingData` (Stripe-centric subscription and payment history) and `useLemonSqueezyCheckouts` (LemonSqueezy checkout records). It normalizes LemonSqueezy checkout records into the same shape as Stripe payment records, then exposes only the data relevant to the configured provider. The hook also computes summary statistics such as total spent, active payment count, and monthly average.

## Signature

```ts
function useProviderPayment(): UseProviderPaymentReturn
```

## Parameters

None. This hook takes no arguments. The active payment provider is read from the application config via `useConfig().pricing.provider`.

## Return Value

### Provider Info

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `PaymentProvider \| undefined` | The configured payment provider (`'stripe'`, `'lemonsqueezy'`, `'polar'`, or `'solidgate'`) |

### Payment Data

| Property | Type | Description |
|----------|------|-------------|
| `payments` | `PaymentRecord[]` | Payment records filtered to the configured provider |
| `stripePayments` | `PaymentRecord[]` | All Stripe-sourced payment records (regardless of active provider) |
| `lemonSqueezyPayments` | `TransformedCheckout[]` | All LemonSqueezy checkout records transformed into payment record shape |
| `stripeTotal` | `number` | Sum of all Stripe payment amounts |
| `lemonSqueezyTotal` | `number` | Sum of all LemonSqueezy payment amounts |

### Statistics

| Property | Type | Description |
|----------|------|-------------|
| `totalSpent` | `number` | Sum of all payment amounts for the active provider |
| `activePayments` | `number` | Count of payments with status `'Paid'` or `'active'` |
| `monthlyAverage` | `number` | `totalSpent / totalPayments`, or `0` if no payments exist |
| `totalPayments` | `number` | Total number of payment records for the active provider |

### Subscription Data

| Property | Type | Description |
|----------|------|-------------|
| `subscription` | `SubscriptionInfo \| undefined` | Subscription information from `useBillingData` |

### Loading and Error States

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `boolean` | `true` if either billing data or LemonSqueezy checkouts are loading |
| `isLoadingCheckouts` | `boolean` | Whether LemonSqueezy checkouts are loading specifically |
| `isError` | `boolean` | Whether the LemonSqueezy checkout query has an error |
| `error` | `Error \| null` | Error object from the LemonSqueezy checkout query |

### Actions

| Property | Type | Description |
|----------|------|-------------|
| `refresh` | `() => void` | Refresh all billing data (subscription + payments) |
| `refreshSubscription` | `() => void` | Refresh only subscription data |
| `refreshPayments` | `() => void` | Refresh only Stripe payment data |
| `refreshCheckouts` | `() => void` | Refresh LemonSqueezy checkout data |
| `updateFilters` | `(filters: CheckoutFilters) => void` | Update LemonSqueezy checkout query filters |

### Pagination (LemonSqueezy)

| Property | Type | Description |
|----------|------|-------------|
| `pagination` | `PaginationInfo` | Current pagination state for LemonSqueezy checkouts |
| `hasMore` | `boolean` | Whether more LemonSqueezy checkout pages are available |
| `nextPage` | `() => void` | Navigate to the next page of LemonSqueezy checkouts |
| `prevPage` | `() => void` | Navigate to the previous page |
| `goToPage` | `(page: number) => void` | Jump to a specific page |

### Flags

| Property | Type | Description |
|----------|------|-------------|
| `isRefreshing` | `boolean` | Whether any billing data refresh is in progress |
| `isRefreshingSubscription` | `boolean` | Whether subscription refresh is in progress |
| `isRefreshingPayments` | `boolean` | Whether payment history refresh is in progress |
| `hasPaymentHistory` | `boolean` | Whether the user has any payments for the active provider |
| `hasSubscriptionHistory` | `boolean` | Whether the user has any subscription history records |

## Implementation Details

### Provider Routing

The `providerPayments` computed value uses the configured provider to decide which data set to expose:

```
provider === 'stripe'       -> Stripe payment records from useBillingData
provider === 'lemonsqueezy' -> Transformed LemonSqueezy checkout records
other                       -> Empty array
```

### LemonSqueezy Checkout Transformation

LemonSqueezy checkouts are transformed into a normalized payment record shape with:
- `id` prefixed with `ls_` to avoid collisions
- `paymentProvider` set to `'lemonsqueezy'`
- `status` mapped from `'active'` to `'Paid'`
- Additional LemonSqueezy-specific fields preserved (`checkoutId`, `productName`, `variantName`, `storeId`, `metadata`)

### Statistics Computation

All statistics (`totalSpent`, `activePayments`, `monthlyAverage`) are computed from `providerPayments`, meaning they reflect only the active provider's data. Provider-specific totals (`stripeTotal`, `lemonSqueezyTotal`) are computed independently for comparison views.

## Usage Examples

### Billing dashboard

```tsx
import { useProviderPayment } from '@/hooks/use-provider-payment';

function BillingDashboard() {
  const {
    provider,
    payments,
    totalSpent,
    activePayments,
    monthlyAverage,
    subscription,
    loading,
    refresh,
  } = useProviderPayment();

  if (loading) return <Skeleton />;

  return (
    <div>
      <h2>Billing ({provider})</h2>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Spent" value={`$${(totalSpent / 100).toFixed(2)}`} />
        <StatCard label="Active Payments" value={activePayments} />
        <StatCard label="Monthly Average" value={`$${(monthlyAverage / 100).toFixed(2)}`} />
      </div>

      {subscription?.hasActiveSubscription && (
        <div className="mt-4">
          <p>Current Plan: {subscription.currentSubscription?.planName}</p>
          <p>Next Billing: {subscription.currentSubscription?.nextBillingDate}</p>
        </div>
      )}

      <button onClick={refresh} className="mt-4">Refresh</button>

      <PaymentHistoryTable payments={payments} />
    </div>
  );
}
```

### Provider comparison view

```tsx
import { useProviderPayment } from '@/hooks/use-provider-payment';

function ProviderComparison() {
  const { stripePayments, lemonSqueezyPayments, stripeTotal, lemonSqueezyTotal } =
    useProviderPayment();

  return (
    <div className="grid grid-cols-2 gap-8">
      <div>
        <h3>Stripe</h3>
        <p>Payments: {stripePayments.length}</p>
        <p>Total: ${(stripeTotal / 100).toFixed(2)}</p>
      </div>
      <div>
        <h3>LemonSqueezy</h3>
        <p>Payments: {lemonSqueezyPayments.length}</p>
        <p>Total: ${(lemonSqueezyTotal / 100).toFixed(2)}</p>
      </div>
    </div>
  );
}
```

### Payment history with empty state

```tsx
import { useProviderPayment } from '@/hooks/use-provider-payment';

function PaymentHistory() {
  const { payments, hasPaymentHistory, loading, provider } = useProviderPayment();

  if (loading) return <Spinner />;

  if (!hasPaymentHistory) {
    return <EmptyState message={`No payment history found for ${provider}.`} />;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Plan</th>
          <th>Amount</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <td>{new Date(payment.date).toLocaleDateString()}</td>
            <td>{payment.plan}</td>
            <td>${(payment.amount / 100).toFixed(2)}</td>
            <td>{payment.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `react` | `useMemo` for computed values |
| `@/app/[locale]/config` | `useConfig` to read the active payment provider |
| `./use-lemonsqueezy-checkouts` | LemonSqueezy checkout data and pagination |
| `./use-billing-data` | Stripe subscription and payment history |
| `@/lib/constants` | `PaymentProvider` enum |

## Related Hooks

- [`useBillingData`](/template/hooks/use-billing-data-reference) -- Stripe subscription and payment data
- [`usePaymentMethods`](/template/hooks/use-payment-methods-reference) -- Saved payment methods management
- [`useSubscription`](/template/hooks/use-subscription-reference) -- Generic subscription state
- [`usePlanStatus`](/template/hooks/use-plan-status-reference) -- Current plan status information
- [`useCurrency`](/template/hooks/use-currency-reference) -- Currency formatting utilities
