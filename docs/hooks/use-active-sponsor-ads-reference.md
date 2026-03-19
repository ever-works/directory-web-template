---
id: use-active-sponsor-ads-reference
title: useActiveSponsorAds Hook Reference
sidebar_label: useActiveSponsorAds
sidebar_position: 96
---

# useActiveSponsorAds

## Overview

`useActiveSponsorAds` is a React hook for fetching currently active sponsor ads intended for public display. It queries the public `/api/sponsor-ads` endpoint and returns sponsor ad records paired with their associated item data. This hook is designed for use on homepage layouts, item detail sidebars, and other public-facing components that show sponsored content.

The file also exports `activeSponsorAdsQueryKeys` for external cache management.

**Source:** `template/hooks/use-active-sponsor-ads.ts`

## Signature

```typescript
function useActiveSponsorAds(options?: UseActiveSponsorAdsOptions): UseActiveSponsorAdsReturn
```

## Parameters

### `UseActiveSponsorAdsOptions`

| Property  | Type      | Default | Description                                        |
|----------|-----------|---------|----------------------------------------------------|
| `limit`  | `number`  | `10`    | Maximum number of active sponsor ads to fetch      |
| `enabled`| `boolean` | `true`  | Whether the query should execute automatically     |

## Return Values

### `UseActiveSponsorAdsReturn`

| Property    | Type                   | Description                                         |
|------------|------------------------|-----------------------------------------------------|
| `sponsors` | `SponsorWithItem[]`    | Array of active sponsor ads with their item data    |
| `isLoading`| `boolean`              | `true` during the initial fetch                     |
| `isError`  | `boolean`              | `true` if the query failed                          |
| `error`    | `Error \| null`        | The error object, if the query failed               |
| `refetch`  | `() => void`           | Manually trigger a refetch of active sponsor ads    |

### `SponsorWithItem`

```typescript
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

Each entry pairs the sponsor ad database record (`SponsorAd`) with the associated item data (`ItemData`). The `item` field may be `null` if the referenced item no longer exists.

## Exported Query Keys

```typescript
export const activeSponsorAdsQueryKeys = {
  all: ['active-sponsor-ads'] as const,
  list: (limit: number) => [...activeSponsorAdsQueryKeys.all, 'list', limit] as const,
};
```

## Implementation Details

- **Public endpoint:** Uses `fetch` directly against `GET /api/sponsor-ads` (not the authenticated `serverClient`), making it suitable for client-side rendering without authentication.
- **Cache configuration:** `staleTime` of 5 minutes and `gcTime` of 10 minutes. `refetchOnWindowFocus` is disabled since sponsor ads do not change frequently.
- **Limit parameter:** The `limit` is passed as a URL search parameter to control how many ads are returned.
- **Default empty array:** When no data is available, `sponsors` defaults to an empty array rather than `undefined`.

## Usage Examples

### Homepage sponsor ads section

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';

function SponsorAdsSection() {
  const { sponsors, isLoading, isError } = useActiveSponsorAds({ limit: 5 });

  if (isLoading) return <div>Loading sponsors...</div>;
  if (isError || sponsors.length === 0) return null;

  return (
    <section className="sponsor-ads">
      <h3>Sponsored</h3>
      <div className="sponsor-grid">
        {sponsors.map(({ sponsor, item }) => (
          <a key={sponsor.id} href={`/items/${sponsor.itemSlug}`}>
            {item?.icon_url && <img src={item.icon_url} alt={sponsor.itemName} />}
            <span>{sponsor.itemName}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
```

### Sidebar with conditional loading

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';

function ItemDetailSidebar({ showSponsors }: { showSponsors: boolean }) {
  const { sponsors, isLoading } = useActiveSponsorAds({
    limit: 3,
    enabled: showSponsors,
  });

  if (!showSponsors || isLoading) return null;

  return (
    <aside>
      <h4>Sponsored Items</h4>
      {sponsors.map(({ sponsor, item }) => (
        <div key={sponsor.id}>
          <strong>{sponsor.itemName}</strong>
          {item && <p>{item.description}</p>}
        </div>
      ))}
    </aside>
  );
}
```

### Invalidating the cache after admin changes

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { activeSponsorAdsQueryKeys } from '@/hooks/use-active-sponsor-ads';

function useRefreshPublicSponsors() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: activeSponsorAdsQueryKeys.all,
    });
  };
}
```

## Related Hooks

- [`useSponsorAdDetail`](./use-sponsor-ad-detail-reference.md) -- Fetch a single sponsor ad by ID.
- [`useUserSponsorAds`](./use-user-sponsor-ads-reference.md) -- Full CRUD management of the current user's sponsor ads.
