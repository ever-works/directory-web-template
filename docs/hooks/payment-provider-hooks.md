---
id: payment-provider-hooks
title: Payment Provider Hooks
sidebar_label: Payment Provider Hooks
sidebar_position: 10
---

# Payment Provider Hooks

Hooks for integrating with payment providers (Stripe, LemonSqueezy, Polar), managing checkout flows, setup intents, and provider selection.

## useSelectedCheckoutProvider

Accesses the user's selected checkout provider from the `LayoutThemeContext`. Provides helpers for checking provider availability and fallback logic.

```
useSelectedCheckoutProvider(): UseSelectedCheckoutProviderReturn
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `checkoutProvider` | `CheckoutProvider` | Currently selected provider |
| `setCheckoutProvider` | `(provider) => void` | Update the selected provider |
| `configuredProviders` | `CheckoutProvider[]` | All providers with valid credentials |
| `getActiveProvider` | `() => CheckoutProvider \| null` | Selected if configured, else first available |
| `isProviderConfigured` | `(provider) => boolean` | Check if a specific provider is configured |
| `isCurrentProviderConfigured` | `() => boolean` | Check if the selection is valid |
| `getFallbackProvider` | `() => CheckoutProvider \| null` | First configured provider |

```tsx
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function CheckoutFlow() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const provider = getActiveProvider();

  switch (provider) {
    case 'stripe': return <StripeCheckout />;
    case 'lemonsqueezy': return <LemonSqueezyCheckout />;
    case 'polar': return <PolarCheckout />;
    default: return <p>No payment provider configured</p>;
  }
}
```

---

## useStripeProducts

Fetches products from the Stripe API when dynamic pricing is enabled. Caches products with React Query.

```
useStripeProducts(options?: UseStripeProductsOptions): UseQueryResult<StripeProductsApiResponse>
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING === 'true'` | Whether to fetch products |
| `staleTime` | `number` | `300000` (5min) | Cache stale time in ms |

### Response Data

| Field | Type | Description |
|-------|------|-------------|
| `products` | `StripeProduct[]` | Fetched Stripe products |
| `sponsorAds` | `object` | Sponsor ad pricing (weekly/monthly) |
| `stripeConfig` | `Record<plan, PlanConfig>` | Multi-currency price IDs per plan |

### Related: useDynamicPricingStatus

```
useDynamicPricingStatus(): {
  isDynamicPricingActive: boolean;
  hasProducts: boolean;
  hasSponsorPricing: boolean;
  hasStripeConfig: boolean;
}
```

```tsx
const { data, isLoading } = useStripeProducts();

if (data?.products) {
  // Render dynamic product cards
}
```

---

## useSetupIntent

Manages Stripe SetupIntent creation and caching for saving payment methods. Provides comprehensive error handling, retry logic, and cache management.

```
useSetupIntent(options?: UseSetupIntentOptions): UseSetupIntentReturn
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether to create a SetupIntent |
| `params` | `CreateSetupIntentParams` | -- | Parameters for intent creation |
| `onSuccess` | `(data) => void` | -- | Success callback |
| `onError` | `(error) => void` | -- | Error callback |
| `suppressSuccessToast` | `boolean` | `false` | Skip the success toast |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `setupIntent` | `SetupIntentResponse \| undefined` | The created SetupIntent |
| `clientSecret` | `string \| undefined` | Client secret for Stripe Elements |
| `isReady` | `boolean` | `true` when intent is ready for payment method |
| `isLoading` / `isFetching` | `boolean` | Loading states |
| `refetch` | `() => void` | Re-create the SetupIntent |
| `invalidateCache` | `() => void` | Invalidate cached intents |
| `clearCache` | `() => void` | Remove all cached intents |
| `prefetch` | `(params?) => Promise<void>` | Pre-create an intent |

### Related Hooks

| Hook | Purpose |
|------|---------|
| `useCreateSetupIntent` | Mutation hook for creating new SetupIntents |
| `useGetSetupIntent` | Fetch an existing SetupIntent by ID |
| `useSetupIntentCache` | Cache management utilities |
| `useSetupIntentManager` | Combined query + mutation + cache hook |
| `useCreateSetupIntentWithCustomParams` | Create intent with customer name |

```tsx
const { clientSecret, isReady } = useSetupIntent({
  suppressSuccessToast: true,
});

if (isReady && clientSecret) {
  return <Elements stripe={stripePromise} options={{ clientSecret }}>
    <PaymentForm />
  </Elements>;
}
```

---

## useCheckoutButton

Encapsulates LemonSqueezy checkout button logic, supporting both redirect and embedded checkout modes.

```
useCheckoutButton(params?: CheckoutButtonParams): UseCheckoutButtonReturn
```

### Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultEmail` | `string` | `''` | Pre-filled customer email |
| `defaultPrice` | `number` | -- | Default price amount |
| `variantId` | `number` | -- | LemonSqueezy variant ID |
| `metadata` | `Record<string, any>` | `{}` | Custom metadata for the checkout |
| `embedded` | `boolean` | `false` | Use embedded checkout instead of redirect |
| `onPaymentSuccess` | `(res?) => void` | -- | Success callback (embedded mode) |
| `onClose` | `() => void` | -- | Close callback (embedded mode) |
| `dark` | `boolean` | -- | Dark mode for checkout UI |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `customPrice` | `number \| undefined` | Current custom price |
| `isLoading` | `boolean` | Checkout creation in progress |
| `isError` | `boolean` | Whether an error occurred |
| `checkoutUrl` | `string \| null` | Embedded checkout URL |
| `isEmbedReady` | `boolean` | Whether embedded checkout is loaded |
| `handleClick` | `() => Promise<void>` | Simple button click handler |
| `handleSubmit` | `(e: FormEvent) => Promise<void>` | Form submission handler |
| `handlePriceChange` | `(e: ChangeEvent) => void` | Price input handler |
| `clearCheckout` | `() => void` | Clear embedded checkout |

```tsx
const { handleClick, isLoading } = useCheckoutButton({
  variantId: 12345,
  metadata: { plan: 'premium' },
});

return (
  <button onClick={handleClick} disabled={isLoading}>
    {isLoading ? 'Processing...' : 'Buy Now'}
  </button>
);
```

---

## useProviderPayment

Aggregates payment data from the configured provider (Stripe or LemonSqueezy). Combines billing data, checkouts, subscriptions, and statistics into a unified interface.

```
useProviderPayment(): UseProviderPaymentReturn
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `PaymentProvider` | Active payment provider |
| `payments` | `Payment[]` | Provider-specific payment history |
| `stripePayments` | `Payment[]` | Stripe-only payments |
| `lemonSqueezyPayments` | `Payment[]` | LemonSqueezy-only payments |
| `totalSpent` | `number` | Sum of all payment amounts |
| `activePayments` | `number` | Count of paid/active payments |
| `monthlyAverage` | `number` | Average payment amount |
| `subscription` | `Subscription` | Current subscription data |
| `loading` | `boolean` | Combined loading state |
| `refresh` | `() => void` | Refresh all payment data |
| `hasPaymentHistory` | `boolean` | Whether any payments exist |
| `hasSubscriptionHistory` | `boolean` | Whether subscription history exists |

---

## LemonSqueezy Hooks

### useLemonSqueezyCheckouts

Fetches and manages LemonSqueezy checkout records with filtering and pagination.

| Property | Description |
|----------|-------------|
| `checkouts` | Array of `CheckoutData` records |
| `pagination` | Page info (total, page, limit, hasMore) |
| `updateFilters` | Update status/email/date filters |
| `refresh` | Refresh checkout data |

### useSubscriptionActions

Mutation hooks for LemonSqueezy subscription management:

| Action | Description |
|--------|-------------|
| `updatePlan` | Change subscription plan/variant |
| `cancelSubscription` | Cancel with optional period-end flag |
| `pauseSubscription` | Pause with mode (`void` or `free`) |
| `resumeSubscription` | Resume a paused subscription |
| `reactivateSubscription` | Reactivate a cancelled subscription |

### useUpdateSubscription

Updates a LemonSqueezy subscription (plan changes, billing updates).

---

## Polar Hooks

### usePolarCheckout

Creates Polar checkout sessions with support for redirect and embedded modes.

| Param | Type | Description |
|-------|------|-------------|
| `embedded` | `boolean` | Use embedded checkout |
| `onSuccess` | `(data) => void` | Success callback |

### usePolarSubscription

Manages Polar subscription lifecycle (cancel, reactivate) with query cache invalidation.

---

## Summary Table

| Hook | Provider | Purpose | Source File |
|------|----------|---------|-------------|
| `useSelectedCheckoutProvider` | All | Provider selection and fallback | `use-selected-checkout-provider.ts` |
| `useStripeProducts` | Stripe | Fetch dynamic products | `use-stripe-products.ts` |
| `useSetupIntent` | Stripe | Manage SetupIntents | `use-setup-intent.ts` |
| `useCheckoutButton` | LemonSqueezy | Checkout button logic | `use-checkout-button.ts` |
| `useProviderPayment` | All | Unified payment data | `use-provider-payment.ts` |
| `useLemonSqueezyCheckouts` | LemonSqueezy | Checkout records | `use-lemonsqueezy-checkouts.ts` |
| `useSubscriptionActions` | LemonSqueezy | Subscription CRUD | `use-lemonsqueezy-subscription.ts` |
| `useUpdateSubscription` | LemonSqueezy | Subscription updates | `use-lemonsqueezy-update.ts` |
| `usePolarCheckout` | Polar | Checkout sessions | `use-polar-checkout.ts` |
| `usePolarSubscription` | Polar | Subscription management | `use-polar-subscription.ts` |
