---
id: overview
title: Hooks Overview
sidebar_label: Overview
sidebar_position: 0
---

# Hooks Overview

The Ever Works template includes **119 custom React hooks** located in the `template/hooks/` directory. These hooks encapsulate data fetching, state management, and UI logic using [TanStack React Query](https://tanstack.com/query) for server state and the internal `serverClient` API layer for HTTP communication.

## Architecture

Every data-fetching hook follows a consistent pattern:

1. **Query Keys Factory** -- A `QUERY_KEYS` constant object generates deterministic, hierarchical cache keys (e.g., `['admin', 'items', 'list', params]`).
2. **API Functions** -- Thin `async` functions call `serverClient.get/post/put/delete` and validate results with `apiUtils.isSuccess()`.
3. **`useQuery` for reads** -- Configures `staleTime` (typically 5 min), `gcTime` (10 min), and optional `placeholderData: keepPreviousData` for pagination.
4. **`useMutation` for writes** -- Wraps create/update/delete operations with `onSuccess` cache invalidation and `toast` feedback via [Sonner](https://sonner.emilkowal.dev/).
5. **Memoized handlers** -- `useCallback`-wrapped action functions return `Promise<boolean>` for easy consumer logic.

```
┌──────────────┐    useQuery / useMutation    ┌─────────────────┐
│  Component   │ ──────────────────────────▶  │  Custom Hook    │
└──────────────┘                              │  (hooks/*.ts)   │
                                              └────────┬────────┘
                                                       │ serverClient
                                              ┌────────▼────────┐
                                              │  API Routes      │
                                              │  (app/api/*)     │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Services /      │
                                              │  Repositories    │
                                              └─────────────────┘
```

## Naming Conventions

| Prefix | Domain | Examples |
|--------|--------|---------|
| `use-admin-*` | Admin dashboard CRUD | `use-admin-items`, `use-admin-categories`, `use-admin-users` |
| `use-client-*` | Authenticated user actions | `use-client-items`, `use-client-item-details` |
| `use-*` (general) | Shared / public features | `use-comments`, `use-favorites`, `use-item-vote` |
| `use-*` (payment) | Billing & subscriptions | `use-subscription`, `use-create-checkout`, `use-billing-data` |
| `use-*` (UI) | Presentational helpers | `use-mobile`, `use-debounced-value`, `use-sticky-state` |

## Hooks by Domain

### Admin Hooks (18)

Hooks prefixed with `use-admin-` power the admin dashboard. Each provides paginated list queries, CRUD mutations, and statistics.

`use-admin-categories` | `use-admin-clients` | `use-admin-collections` | `use-admin-comments` | `use-admin-companies` | `use-admin-featured-items` | `use-admin-filters` | `use-admin-items` | `use-admin-notifications` | `use-admin-reports` | `use-admin-roles` | `use-admin-sponsor-ads` | `use-admin-stats` | `use-admin-tags` | `use-admin-users`

### Client / User Hooks (15+)

Hooks for authenticated end-users to manage their own content, preferences, and interactions.

`use-client-items` | `use-client-item-details` | `use-client-item-filters` | `use-deleted-client-items` | `use-favorites` | `use-comments` | `use-item-vote` | `use-item-rating` | `use-item-engagement` | `use-item-history` | `use-current-user` | `use-change-password` | `use-security-settings` | `use-users` | `use-user-utils`

### Payment & Subscription Hooks (15+)

Hooks covering the full payment lifecycle across multiple providers (Stripe, LemonSqueezy, Polar, Solidgate).

`use-subscription` | `use-create-checkout` | `use-billing-data` | `use-payment-flow` | `use-payment-methods` | `use-payment-availability` | `use-checkout-button` | `use-promo-code` | `use-plan-guard` | `use-plan-status` | `use-auto-renewal` | `use-setup-intent` | `use-stripe-products` | `use-lemonsqueezy-checkouts` | `use-lemonsqueezy-subscription` | `use-polar-checkout` | `use-polar-subscription` | `use-provider-payment` | `use-selected-checkout-provider` | `use-pricing-features` | `use-pricing-section` | `use-portal` | `use-transaction-details` | `use-currency`

### Feature & Configuration Hooks (20+)

Hooks for maps, analytics, feature flags, location, search, and UI configuration.

`use-feature-flag` | `use-feature-flags` | `use-feature-flags-with-simulation` | `use-analytics` | `use-geo-analytics` | `use-geolocation` | `use-map-coordinates` | `use-map-provider` | `use-location-items` | `use-location-settings` | `use-user-location` | `use-debounced-search` | `use-filters` | `use-infinite-loading` | `use-paginated-query` | `use-categories-enabled` | `use-categories-exists` | `use-collections-exists` | `use-tags-enabled` | `use-tags-exists` | `use-surveys-enabled` | `use-has-global-surveys` | `use-companies-enabled` | `use-image-domains`

### UI Utility Hooks (15+)

Low-level hooks for layout, scroll behavior, and component state.

`use-mobile` | `use-debounced-value` | `use-sticky-state` | `use-throttled-scroll` | `use-scroll-to-top` | `use-on-click-outside` | `use-composed-ref` | `use-local-storage` | `use-toast` | `use-login-modal` | `use-logout` | `use-logout-overlay` | `use-menu-navigation` | `use-skeleton-visibility` | `use-settings-modal` | `use-retry` | `use-theme` | `use-version-info`

## Caching Strategy

All data-fetching hooks share a common caching strategy via React Query:

| Setting | Default | Purpose |
|---------|---------|---------|
| `staleTime` | 5 minutes | Data considered fresh; no background refetch |
| `gcTime` | 10 minutes | Unused cache entries garbage-collected |
| `retry` | 3 | Automatic retry on transient failures |
| `refetchInterval` | 5 minutes (some hooks) | Periodic background polling |
| `placeholderData` | `keepPreviousData` (paginated) | Smooth pagination transitions |

Cache invalidation happens automatically via `queryClient.invalidateQueries()` inside mutation `onSuccess` callbacks, scoped to the relevant query key prefix.

## Creating a New Hook

Follow this pattern when adding a new data-fetching hook:

```typescript
// hooks/use-admin-widgets.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { serverClient, apiUtils } from '@/lib/api/server-api-client';

const QUERY_KEYS = {
  widgets: ['admin', 'widgets'] as const,
  widgetsList: (params: ListParams) =>
    [...QUERY_KEYS.widgets, 'list', params] as const,
};

export function useAdminWidgets(params: ListParams = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.widgetsList(params),
    queryFn: () => fetchWidgets(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: createWidget,
    onSuccess: () => {
      toast.success('Widget created');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.widgets });
    },
    onError: (error) => toast.error(error.message),
  });

  return { widgets: data?.items || [], isLoading, refetch, createWidget: createMutation.mutateAsync };
}
```

## Related Documentation

- [Admin Hooks Reference](./admin-hooks.md) -- Detailed admin hook API
- [Client Hooks Reference](./client-hooks.md) -- Client-facing hooks
- [Payment Hooks Reference](./payment-hooks.md) -- Billing and subscription hooks
