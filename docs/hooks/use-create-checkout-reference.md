---
id: use-create-checkout-reference
title: useCreateCheckoutSession Hook Reference
sidebar_label: useCreateCheckoutSession
sidebar_position: 66
---

# useCreateCheckoutSession

## Overview

`useCreateCheckoutSession` is a React hook for creating Stripe Checkout sessions for subscription purchases. It handles plan validation, multi-currency price ID resolution, trial period configuration, and automatic redirection to the Stripe-hosted checkout page. The module also exports a companion `useCheckoutSessionCache` hook for cache management and an `isStripeConfigured` constant.

**Source:** `template/hooks/use-create-checkout.ts`

## Signature

```typescript
const useCreateCheckoutSession: () => UseCreateCheckoutSessionReturn
```

### Parameters

This hook takes no parameters. It reads the router from `useRouter()` and the active currency from `useCurrencyContext()`.

## Return Values

| Property | Type | Description |
|---|---|---|
| `createCheckoutSession` | `(plan: PricingConfig, user: User \| null, billingInterval: PaymentInterval) => Promise<string>` | Creates a checkout session and redirects to Stripe. Returns the session ID. |
| `isLoading` | `boolean` | `true` while the checkout session is being created. |
| `error` | `string \| null` | Error message from the most recent attempt, or `null`. |
| `isError` | `boolean` | `true` if the most recent attempt failed. |
| `isSuccess` | `boolean` | `true` if the most recent session was created successfully. |
| `reset` | `() => void` | Reset the mutation state (clears error, success, etc.). |
| `data` | `string \| undefined` | The checkout session ID from the most recent successful creation. |
| `isPaused` | `boolean` | `true` if the mutation is paused (e.g., due to network issues). |
| `failureCount` | `number` | Number of times the current mutation has failed. |
| `failureReason` | `Error \| null` | The reason for the most recent failure. |
| `canRetry` | `boolean` | `true` if the failure count is less than 2 (the retry limit). |

## Type Definitions

### CheckoutSessionPayload

The payload sent to the checkout API:

```typescript
interface CheckoutSessionPayload {
  priceId: string;
  mode: 'subscription';
  trialPeriodDays: number;
  billingInterval: PaymentInterval;
  successUrl: string;
  cancelUrl: string;
  customerId: string;
  trialAmountId?: string;
  isAuthorizedTrialAmount?: boolean;
  metadata: {
    planId: string;
    planName: string;
    billingInterval: PaymentInterval;
    userId: string;
    email?: string;
    trialAmount?: number;
  };
}
```

### User (Internal)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  image: string;
}
```

### SubscriptionFormProps

```typescript
interface SubscriptionFormProps {
  selectedPlan?: PricingPlans;
  onSuccess?: (subscriptionId: string) => void;
  onError?: (error: Error) => void;
}
```

## Implementation Details

### Multi-Currency Price Resolution

The hook resolves the correct Stripe price ID based on the active currency context:

1. Maps the plan ID to a plan name (`free`, `standard`, `premium`) with validation
2. Calls `getStripePriceConfig(planName, currency, interval)` for currency-aware price IDs
3. If a currency-specific price ID exists, uses it along with the currency-specific setup fee
4. Falls back to the plan's configured `stripePriceId` or `annualPriceId` if no currency-specific config is found

### Checkout Flow

1. Validates the user is authenticated (redirects to `/auth/signin` if not)
2. Resolves the correct price ID for the plan, currency, and interval
3. Constructs the `CheckoutSessionPayload` with metadata, trial config, and callback URLs
4. Posts to `POST /api/stripe/checkout`
5. Extracts the session ID and checkout URL from the response
6. Redirects to the Stripe-hosted checkout page via `window.location.href`

### Retry Logic

- Up to 2 retries with exponential backoff (max 30 seconds)
- Authentication errors (messages containing `'auth'`) are not retried

### Query Invalidation

On successful checkout creation, the hook invalidates:
- `['subscriptions']`
- `['user-subscription']`

### Error Handling

The hook uses a custom `CheckoutSessionError` class. Authentication errors trigger a redirect to `/auth/signin`.

## Exported Constants

### isStripeConfigured

```typescript
const isStripeConfigured: boolean
```

`true` when all required Stripe environment variables are set:
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID`
- `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID`

## Companion Hook

### useCheckoutSessionCache

```typescript
function useCheckoutSessionCache(): {
  invalidateCheckoutCache: () => Promise<void>;
  clearCheckoutCache: () => Promise<void>;
}
```

Provides cache management for checkout session queries, invalidating or clearing the `['create-checkout-session']` and `['checkout-session']` query keys.

## Usage Examples

### Basic Checkout Button

```tsx
import { useCreateCheckoutSession } from '@/hooks/use-create-checkout';
import { useCurrentUser } from '@/hooks/use-current-user';

function CheckoutButton({ plan, billingInterval }: {
  plan: PricingConfig;
  billingInterval: PaymentInterval;
}) {
  const { createCheckoutSession, isLoading, error } = useCreateCheckoutSession();
  const { user } = useCurrentUser();

  const handleCheckout = async () => {
    try {
      await createCheckoutSession(plan, user, billingInterval);
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleCheckout} disabled={isLoading}>
        {isLoading ? 'Creating session...' : `Subscribe to ${plan.name}`}
      </button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### With Retry State

```tsx
function CheckoutWithRetry({ plan, billingInterval }: {
  plan: PricingConfig;
  billingInterval: PaymentInterval;
}) {
  const {
    createCheckoutSession,
    isLoading,
    isError,
    error,
    canRetry,
    failureCount,
    reset
  } = useCreateCheckoutSession();
  const { user } = useCurrentUser();

  return (
    <div>
      <button
        onClick={() => createCheckoutSession(plan, user, billingInterval)}
        disabled={isLoading}
      >
        {isLoading ? 'Processing...' : 'Subscribe'}
      </button>

      {isError && (
        <div>
          <p>Error: {error}</p>
          <p>Attempts: {failureCount}/2</p>
          {canRetry && (
            <button onClick={reset}>Reset & Try Again</button>
          )}
        </div>
      )}
    </div>
  );
}
```

### Checking Stripe Configuration

```tsx
import { isStripeConfigured } from '@/hooks/use-create-checkout';

function PaymentSection() {
  if (!isStripeConfigured) {
    return <p>Stripe is not configured. Please set environment variables.</p>;
  }

  return <CheckoutButton />;
}
```

## Related Hooks

- [`useCheckoutButton`](./use-checkout-button-reference.md) -- LemonSqueezy checkout button logic.
- [`useSetupIntent`](./use-setup-intent-reference.md) -- Create Stripe SetupIntents for saving payment methods.
- [`usePaymentMethods`](./use-payment-methods-reference.md) -- Manage stored payment methods.
- [`useBillingData`](./use-billing-data-reference.md) -- Fetch subscription and payment history.
- [`useStripeProducts`](./use-stripe-products-reference.md) -- Fetch dynamic Stripe products.
