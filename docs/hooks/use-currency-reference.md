---
id: use-currency-reference
title: useCurrency Hook Reference
sidebar_label: useCurrency
sidebar_position: 39
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCurrency

Manages user currency detection and preference. Supports both authenticated and anonymous users, with automatic geo-based currency detection, manual currency updates with optimistic UI, and robust validation.

**Source:** `template/hooks/use-currency.ts`

## Return Values

```ts
const {
  currency,       // string -- Current currency code (e.g., 'USD', 'EUR'). Always uppercase, 3 letters.
  country,        // string | null -- Detected country code (e.g., 'US', 'DE'), or null
  detected,       // boolean -- True if currency was successfully auto-detected; false if using fallback
  isLoading,      // boolean -- True while fetching currency data
  isError,        // boolean -- True if the fetch failed
  error,          // Error | null -- Normalized error object
  updateCurrency, // (newCurrency: string, options?: UpdateCurrencyOptions) => void
  isUpdating,     // boolean -- True while the update mutation is in flight
  refetch,        // () => void -- Manually refetch currency data
} = useCurrency();
```

## Types

```ts
interface UpdateCurrencyOptions {
  onSuccess?: (currency: string) => void;
  onError?: (error: Error) => void;
}
```

## Default Behavior

| Aspect | Value |
|--------|-------|
| Default currency | `'USD'` |
| Query key | `['user-currency']` |
| `staleTime` | 1 hour |
| `gcTime` | 24 hours |
| `refetchOnWindowFocus` | `false` |
| `refetchOnReconnect` | `true` |
| Placeholder data | `{ currency: 'USD', country: null, detected: false }` |

The hook always returns a valid currency string -- never `null` or `undefined`. If detection fails, it falls back to `'USD'`.

## Currency Detection

The API endpoint `/api/user/currency` performs automatic currency detection based on:

1. **Authenticated users:** Stored preference in the database
2. **Anonymous users:** Geolocation-based detection via IP address

The `detected` boolean indicates whether the returned currency came from a successful detection (`true`) or is a fallback value (`false`).

```tsx
function CurrencyNotice() {
  const { currency, detected, country } = useCurrency();

  if (!detected) {
    return (
      <Notice>
        We could not detect your currency. Showing prices in {currency}.
        <button onClick={() => openCurrencySelector()}>Change</button>
      </Notice>
    );
  }

  return <p>Prices shown in {currency} (detected from {country})</p>;
}
```

## Currency Update

The `updateCurrency` function allows authenticated users to change their currency preference. It includes:

- **Validation:** Currency code must be exactly 3 uppercase letters (e.g., `'USD'`, `'EUR'`)
- **Normalization:** Input is automatically trimmed and uppercased
- **Auth check:** Throws an error if the user is not authenticated
- **Optimistic update:** Cache is immediately updated, then reconciled with the server

### Update Flow

1. Validate and normalize the currency code
2. Check authentication status
3. Optimistically update the cache with the new currency
4. Send `PUT /api/user/currency` to the server
5. On success: invalidate the query to sync with server
6. On error: roll back to the previous cached value

```tsx
function CurrencySelector() {
  const { currency, updateCurrency, isUpdating } = useCurrency();

  const handleChange = (newCurrency: string) => {
    updateCurrency(newCurrency, {
      onSuccess: (curr) => toast.success(`Currency changed to ${curr}`),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <select
      value={currency}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isUpdating}
    >
      <option value="USD">USD - US Dollar</option>
      <option value="EUR">EUR - Euro</option>
      <option value="GBP">GBP - British Pound</option>
      <option value="JPY">JPY - Japanese Yen</option>
    </select>
  );
}
```

## Usage: Price Display

```tsx
function PriceDisplay({ amount }: { amount: number }) {
  const { currency, isLoading } = useCurrency();

  if (isLoading) return <Skeleton width={80} />;

  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency,
  }).format(amount);

  return <span className="font-bold">{formatted}</span>;
}
```

## Usage: Currency-Aware Pricing Page

```tsx
function PricingPage({ plans }) {
  const { currency, detected, updateCurrency } = useCurrency();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Pricing</h1>
        <CurrencySelector
          value={currency}
          onChange={updateCurrency}
        />
      </div>

      {!detected && (
        <Banner>
          Prices are shown in {currency} (default). Select your currency above.
        </Banner>
      )}

      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currency={currency}
          />
        ))}
      </div>
    </div>
  );
}
```

## Validation

The hook validates currency codes before sending them to the server:

| Check | Rule | Error Message |
|-------|------|---------------|
| Format | Must match `/^[A-Z]{3}$/` | `Invalid currency code: X. Expected 3 uppercase letters (e.g., USD, EUR)` |
| Authentication | User must be signed in | `You must be signed in to update your currency preference` |
| Normalization | Input is trimmed and uppercased | N/A (silent) |

## Retry Strategy

| Error Type | Retry? |
|------------|--------|
| Server errors (5xx) | Up to 2 times with exponential backoff (max 30s) |
| Network failures | Up to 2 times with exponential backoff |
| Client errors (4xx) | No retry |

## Cache Invalidation

| Event | Cache Behavior |
|-------|---------------|
| Initial load | Fetches from `/api/user/currency` |
| `updateCurrency` | Optimistic update, then invalidate on `onSettled` |
| Window reconnect | Refetch triggered |
| Window focus | No refetch |

## Error Handling

Errors are normalized to always be an `Error` instance:

```tsx
function CurrencyErrorBanner() {
  const { isError, error } = useCurrency();

  if (!isError || !error) return null;

  return (
    <Banner variant="error">
      Failed to load currency: {error.message}
    </Banner>
  );
}
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/user/currency` | Fetch current currency and country (works for all users) |
| `PUT` | `/api/user/currency` | Update currency preference (authenticated users only) |

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Query caching, mutations, optimistic updates |
| `next-auth/react` | `useSession` for authentication check |
| `@/lib/api/server-api-client` | API communication |

## Related Hooks

- [`useSubscription`](/template/hooks/use-subscription-reference) - Subscription pricing uses currency context
- [`useCurrentUser`](/template/hooks/use-current-user-reference) - Authentication state
- [`useGeolocation`](/template/hooks/data-hooks) - Geolocation detection
- [`usePaymentFlow`](/template/hooks/payment-hooks) - Checkout flow with currency awareness
