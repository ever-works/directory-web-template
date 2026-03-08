---
id: use-lemonsqueezy-checkouts-reference
title: useLemonSqueezyCheckouts Hook Reference
sidebar_label: useLemonSqueezyCheckouts
sidebar_position: 78
---

# useLemonSqueezyCheckouts

## Overview

The `use-lemonsqueezy-checkouts.ts` module exports a family of hooks and utilities for managing LemonSqueezy checkout data. The primary hook `useLemonSqueezyCheckouts` provides paginated, filterable checkout listing with full pagination controls and cache management. Additional hooks are provided for single-checkout lookup, POST-based complex queries, and real-time polling. A `checkoutUtils` object provides client-side data processing helpers.

**Source:** `template/hooks/use-lemonsqueezy-checkouts.ts`

## Exported Hooks

| Hook                              | Purpose                                               |
|-----------------------------------|-------------------------------------------------------|
| `useLemonSqueezyCheckouts`        | Primary paginated checkout listing with filters       |
| `useLemonSqueezyListCheckout`     | Look up a single checkout by ID from the full list    |
| `useLemonSqueezyCheckoutsPost`    | POST-based mutation for complex filter queries        |
| `useLemonSqueezyCheckoutsRealtime`| Real-time polling wrapper with configurable interval  |

---

## useLemonSqueezyCheckouts

The primary hook for fetching and managing LemonSqueezy checkouts.

```typescript
function useLemonSqueezyCheckouts(
  initialFilters?: CheckoutFilters,
  options?: UseCheckoutsOptions
): UseCheckoutsReturn
```

### `CheckoutFilters`

| Parameter       | Type                                                                              | Default     | Description                         |
|-----------------|-----------------------------------------------------------------------------------|-------------|-------------------------------------|
| `status`        | `'active' \| 'cancelled' \| 'expired' \| 'on_trial' \| 'past_due' \| 'paused' \| 'unpaid'` | `undefined` | Filter by checkout status |
| `limit`         | `number`                                                                          | `100`       | Number of checkouts per page        |
| `page`          | `number`                                                                          | `1`         | Page number                         |
| `customerEmail` | `string`                                                                          | `undefined` | Filter by customer email            |
| `dateFrom`      | `string`                                                                          | `undefined` | Start date filter (ISO string)      |
| `dateTo`        | `string`                                                                          | `undefined` | End date filter (ISO string)        |
| `storeId`       | `string`                                                                          | `undefined` | Filter by LemonSqueezy store ID     |

### `UseCheckoutsOptions`

| Parameter         | Type                                     | Default         | Description                                     |
|-------------------|------------------------------------------|-----------------|-------------------------------------------------|
| `initialFilters`  | `CheckoutFilters`                        | `undefined`     | Overrides for default filters                   |
| `enabled`         | `boolean`                                | `true`          | Whether the query should execute                |
| `refetchInterval` | `number`                                 | `undefined`     | Polling interval in milliseconds                |
| `staleTime`       | `number`                                 | `300000` (5min) | Time before data is considered stale            |
| `cacheTime`       | `number`                                 | `600000` (10min)| Time before inactive cache is garbage collected |
| `retry`           | `boolean \| number`                      | `3`             | Number of retry attempts on failure             |
| `retryDelay`      | `number`                                 | `1000`          | Delay between retries in milliseconds           |
| `onSuccess`       | `(data: CheckoutListResponse) => void`   | `undefined`     | Callback fired on successful fetch              |
| `onError`         | `(error: Error) => void`                 | `undefined`     | Callback fired on fetch error                   |

### Return Values (`UseCheckoutsReturn`)

#### Data

| Property     | Type                                          | Description                          |
|--------------|-----------------------------------------------|--------------------------------------|
| `checkouts`  | `CheckoutData[]`                              | Array of checkout records            |
| `pagination` | `CheckoutListResponse['pagination'] \| null`  | Server pagination metadata           |
| `filters`    | `CheckoutListResponse['filters'] \| null`     | Applied filters from the server      |
| `metadata`   | `CheckoutListResponse['metadata'] \| null`    | Response metadata (timestamp, env)   |

#### Loading States

| Property        | Type      | Description                                     |
|-----------------|-----------|-------------------------------------------------|
| `isLoading`     | `boolean` | `true` only on initial load                     |
| `isError`       | `boolean` | `true` if the query errored                     |
| `isFetching`    | `boolean` | `true` when fetching, including background      |
| `isRefetching`  | `boolean` | `true` when refetching (not initial load)       |

#### Error Handling

| Property    | Type             | Description                        |
|-------------|------------------|------------------------------------|
| `error`     | `Error \| null`  | The error object, if any           |
| `errorCode` | `string \| null` | Error code from the API response   |

#### Actions

| Method           | Signature                                       | Description                                              |
|------------------|-------------------------------------------------|----------------------------------------------------------|
| `updateFilters`  | `(newFilters: Partial<CheckoutFilters>) => void` | Merge new filters (resets page to 1)                    |
| `resetFilters`   | `() => void`                                    | Reset filters to defaults (`{ limit: 100, page: 1 }`)   |
| `refresh`        | `() => void`                                    | Re-execute the current query                             |
| `invalidateCache`| `() => void`                                    | Invalidate all `lemonsqueezy/listCheckouts` cache keys   |
| `nextPage`       | `() => void`                                    | Navigate to next page (respects `hasMore`)               |
| `prevPage`       | `() => void`                                    | Navigate to previous page (minimum page 1)               |
| `goToPage`       | `(page: number) => void`                        | Navigate to a specific page (bounds-checked)             |

#### Current State

| Property         | Type              | Description                        |
|------------------|-------------------|------------------------------------|
| `currentFilters` | `CheckoutFilters` | The currently applied filter state |
| `hasMore`        | `boolean`         | Whether more pages exist           |
| `totalPages`     | `number`          | Total number of pages              |
| `currentPage`    | `number`          | Current page number                |
| `total`          | `number`          | Total number of checkout records   |

---

## useLemonSqueezyListCheckout

Look up a single checkout by ID from the full checkout list.

```typescript
function useLemonSqueezyListCheckout(checkoutId: string): {
  checkout: CheckoutData | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  exists: boolean;
}
```

Internally fetches up to 100 checkouts and searches for the matching `id` or `checkoutId`. The `exists` property indicates whether the checkout was found.

---

## useLemonSqueezyCheckoutsPost

Mutation-based hook for fetching checkouts via POST (useful for complex filter payloads).

```typescript
function useLemonSqueezyCheckoutsPost(): {
  ...UseMutationResult;
  fetchCheckouts: (filters: CheckoutFilters) => void;
  fetchCheckoutsAsync: (filters: CheckoutFilters) => Promise<CheckoutListResponse>;
}
```

On success, the result is written into the React Query cache.

---

## useLemonSqueezyCheckoutsRealtime

A convenience wrapper that enables automatic polling at a configurable interval.

```typescript
function useLemonSqueezyCheckoutsRealtime(
  filters?: CheckoutFilters,
  interval?: number // default: 30000 (30 seconds)
): UseCheckoutsReturn
```

Sets `staleTime: 0` so data is always considered stale, ensuring every poll returns fresh data.

---

## checkoutUtils

A collection of utility functions for client-side checkout data processing.

| Method               | Signature                                                                     | Description                                  |
|----------------------|-------------------------------------------------------------------------------|----------------------------------------------|
| `calculateTotal`     | `(checkouts: CheckoutData[], currency?: string) => number`                    | Sum amounts for active checkouts by currency |
| `groupByStatus`      | `(checkouts: CheckoutData[]) => Record<string, CheckoutData[]>`               | Group checkouts by status                    |
| `filterByDateRange`  | `(checkouts: CheckoutData[], start: Date, end: Date) => CheckoutData[]`       | Filter checkouts within a date range         |
| `getUniqueCustomers` | `(checkouts: CheckoutData[]) => string[]`                                     | Get unique customer email addresses          |
| `formatAmount`       | `(amount: number, currency?: string) => string`                               | Format amount as currency string             |
| `formatDate`         | `(dateString: string, options?: Intl.DateTimeFormatOptions) => string`         | Format date with timezone support (UTC)      |
| `formatDateShort`    | `(dateString: string) => string`                                              | Short date format (e.g., "Jan 1, 2025")      |
| `formatDateTime`     | `(dateString: string) => string`                                              | Date with time format                        |
| `formatDateTimeLocal`| `(dateString: string) => string`                                              | Date with time in local timezone             |
| `getRawDate`         | `(dateString: string) => string`                                              | Return raw date string for debugging         |
| `getStats`           | `(checkouts: CheckoutData[]) => CheckoutStatsObject`                          | Comprehensive stats from checkout array      |
| `sortCheckouts`      | `(checkouts: CheckoutData[], sortBy?: string, order?: string) => CheckoutData[]` | Sort by date, amount, status, or email    |

## Implementation Details

- **Query caching:** Default 5-minute `staleTime` and 10-minute `gcTime` with 3 retries and 1-second retry delay.
- **Filter state:** Managed internally via `useState`. Calling `updateFilters` merges new values and resets the page to 1.
- **Pagination guards:** `nextPage`, `prevPage`, and `goToPage` all perform bounds checking against the server pagination response before updating state.
- **Callbacks:** `onSuccess` and `onError` callbacks are triggered via `useEffect` when the query data or error changes.
- **Query key:** The query key includes the full filter object, so changing any filter automatically triggers a new query: `['lemonsqueezy', 'listCheckouts', filters]`.

### API Endpoints

| Operation     | Method | Endpoint                  |
|---------------|--------|---------------------------|
| List (GET)    | `GET`  | `/api/lemonsqueezy/list`  |
| List (POST)   | `POST` | `/api/lemonsqueezy/list`  |

## Usage Examples

### Basic checkout listing with filters

```tsx
import { useLemonSqueezyCheckouts, checkoutUtils } from '@/hooks/use-lemonsqueezy-checkouts';

function CheckoutsPage() {
  const {
    checkouts,
    isLoading,
    totalPages,
    currentPage,
    total,
    updateFilters,
    nextPage,
    prevPage,
  } = useLemonSqueezyCheckouts({ limit: 20 });

  if (isLoading) return <Spinner />;

  const stats = checkoutUtils.getStats(checkouts);

  return (
    <div>
      <p>{total} checkouts ({stats.active} active)</p>

      {/* Status filter */}
      <select onChange={(e) => updateFilters({ status: e.target.value as any })}>
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="cancelled">Cancelled</option>
        <option value="expired">Expired</option>
      </select>

      <CheckoutsTable checkouts={checkouts} />

      <button onClick={prevPage} disabled={currentPage <= 1}>Previous</button>
      <span>Page {currentPage} of {totalPages}</span>
      <button onClick={nextPage}>Next</button>
    </div>
  );
}
```

### Real-time polling for live updates

```tsx
import { useLemonSqueezyCheckoutsRealtime } from '@/hooks/use-lemonsqueezy-checkouts';

function LiveCheckouts() {
  const { checkouts, isFetching } = useLemonSqueezyCheckoutsRealtime(
    { status: 'active' },
    10000 // Poll every 10 seconds
  );

  return (
    <div>
      {isFetching && <Badge>Updating...</Badge>}
      <LiveCheckoutsFeed checkouts={checkouts} />
    </div>
  );
}
```

### Looking up a single checkout

```tsx
import { useLemonSqueezyListCheckout } from '@/hooks/use-lemonsqueezy-checkouts';

function CheckoutDetail({ checkoutId }: { checkoutId: string }) {
  const { checkout, isLoading, exists } = useLemonSqueezyListCheckout(checkoutId);

  if (isLoading) return <Spinner />;
  if (!exists) return <NotFound />;

  return <CheckoutCard checkout={checkout} />;
}
```

### Using checkout utilities

```tsx
import { checkoutUtils } from '@/hooks/use-lemonsqueezy-checkouts';

// Format currency
const display = checkoutUtils.formatAmount(49.99, 'USD'); // "$49.99"

// Get stats summary
const stats = checkoutUtils.getStats(checkouts);
console.log(`${stats.uniqueCustomers} unique customers, $${stats.totalAmount} total`);

// Sort by amount descending
const sorted = checkoutUtils.sortCheckouts(checkouts, 'amount', 'desc');
```

## Related Hooks

- [`useLemonSqueezyQueries`](./use-lemonsqueezy-queries-reference.md) -- LemonSqueezy health checks, checkout creation, and embedded checkout management.
- [`useLemonSqueezySubscription`](./use-lemonsqueezy-subscription-reference.md) -- Subscription lifecycle management with LemonSqueezy.
- [`useCheckout`](./use-checkout-reference.md) -- Provider-agnostic checkout flow.
- [`useCreateCheckout`](./use-create-checkout-reference.md) -- Provider-agnostic checkout creation.
