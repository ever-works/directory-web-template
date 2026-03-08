---
id: use-sponsor-ad-detail-reference
title: useSponsorAdDetail Hook Reference
sidebar_label: useSponsorAdDetail
sidebar_position: 94
---

# useSponsorAdDetail

## Overview

`useSponsorAdDetail` is a React hook for fetching a single sponsor ad by its ID. It wraps TanStack Query's `useQuery` to provide cached, auto-refetching access to the `/api/sponsor-ads/user/:id` endpoint. The hook is conditionally enabled -- it only fires the query when a non-null ID is provided.

The file also exports `sponsorAdDetailQueryKeys` for external cache management.

**Source:** `template/hooks/use-sponsor-ad-detail.ts`

## Signature

```typescript
function useSponsorAdDetail(id: string | null): UseQueryResult<SponsorAd>
```

## Parameters

| Parameter | Type              | Required | Description                                                       |
|----------|-------------------|----------|-------------------------------------------------------------------|
| `id`     | `string \| null`  | Yes      | The sponsor ad ID to fetch. Pass `null` to disable the query.     |

## Return Value

Returns a standard TanStack Query `UseQueryResult<SponsorAd>` object. Key properties:

| Property      | Type                | Description                                         |
|--------------|---------------------|-----------------------------------------------------|
| `data`       | `SponsorAd \| undefined` | The fetched sponsor ad record                  |
| `isLoading`  | `boolean`           | `true` during the initial fetch                     |
| `isFetching` | `boolean`           | `true` whenever a fetch is in progress              |
| `isError`    | `boolean`           | `true` if the query encountered an error            |
| `error`      | `Error \| null`     | The error object if the query failed                |
| `refetch`    | `() => void`        | Manually re-execute the query                       |

### `SponsorAd` Type

The `SponsorAd` type comes from the database schema (`@/lib/db/schema`) and represents a sponsor advertisement record with fields such as `id`, `userId`, `itemSlug`, `itemName`, `status`, `interval`, `startDate`, `endDate`, and payment-related metadata.

## Exported Query Keys

```typescript
export const sponsorAdDetailQueryKeys = {
  all: ['sponsor-ad-detail'] as const,
  detail: (id: string) => [...sponsorAdDetailQueryKeys.all, id] as const,
};
```

Use these keys to manually invalidate or prefetch sponsor ad detail data from other parts of the application.

## Implementation Details

- **Conditional fetching:** The query is only `enabled` when `!!id` evaluates to `true`. Passing `null` prevents the network request entirely.
- **API endpoint:** Fetches from `GET /api/sponsor-ads/user/:id` via the `serverClient`.
- **Cache configuration:** `staleTime` of 2 minutes and `gcTime` of 5 minutes.
- **Error handling:** If the API response indicates failure (via `apiUtils.isSuccess`), the hook throws an `Error` with the server's error message.

## Usage Examples

### Displaying sponsor ad details

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';

function SponsorAdDetailPage({ adId }: { adId: string }) {
  const { data: sponsorAd, isLoading, isError, error } = useSponsorAdDetail(adId);

  if (isLoading) return <div>Loading sponsor ad...</div>;
  if (isError) return <div>Error: {error?.message}</div>;
  if (!sponsorAd) return <div>Sponsor ad not found</div>;

  return (
    <div>
      <h2>{sponsorAd.itemName}</h2>
      <p>Status: {sponsorAd.status}</p>
      <p>Interval: {sponsorAd.interval}</p>
    </div>
  );
}
```

### Conditionally fetching based on selection

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';

function SponsorAdPreview({ selectedId }: { selectedId: string | null }) {
  const { data, isLoading } = useSponsorAdDetail(selectedId);

  if (!selectedId) return <p>Select a sponsor ad to preview</p>;
  if (isLoading) return <p>Loading...</p>;

  return <SponsorAdCard ad={data} />;
}
```

### Invalidating the cache externally

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { sponsorAdDetailQueryKeys } from '@/hooks/use-sponsor-ad-detail';

function useInvalidateSponsorAd() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.invalidateQueries({
      queryKey: sponsorAdDetailQueryKeys.detail(id),
    });
  };
}
```

## Related Hooks

- [`useUserSponsorAds`](./use-user-sponsor-ads-reference.md) -- List, create, cancel, and manage the current user's sponsor ads.
- [`useActiveSponsorAds`](./use-active-sponsor-ads-reference.md) -- Fetch active sponsor ads for public display.
