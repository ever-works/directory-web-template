---
id: use-setup-intent-reference
title: useSetupIntent Hook Reference
sidebar_label: useSetupIntent
sidebar_position: 67
---

# useSetupIntent

## Overview

`useSetupIntent` is a comprehensive React hook for managing Stripe SetupIntents, which are used to save payment methods for future use. The module exports a family of hooks covering different use cases: the main `useSetupIntent` query hook, `useCreateSetupIntent` for on-demand creation, `useSetupIntentCache` for cache management, `useGetSetupIntent` for retrieving existing intents, `useCreateSetupIntentWithCustomParams` for custom creation flows, and `useSetupIntentManager` that combines all functionality.

**Source:** `template/hooks/use-setup-intent.ts`

## Hooks Overview

| Hook | Purpose |
|---|---|
| `useSetupIntent` | Main hook -- creates and caches a SetupIntent via query |
| `useCreateSetupIntent` | On-demand SetupIntent creation via mutation |
| `useSetupIntentCache` | Cache management utilities |
| `useGetSetupIntent` | Retrieve an existing SetupIntent by ID |
| `useCreateSetupIntentWithCustomParams` | Create with customer name and default flag |
| `useSetupIntentManager` | Combined hook merging query, mutation, and cache |

## useSetupIntent (Main Hook)

### Signature

```typescript
function useSetupIntent(options?: UseSetupIntentOptions): UseSetupIntentReturn
```

### Parameters

| Property | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | Whether to enable the automatic SetupIntent creation query. |
| `params` | `CreateSetupIntentParams` | `undefined` | Parameters for creating the SetupIntent. |
| `onSuccess` | `(data: SetupIntentResponse) => void` | `undefined` | Callback fired on successful creation. |
| `onError` | `(error: SetupIntentError) => void` | `undefined` | Callback fired on creation failure. |
| `suppressSuccessToast` | `boolean` | `false` | Whether to suppress the default success toast notification. |

#### CreateSetupIntentParams

```typescript
interface CreateSetupIntentParams {
  customer_id?: string;
  payment_method_types?: string[];
  usage?: 'off_session' | 'on_session';
  metadata?: Record<string, string>;
  customer_name?: string;
  set_as_default?: boolean;
}
```

### Return Values

| Property | Type | Description |
|---|---|---|
| `data` | `SetupIntentResponse \| undefined` | The raw SetupIntent data. |
| `setupIntent` | `SetupIntentResponse \| undefined` | Memoized alias for `data`. |
| `clientSecret` | `string \| undefined` | The client secret for Stripe Elements. |
| `isLoading` | `boolean` | `true` while the initial creation is in progress. |
| `isFetching` | `boolean` | `true` while any fetch (initial or refetch) is in progress. |
| `isError` | `boolean` | `true` if creation failed. |
| `isSuccess` | `boolean` | `true` if creation succeeded. |
| `isReady` | `boolean` | `true` when the SetupIntent is created, has a client secret, and its status is `'requires_payment_method'`. |
| `isStale` | `boolean` | `true` if the cached data is considered stale. |
| `error` | `SetupIntentError \| undefined` | The error from the creation attempt. |
| `refetch` | `() => void` | Manually refetch (re-create) the SetupIntent. |
| `invalidateCache` | `() => void` | Mark the cache as stale and trigger refetch. |
| `clearCache` | `() => void` | Remove the SetupIntent from cache entirely. |
| `prefetch` | `(params?: CreateSetupIntentParams) => Promise<void>` | Prefetch a SetupIntent with optional parameters. |
| `setData` | `(data: SetupIntentResponse \| null) => void` | Manually set the cached SetupIntent data. |

## useCreateSetupIntent

On-demand SetupIntent creation using a mutation.

### Signature

```typescript
function useCreateSetupIntent(options?: UseCreateSetupIntentOptions): {
  createSetupIntent: (params?: CreateSetupIntentParams) => void;
  createSetupIntentAsync: (params?: CreateSetupIntentParams) => Promise<SetupIntentResponse>;
  isCreating: boolean;
  isError: boolean;
  error: SetupIntentError | null;
  reset: () => void;
}
```

## useSetupIntentCache

Cache management utilities for SetupIntents.

### Signature

```typescript
function useSetupIntentCache(): {
  invalidateAll: () => void;
  clearAll: () => void;
  getFromCache: (params?: CreateSetupIntentParams) => SetupIntentResponse | undefined;
  setInCache: (data: SetupIntentResponse | null, params?: CreateSetupIntentParams) => void;
  isCached: (params?: CreateSetupIntentParams) => boolean;
  prefetchSetupIntent: (params?: CreateSetupIntentParams) => Promise<void>;
}
```

## useGetSetupIntent

Retrieve an existing SetupIntent by its ID.

### Signature

```typescript
function useGetSetupIntent(
  setupIntentId: string,
  options?: { enabled?: boolean }
): UseQueryResult<SetupIntentResponse, SetupIntentError>
```

## useCreateSetupIntentWithCustomParams

Create a SetupIntent with `customer_name` and optional `set_as_default` flag.

### Signature

```typescript
function useCreateSetupIntentWithCustomParams(options?: {
  onSuccess?: (data: { client_secret: string }) => void;
  onError?: (error: SetupIntentError) => void;
}): {
  createSetupIntent: (params: { customer_name: string; set_as_default?: boolean }) => void;
  createSetupIntentAsync: (params: { customer_name: string; set_as_default?: boolean }) => Promise<{ client_secret: string }>;
  isCreating: boolean;
  isError: boolean;
  error: SetupIntentError | null;
  reset: () => void;
}
```

## useSetupIntentManager

Combined hook that merges query, mutation, and cache functionality.

### Signature

```typescript
function useSetupIntentManager(params?: CreateSetupIntentParams): {
  // All properties from useSetupIntent
  // Plus: createSetupIntent, createSetupIntentAsync, isCreating, createError, resetCreate
  // Plus: all properties from useSetupIntentCache
}
```

## Type Definitions

### SetupIntentData

```typescript
interface SetupIntentData {
  id: string;
  client_secret: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'processing' | 'succeeded' | 'canceled';
  usage: 'off_session' | 'on_session';
  customer?: string;
  payment_method?: string;
  created: number;
  metadata?: Record<string, string>;
}
```

### SetupIntentError

```typescript
interface SetupIntentError extends Error {
  status?: number;
  code?: string;
}
```

## Implementation Details

- **Query Key:** `['setup-intent']` (exported as `SETUP_INTENT_QUERY_KEY`). When params are provided, the key becomes `['setup-intent', params]`.
- **Stale Time:** 5 minutes
- **Garbage Collection Time:** 30 minutes
- **Max Retries:** 3
- **Retry Logic:** Auth errors (401, 403) are never retried. Client errors (4xx) are only retried for rate limiting (429) and timeouts (408). No-data responses (204) are not retried. Server errors (5xx) and network errors are retried.
- **Toast Notifications:** Success toast ("Payment setup ready") displayed by default (suppressible). Error toasts display user-friendly messages based on status code.
- **API Endpoints:**
  - `POST /api/stripe/setup-intent` -- Create a new SetupIntent
  - `GET /api/stripe/setup-intent/{id}` -- Retrieve an existing SetupIntent

## Usage Examples

### Basic Payment Method Setup

```tsx
import { useSetupIntent } from '@/hooks/use-setup-intent';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

function PaymentMethodForm() {
  const { clientSecret, isReady, isLoading, error } = useSetupIntent({
    suppressSuccessToast: true
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;
  if (!isReady || !clientSecret) return <p>Initializing...</p>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentElement />
      <SubmitButton />
    </Elements>
  );
}
```

### On-Demand Creation

```tsx
import { useCreateSetupIntent } from '@/hooks/use-setup-intent';

function AddPaymentMethodButton() {
  const { createSetupIntentAsync, isCreating } = useCreateSetupIntent({
    onSuccess: (data) => {
      // Navigate to payment form with the client secret
      router.push(`/payment/setup?secret=${data.client_secret}`);
    }
  });

  return (
    <button
      onClick={() => createSetupIntentAsync({ usage: 'off_session' })}
      disabled={isCreating}
    >
      {isCreating ? 'Setting up...' : 'Add Payment Method'}
    </button>
  );
}
```

### Using the Manager Hook

```tsx
import { useSetupIntentManager } from '@/hooks/use-setup-intent';

function PaymentSetupManager() {
  const {
    clientSecret,
    isReady,
    isLoading,
    createSetupIntent,
    isCreating,
    isCached,
    clearAll
  } = useSetupIntentManager();

  return (
    <div>
      <p>Status: {isLoading ? 'Loading' : isReady ? 'Ready' : 'Not ready'}</p>
      <p>Cached: {isCached() ? 'Yes' : 'No'}</p>
      <button onClick={() => createSetupIntent()} disabled={isCreating}>
        Create New
      </button>
      <button onClick={clearAll}>Clear Cache</button>
    </div>
  );
}
```

## Related Hooks

- [`usePaymentMethods`](./use-payment-methods-reference.md) -- Manage payment methods (uses SetupIntents for creation).
- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Create Stripe Checkout sessions.
- [`useBillingData`](./use-billing-data-reference.md) -- Fetch subscription and payment history.
- [`useStripeProducts`](./use-stripe-products-reference.md) -- Fetch dynamic Stripe products.
