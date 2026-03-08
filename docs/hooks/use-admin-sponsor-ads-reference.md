---
id: use-admin-sponsor-ads-reference
title: useAdminSponsorAds Hook Reference
sidebar_label: useAdminSponsorAds
sidebar_position: 74
---

# useAdminSponsorAds

## Overview

`useAdminSponsorAds` is a React hook for managing sponsor advertisements in the admin panel. It provides a full moderation workflow (approve, reject, cancel), deletion, paginated listing with multi-field filtering and sorting, aggregate statistics, and automatic cache invalidation. Built on top of TanStack React Query with `keepPreviousData` for seamless pagination transitions.

**Source:** `template/hooks/use-admin-sponsor-ads.ts`

## Signature / Parameters

```typescript
function useAdminSponsorAds(
  options?: UseAdminSponsorAdsOptions
): UseAdminSponsorAdsReturn
```

### `UseAdminSponsorAdsOptions`

| Parameter   | Type                   | Default       | Description                                        |
|-------------|------------------------|---------------|----------------------------------------------------|
| `page`      | `number`               | `1`           | Initial page number for pagination                 |
| `limit`     | `number`               | `10`          | Number of sponsor ads per page                     |
| `status`    | `SponsorAdStatus`      | `undefined`   | Filter by ad status                                |
| `interval`  | `SponsorAdIntervalType`| `undefined`   | Filter by billing interval type                    |
| `search`    | `string`               | `undefined`   | Search term to filter sponsor ads                  |
| `sortBy`    | `SponsorAdSortBy`      | `'createdAt'` | Field to sort results by                           |
| `sortOrder` | `'asc' \| 'desc'`     | `'desc'`      | Sort direction                                     |

### `SponsorAdSortBy`

```typescript
type SponsorAdSortBy = 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
```

## Return Values

The hook returns an object implementing `UseAdminSponsorAdsReturn`:

### Data

| Property     | Type                     | Description                                          |
|--------------|--------------------------|------------------------------------------------------|
| `sponsorAds` | `SponsorAd[]`            | Array of sponsor ads for the current page            |
| `stats`      | `SponsorAdStats \| null` | Aggregate statistics across all sponsor ads          |

### Loading States

| Property       | Type      | Description                                                        |
|----------------|-----------|---------------------------------------------------------------------|
| `isLoading`    | `boolean` | `true` only on initial load (no cached data)                       |
| `isSubmitting` | `boolean` | `true` when any mutation (approve/reject/cancel/delete) is pending |

### Pagination

| Property      | Type     | Description                           |
|---------------|----------|---------------------------------------|
| `currentPage` | `number` | Current page number                   |
| `totalPages`  | `number` | Total number of pages (defaults to 1) |
| `totalItems`  | `number` | Total number of sponsor ads           |

### Sorting

| Property    | Type               | Description              |
|-------------|-------------------|--------------------------|
| `sortBy`    | `SponsorAdSortBy` | Current sort field       |
| `sortOrder` | `'asc' \| 'desc'` | Current sort direction   |

### Actions

| Method            | Signature                                                                                  | Description                                                                         |
|-------------------|--------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `approveSponsorAd`| `(id: string, forceApprove?: boolean) => Promise<{ success: boolean; requiresForceApprove?: boolean }>` | Approve a sponsor ad. Returns `requiresForceApprove: true` if payment not received. |
| `rejectSponsorAd` | `(id: string, reason: string) => Promise<boolean>`                                         | Reject a sponsor ad with a reason.                                                  |
| `cancelSponsorAd` | `(id: string, reason?: string) => Promise<boolean>`                                        | Cancel an active sponsor ad with an optional reason.                                |
| `deleteSponsorAd` | `(id: string) => Promise<boolean>`                                                         | Permanently delete a sponsor ad.                                                    |

### Setters

| Method           | Signature                          | Description                                |
|------------------|------------------------------------|--------------------------------------------|
| `setSortBy`      | `(sortBy: SponsorAdSortBy) => void`| Change sort field (resets page to 1)       |
| `setSortOrder`   | `(order: 'asc' \| 'desc') => void`| Change sort direction (resets page to 1)   |
| `setCurrentPage` | `(page: number) => void`          | Navigate to a specific page                |

### Utility

| Method        | Signature    | Description                                       |
|---------------|-------------|---------------------------------------------------|
| `refreshData` | `() => void` | Invalidate all sponsor-ads queries for a refetch  |

## Implementation Details

- **Query caching:** Uses TanStack React Query with a 2-minute `staleTime` and 5-minute `gcTime` -- shorter than most admin hooks due to the time-sensitive nature of ad approvals.
- **Placeholder data:** Uses `keepPreviousData` for seamless pagination transitions.
- **Immediate refetch:** After mutations, the hook uses `refetchQueries` instead of `invalidateQueries` to ensure the UI updates immediately rather than waiting for the next natural refetch.
- **Payment verification:** The `approveSponsorAd` action supports a two-step approval flow. If payment has not been received, the API returns `PAYMENT_NOT_RECEIVED` and the hook returns `{ success: false, requiresForceApprove: true }`, allowing the UI to prompt for force-approval confirmation.
- **Sort-resets pagination:** Changing `sortBy` or `sortOrder` automatically resets `currentPage` to 1.
- **Page sync:** The hook syncs the internal `currentPage` state with the external `page` option prop via `useEffect`, so that parent-level filter changes that reset the page are reflected.
- **Toast notifications:** All mutation success and error states trigger `sonner` toast notifications automatically, except for the `PAYMENT_NOT_RECEIVED` error which is handled silently for UI-level handling.
- **Memoized params:** Query parameters are memoized with `useMemo` to prevent unnecessary re-renders and query refetches.

### Query Keys

```typescript
const sponsorAdsQueryKeys = {
  all: ['sponsor-ads'],
  lists: () => ['sponsor-ads', 'list'],
  list: (filters) => ['sponsor-ads', 'list', filters],
  details: () => ['sponsor-ads', 'detail'],
  detail: (id) => ['sponsor-ads', 'detail', id],
};
```

### API Endpoints

| Operation | Method   | Endpoint                              |
|-----------|----------|---------------------------------------|
| List      | `GET`    | `/api/admin/sponsor-ads`              |
| Approve   | `POST`   | `/api/admin/sponsor-ads/:id/approve`  |
| Reject    | `POST`   | `/api/admin/sponsor-ads/:id/reject`   |
| Cancel    | `POST`   | `/api/admin/sponsor-ads/:id/cancel`   |
| Delete    | `DELETE` | `/api/admin/sponsor-ads/:id`          |

## Usage Examples

### Paginated listing with filters

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';

function SponsorAdsPage() {
  const {
    sponsorAds,
    stats,
    totalItems,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
  } = useAdminSponsorAds({
    limit: 20,
    status: 'pending',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <StatsBar stats={stats} />
      <p>{totalItems} sponsor ads</p>
      <SponsorAdsTable ads={sponsorAds} />
      <Pagination
        current={currentPage}
        total={totalPages}
        onChange={setCurrentPage}
      />
    </div>
  );
}
```

### Approval workflow with force-approve

```tsx
const { approveSponsorAd, isSubmitting } = useAdminSponsorAds();

const handleApprove = async (adId: string) => {
  const result = await approveSponsorAd(adId);

  if (result.requiresForceApprove) {
    // Payment not received -- prompt admin for confirmation
    const confirmed = window.confirm(
      'Payment has not been received. Force approve anyway?'
    );
    if (confirmed) {
      await approveSponsorAd(adId, true);
    }
  }
};
```

### Rejection and cancellation

```tsx
const { rejectSponsorAd, cancelSponsorAd } = useAdminSponsorAds();

// Reject a pending ad
const handleReject = async (adId: string) => {
  const success = await rejectSponsorAd(adId, 'Content violates guidelines');
};

// Cancel an active ad
const handleCancel = async (adId: string) => {
  const success = await cancelSponsorAd(adId, 'Advertiser requested cancellation');
};
```

### Dynamic sorting

```tsx
const { sponsorAds, sortBy, sortOrder, setSortBy, setSortOrder } =
  useAdminSponsorAds();

function SortableHeader({ field, label }: { field: SponsorAdSortBy; label: string }) {
  return (
    <th
      onClick={() => {
        if (sortBy === field) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortBy(field);
        }
      }}
    >
      {label} {sortBy === field && (sortOrder === 'asc' ? '↑' : '↓')}
    </th>
  );
}
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Item management with a similar approve/reject workflow.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide statistics including ad metrics.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management for admin panels.
