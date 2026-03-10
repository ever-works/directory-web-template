---
id: query-client-system
title: "Query Client System"
sidebar_label: "Query Client System"
sidebar_position: 43
---

# Query Client System

## Overview

The Query Client System provides centralized TanStack React Query configuration for the application. It consists of two modules: a general-purpose query client factory (`lib/query-client.ts`) that handles server/client singleton management, and a billing-optimized configuration (`lib/react-query-config.ts`) with query key factories, prefetch strategies, and cache invalidation utilities.

## Architecture

The system has two entry points serving different concerns:

- **`lib/query-client.ts`** -- The primary query client used across the application. It creates separate instances for server and client environments, ensuring server-side rendering does not share state between requests while the browser reuses a single instance.
- **`lib/react-query-config.ts`** -- A specialized query client configured for billing and subscription management. It adds query key factories, prefetch strategies, and cache invalidation utilities tailored to payment-related data.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## API Reference

### Exports from `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Factory function that creates a new `QueryClient` with the following defaults:

| Option | Value | Purpose |
|--------|-------|---------|
| `staleTime` | 5 minutes | Data considered fresh |
| `gcTime` | 10 minutes | Cache retention after last use |
| `refetchOnWindowFocus` | `false` | Prevent excessive refetching |
| `refetchOnMount` | `false` | Skip refetch if data is fresh |
| `refetchOnReconnect` | `true` | Refetch on network recovery |
| `retry` | Up to 2 attempts | Simple retry for all errors |
| `retryDelay` | Exponential backoff, max 30s | `1000 * 2^attempt` |
| Mutation `retry` | 1 | Retry mutations once |
| Mutation `onError` | Toast + console.error | Global error notification |

#### `getQueryClient(): QueryClient`

Returns the appropriate `QueryClient` instance. On the server, it creates a new instance per call (no shared state). On the client, it returns a singleton instance (created once and reused).

### Exports from `lib/react-query-config.ts`

#### `queryClient: QueryClient`

A pre-configured `QueryClient` instance optimized for billing operations. Key differences from the general client:

- `refetchOnWindowFocus: true` -- Ensures subscription status is always current
- `refetchOnMount: true` -- Refetches stale data on component mount
- Retry skips 4xx and 401 errors (client/auth errors are not retried)
- Exponential backoff includes jitter (85-115% of base delay)
- `notifyOnChangeProps` set to `['data', 'error', 'isLoading', 'isFetching']` for optimized re-renders

#### `queryKeys`

Hierarchical query key factory for consistent cache management:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

Pre-built prefetch functions for common navigation patterns:

- `prefetchStrategies.billing()` -- Prefetches subscription and payment data
- `prefetchStrategies.userProfile()` -- Prefetches user profile data

#### `cacheUtils`

Cache management utilities:

- `cacheUtils.invalidateBilling()` -- Invalidates all billing queries
- `cacheUtils.invalidateSubscription()` -- Invalidates subscription query
- `cacheUtils.invalidatePayments()` -- Invalidates payments query
- `cacheUtils.removeBilling()` -- Removes all billing data from cache
- `cacheUtils.resetCache()` -- Clears entire query cache

## Implementation Details

**Server/client split**: `getQueryClient()` uses TanStack's `isServer` flag to determine the environment. Server instances are ephemeral (new per request) to prevent data leaking between users. The browser singleton is stored in a module-level variable.

**Error handling strategy**: The general client uses `toast.error()` from Sonner for mutation errors, providing immediate user feedback. The billing client skips retries on 4xx errors since they indicate client-side issues that retrying will not resolve.

**Retry with jitter**: The billing client adds random jitter (85-115% of base delay) to exponential backoff to prevent thundering herd problems when many clients retry simultaneously after a service disruption.

## Configuration

No additional configuration files are needed. Both clients are configured entirely in code. To adjust defaults, modify the `defaultOptions` in the respective factory functions.

## Usage Examples

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## Best Practices

- Use `getQueryClient()` from `lib/query-client.ts` for all general data fetching; use the billing-specific client only for payment-related features.
- Always use `queryKeys` factories for cache key consistency; never hardcode query key arrays.
- Call `cacheUtils.invalidateBilling()` after any mutation that changes subscription or payment state.
- Use `prefetchStrategies` on hover or route pre-loading to improve perceived performance.
- Avoid calling `cacheUtils.resetCache()` in production unless absolutely necessary, as it discards all cached data.

## Related Modules

- [API Client Layer](/template/architecture/api-client-layer) -- Makes the API calls consumed by query functions
- [Guards System](./guards-system-deep-dive) -- Plan-based access control that may depend on subscription data
