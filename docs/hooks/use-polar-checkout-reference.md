---
id: use-polar-checkout-reference
title: usePolarCheckout Hook Reference
sidebar_label: usePolarCheckout
sidebar_position: 80
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePolarCheckout

A mutation hook that creates Polar checkout sessions for subscription purchases. Handles session creation, redirect or embedded checkout flows, error handling with automatic retries, and query cache invalidation.

**Source file:** `template/hooks/use-polar-checkout.ts`

## Overview

`usePolarCheckout` wraps a React Query `useMutation` to POST to the `/api/polar/checkout` endpoint. It creates a checkout session on the Polar payment platform, then either redirects the browser to the checkout URL or stores the URL for embedded checkout rendering. The hook manages loading, error, and success states, and automatically invalidates subscription-related query caches on success.

## Signature

```ts
function usePolarCheckout(params?: UsePolarCheckoutParams): {
  createCheckoutSession: (
    productId: string,
    user: User | null,
    plan?: PricingConfig,
    billingInterval?: PaymentInterval
  ) => Promise<PolarCheckoutSessionResponse>;
  isLoading: boolean;
  error: string | null;
  isError: boolean;
  isSuccess: boolean;
  reset: () => void;
  data: PolarCheckoutSessionResponse | undefined;
  checkoutUrl: string | null;
}
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `params` | `UsePolarCheckoutParams` | `undefined` | Optional configuration for the checkout behavior |

### UsePolarCheckoutParams

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `embedded` | `boolean` | `false` | When `true`, stores the checkout URL in state instead of redirecting. Use this for rendering Polar's embedded checkout. |
| `onSuccess` | `(data: PolarCheckoutSessionResponse) => void` | `undefined` | Callback invoked after a successful checkout session creation |

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `createCheckoutSession` | `(productId, user, plan?, billingInterval?) => Promise<...>` | Initiates the checkout session creation. Requires a Polar `productId` and authenticated `user`. |
| `isLoading` | `boolean` | Whether the mutation is currently in progress |
| `error` | `string \| null` | Error message string if the mutation failed, otherwise `null` |
| `isError` | `boolean` | Whether the mutation is in an error state |
| `isSuccess` | `boolean` | Whether the mutation completed successfully |
| `reset` | `() => void` | Clears the checkout URL and resets the mutation state |
| `data` | `PolarCheckoutSessionResponse \| undefined` | The checkout session response data on success |
| `checkoutUrl` | `string \| null` | The Polar checkout URL when `embedded` mode is enabled. `null` otherwise. |

## Types

### PolarCheckoutSessionPayload

```ts
interface PolarCheckoutSessionPayload {
  productId: string;
  mode: 'one_time' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: PaymentInterval;
    userId?: string;
  };
}
```

### PolarCheckoutSessionResponse

```ts
interface PolarCheckoutSessionResponse {
  id: string;
  url?: string;
}
```

### PaymentInterval

```ts
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

## Implementation Details

### Checkout Flow

1. **Validation**: The mutation checks that `user` is non-null and `productId` is provided. Missing either throws a `PolarCheckoutSessionError`.
2. **API Call**: Posts a `PolarCheckoutSessionPayload` to `/api/polar/checkout` via `serverClient.post`.
3. **Response Parsing**: Handles both `{ data: { id, url } }` and flat `{ id, url }` response shapes for resilience.
4. **Redirect vs Embedded**:
   - **Redirect mode** (default): Sets `window.location.href` to the checkout URL.
   - **Embedded mode**: Stores the URL in `checkoutUrl` state for the consumer to render an iframe or embedded component.

### Retry Strategy

- Authentication errors (messages containing `'auth'`) are not retried.
- Other errors are retried up to 2 times with exponential backoff (1s, 2s, capped at 30s).

### Cache Invalidation

On success, the hook invalidates both `['subscriptions']` and `['user-subscription']` query keys to ensure billing data reflects the new checkout.

### Error Handling

- Authentication errors trigger a redirect to `/auth/signin`.
- All errors are displayed via `toast.error`.
- The `PolarCheckoutSessionError` class provides typed error identification.

## Usage Examples

### Basic redirect checkout

```tsx
import { usePolarCheckout } from '@/hooks/use-polar-checkout';

function PolarCheckoutButton({ plan, productId, user }) {
  const { createCheckoutSession, isLoading } = usePolarCheckout();

  const handleCheckout = async () => {
    await createCheckoutSession(productId, user, plan, 'monthly');
  };

  return (
    <button onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? 'Redirecting...' : `Subscribe to ${plan.name}`}
    </button>
  );
}
```

### Embedded checkout

```tsx
import { usePolarCheckout } from '@/hooks/use-polar-checkout';

function EmbeddedPolarCheckout({ plan, productId, user }) {
  const { createCheckoutSession, checkoutUrl, isLoading, reset } =
    usePolarCheckout({ embedded: true });

  const handleStart = async () => {
    await createCheckoutSession(productId, user, plan);
  };

  if (checkoutUrl) {
    return (
      <div>
        <iframe src={checkoutUrl} className="w-full h-[600px] border-0" />
        <button onClick={reset}>Cancel</button>
      </div>
    );
  }

  return (
    <button onClick={handleStart} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Start Checkout'}
    </button>
  );
}
```

### With success callback

```tsx
import { usePolarCheckout } from '@/hooks/use-polar-checkout';

function CheckoutWithTracking({ productId, user, plan }) {
  const { createCheckoutSession, isLoading } = usePolarCheckout({
    onSuccess: (data) => {
      analytics.track('checkout_session_created', {
        sessionId: data.id,
        provider: 'polar',
        planName: plan.name,
      });
    },
  });

  return (
    <button
      onClick={() => createCheckoutSession(productId, user, plan, 'yearly')}
      disabled={isLoading}
    >
      Subscribe Yearly
    </button>
  );
}
```

### Error state handling

```tsx
function PolarCheckoutWithErrors({ productId, user, plan }) {
  const { createCheckoutSession, isLoading, isError, error, reset } =
    usePolarCheckout();

  return (
    <div>
      <button
        onClick={() => createCheckoutSession(productId, user, plan)}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Subscribe'}
      </button>

      {isError && (
        <div className="text-red-500 mt-2">
          <p>{error}</p>
          <button onClick={reset} className="text-sm underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useMutation` for the checkout API call |
| `@/lib/api/server-api-client` | `serverClient.post` and `apiUtils` for the API request |
| `@/lib/query-client` | `getQueryClient` for cache invalidation |
| `next/navigation` | `useRouter` for auth error redirects |
| `sonner` | `toast` for success/error notifications |

## Related Hooks

- [`usePolarSubscription`](/docs/template/hooks/use-polar-subscription-reference) -- Cancel and reactivate Polar subscriptions
- [`useSelectedCheckoutProvider`](/docs/template/hooks/use-selected-checkout-provider-reference) -- Determines which payment provider to use
- [`useCreateCheckout`](/docs/template/hooks/use-create-checkout-reference) -- Generic checkout creation across providers
- [`useBillingData`](/docs/template/hooks/use-billing-data-reference) -- Fetches subscription and payment history
