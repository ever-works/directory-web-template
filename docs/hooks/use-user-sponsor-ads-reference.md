---
id: use-user-sponsor-ads-reference
title: useUserSponsorAds Hook Reference
sidebar_label: useUserSponsorAds
sidebar_position: 95
---

# useUserSponsorAds

## Overview

`useUserSponsorAds` is a comprehensive React hook for managing the current user's sponsor advertisements. It provides paginated listing with filtering and debounced search, aggregate statistics, and mutation actions for creating, cancelling, paying, and renewing sponsor ads. The hook orchestrates multiple TanStack Query queries and mutations with automatic cache invalidation and toast notifications.

**Source:** `template/hooks/use-user-sponsor-ads.ts`

## Signature

```typescript
function useUserSponsorAds(options?: UseUserSponsorAdsOptions): UseUserSponsorAdsReturn
```

## Parameters

### `UseUserSponsorAdsOptions`

| Property   | Type                 | Default     | Description                                      |
|-----------|----------------------|-------------|--------------------------------------------------|
| `page`    | `number`             | `1`         | Initial page number for pagination               |
| `limit`   | `number`             | `10`        | Number of items per page                         |
| `status`  | `SponsorAdStatus`    | `undefined` | Initial status filter                            |
| `interval`| `'weekly' \| 'monthly'` | `undefined` | Initial interval filter                       |
| `search`  | `string`             | `""`        | Initial search query                             |

### `SponsorAdStatus`

```typescript
type SponsorAdStatus = 'pending_payment' | 'pending' | 'rejected' | 'active' | 'expired' | 'cancelled';
```

## Return Values

### `UseUserSponsorAdsReturn`

#### Data

| Property      | Type              | Description                                   |
|--------------|-------------------|-----------------------------------------------|
| `sponsorAds` | `SponsorAd[]`     | Array of sponsor ads for the current page     |
| `stats`      | `SponsorAdStats`  | Aggregate statistics across all user sponsor ads |

#### `SponsorAdStats`

```typescript
interface SponsorAdStats {
  overview: {
    total: number;
    pendingPayment: number;
    pending: number;
    active: number;
    rejected: number;
    expired: number;
    cancelled: number;
  };
  byInterval: {
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  };
}
```

#### Loading States

| Property          | Type      | Description                                     |
|------------------|-----------|--------------------------------------------------|
| `isLoading`      | `boolean` | `true` during the initial sponsor ads list fetch |
| `isFetching`     | `boolean` | `true` whenever the list query is refetching     |
| `isStatsLoading` | `boolean` | `true` during the initial stats fetch            |
| `isCreating`     | `boolean` | `true` while the create mutation is pending      |
| `isCancelling`   | `boolean` | `true` while the cancel mutation is pending      |
| `isPayingNow`    | `boolean` | `true` while the pay-now mutation is pending     |
| `isRenewing`     | `boolean` | `true` while the renew mutation is pending       |

#### Pagination

| Property      | Type     | Description                |
|--------------|----------|----------------------------|
| `currentPage` | `number` | Current page number        |
| `totalPages` | `number` | Total number of pages      |
| `totalItems` | `number` | Total number of sponsor ads matching filters |

#### Filters

| Property         | Type                          | Description                                         |
|-----------------|-------------------------------|-----------------------------------------------------|
| `statusFilter`  | `SponsorAdStatus \| undefined` | Currently active status filter                     |
| `intervalFilter` | `'weekly' \| 'monthly' \| undefined` | Currently active interval filter           |
| `search`        | `string`                       | Current search input value                         |
| `isSearching`   | `boolean`                      | `true` while the search value is being debounced   |

#### Actions

| Method               | Signature                                                      | Description                                                 |
|---------------------|----------------------------------------------------------------|-------------------------------------------------------------|
| `createSponsorAd`   | `(input: CreateSponsorAdInput) => Promise<SponsorAd \| null>`  | Create a new sponsor ad. Returns the created record or `null` on failure. |
| `cancelSponsorAd`   | `(id: string, cancelReason?: string) => Promise<boolean>`      | Cancel a sponsor ad. Returns `true` on success.             |
| `payNow`            | `(id: string) => Promise<{ checkoutUrl: string } \| null>`     | Initiate payment checkout. Returns checkout URL or `null`.  |
| `renewSponsorship`  | `(id: string) => Promise<{ checkoutUrl: string } \| null>`     | Renew an expired sponsorship. Returns checkout URL or `null`. |

##### `CreateSponsorAdInput`

| Field            | Type                        | Required | Description                       |
|-----------------|-----------------------------|----------|-----------------------------------|
| `itemSlug`      | `string`                    | Yes      | Slug of the item to sponsor       |
| `itemName`      | `string`                    | Yes      | Display name of the item          |
| `itemIconUrl`   | `string`                    | No       | Icon URL for the item             |
| `itemCategory`  | `string`                    | No       | Category of the item              |
| `itemDescription` | `string`                  | No       | Short description of the item     |
| `interval`      | `'weekly' \| 'monthly'`     | Yes      | Billing interval for the ad       |

#### Filter Actions

| Method              | Signature                                          | Description                           |
|--------------------|----------------------------------------------------|---------------------------------------|
| `setStatusFilter`  | `(status: SponsorAdStatus \| undefined) => void`   | Set or clear the status filter        |
| `setIntervalFilter`| `(interval: 'weekly' \| 'monthly' \| undefined) => void` | Set or clear the interval filter |
| `setSearch`        | `(search: string) => void`                         | Update the search query               |
| `setCurrentPage`   | `(page: number) => void`                           | Jump to a specific page               |
| `nextPage`         | `() => void`                                       | Navigate to the next page             |
| `prevPage`         | `() => void`                                       | Navigate to the previous page         |

#### Utility

| Method        | Signature    | Description                                                     |
|--------------|--------------|-----------------------------------------------------------------|
| `refreshData`| `() => void` | Invalidate all user sponsor ads queries to force a fresh fetch  |

## Implementation Details

- **Two independent queries:** The hook runs separate queries for the sponsor ads list (`/api/sponsor-ads/user`) and stats (`/api/sponsor-ads/user/stats`), allowing them to load and cache independently.
- **Debounced search:** The search input is debounced with a 300ms delay via `useDebounceValue` to prevent excessive API calls.
- **Cache configuration:** Both queries use a `staleTime` of 2 minutes and `gcTime` of 5 minutes.
- **Automatic cache invalidation:** The `createSponsorAd` and `cancelSponsorAd` mutations automatically invalidate all queries under the `['user-sponsor-ads']` key family.
- **Toast notifications:** Success and error toasts are shown via `sonner` for create and cancel operations.
- **Checkout flow:** `payNow` and `renewSponsorship` return checkout URLs from the server. The calling component is responsible for redirecting the user to the checkout page.

### Query Keys

```typescript
const userSponsorAdsQueryKeys = {
  all: ['user-sponsor-ads'] as const,
  lists: () => [...userSponsorAdsQueryKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userSponsorAdsQueryKeys.lists(), filters] as const,
  stats: () => [...userSponsorAdsQueryKeys.all, 'stats'] as const,
};
```

## Usage Examples

### Sponsor ads dashboard page

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';

function SponsorAdsDashboard() {
  const {
    sponsorAds,
    stats,
    isLoading,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
  } = useUserSponsorAds({ limit: 10 });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <div className="stats-bar">
        <span>Active: {stats.overview.active}</span>
        <span>Pending: {stats.overview.pending}</span>
        <span>Total Revenue: ${stats.revenue.totalRevenue}</span>
      </div>

      <input
        placeholder="Search sponsor ads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <select
        value={statusFilter || ''}
        onChange={(e) => setStatusFilter(e.target.value as any || undefined)}
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="expired">Expired</option>
      </select>

      <SponsorAdsList ads={sponsorAds} />

      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage <= 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={nextPage} disabled={currentPage >= totalPages}>Next</button>
      </div>
    </div>
  );
}
```

### Creating a new sponsor ad

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';

function CreateSponsorAdForm({ item }) {
  const { createSponsorAd, isCreating } = useUserSponsorAds();

  const handleCreate = async () => {
    const result = await createSponsorAd({
      itemSlug: item.slug,
      itemName: item.name,
      itemIconUrl: item.icon_url,
      itemCategory: item.category,
      interval: 'monthly',
    });

    if (result) {
      console.log('Created sponsor ad:', result.id);
    }
  };

  return (
    <button onClick={handleCreate} disabled={isCreating}>
      {isCreating ? 'Creating...' : 'Sponsor This Item'}
    </button>
  );
}
```

### Payment and renewal flow

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';

function SponsorAdActions({ ad }) {
  const { payNow, renewSponsorship, cancelSponsorAd, isPayingNow, isRenewing } =
    useUserSponsorAds();

  const handlePay = async () => {
    const result = await payNow(ad.id);
    if (result) {
      window.location.href = result.checkoutUrl;
    }
  };

  const handleRenew = async () => {
    const result = await renewSponsorship(ad.id);
    if (result) {
      window.location.href = result.checkoutUrl;
    }
  };

  const handleCancel = async () => {
    await cancelSponsorAd(ad.id, 'No longer needed');
  };

  return (
    <div>
      {ad.status === 'pending_payment' && (
        <button onClick={handlePay} disabled={isPayingNow}>Pay Now</button>
      )}
      {ad.status === 'expired' && (
        <button onClick={handleRenew} disabled={isRenewing}>Renew</button>
      )}
      {ad.status === 'active' && (
        <button onClick={handleCancel}>Cancel Sponsorship</button>
      )}
    </div>
  );
}
```

## Related Hooks

- [`useSponsorAdDetail`](./use-sponsor-ad-detail-reference.md) -- Fetch a single sponsor ad by ID.
- [`useActiveSponsorAds`](./use-active-sponsor-ads-reference.md) -- Fetch active sponsor ads for public-facing display.
- [`useCheckout`](./use-checkout-reference.md) -- General checkout flow management.
