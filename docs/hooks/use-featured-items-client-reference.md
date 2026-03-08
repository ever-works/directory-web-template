---
id: use-featured-items-client-reference
title: useFeaturedItems Hook Reference
sidebar_label: useFeaturedItems (Client)
sidebar_position: 79
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFeaturedItems

Fetches the list of featured items for client-side display. Gated behind the `featuredItems` feature flag -- when disabled, no network request is made and an empty array is returned. Includes smart retry logic with exponential backoff to handle transient errors gracefully.

**Source:** `template/hooks/use-featured-items-client.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useFeaturedItems` | Fetch active featured items for display on the public site |

## Exported Types

```ts
export interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;
  featuredUntil?: string;
  isActive: boolean;
  featuredBy: string;
  featuredAt: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Signature

```ts
function useFeaturedItems(): UseFeaturedItemsReturn;
```

This hook takes no parameters. Feature gating is handled internally via the `featuredItems` feature flag.

---

## Return Values

```ts
const {
  featuredItems,  // FeaturedItem[] -- Array of featured items (empty when feature is off)
  isLoading,      // boolean -- True while fetching
  error,          // Error | null -- Fetch error if any
  refetch,        // () => void -- Manually re-fetch featured items
} = useFeaturedItems();
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['featured-items-client', 'list', {}]` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `enabled` | `features.featuredItems` |

---

## Retry Strategy

The hook uses custom retry logic with exponential backoff:

| Error Type | Retry? | Details |
|------------|--------|---------|
| `'Database not configured'` | No | Fails fast when database is unavailable |
| Other errors | Up to 2 attempts | Exponential backoff: 1s, 2s, 4s... capped at 30s |

This prevents server hammering during outages or rate limiting scenarios while still recovering from transient errors.

---

## Implementation Details

- **Feature flag gated:** The query's `enabled` flag reads `features.featuredItems` from `useFeatureFlagsWithSimulation`. When the flag is `false`, the hook returns `featuredItems: []` without any network request.
- **API endpoint:** Fetches from `/api/featured-items` which returns a paginated response. The hook extracts the `data` array from the response.
- **Response shape:** The API response includes pagination metadata (`page`, `limit`, `total`, `totalPages`, `hasNext`, `hasPrev`), but this hook fetches the default first page and exposes only the items array.
- **Database resilience:** The custom retry function checks for `'Database not configured'` errors and immediately fails without retry, avoiding unnecessary retry cycles when the database backend is unavailable.
- **Exponential backoff:** Retry delays follow `Math.min(1000 * 2^attemptIndex, 30000)`, resulting in delays of 1s, 2s, 4s, 8s, 16s, 30s, 30s...
- **Default empty array:** The `data` option defaults to `[]`, ensuring `featuredItems` is always an array even during loading or error states.

---

## Usage: Featured Items Section

```tsx
function FeaturedSection() {
  const { featuredItems, isLoading } = useFeaturedItems();

  if (isLoading) return <FeaturedSkeleton />;
  if (featuredItems.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-4">Featured</h2>
      <div className="grid grid-cols-3 gap-4">
        {featuredItems.map((item) => (
          <FeaturedItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
```

## Usage: Featured Item Card

```tsx
function FeaturedItemCard({ item }: { item: FeaturedItem }) {
  return (
    <a href={`/items/${item.itemSlug}`} className="block p-4 border rounded hover:shadow">
      <div className="flex items-center gap-3">
        {item.itemIconUrl && (
          <img src={item.itemIconUrl} alt="" className="h-10 w-10 rounded" />
        )}
        <div>
          <h3 className="font-medium">{item.itemName}</h3>
          {item.itemCategory && (
            <span className="text-xs text-muted-foreground">{item.itemCategory}</span>
          )}
        </div>
      </div>
      {item.itemDescription && (
        <p className="text-sm mt-2 line-clamp-2">{item.itemDescription}</p>
      )}
    </a>
  );
}
```

## Usage: Homepage with Conditional Display

```tsx
function Homepage() {
  const { featuredItems } = useFeaturedItems();

  return (
    <div>
      <HeroSection />

      {/* Only renders when featured items feature is active and items exist */}
      {featuredItems.length > 0 && (
        <section className="container mx-auto py-12">
          <h2>Featured Items</h2>
          <div className="flex gap-4 overflow-x-auto">
            {featuredItems
              .sort((a, b) => a.featuredOrder - b.featuredOrder)
              .map((item) => (
                <FeaturedItemCard key={item.id} item={item} />
              ))}
          </div>
        </section>
      )}

      <AllItemsSection />
    </div>
  );
}
```

## Usage: Sidebar Featured Widget

```tsx
function FeaturedSidebar() {
  const { featuredItems, isLoading, error } = useFeaturedItems();

  if (isLoading) return <Skeleton className="h-48" />;
  if (error || featuredItems.length === 0) return null;

  return (
    <aside className="p-4 bg-muted rounded">
      <h3 className="font-semibold mb-3">Featured</h3>
      <ul className="space-y-2">
        {featuredItems.slice(0, 5).map((item) => (
          <li key={item.id}>
            <a href={`/items/${item.itemSlug}`} className="text-sm hover:underline">
              {item.itemName}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery` for data fetching and caching |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |
| `@/hooks/use-feature-flags-with-simulation` | `useFeatureFlagsWithSimulation` for the `featuredItems` feature flag |

## Related Hooks

- [`useFeatureFlags`](/docs/template/hooks/use-feature-flags-reference) -- Feature flag system that gates this hook
- [`useClientItems`](/docs/template/hooks/use-client-items-reference) -- Regular client items listing
- [`useItemRating`](/docs/template/hooks/use-item-rating-reference) -- Another feature-flag-gated item hook
- [`useItemVote`](/docs/template/hooks/use-item-vote-reference) -- Voting functionality for items
