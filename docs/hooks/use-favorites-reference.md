---
id: use-favorites-reference
title: useFavorites Hook Reference
sidebar_label: useFavorites
sidebar_position: 33
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useFavorites

Manages user favorites with full CRUD operations, optimistic updates for instant UI feedback, and automatic feature flag gating. Requires authentication and the `favorites` feature flag to be enabled.

**Source:** `template/hooks/use-favorites.ts`

## Return Values

```ts
const {
  favorites,       // Favorite[] -- Array of user's favorited items
  isLoading,       // boolean -- True while fetching favorites
  error,           // Error | null -- Fetch error
  refetch,         // () => void -- Manually re-fetch favorites
  isFavorited,     // (itemSlug: string) => boolean -- Check if item is favorited
  toggleFavorite,  // (itemData: AddFavoriteRequest) => void -- Toggle favorite on/off
  addFavorite,     // (data: AddFavoriteRequest) => void -- Add a favorite
  removeFavorite,  // (itemSlug: string) => void -- Remove a favorite
  isAdding,        // boolean -- True while add mutation is in flight
  isRemoving,      // boolean -- True while remove mutation is in flight
} = useFavorites();
```

## Types

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

## Prerequisites

The hook's query is **only enabled** when both conditions are met:

1. **User is authenticated** -- `user.id` exists (via `useCurrentUser`)
2. **Favorites feature is enabled** -- `features.favorites === true` (via `useFeatureFlagsWithSimulation`)

If either condition is false, the query does not execute and `favorites` returns an empty array.

## Optimistic Updates

Both add and remove operations use optimistic updates for instant UI feedback:

### Add Flow

1. Cancel outgoing refetches for `['favorites']`
2. Snapshot current cache state
3. Append a temporary `Favorite` object with a `temp-` prefixed ID
4. On success: replace the temporary item with the real server response
5. On error: roll back to the snapshot, show error toast

### Remove Flow

1. Cancel outgoing refetches for `['favorites']`
2. Snapshot current cache state
3. Filter out the removed item immediately
4. On error: roll back to the snapshot, show error toast

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['favorites']` |
| `staleTime` | 5 minutes |
| `enabled` | `!!user?.id && features.favorites` |

Cache is **not** invalidated on `onSettled`; the optimistic update plus `onSuccess` cache write provides sufficient consistency without extra network requests.

## Usage: Toggle Favorite Button

```tsx
function FavoriteButton({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();
  const active = isFavorited(item.slug);

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.iconUrl,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
      className={active ? 'text-red-500' : 'text-gray-400'}
    >
      {active ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## Usage: Favorites List Page

```tsx
function FavoritesPage() {
  const { favorites, isLoading, error } = useFavorites();

  if (isLoading) return <Skeleton count={6} />;
  if (error) return <ErrorMessage message={error.message} />;
  if (favorites.length === 0) return <EmptyState message="No favorites yet" />;

  return (
    <div className="grid grid-cols-3 gap-4">
      {favorites.map((fav) => (
        <FavoriteCard key={fav.id} favorite={fav} />
      ))}
    </div>
  );
}
```

## Usage: Conditional Rendering with Feature Flag

```tsx
function ItemActions({ item }) {
  const { features } = useFeatureFlagsWithSimulation();
  const { isFavorited, toggleFavorite } = useFavorites();

  return (
    <div className="flex gap-2">
      {features.favorites && (
        <FavoriteButton
          active={isFavorited(item.slug)}
          onToggle={() => toggleFavorite({
            itemSlug: item.slug,
            itemName: item.name,
          })}
        />
      )}
      <ShareButton item={item} />
    </div>
  );
}
```

## Error Handling

- **Fetch errors:** Exposed via the `error` return value. The query retries using TanStack Query defaults.
- **Add errors:** Rolls back optimistic update and shows `toast.error()` with the error message.
- **Remove errors:** Rolls back optimistic update and shows `toast.error()` with the error message.

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/favorites` | Fetch all user favorites |
| `POST` | `/api/favorites` | Add a new favorite |
| `DELETE` | `/api/favorites/:itemSlug` | Remove a favorite by item slug |

## Related Hooks

- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) - Authentication state
- [`useFeatureFlagsWithSimulation`](/docs/template/hooks/use-feature-flags-reference) - Feature flag gating
- [`useItemVote`](/docs/template/hooks/use-voting-reference) - Item engagement (voting)
- [`useComments`](/docs/template/hooks/use-comments-reference) - Item engagement (comments)
