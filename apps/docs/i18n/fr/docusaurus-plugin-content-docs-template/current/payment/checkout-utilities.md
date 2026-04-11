---
id: checkout-utilities
title: Utilitaires de checkout
sidebar_label: Utilitaires de checkout
sidebar_position: 7
---

# Utilitaires de checkout

The `checkout-utils` module (`lib/utils/checkout-utils.ts`) provides helper functions for opening payment checkout flows in the browser. It handles popup blocking, fallback redirects, error handling, and creates reusable click handlers for checkout buttons.

## Core Concepts

The checkout utilities solve common browser challenges when opening payment provider checkout pages:

- **Popup blocking** -- Browsers may block `window.open()` calls. The utilities detect this and fall back to direct navigation.
- **Error handling** -- Network failures and unexpected errors are caught and reported through callbacks.
- **Reusable handlers** -- A factory function creates click handlers that can be attached to any button component.

## Types

```ts
interface CheckoutWindowOptions {
  url: string;
  windowName?: string;       // Default: '_blank'
  windowFeatures?: string;   // Default: 'noopener,noreferrer'
  fallbackToRedirect?: boolean; // Default: true
}
```

## Functions

### openCheckoutInNewTab

Opens a checkout URL in a new browser tab with popup detection and fallback:

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

const success = openCheckoutInNewTab({
  url: 'https://checkout.stripe.com/pay/cs_test_...',
});

if (!success) {
  // Both popup and redirect failed
  console.error('Could not open checkout');
}
```

#### Implementation

```ts
export function openCheckoutInNewTab(
  options: CheckoutWindowOptions
): boolean {
  const {
    url,
    windowName = '_blank',
    windowFeatures = 'noopener,noreferrer',
    fallbackToRedirect = true,
  } = options;

  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const newWindow = window.open(url, windowName, windowFeatures);

    if (!newWindow) {
      console.warn('Popup blocked by browser');

      if (fallbackToRedirect) {
        window.location.href = url;
        return true;
      }

      return false;
    }

    try {
      newWindow.focus();
    } catch (focusError) {
      console.warn('Could not focus new window:', focusError);
    }

    return true;
  } catch {
    if (fallbackToRedirect) {
      window.location.href = url;
      return true;
    }
    return false;
  }
}
```

#### Behavior Flow

1. **SSR guard** -- Returns `false` immediately if running on the server
2. **Open popup** -- Attempts `window.open()` with the specified features
3. **Popup blocked** -- If `window.open()` returns `null`, the popup was blocked
4. **Fallback redirect** -- If `fallbackToRedirect` is `true` (default), navigates the current page to the checkout URL
5. **Focus attempt** -- Tries to focus the new window (may fail in some browsers without causing an error)
6. **Error catch** -- Any exception falls back to redirect if enabled

#### Options

| Option | Default | Description |
|--------|---------|-------------|
| `url` | Required | The checkout URL to open |
| `windowName` | `'_blank'` | Target window name |
| `windowFeatures` | `'noopener,noreferrer'` | Security features for the new window |
| `fallbackToRedirect` | `true` | Navigate current page if popup is blocked |

### openCheckoutWithErrorHandling

A wrapper around `openCheckoutInNewTab` that adds an error callback:

```ts
import { openCheckoutWithErrorHandling } from '@/lib/utils/checkout-utils';

const success = openCheckoutWithErrorHandling(
  'https://checkout.stripe.com/pay/cs_test_...',
  (error) => {
    showToast(error); // Display error to user
  }
);
```

#### Implementation

```ts
export function openCheckoutWithErrorHandling(
  url: string,
  onError?: (error: string) => void
): boolean {
  const success = openCheckoutInNewTab({ url });

  if (!success && onError) {
    onError(
      'Unable to open checkout. Please check your popup blocker settings.'
    );
  }

  return success;
}
```

### createCheckoutClickHandler

A factory function that creates a checkout click handler with success, error, and toast callbacks. This is designed to be passed directly to button `onClick` props:

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';

function PricingCard({ checkoutUrl }: { checkoutUrl: string }) {
  const handleCheckout = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_opened');
    },
    onError: (error) => {
      console.error(error);
    },
    showAlert: true, // Show toast notification on failure
  });

  return (
    <button onClick={handleCheckout}>
      Subscribe Now
    </button>
  );
}
```

#### Implementation

```ts
export function createCheckoutClickHandler(
  checkoutUrl: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showAlert?: boolean;
  }
) {
  return () => {
    const success = openCheckoutWithErrorHandling(
      checkoutUrl,
      options?.onError
    );

    if (success && options?.onSuccess) {
      options.onSuccess();
    }

    if (!success && options?.showAlert) {
      toast.error(
        'Unable to open checkout. Please try again or contact support.'
      );
    }
  };
}
```

#### Options

| Option | Type | Description |
|--------|------|-------------|
| `onSuccess` | `() => void` | Called when checkout opens successfully |
| `onError` | `(error: string) => void` | Called with error message on failure |
| `showAlert` | `boolean` | Show a toast notification using `sonner` on failure |

## Usage Patterns

### Basic Checkout Button

```ts
import { openCheckoutInNewTab } from '@/lib/utils/checkout-utils';

function CheckoutButton({ url }: { url: string }) {
  return (
    <button
      onClick={() => openCheckoutInNewTab({ url })}
    >
      Proceed to Checkout
    </button>
  );
}
```

### Checkout with Analytics

```ts
import { createCheckoutClickHandler } from '@/lib/utils/checkout-utils';
import { analytics } from '@/lib/analytics';

function PricingTier({ plan, checkoutUrl }) {
  const handleClick = createCheckoutClickHandler(checkoutUrl, {
    onSuccess: () => {
      analytics.track('checkout_initiated', {
        plan: plan.name,
        price: plan.price,
      });
    },
    onError: (error) => {
      analytics.captureException(new Error(error), {
        plan: plan.name,
      });
    },
    showAlert: true,
  });

  return (
    <button onClick={handleClick}>
      Choose {plan.name}
    </button>
  );
}
```

### Disabling Popup Fallback

If you want to prevent the current page from navigating away (e.g., in a modal), disable the redirect fallback:

```ts
const success = openCheckoutInNewTab({
  url: checkoutUrl,
  fallbackToRedirect: false,
});

if (!success) {
  // Show inline message instead of navigating
  setShowPopupBlockedMessage(true);
}
```

## Security Considerations

- The `noopener,noreferrer` window features prevent the opened page from accessing `window.opener`, protecting against tabnapping attacks
- The `fallbackToRedirect` uses `window.location.href` assignment (not `window.open`) which is not subject to popup blockers
- SSR guard prevents `window` access during server-side rendering

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/checkout-utils.ts` | Checkout window management and click handlers |