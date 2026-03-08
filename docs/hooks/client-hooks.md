---
id: client-hooks
title: Client & User Hooks Reference
sidebar_label: Client & User Hooks
sidebar_position: 2
---

# Client & User Hooks Reference

Client-facing hooks provide authenticated users with tools to manage their own content, interact with items, and handle user preferences. These hooks power the public-facing UI and user dashboards.

## useClientItems

Manages the authenticated user's submitted items with status filtering, pagination, and soft-delete/restore support.

```typescript
import { useClientItems } from '@/hooks/use-client-items';

const {
  items,           // ClientSubmissionData[]
  stats,           // { total, draft, pending, approved, rejected, deleted }
  total, page, limit, totalPages,
  isLoading, isFetching, isStatsLoading,
  isUpdating, isDeleting, isRestoring, isSubmitting,
  error,
  updateItem,      // (id: string, data: ClientUpdateItemRequest) => Promise<boolean>
  deleteItem,      // (id: string) => Promise<boolean>  -- soft delete
  restoreItem,     // (id: string) => Promise<boolean>
  refetch, refreshData, prefetchNextPage,
} = useClientItems({ page: 1, limit: 10, status: 'approved', search: '' });
```

**Key features:**
- Separate stats query for independent refresh
- `prefetchNextPage(nextPage)` for smooth pagination
- Soft delete with restore capability
- Status change detection on update (re-triggers review)

**Cache key:** `['client', 'items', ...]`

## useFavorites

User favorites with optimistic updates for instant UI feedback.

```typescript
import { useFavorites } from '@/hooks/use-favorites';

const {
  favorites,       // Favorite[]
  isLoading,
  error,
  refetch,
  isFavorited,     // (itemSlug: string) => boolean
  toggleFavorite,  // (data: AddFavoriteRequest) => void
  addFavorite,     // mutation function
  removeFavorite,  // mutation function
  isAdding,        // boolean
  isRemoving,      // boolean
} = useFavorites();
```

**Key features:**
- **Optimistic updates** on both add and remove -- UI updates immediately, rolls back on error
- Respects `useFeatureFlagsWithSimulation` -- only fetches when favorites feature is enabled
- Requires authenticated user (`useCurrentUser`)
- Deduplication logic prevents stale cache entries

**Cache key:** `['favorites']`

## useComments

Full comment CRUD with rating support and real-time cache updates.

```typescript
import { useComments } from '@/hooks/use-comments';

const {
  comments,         // CommentWithUser[]
  isPending,
  createComment,    // ({ content, itemId, rating }) => Promise<CommentWithUser>
  isCreating,
  updateComment,    // ({ commentId, content?, rating? }) => Promise<CommentWithUser>
  isUpdating,
  deleteComment,    // (commentId: string) => Promise<void>
  isDeleting,
  rateComment,      // ({ commentId, rating }) => void
  isRatingComment,
  updateCommentRating, // ({ commentId, rating }) => void
  isUpdatingRating,
  commentRating,    // number
  isLoadingRating,
} = useComments(itemId);
```

**Key features:**
- Optimistic cache update on create/edit (no full refetch needed)
- Cross-query rating invalidation -- `["item-rating", itemId]` refetched on comment changes
- Custom event dispatch (`comment:mutated`) for cross-component coordination
- Login modal trigger on 401 responses

**Cache key:** `['comments', itemId]`

## useItemVote

Upvote/downvote system with optimistic updates and vote toggling.

```typescript
import { useItemVote } from '@/hooks/use-item-vote';

const {
  voteCount,       // number -- net vote count
  userVote,        // 'up' | 'down' | null
  isLoading,       // boolean
  handleVote,      // (type: 'up' | 'down') => void
  refreshVotes,    // () => void
} = useItemVote(itemId);
```

**Behavior:**
- Clicking the same vote type removes the vote (toggle)
- Clicking the opposite vote type switches the vote
- Unauthenticated users see a login modal
- Optimistic count calculation accounts for vote switching

**Additional export:** `useVoteCache()` for cross-component cache management (invalidate, clear, prefetch).

**Cache key:** `['item-votes', itemId]`

## useFilters

Client-side filtering with URL synchronization.

```typescript
import { useFilters } from '@/hooks/use-filters';

const {
  activeFilters,
  setFilter,       // (key: string, value: string | string[]) => void
  clearFilter,     // (key: string) => void
  clearAll,        // () => void
  hasActiveFilters, // boolean
} = useFilters();
```

## useDebouncedSearch

Search input with configurable debounce delay.

```typescript
import { useDebouncedSearch } from '@/hooks/use-debounced-search';

const {
  searchTerm,      // string -- current input value
  debouncedTerm,   // string -- debounced value for API calls
  setSearchTerm,   // (value: string) => void
  clearSearch,     // () => void
} = useDebouncedSearch({ delay: 300 });
```

## usePaginatedQuery

Generic paginated query wrapper used by many list hooks.

```typescript
import { usePaginatedQuery } from '@/hooks/use-paginated-query';

const {
  data,
  page, totalPages, hasNext, hasPrev,
  nextPage, prevPage, goToPage,
  isLoading, isFetching,
} = usePaginatedQuery({
  queryKey: ['items'],
  queryFn: (page) => fetchItems({ page }),
  initialPage: 1,
});
```

## useCurrentUser

Provides the authenticated user's session data.

```typescript
import { useCurrentUser } from '@/hooks/use-current-user';

const { user, isLoading, isAuthenticated } = useCurrentUser();
// user: { id, name, email, image, role }
```

## useInfiniteLoading

Infinite scroll support with intersection observer.

```typescript
import { useInfiniteLoading } from '@/hooks/use-infinite-loading';

const {
  items,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  loadMoreRef,     // Ref<HTMLDivElement> -- attach to sentinel element
  fetchNextPage,
} = useInfiniteLoading({
  queryKey: ['items-infinite'],
  queryFn: ({ pageParam }) => fetchItems({ page: pageParam }),
});
```

## UI Utility Hooks

| Hook | Purpose | Returns |
|------|---------|---------|
| `useMobile` | Responsive breakpoint detection | `{ isMobile: boolean }` |
| `useDebouncedValue` | Generic debounce for any value | `debouncedValue` |
| `useStickyState` | Persisted state via localStorage | `[value, setValue]` |
| `useThrottledScroll` | Scroll position with throttling | `{ scrollY, isScrolled }` |
| `useScrollToTop` | Programmatic scroll-to-top | `{ scrollToTop: () => void }` |
| `useOnClickOutside` | Click-outside detection | Attaches handler to ref |
| `useComposedRef` | Merge multiple refs | `composedRef` |
| `useLocalStorage` | Type-safe localStorage | `[value, setValue, remove]` |
| `useToast` | Toast notification wrapper | `{ toast, dismiss }` |
| `useLoginModal` | Login modal state | `{ isOpen, onOpen, onClose }` |
| `useTheme` | Theme switching | `{ theme, setTheme, resolvedTheme }` |
