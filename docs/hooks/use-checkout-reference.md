---
id: use-checkout-reference
title: useCheckoutButton / useCreateCheckoutSession
sidebar_label: useCheckoutButton
sidebar_position: 35
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCheckoutButton / useCreateCheckoutSession

Two complementary hooks for managing checkout flows. `useCheckoutButton` handles Lemon Squeezy checkout interactions (embedded and redirect modes), while `useCreateCheckoutSession` manages Stripe checkout session creation with multi-currency support.

## Import

```typescript
// Lemon Squeezy checkout
import { useCheckoutButton } from '@/hooks/use-checkout-button';
import type { CheckoutButtonParams, UseCheckoutButtonReturn } from '@/hooks/use-checkout-button';

// Stripe checkout
import { useCreateCheckoutSession, useCheckoutSessionCache } from '@/hooks/use-create-checkout';
```

## API Reference

### `useCheckoutButton`

```typescript
function useCheckoutButton(params?: CheckoutButtonParams): UseCheckoutButtonReturn;
```

#### `CheckoutButtonParams`

| Property | Type | Default | Description |
|---|---|---|---|
| `defaultEmail` | `string` | `''` | Pre-filled email for the checkout form. |
| `defaultPrice` | `number` | `undefined` | Default price in cents. |
| `variantId` | `number` | `undefined` | Lemon Squeezy product variant ID. |
| `metadata` | `Record<string, any>` | `{}` | Custom metadata to attach to the checkout. |
| `embedded` | `boolean` | `false` | Use embedded checkout overlay instead of redirect. |
| `onPaymentSuccess` | `(res?: any) => void` | `undefined` | Callback for successful payment (embedded mode). |
| `onClose` | `() => void` | `undefined` | Callback when embedded checkout is closed. |
| `dark` | `boolean` | `undefined` | Enable dark mode for the checkout UI. |

#### Return Value -- `UseCheckoutButtonReturn`

**State Properties:**

| Property | Type | Description |
|---|---|---|
| `customPrice` | `number \| undefined` | The current custom price value. |
| `showForm` | `boolean` | Whether to show the email form (true when no default email is provided). |
| `isLoading` | `boolean` | Whether the checkout creation is in progress. |
| `error` | `Error \| null` | Error from the last checkout attempt. |
| `isError` | `boolean` | Whether the last operation resulted in an error. |
| `isSuccess` | `boolean` | Whether the last checkout was created successfully. |
| `checkoutUrl` | `string \| null` | The generated checkout URL (embedded mode only). |
| `isEmbedReady` | `boolean` | Whether the embedded checkout overlay is ready to display. |

**Action Properties:**

| Property | Type | Description |
|---|---|---|
| `setCustomPrice` | `(price: number \| undefined) => void` | Update the custom price. |
| `handleSubmit` | `(e: React.FormEvent) => Promise<void>` | Form submission handler that creates a checkout. |
| `handleClick` | `() => Promise<void>` | Simple click handler that creates a checkout. |
| `handlePriceChange` | `(e: React.ChangeEvent<HTMLInputElement>) => void` | Input handler for price fields (validates numeric input). |
| `clearCheckout` | `() => void` | Clears the embedded checkout state. |
| `handleSubmitWithParams` | `(params?: CheckoutButtonParams) => Promise<void>` | Creates a checkout with custom override parameters. |

---

### `useCreateCheckoutSession`

```typescript
function useCreateCheckoutSession(): UseCreateCheckoutSessionReturn;
```

#### Return Value

| Property | Type | Description |
|---|---|---|
| `createCheckoutSession` | `(plan: PricingConfig, user: User \| null, billingInterval: PaymentInterval) => Promise<string>` | Creates a Stripe checkout session and redirects to the Stripe-hosted payment page. Returns the session ID. |
| `isLoading` | `boolean` | Whether the session creation is in progress. |
| `error` | `string \| null` | Error message from the last attempt. |
| `isError` | `boolean` | Whether the last operation failed. |
| `isSuccess` | `boolean` | Whether the last session was created successfully. |
| `reset` | `() => void` | Resets the mutation state. |
| `data` | `string \| undefined` | The checkout session ID from the last successful creation. |
| `isPaused` | `boolean` | Whether the mutation is paused (e.g., due to network issues). |
| `failureCount` | `number` | Number of failed attempts. |
| `failureReason` | `Error \| null` | The error from the last failure. |
| `canRetry` | `boolean` | Whether a retry is possible (fewer than 2 failures). |

---

### `useCheckoutSessionCache`

```typescript
function useCheckoutSessionCache(): {
  invalidateCheckoutCache: () => Promise<void>;
  clearCheckoutCache: () => Promise<void>;
};
```

| Property | Type | Description |
|---|---|---|
| `invalidateCheckoutCache` | `() => Promise<void>` | Invalidates checkout-related query caches, triggering background refetches. |
| `clearCheckoutCache` | `() => Promise<void>` | Completely removes checkout session data from the query cache. |

## Usage Examples

### Lemon Squeezy Redirect Checkout

```tsx
function BuyButton({ variantId }: { variantId: number }) {
  const { handleClick, isLoading, isError, error } = useCheckoutButton({
    variantId,
    metadata: { source: 'pricing-page' },
  });

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Processing...' : 'Buy Now'}
      </button>
      {isError && <p className="text-red-500">{error?.message}</p>}
    </div>
  );
}
```

### Stripe Subscription Checkout

```tsx
function SubscriptionButton({ plan, billingInterval }: {
  plan: PricingConfig;
  billingInterval: PaymentInterval;
}) {
  const { createCheckoutSession, isLoading, error, canRetry } = useCreateCheckoutSession();
  const { data: session } = useSession();

  const handleSubscribe = async () => {
    try {
      await createCheckoutSession(plan, session?.user ?? null, billingInterval);
      // Redirect happens automatically via window.location.href
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSubscribe} disabled={isLoading}>
        {isLoading ? 'Creating session...' : `Subscribe to ${plan.name}`}
      </button>
      {error && (
        <div className="text-red-500">
          <p>{error}</p>
          {canRetry && <button onClick={handleSubscribe}>Retry</button>}
        </div>
      )}
    </div>
  );
}
```

### Embedded Lemon Squeezy Checkout

```tsx
function EmbeddedCheckout({ variantId }: { variantId: number }) {
  const {
    handleClick,
    isLoading,
    checkoutUrl,
    isEmbedReady,
    clearCheckout,
  } = useCheckoutButton({
    variantId,
    embedded: true,
    onPaymentSuccess: (res) => console.log('Payment complete!', res),
    onClose: () => clearCheckout(),
    dark: true,
  });

  return (
    <div>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Loading checkout...' : 'Purchase'}
      </button>
      {checkoutUrl && isEmbedReady && (
        <div className="checkout-overlay">
          {/* Lemon Squeezy embedded checkout renders here */}
        </div>
      )}
    </div>
  );
}
```

## Configuration

### Stripe Environment Variables

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_...
```

All three must be set for Stripe checkout to be considered configured. The hook exports an `isStripeConfigured` boolean.

### Multi-Currency Support

The `useCreateCheckoutSession` hook uses `useCurrencyContext()` to detect the user's currency and looks up currency-specific Stripe price IDs via `getStripePriceConfig()`. If no currency-specific price exists, it falls back to the plan's default price ID.

### Retry Strategy

| Setting | Value |
|---|---|
| Max retries | 2 |
| Retry condition | Does not retry authentication errors |
| Retry delay | Exponential backoff, capped at 30 seconds |

## Edge Cases and Gotchas

- **Unauthenticated Users**: `useCreateCheckoutSession` throws a `CheckoutSessionError` if `user` is `null`. It then redirects to `/auth/signin` via `router.push`.
- **Invalid Plan ID**: If the plan ID does not match `PaymentPlan.FREE`, `PaymentPlan.STANDARD`, or `PaymentPlan.PREMIUM`, a `CheckoutSessionError` is thrown with a descriptive message.
- **Redirect vs Embedded**: `useCheckoutButton` switches between Lemon Squeezy redirect and embedded modes based on the `embedded` parameter. The underlying hooks (`useLemonSqueezyCheckoutWithRedirect` and `useLemonSqueezyEmbeddedCheckout`) are both instantiated regardless, but only one is used.
- **Price Validation**: `handlePriceChange` only accepts non-negative integers. Empty values set `customPrice` to `undefined`.
- **Cache Invalidation on Success**: After a successful Stripe session creation, both `subscriptions` and `user-subscription` query caches are invalidated to keep subscription state fresh.
- **Automatic Redirect**: `useCreateCheckoutSession` automatically sets `window.location.href` when the API returns a checkout URL. There is no way to prevent this redirect from within the hook.

## Related Hooks

- [usePlanGuard](./use-plan-guard-reference.md) -- Check plan access before showing checkout options.
- [useMultiStepForm](./use-multi-step-form-reference.md) -- Build multi-step checkout wizards.
- [useToast](./use-toast-reference.md) -- Display payment success/error notifications.
