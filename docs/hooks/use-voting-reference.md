---
id: use-voting-reference
title: Voting Hooks Reference
sidebar_label: useItemVote
sidebar_position: 35
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Voting Hooks

Hooks for managing item votes (upvote/downvote) and aggregate item ratings. Both support optimistic updates, authentication gating, and TanStack Query caching.

**Source files:**
- `template/hooks/use-item-vote.ts` -- Upvote/downvote system
- `template/hooks/use-item-rating.ts` -- Aggregate rating display

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useItemVote` | Manage upvote/downvote on a specific item |
| `useVoteCache` | Utility hook for vote cache management across the app |
| `useItemRating` | Fetch aggregate rating data for an item |

---

## useItemVote

Manages upvote and downvote interactions for a single item. Provides optimistic updates that calculate the new vote count immediately, then reconcile with the server response.

### Signature

```ts
function useItemVote(itemId: string): UseItemVoteResult
```

### Return Values

```ts
const {
  voteCount,     // number -- Net vote count (upvotes minus downvotes)
  userVote,      // 'up' | 'down' | null -- Current user's vote direction
  isLoading,     // boolean -- True while fetching or mutating
  handleVote,    // (type: 'up' | 'down') => void -- Toggle vote
  refreshVotes,  // () => void -- Manually invalidate and refetch vote data
} = useItemVote(itemId);
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-votes', itemId]` |
| `staleTime` | 5 minutes |
| `gcTime` | 30 minutes |
| `enabled` | `!!itemId` |
| Retry | Up to 2 times; skips auth errors |
| Retry delay | Exponential backoff, max 10 seconds |

### Optimistic Update Logic

When `handleVote` is called:

1. If the user already has the same vote type, `unvote()` is called (toggle off)
2. If the user has no vote or a different vote type, `vote(type)` is called

The optimistic update immediately calculates the new count:

| Previous Vote | Action | Count Change |
|--------------|--------|-------------|
| `null` | Vote up | `+1` |
| `null` | Vote down | `-1` |
| `'up'` | Vote up (toggle off) | `-1` |
| `'down'` | Vote down (toggle off) | `+1` |
| `'up'` | Vote down (switch) | `-2` |
| `'down'` | Vote up (switch) | `+2` |

On server response, the cache is updated with the authoritative server data. On error, the cache is rolled back to the previous snapshot.

### Authentication

If the user is not authenticated, `handleVote` opens the login modal with the message "Please sign in to vote on this item" and throws an `'Authentication required'` error. The calling component should handle this:

```tsx
function VoteButtons({ itemId }) {
  const { voteCount, userVote, handleVote, isLoading } = useItemVote(itemId);

  const onVote = (type: 'up' | 'down') => {
    try {
      handleVote(type);
    } catch (err) {
      // Login modal is already open for auth errors
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onVote('up')}
        disabled={isLoading}
        className={userVote === 'up' ? 'text-green-500' : 'text-gray-400'}
      >
        Upvote
      </button>
      <span>{voteCount}</span>
      <button
        onClick={() => onVote('down')}
        disabled={isLoading}
        className={userVote === 'down' ? 'text-red-500' : 'text-gray-400'}
      >
        Downvote
      </button>
    </div>
  );
}
```

### Usage: Compact Vote Counter

```tsx
function VoteCounter({ itemId }) {
  const { voteCount, userVote, handleVote, isLoading } = useItemVote(itemId);

  return (
    <div className="flex flex-col items-center">
      <button onClick={() => handleVote('up')} disabled={isLoading}>
        <ChevronUp className={userVote === 'up' ? 'fill-green-500' : ''} />
      </button>
      <span className="font-bold">{voteCount}</span>
      <button onClick={() => handleVote('down')} disabled={isLoading}>
        <ChevronDown className={userVote === 'down' ? 'fill-red-500' : ''} />
      </button>
    </div>
  );
}
```

---

## useVoteCache

A utility hook for managing the vote cache globally. Useful for admin operations, page transitions, or bulk invalidation.

### Return Values

```ts
const {
  invalidateAllVotes,       // () => void -- Invalidate all vote queries
  invalidateItemVotes,      // (itemId: string) => void -- Invalidate votes for a specific item
  clearVoteCache,           // () => void -- Remove all vote data from cache
  prefetchItemVotes,        // (itemId: string) => Promise<void> -- Prefetch votes for an item
} = useVoteCache();
```

### Usage: Prefetch on Hover

```tsx
function ItemCard({ item }) {
  const { prefetchItemVotes } = useVoteCache();

  return (
    <div onMouseEnter={() => prefetchItemVotes(item.id)}>
      <h3>{item.name}</h3>
      <VoteButtons itemId={item.id} />
    </div>
  );
}
```

---

## useItemRating

Fetches the aggregate rating data for an item. Gated by the `ratings` feature flag via `useFeatureFlagsWithSimulation`.

### Signature

```ts
function useItemRating(itemId: string, enabled?: boolean): UseItemRatingResult
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `itemId` | `string` | -- | The item to fetch the rating for |
| `enabled` | `boolean` | `true` | Additional enable/disable control |

### Return Values

```ts
const {
  rating,      // { averageRating: number; totalRatings: number }
  isLoading,   // boolean
  error,       // Error | null
  refetch,     // () => void
} = useItemRating(itemId);
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-rating', itemId]` |
| `staleTime` | 5 minutes |
| `refetchOnMount` | `false` |
| `refetchOnWindowFocus` | `false` |
| `refetchOnReconnect` | `false` |
| `enabled` | `features.ratings && enabled` |
| HTTP cache | `no-store` (relies on React Query for caching) |

### Usage: Star Rating Display

```tsx
function ItemRatingDisplay({ itemId }) {
  const { rating, isLoading } = useItemRating(itemId);

  if (isLoading) return <Skeleton width={100} />;

  return (
    <div className="flex items-center gap-2">
      <StarDisplay value={rating.averageRating} />
      <span className="text-sm text-muted">
        ({rating.totalRatings} {rating.totalRatings === 1 ? 'rating' : 'ratings'})
      </span>
    </div>
  );
}
```

### Rating Refresh

The `['item-rating', itemId]` query is automatically refetched by `useComments` when:
- A new comment with a rating is created
- An existing comment's rating is updated
- A standalone comment rating is submitted

This ensures the aggregate rating stays current without manual intervention.

## Error Handling

| Hook | Auth Errors | Network Errors |
|------|------------|----------------|
| `useItemVote` | Opens login modal, throws error | Toast notification, cache rollback |
| `useVoteCache` | N/A (utility only) | N/A |
| `useItemRating` | N/A (read-only) | Standard TanStack Query retry |

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/items/:itemId/votes` | Fetch vote count and user's vote |
| `POST` | `/api/items/:itemId/votes` | Submit or change a vote |
| `DELETE` | `/api/items/:itemId/votes` | Remove user's vote |
| `GET` | `/api/items/:itemId/comments/rating` | Fetch aggregate rating |

## Related Hooks

- [`useComments`](/docs/template/hooks/use-comments-reference) - Comment system with rating integration
- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) - Authentication state for vote eligibility
- [`useFavorites`](/docs/template/hooks/use-favorites-reference) - Another item engagement mechanism
- [`useFeatureFlagsWithSimulation`](/docs/template/hooks/use-feature-flags-reference) - Feature flag gating for ratings
