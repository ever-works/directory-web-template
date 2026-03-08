---
id: use-item-rating-reference
title: useItemRating Hook Reference
sidebar_label: useItemRating
sidebar_position: 75
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useItemRating

Fetches the average rating and total number of ratings for a specific item. The query is gated behind the `ratings` feature flag -- when the flag is disabled, no network request is made and the hook returns zero defaults.

**Source:** `template/hooks/use-item-rating.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useItemRating` | Fetch rating data (average and count) for a single item |

---

## Signature

```ts
function useItemRating(itemId: string, enabled?: boolean): UseItemRatingReturn;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `itemId` | `string` | — | **Required.** The item ID to fetch ratings for. |
| `enabled` | `boolean` | `true` | Additional enable flag (combined with the `ratings` feature flag). |

---

## Return Values

```ts
const {
  rating,     // RatingData -- { averageRating: number; totalRatings: number }
  isLoading,  // boolean -- True while fetching
  error,      // Error | null -- Fetch error if any
  refetch,    // () => void -- Manually re-fetch rating data
} = useItemRating(itemId);
```

### RatingData Shape

```ts
interface RatingData {
  averageRating: number;   // Average score (e.g. 4.5)
  totalRatings: number;    // Number of ratings submitted
}
```

The default value when no data is loaded is `{ averageRating: 0, totalRatings: 0 }`.

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-rating', itemId]` |
| `staleTime` | 5 minutes |
| `refetchOnMount` | `false` |
| `refetchOnWindowFocus` | `false` |
| `refetchOnReconnect` | `false` |
| `enabled` | `features.ratings && enabled` |

---

## Implementation Details

- **Feature flag gated:** The query's `enabled` flag is `features.ratings && enabled`. When the `ratings` feature is turned off in the application's feature flags, the hook short-circuits and returns the default `{ averageRating: 0, totalRatings: 0 }` without any network request.
- **No HTTP cache:** The fetch function passes `cache: 'no-store'` and a `Cache-Control: no-store` header to prevent stale browser-level caching. Freshness is managed entirely by React Query's stale time and explicit `refetch` calls.
- **Abort signal:** The query function accepts and forwards the `signal` from React Query, enabling automatic cancellation of in-flight requests when the component unmounts or the query is invalidated.
- **Conservative refetch policy:** All automatic refetch triggers (`refetchOnMount`, `refetchOnWindowFocus`, `refetchOnReconnect`) are disabled. Rating data only refreshes when the `staleTime` expires or when `refetch` is called explicitly, typically after a user submits a new rating.
- **Client component:** This hook is marked with `'use client'` and should only be used in client components.

---

## Usage: Star Rating Display

```tsx
function ItemRatingDisplay({ itemId }: { itemId: string }) {
  const { rating, isLoading } = useItemRating(itemId);

  if (isLoading) return <Skeleton className="h-5 w-24" />;

  return (
    <div className="flex items-center gap-2">
      <StarRating value={rating.averageRating} readOnly />
      <span className="text-sm text-muted-foreground">
        {rating.averageRating.toFixed(1)} ({rating.totalRatings} ratings)
      </span>
    </div>
  );
}
```

## Usage: Refresh After Rating Submission

```tsx
function RatingForm({ itemId }: { itemId: string }) {
  const { rating, refetch } = useItemRating(itemId);

  const handleSubmitRating = async (value: number) => {
    await submitRating(itemId, value);
    // Explicitly refresh after the user submits a rating
    refetch();
  };

  return (
    <div>
      <p>Current: {rating.averageRating.toFixed(1)}</p>
      <StarRating
        value={0}
        onChange={handleSubmitRating}
      />
    </div>
  );
}
```

## Usage: Conditional Rendering Based on Feature Flag

```tsx
function ItemDetailSidebar({ itemId }: { itemId: string }) {
  const { rating, isLoading } = useItemRating(itemId);

  // When the ratings feature flag is off, rating stays at defaults
  // and isLoading is false, so nothing renders
  if (rating.totalRatings === 0 && !isLoading) return null;

  return (
    <div className="p-4 border rounded">
      <h4>Rating</h4>
      <span>{rating.averageRating.toFixed(1)} / 5</span>
      <span className="text-sm ml-1">({rating.totalRatings})</span>
    </div>
  );
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery` for data fetching and caching |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |
| `@/hooks/use-feature-flags-with-simulation` | `useFeatureFlagsWithSimulation` for the `ratings` feature flag |

## Related Hooks

- [`useItemVote`](/docs/template/hooks/use-item-vote-reference) -- Voting system for items (complementary engagement metric)
- [`useComments`](/docs/template/hooks/use-comments-reference) -- Comments that may include inline ratings
- [`useFeatureFlags`](/docs/template/hooks/use-feature-flags-reference) -- Feature flag system that gates this hook
- [`useItemEngagement`](/docs/template/hooks/use-item-engagement-reference) -- Broader engagement metrics (views, likes)
