---
id: use-lemonsqueezy-queries-reference
title: useLemonSqueezyQueries Hook Reference
sidebar_label: useLemonSqueezyQueries
sidebar_position: 79
---

# useLemonSqueezyQueries

## Overview

The `use-lemonsqueezy-queries.ts` module exports a family of hooks for interacting with the LemonSqueezy payment platform. It includes a health-check query, a low-level checkout creation mutation, an embedded checkout experience with SDK initialization, and a redirect-based checkout flow. These hooks serve as the foundation for LemonSqueezy payment integration in the template.

**Source:** `template/hooks/use-lemonsqueezy-queries.ts`

## Exported Hooks

| Hook                                   | Purpose                                                      |
|----------------------------------------|--------------------------------------------------------------|
| `useLemonSqueezyHealth`                | Query hook for checking LemonSqueezy API availability        |
| `useCreateLemonSqueezyCheckout`        | Mutation hook for creating a checkout session                |
| `useLemonSqueezyEmbeddedCheckout`      | Embedded checkout with LemonSqueezy JS SDK integration       |
| `useLemonSqueezyCheckoutWithRedirect`  | Checkout that redirects/opens in a new tab                   |

## Shared Query Keys

```typescript
const lemonsqueezyKeys = {
  all: ['lemonsqueezy'],
  health: () => ['lemonsqueezy', 'health'],
  variants: () => ['lemonsqueezy', 'variants'],
  checkout: () => ['lemonsqueezy', 'checkout'],
};
```

---

## useLemonSqueezyHealth

Checks whether the LemonSqueezy API is available and responding.

```typescript
function useLemonSqueezyHealth(): UseQueryResult
```

This hook takes no parameters. It calls `lemonsqueezyClient.healthCheck()` and returns a standard React Query result.

### Cache Strategy

| Setting     | Value       | Description                            |
|-------------|-------------|----------------------------------------|
| `staleTime` | 5 minutes   | Health status cached for 5 minutes     |
| `gcTime`    | 10 minutes  | Inactive cache kept for 10 minutes     |
| `retry`     | 2           | Retry failed health checks twice       |
| `retryDelay`| 1000ms      | 1-second delay between retries         |

---

## useCreateLemonSqueezyCheckout

Low-level mutation hook for creating a LemonSqueezy checkout session. This hook is used internally by the embedded and redirect checkout hooks.

```typescript
function useCreateLemonSqueezyCheckout(): UseMutationResult<
  CheckoutResponse,
  Error,
  LemonSqueezyCheckoutParams
>
```

### Behavior

- **On success:** Invalidates the `['lemonsqueezy', 'checkout']` query key and writes the checkout data into the cache.
- **On error:** Logs the error to the console.

The `LemonSqueezyCheckoutParams` type is imported from `@/lib/api/lemonsqueezy-client`.

---

## useLemonSqueezyEmbeddedCheckout

Provides an embedded checkout experience using the LemonSqueezy JavaScript SDK. Handles SDK initialization with retry logic, event handling for success and close events, and checkout URL management.

```typescript
function useLemonSqueezyEmbeddedCheckout(
  params?: UseLemonSqueezyEmbeddedCheckoutParams
): UseLemonSqueezyEmbeddedCheckoutReturn
```

### `UseLemonSqueezyEmbeddedCheckoutParams`

| Parameter  | Type                    | Default     | Description                                   |
|------------|-------------------------|-------------|-----------------------------------------------|
| `onSuccess`| `(event: any) => void`  | `undefined` | Callback fired when checkout completes        |
| `onClose`  | `() => void`            | `undefined` | Callback fired when checkout overlay is closed|

### Return Values

| Property                 | Type                                                    | Description                                           |
|--------------------------|---------------------------------------------------------|-------------------------------------------------------|
| `createEmbeddedCheckout` | `(params: LemonSqueezyCheckoutParams) => Promise<any>`  | Create a checkout and set the embedded checkout URL    |
| `checkoutUrl`            | `string \| null`                                        | The active checkout URL, or `null` if none            |
| `isEmbedReady`           | `boolean`                                               | `true` when the LemonSqueezy SDK is initialized       |
| `clearCheckout`          | `() => void`                                            | Clear the current checkout URL                        |
| `isLoading`              | `boolean`                                               | `true` while the checkout is being created            |
| `error`                  | `Error \| null`                                         | Error from the last checkout creation attempt         |
| `isSuccess`              | `boolean`                                               | `true` if the last checkout creation succeeded        |
| `isError`                | `boolean`                                               | `true` if the last checkout creation failed           |

### SDK Initialization

The hook initializes the LemonSqueezy SDK via `window.LemonSqueezy.Setup()` with retry logic:
- **Max retries:** 20 attempts (10 seconds total)
- **Retry interval:** 500ms between attempts
- **Events handled:** `Checkout.Success` (clears URL, calls `onSuccess`) and `Checkout.Closed` (shows toast, clears URL, calls `onClose`)
- **Cleanup:** Pending timeouts are cleared on component unmount

Callback refs (`useRef`) are used to keep the `onSuccess`, `onClose`, and translation function fresh inside the event handler closure without re-initializing the SDK.

---

## useLemonSqueezyCheckoutWithRedirect

Creates a checkout session and redirects the user to the LemonSqueezy checkout page, either in a new tab or via full-page redirect as a fallback.

```typescript
function useLemonSqueezyCheckoutWithRedirect(): UseLemonSqueezyCheckoutWithRedirectReturn
```

### Return Values

| Property                    | Type                                                    | Description                                          |
|-----------------------------|---------------------------------------------------------|------------------------------------------------------|
| `createCheckoutAndRedirect` | `(params: LemonSqueezyCheckoutParams) => Promise<void>` | Create checkout and open in new tab / redirect       |
| `isLoading`                 | `boolean`                                               | `true` while the checkout is being created           |
| `error`                     | `Error \| null`                                         | Error from the last checkout creation attempt        |
| `isError`                   | `boolean`                                               | `true` if the last checkout creation failed          |
| `isSuccess`                 | `boolean`                                               | `true` if the last checkout creation succeeded       |

### Redirect Strategy

Uses the `openCheckoutInNewTab` utility from `@/lib/utils/checkout-utils` with these settings:
- `windowFeatures: 'noopener,noreferrer'` for security
- `fallbackToRedirect: true` for popup-blocked scenarios
- `windowName: '_self'` to open in the current window as fallback
- Shows a toast error if the checkout URL cannot be opened

## Implementation Details

- **i18n support:** Both `useLemonSqueezyEmbeddedCheckout` and `useLemonSqueezyCheckoutWithRedirect` use `next-intl` translations from the `'payment'` namespace for user-facing messages.
- **Global type augmentation:** The module declares global `Window` types for `LemonSqueezy.Checkout.open`, `LemonSqueezy.Setup`, and `createLemonSqueezyAffiliate`.
- **Toast notifications:** Error states show `sonner` toast notifications with translated messages.

### API Layer

These hooks delegate to `lemonsqueezyClient` from `@/lib/api/lemonsqueezy-client` for actual API communication. The client handles endpoint routing, authentication, and response parsing.

## Usage Examples

### Health check before showing payment options

```tsx
import { useLemonSqueezyHealth } from '@/hooks/use-lemonsqueezy-queries';

function PaymentSection() {
  const { data: health, isLoading, isError } = useLemonSqueezyHealth();

  if (isLoading) return <Spinner />;
  if (isError) return <p>Payment system unavailable</p>;

  return <PricingCards />;
}
```

### Embedded checkout flow

```tsx
import { useLemonSqueezyEmbeddedCheckout } from '@/hooks/use-lemonsqueezy-queries';

function EmbeddedCheckout() {
  const {
    createEmbeddedCheckout,
    checkoutUrl,
    isEmbedReady,
    clearCheckout,
    isLoading,
  } = useLemonSqueezyEmbeddedCheckout({
    onSuccess: (event) => {
      console.log('Payment completed!', event);
      router.push('/success');
    },
    onClose: () => {
      console.log('Checkout closed by user');
    },
  });

  const handleBuy = async (variantId: string) => {
    await createEmbeddedCheckout({ variantId });
  };

  return (
    <div>
      <button onClick={() => handleBuy('variant-123')} disabled={!isEmbedReady || isLoading}>
        {isLoading ? 'Creating checkout...' : 'Buy Now'}
      </button>

      {checkoutUrl && (
        <div className="checkout-overlay">
          <LemonSqueezyCheckoutEmbed url={checkoutUrl} />
          <button onClick={clearCheckout}>Close</button>
        </div>
      )}
    </div>
  );
}
```

### Redirect-based checkout

```tsx
import { useLemonSqueezyCheckoutWithRedirect } from '@/hooks/use-lemonsqueezy-queries';

function RedirectCheckout() {
  const {
    createCheckoutAndRedirect,
    isLoading,
    isError,
  } = useLemonSqueezyCheckoutWithRedirect();

  return (
    <button
      onClick={() => createCheckoutAndRedirect({ variantId: 'variant-456' })}
      disabled={isLoading}
    >
      {isLoading ? 'Redirecting...' : 'Subscribe Now'}
    </button>
  );
}
```

### Low-level checkout creation

```tsx
import { useCreateLemonSqueezyCheckout } from '@/hooks/use-lemonsqueezy-queries';

function CustomCheckout() {
  const createCheckout = useCreateLemonSqueezyCheckout();

  const handleCustomFlow = async () => {
    try {
      const result = await createCheckout.mutateAsync({
        variantId: 'variant-789',
        customPrice: 1999, // cents
      });
      // Handle the checkout URL yourself
      console.log('Checkout URL:', result.checkoutUrl);
    } catch (error) {
      console.error('Failed to create checkout:', error);
    }
  };

  return (
    <button onClick={handleCustomFlow} disabled={createCheckout.isPending}>
      Custom Checkout
    </button>
  );
}
```

## Related Hooks

- [`useLemonSqueezyCheckouts`](./use-lemonsqueezy-checkouts-reference.md) -- Listing and managing existing LemonSqueezy checkouts/subscriptions.
- [`useLemonSqueezySubscription`](./use-lemonsqueezy-subscription-reference.md) -- Subscription lifecycle management (cancel, resume, update).
- [`useCheckout`](./use-checkout-reference.md) -- Provider-agnostic checkout flow.
- [`useSelectedCheckoutProvider`](./use-selected-checkout-provider-reference.md) -- Determines which payment provider is active.
