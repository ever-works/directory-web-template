---
id: voting-comments-deep-dive
title: Votes et commentaires – Guide approfondi
sidebar_label: Votes et commentaires – Guide approfondi
sidebar_position: 36
---

# Votes et commentaires – Guide approfondi

This deep dive covers the internal mechanics of the voting and commenting systems, including optimistic update algorithms, cache management strategies, rating aggregation, cross-component event coordination, and admin moderation workflows.

## Architecture Overview

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## Voting System Internals

### useItemVote Hook

The hook manages vote state for a single item with full optimistic update support:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Vote State Machine

The `handleVote` function implements a toggle-based state machine:

| Current State | Action | Result | Net Change |
|--------------|--------|--------|------------|
| No vote | Click Up | Upvote | +1 |
| No vote | Click Down | Downvote | -1 |
| Upvoted | Click Up | Remove vote (toggle off) | -1 |
| Upvoted | Click Down | Switch to downvote | -2 |
| Downvoted | Click Down | Remove vote (toggle off) | +1 |
| Downvoted | Click Up | Switch to upvote | +2 |

When the user's current vote matches the requested type, the hook calls `unvote()` (DELETE). Otherwise it calls `vote(type)` (POST).

### Optimistic Count Calculation

The optimistic update computes the count differential without waiting for the server:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

The `countDiff` calculation handles three cases: toggling off (subtract 1), fresh vote (add 1), and switching direction (add 2 for the full swing).

### Authentication Gate

Unauthenticated users who attempt to vote are shown a login modal instead of receiving an error:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

The error is caught by the mutation's `onError` handler, which checks for the authentication message and suppresses the error toast.

### Query Configuration

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Vote Cache Utilities

The `useVoteCache` hook provides cross-component cache operations:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## Comments System Internals

### useComments Hook

The hook provides full CRUD operations with integrated rating support:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Comments with populated user data |
| `isPending` | `boolean` | True during initial fetch |
| `createComment` | `(data) => Promise` | Create a new comment |
| `updateComment` | `(data) => Promise` | Edit an existing comment |
| `deleteComment` | `(id) => Promise` | Remove a comment |
| `rateComment` | `(data) => void` | Rate a comment |
| `updateCommentRating` | `(data) => void` | Update an existing rating |
| `commentRating` | `number` | Aggregate rating for the item |

### Cross-Component Event System

The comment system dispatches custom DOM events for coordination between components that do not share React Query cache keys:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

This allows components like the item detail header (which shows comment count) to react to comment changes without being directly coupled to the comments query.

### Rating Aggregation

Comments and ratings are tightly integrated. After any comment mutation (create, update, delete), the hook forces a refetch of the item rating:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

This ensures the star rating display updates immediately after a user submits or edits a review.

### Query Stability

The comments query uses conservative refresh settings to prevent UI flicker:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Admin Moderation

### useAdminComments Hook

The admin moderation hook provides paginated comment management:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### Moderation Workflow

1. Admin navigates to the comments management page.
2. Comments are displayed with search and pagination.
3. The `isDeleting` state tracks which comment is being removed, disabling its row.
4. Deletion triggers a notification to the comment author via `NotificationService`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items/:id/votes` | Fetch vote count and user's vote |
| POST | `/api/items/:id/votes` | Cast or change a vote |
| DELETE | `/api/items/:id/votes` | Remove a vote |
| GET | `/api/items/:id/comments` | Fetch comments with user data |
| POST | `/api/items/:id/comments` | Create a new comment |
| PUT | `/api/items/:id/comments/:commentId` | Update a comment |
| DELETE | `/api/items/:id/comments/:commentId` | Delete a comment |
| POST | `/api/items/:id/comments/rating` | Rate a comment |
| PUT | `/api/items/:id/comments/rating` | Update a comment rating |
| GET | `/api/items/:id/comments/rating` | Get aggregate item rating |

## Feature Flag Integration

Both voting and comments respect feature flags:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

When the database is not configured, these features are automatically disabled.

## Accessibility

- Vote buttons use `aria-pressed` to indicate the current vote state.
- The login modal triggered by unauthenticated vote attempts is focus-trapped.
- Comment forms use proper `<label>` associations and validation messages.
- The star rating component supports keyboard navigation with arrow keys.
- Admin moderation tables include row-level status indicators and keyboard-accessible actions.
- Loading and error states provide `aria-busy` and `role="alert"` attributes respectively.

## Related Documentation

- [Voting & Comments Overview](/docs/template/features/voting-comments) -- High-level feature overview
- [Item Detail Components](/docs/template/components/item-detail-components) -- Where votes and comments render
- [Notification System](/docs/template/features/notification-system) -- Comment-triggered notifications
- [Dashboard Components](/docs/template/components/dashboard-components) -- Vote and comment analytics