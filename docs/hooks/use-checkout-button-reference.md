---
id: use-checkout-button-reference
title: useCheckoutButton Hook Reference
sidebar_label: useCheckoutButton
sidebar_position: 64
---

# useCheckoutButton

## Overview

`useCheckoutButton` is a React hook that encapsulates all LemonSqueezy checkout button logic. It supports both redirect-based and embedded checkout modes, custom pricing, and provides handlers for form submission, button clicks, and price input changes.

**Source:** `template/hooks/use-checkout-button.ts`

## Signature

```typescript
function useCheckoutButton(params?: CheckoutButtonParams): UseCheckoutButtonReturn
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `params` | `CheckoutButtonParams` | No | Optional configuration for checkout behavior. |

#### CheckoutButtonParams

| Property | Type | Default | Description |
|---|---|---|---|
| `defaultEmail` | `string` | `''` | Pre-filled email for the checkout. If empty, a form is shown. |
| `defaultPrice` | `number` | `undefined` | Initial custom price value. |
| `variantId` | `number` | `undefined` | LemonSqueezy product variant ID. |
| `metadata` | `Record<string, any>` | `{}` | Additional metadata to pass to the checkout session. |
| `embedded` | `boolean` | `false` | Whether to use embedded checkout mode instead of redirect. |
| `onPaymentSuccess` | `(res?: any) => void` | `undefined` | Callback fired when embedded payment completes successfully. |
| `onClose` | `() => void` | `undefined` | Callback fired when the embedded checkout overlay is closed. |
| `dark` | `boolean` | `undefined` | Whether to use dark theme for the checkout. |

## Return Values

The hook returns an object that merges `CheckoutButtonState` and `CheckoutButtonActions`:

### State

| Property | Type | Description |
|---|---|---|
| `customPrice` | `number \| undefined` | The current custom price value. |
| `showForm` | `boolean` | Whether to show the email form. `true` when no `defaultEmail` is provided. |
| `isLoading` | `boolean` | `true` while the checkout session is being created. |
| `error` | `Error \| null` | The error from the most recent checkout attempt. |
| `isError` | `boolean` | `true` if the most recent checkout attempt failed. |
| `isSuccess` | `boolean` | `true` if the most recent checkout session was created successfully. |
| `checkoutUrl` | `string \| null` | The embedded checkout URL. Only set in embedded mode. |
| `isEmbedReady` | `boolean` | Whether the embedded checkout is ready to display. Always `true` in redirect mode. |

### Actions

| Property | Type | Description |
|---|---|---|
| `setCustomPrice` | `(price: number \| undefined) => void` | Update the custom price value. |
| `handleSubmit` | `(e: React.FormEvent) => Promise<void>` | Form submission handler. Calls `e.preventDefault()` and triggers checkout. |
| `handleClick` | `() => Promise<void>` | Simple button click handler that triggers checkout. |
| `handlePriceChange` | `(e: React.ChangeEvent<HTMLInputElement>) => void` | Input change handler for price fields. Parses integer values and validates `>= 0`. |
| `clearCheckout` | `() => void` | Clear the embedded checkout state. Only functional in embedded mode. |
| `handleSubmitWithParams` | `(params?: CheckoutButtonParams) => Promise<void>` | Execute checkout with optional override parameters. |

## Implementation Details

- **Checkout Modes:** The hook internally uses `useLemonSqueezyCheckoutWithRedirect` for redirect mode and `useLemonSqueezyEmbeddedCheckout` for embedded mode. The active hook is selected based on the `embedded` parameter.
- **Metadata Injection:** A `source: 'checkout-button'` field and a `timestamp` are automatically added to checkout metadata.
- **Price Validation:** The `handlePriceChange` handler only accepts non-negative integers. Empty input sets the price to `undefined`.
- **Error Handling:** Checkout errors are caught, logged to the console, and re-thrown for upstream handling.

### Dependencies

- `useLemonSqueezyCheckoutWithRedirect` -- From `@/hooks/use-lemonsqueezy-queries`
- `useLemonSqueezyEmbeddedCheckout` -- From `@/hooks/use-lemonsqueezy-queries`

## Usage Examples

### Redirect Checkout Button

```tsx
import { useCheckoutButton } from '@/hooks/use-checkout-button';

function SimpleCheckoutButton({ variantId }: { variantId: number }) {
  const { handleClick, isLoading } = useCheckoutButton({
    variantId,
    defaultEmail: 'user@example.com'
  });

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Subscribe Now'}
    </button>
  );
}
```

### Embedded Checkout with Custom Price

```tsx
function EmbeddedCheckout({ variantId }: { variantId: number }) {
  const {
    customPrice,
    handlePriceChange,
    handleSubmit,
    isLoading,
    checkoutUrl,
    isEmbedReady,
    clearCheckout
  } = useCheckoutButton({
    variantId,
    embedded: true,
    defaultPrice: 1000,
    onPaymentSuccess: (res) => {
      console.log('Payment succeeded:', res);
    },
    onClose: () => {
      console.log('Checkout closed');
    }
  });

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Price (cents):
          <input
            type="number"
            value={customPrice ?? ''}
            onChange={handlePriceChange}
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating checkout...' : 'Pay'}
        </button>
      </form>

      {checkoutUrl && isEmbedReady && (
        <div>
          <iframe src={checkoutUrl} />
          <button onClick={clearCheckout}>Cancel</button>
        </div>
      )}
    </div>
  );
}
```

### Dynamic Params Override

```tsx
function DynamicCheckout() {
  const { handleSubmitWithParams, isLoading } = useCheckoutButton();

  const handleUpgrade = async () => {
    await handleSubmitWithParams({
      variantId: 12345,
      metadata: { plan: 'premium', source: 'upgrade-modal' },
      dark: true
    });
  };

  return (
    <button onClick={handleUpgrade} disabled={isLoading}>
      Upgrade to Premium
    </button>
  );
}
```

## Related Hooks

- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Stripe-based checkout session creation.
- [`usePaymentAvailability`](./use-payment-availability-reference.md) -- Check whether payment providers are configured.
- [`useLemonSqueezySubscription`](./use-lemonsqueezy-subscription-reference.md) -- LemonSqueezy subscription management actions.
- [`useAutoRenewal`](./use-auto-renewal-reference.md) -- Manage subscription auto-renewal.
