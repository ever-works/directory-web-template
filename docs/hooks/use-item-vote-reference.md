---
id: use-item-vote-reference
title: useItemVote Hook Reference
sidebar_label: useItemVote
sidebar_position: 76
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useItemVote

Manages upvote/downvote functionality for items with optimistic updates, authentication gating, and automatic cache reconciliation. Includes a companion `useVoteCache` utility hook for managing vote cache across the application.

**Source:** `template/hooks/use-item-vote.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useItemVote` | Vote on an item (up/down) with optimistic UI and auth checks |
| `useVoteCache` | Utility hook for managing vote cache globally |

---

## useItemVote

### Signature

```ts
function useItemVote(itemId: string): UseItemVoteReturn;
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemId` | `string` | **Required.** The item ID to manage votes for. |

### Return Values

```ts
const {
  voteCount,     // number -- Net vote count (upvotes minus downvotes)
  userVote,      // 'up' | 'down' | null -- Current user's vote, or null
  isLoading,     // boolean -- True while fetching, voting, unvoting, or if itemId is missing
  handleVote,    // (type: 'up' | 'down') => void -- Toggle a vote
  refreshVotes,  // () => void -- Invalidate and refetch vote data
} = useItemVote(itemId);
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-votes', itemId]` |
| `staleTime` | 5 minutes |
| `gcTime` | 30 minutes |
| `enabled` | `!!itemId` |

### Retry Strategy

| Error Type | Retry? |
|------------|--------|
| Authentication errors (`'sign in'`, `'unauthorized'`) | No |
| Other errors | Up to 2 attempts with exponential backoff (max 10s) |

---

## Implementation Details

### Optimistic Updates

The hook implements full optimistic update flow for both `vote` and `unvote` mutations:

1. **onMutate:** Cancels in-flight queries, saves the previous vote data as context, and immediately updates the cache with the expected new state.
2. **onSuccess:** Replaces the optimistic cache data with the server-confirmed values to ensure consistency.
3. **onError:** Rolls back to the previously saved data from the context.

The optimistic count calculation handles all transitions:

| Current Vote | New Vote | Count Change |
|-------------|----------|--------------|
| `null` | `up` | `+1` |
| `null` | `down` | `-1` |
| `up` | `up` (toggle off) | `-1` |
| `down` | `down` (toggle off) | `+1` |
| `up` | `down` (switch) | `-2` |
| `down` | `up` (switch) | `+2` |

### Authentication Gating

- The `handleVote` function checks for an authenticated user before proceeding.
- If no user is logged in, the login modal is opened with the message "Please sign in to vote on this item" and an `Error('Authentication required')` is thrown.
- The mutation's `onError` handler suppresses toast errors for authentication-related messages, since the login modal already handles the UI.

### Vote Toggle Behavior

`handleVote(type)` implements smart toggling:
- If the user's current vote matches `type`, the vote is **removed** (calls `unvote`).
- Otherwise, the vote is **cast or changed** (calls `vote(type)`).
- While any vote mutation is in-flight, subsequent calls are ignored.

---

## Usage: Upvote/Downvote Buttons

```tsx
function VoteButtons({ itemId }: { itemId: string }) {
  const { voteCount, userVote, isLoading, handleVote } = useItemVote(itemId);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('up')}
        disabled={isLoading}
        className={userVote === 'up' ? 'text-green-500' : ''}
      >
        Upvote
      </button>
      <span className="font-medium">{voteCount}</span>
      <button
        onClick={() => handleVote('down')}
        disabled={isLoading}
        className={userVote === 'down' ? 'text-red-500' : ''}
      >
        Downvote
      </button>
    </div>
  );
}
```

## Usage: Simple Upvote Only

```tsx
function UpvoteButton({ itemId }: { itemId: string }) {
  const { voteCount, userVote, isLoading, handleVote } = useItemVote(itemId);

  return (
    <button
      onClick={() => handleVote('up')}
      disabled={isLoading}
      className={`flex items-center gap-1 ${userVote === 'up' ? 'bg-blue-100' : ''}`}
    >
      <ChevronUpIcon />
      <span>{voteCount}</span>
    </button>
  );
}
```

## Usage: Auth-Aware Voting with Error Handling

```tsx
function SafeVoteButton({ itemId }: { itemId: string }) {
  const { handleVote, isLoading, userVote } = useItemVote(itemId);

  const onVote = () => {
    try {
      handleVote('up');
    } catch (err) {
      // Authentication error -- login modal is already shown
      // No additional handling needed
    }
  };

  return (
    <button onClick={onVote} disabled={isLoading}>
      {userVote === 'up' ? 'Voted' : 'Vote'}
    </button>
  );
}
```

---

## useVoteCache

A utility hook for managing the vote cache from anywhere in the application. Useful for batch invalidation, pre-loading, and cleanup.

### Return Values

```ts
const {
  invalidateAllVotes,    // () => void -- Mark all vote queries as stale
  invalidateItemVotes,   // (itemId: string) => void -- Mark a single item's votes as stale
  clearVoteCache,        // () => void -- Remove all vote data from cache entirely
  prefetchItemVotes,     // (itemId: string) => Promise<void> -- Prefetch votes for an item
} = useVoteCache();
```

### Usage: Prefetch Votes for a List

```tsx
function ItemList({ items }: { items: Item[] }) {
  const { prefetchItemVotes } = useVoteCache();

  useEffect(() => {
    // Prefetch votes for all visible items
    items.forEach((item) => {
      prefetchItemVotes(item.id);
    });
  }, [items, prefetchItemVotes]);

  return (
    <div>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

### Usage: Clear Cache on Logout

```tsx
function LogoutHandler() {
  const { clearVoteCache } = useVoteCache();

  const handleLogout = async () => {
    clearVoteCache();
    await signOut();
  };

  return <button onClick={handleLogout}>Sign Out</button>;
}
```

### Usage: Refresh After External Change

```tsx
function AdminVoteReset({ itemId }: { itemId: string }) {
  const { invalidateItemVotes } = useVoteCache();

  const handleReset = async () => {
    await resetItemVotes(itemId); // Admin API call
    invalidateItemVotes(itemId);  // Refresh the cache
  };

  return <button onClick={handleReset}>Reset Votes</button>;
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery`, `useMutation`, `useQueryClient` for caching and optimistic updates |
| `sonner` | Toast notifications for error feedback |
| `@/hooks/use-login-modal` | `useLoginModal` for authentication gating |
| `@/hooks/use-current-user` | `useCurrentUser` for checking auth state |
| `@/lib/api/server-api-client` | `serverClient` for API calls, `apiUtils` for response validation |

## Related Hooks

- [`useItemRating`](/docs/template/hooks/use-item-rating-reference) -- Rating system (complementary engagement metric)
- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) -- Auth state used to gate voting
- [`useLoginModal`](/docs/template/hooks/use-login-modal-reference) -- Login modal shown to unauthenticated users
- [`useItemEngagement`](/docs/template/hooks/use-item-engagement-reference) -- Broader engagement metrics
- [`useFavorites`](/docs/template/hooks/use-favorites-reference) -- Another user-specific item interaction
