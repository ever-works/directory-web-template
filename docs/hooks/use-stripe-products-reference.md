---
id: use-stripe-products-reference
title: useStripeProducts Hook Reference
sidebar_label: useStripeProducts
sidebar_position: 68
---

# useStripeProducts

## Overview

`useStripeProducts` is a React hook for fetching Stripe products when dynamic pricing is enabled. It retrieves products, prices, sponsor ad pricing, and multi-currency Stripe configuration from the server API. The module also exports `useDynamicPricingStatus` for checking whether dynamic pricing is active, and the `isStripeDynamicPricingEnabled` utility function.

**Source:** `template/hooks/use-stripe-products.ts`

## Signature

```typescript
function useStripeProducts(options?: UseStripeProductsOptions): UseQueryResult<StripeProductsApiResponse, Error>
```

### Parameters

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `isStripeDynamicPricingEnabled()` | Whether to enable fetching products. Defaults to `true` only if `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` is `'true'`. |
| `staleTime` | `number` | `300000` (5 minutes) | How long (in milliseconds) the data is considered fresh. |

## Return Values

This hook returns the standard TanStack React Query `UseQueryResult` object. The `data` property is of type `StripeProductsApiResponse`:

| Property | Type | Description |
|---|---|---|
| `data` | `StripeProductsApiResponse \| undefined` | The fetched products response. |
| `isLoading` | `boolean` | `true` during the initial fetch. |
| `isError` | `boolean` | `true` if the fetch failed. |
| `error` | `Error \| null` | The error object if the fetch failed. |
| `isSuccess` | `boolean` | `true` if the fetch completed successfully. |
| `isFetching` | `boolean` | `true` during any fetch (initial or refetch). |
| `refetch` | `() => void` | Manually trigger a refetch. |

### StripeProductsApiResponse

```typescript
interface StripeProductsApiResponse extends StripeProductsResponse {
  stripeConfig?: Record<'premium' | 'standard' | 'free', PlanConfig>;
}
```

The response extends `StripeProductsResponse` (from `@/lib/services/stripe-products.service`) with an optional `stripeConfig` field containing multi-currency plan configurations keyed by plan name.

## Type Definitions

### UseStripeProductsOptions

```typescript
interface UseStripeProductsOptions {
  enabled?: boolean;
  staleTime?: number;
}
```

## Implementation Details

- **Query Key:** `['stripe-products']`
- **Stale Time:** 5 minutes (configurable)
- **Garbage Collection Time:** 10 minutes
- **Retry:** 2 retries with exponential backoff (max 30 seconds)
- **Cache:** `no-store` on the fetch request to avoid browser caching stale product data
- **API Endpoint:** `GET /api/stripe/products`
- **Environment Variable:** `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` must be `'true'` for the hook to fetch by default

## Exported Utilities

### isStripeDynamicPricingEnabled

```typescript
function isStripeDynamicPricingEnabled(): boolean
```

Returns `true` when the `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` environment variable is set to `'true'`. This is a client-side check.

## Companion Hook

### useDynamicPricingStatus

Checks whether dynamic pricing is active and what data is available.

```typescript
function useDynamicPricingStatus(): {
  isDynamicPricingActive: boolean;
  hasProducts: boolean;
  hasSponsorPricing: boolean;
  hasStripeConfig: boolean;
}
```

| Property | Type | Description |
|---|---|---|
| `isDynamicPricingActive` | `boolean` | `true` only when dynamic pricing is enabled AND products were fetched successfully AND at least one product exists. |
| `hasProducts` | `boolean` | Whether any products were returned. |
| `hasSponsorPricing` | `boolean` | Whether both weekly and monthly sponsor ad pricing are available. |
| `hasStripeConfig` | `boolean` | Whether the multi-currency Stripe configuration is present. |

## Usage Examples

### Displaying Dynamic Products

```tsx
import { useStripeProducts } from '@/hooks/use-stripe-products';

function ProductsList() {
  const { data, isLoading, error } = useStripeProducts();

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      {data?.products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Conditional Rendering Based on Dynamic Pricing

```tsx
import { useDynamicPricingStatus, useStripeProducts } from '@/hooks/use-stripe-products';

function PricingSection() {
  const { isDynamicPricingActive, hasStripeConfig } = useDynamicPricingStatus();
  const { data } = useStripeProducts();

  if (!isDynamicPricingActive) {
    return <StaticPricingCards />;
  }

  return (
    <div>
      <DynamicPricingCards products={data?.products} />
      {hasStripeConfig && (
        <CurrencySelector stripeConfig={data?.stripeConfig} />
      )}
    </div>
  );
}
```

### Checking Before Fetch

```tsx
import { isStripeDynamicPricingEnabled } from '@/hooks/use-stripe-products';

function PricingPage() {
  const isDynamic = isStripeDynamicPricingEnabled();

  return (
    <div>
      <h1>Pricing</h1>
      <p>{isDynamic ? 'Prices are loaded from Stripe' : 'Using static pricing'}</p>
      {isDynamic ? <DynamicPricing /> : <StaticPricing />}
    </div>
  );
}
```

### Using Multi-Currency Config

```tsx
function CurrencyAwarePricing() {
  const { data } = useStripeProducts();

  if (data?.stripeConfig) {
    const premiumConfig = data.stripeConfig.premium;
    // Access currency-specific price IDs from premiumConfig
  }

  return <PricingDisplay />;
}
```

## Related Hooks

- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Creates Stripe checkout sessions using product price IDs.
- [`usePaymentAvailability`](./use-payment-availability-reference.md) -- Checks whether payment providers are configured.
- [`useBillingData`](./use-billing-data-reference.md) -- Fetches subscription and payment history.
- [`useSetupIntent`](./use-setup-intent-reference.md) -- Manages Stripe SetupIntents for payment methods.
