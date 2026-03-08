---
id: favorites-system
title: "Favorites System"
sidebar_label: "Favorites"
sidebar_position: 33
---

# Favorites System

The favorites feature lets authenticated users bookmark directory items for quick access. It includes a dedicated favorites page, optimistic UI updates, a full REST API backed by PostgreSQL, and integration with feature flags for conditional rendering.

## Architecture Overview

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Database Schema

The `favorites` table stores bookmark relationships between users and items:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Design Decisions

- **Denormalized metadata** -- `itemName`, `itemIconUrl`, and `itemCategory` are stored alongside the slug so the favorites list renders without joining to the items table.
- **Composite unique constraint** -- the `(userId, itemSlug)` index prevents duplicate favorites at the database level.
- **Indexed lookups** -- separate indexes on `userId`, `itemSlug`, and `createdAt` optimize common query patterns for listing, counting, and chronological ordering.

## useFavorites Hook

The primary client-side API with full optimistic update support:

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

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Current list of user favorites |
| `isLoading` | `boolean` | True during initial fetch |
| `error` | `Error \| null` | Fetch error if any |
| `refetch` | `() => void` | Manually re-fetch favorites |
| `isFavorited` | `(slug: string) => boolean` | Check if an item is bookmarked |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Add or remove based on current state |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Add a favorite explicitly |
| `removeFavorite` | `(slug: string) => void` | Remove a favorite explicitly |
| `isAdding` | `boolean` | True while add mutation is in flight |
| `isRemoving` | `boolean` | True while remove mutation is in flight |

### Optimistic Update Flow

Both add and remove mutations follow the React Query optimistic update pattern:

1. **`onMutate`** -- cancel inflight queries, snapshot previous state, apply the optimistic change immediately. Add mutations create a temporary favorite with a `temp-` prefixed ID.
2. **`onError`** -- roll back to the snapshot if the API call fails, display an error toast.
3. **`onSuccess`** -- replace the optimistic entry with server-confirmed data. The add mutation intelligently replaces the temporary entry by matching on `itemSlug`, preventing duplicates.

The `onSettled` invalidation is intentionally omitted to avoid unnecessary refetches. The optimistic update plus the `onSuccess` cache update provide sufficient consistency.

### Feature Flag Integration

The query is only enabled when both conditions are met:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

When the `favorites` feature flag is disabled or the user is not authenticated, the hook returns an empty array without making any network requests.

### Usage

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## API Endpoints

### GET /api/favorites

Returns all favorites for the authenticated user, ordered by creation date.

### POST /api/favorites

Adds an item to favorites. Validates with Zod and checks for duplicates (returns 409 on conflict).

| Field | Required | Description |
|-------|----------|-------------|
| `itemSlug` | Yes | Unique item identifier |
| `itemName` | Yes | Display name for the favorites list |
| `itemIconUrl` | No | Icon URL for rendering |
| `itemCategory` | No | Category label |

### DELETE /api/favorites/[itemSlug]

Removes a specific item from the user's favorites by slug. Returns 404 if not found.

## Favorites Page

The `FavoritesClient` component renders the full favorites page:

1. **Authentication gate** -- sign-in prompt for unauthenticated users.
2. **Loading skeleton** -- 8-card grid placeholder during initial fetch.
3. **Error state** -- error message with a retry button.
4. **Empty state** -- message with a "popular items" fallback section.
5. **Favorites grid** -- items displayed with sorting, pagination, and layout switching.

### Sort Options

| Value | Label |
|-------|-------|
| `popularity` | Popularity |
| `name-asc` | Name A-Z |
| `name-desc` | Name Z-A |
| `date-asc` | Oldest |

### Layout Integration

The page integrates with `useLayoutTheme()` for grid/list/card view switching. A `ViewToggle` and `SortMenu` appear above the items. Client-side pagination divides favorites into pages of 12, with `clampAndScrollToTop` on page change.

## Cross-Device Sync

Favorites are stored server-side in PostgreSQL, so they sync automatically across devices when the user is authenticated. The React Query cache with a 5-minute stale time balances freshness with performance. Manual sync is available via the `refetch` function.

## Accessibility

- The favorite toggle button disables during pending mutations to prevent double-actions.
- Toast notifications provide feedback for both successful and failed operations.
- The favorites page grid uses the same accessible card components as the main listing.
- Empty and error states include actionable elements for keyboard navigation.

## Related Documentation

- [Feature Flags](/docs/template/configuration/feature-config) -- Enabling/disabling the favorites feature
- [Shared Card Components](/docs/template/components/shared-card-components) -- Card rendering in the favorites grid
- [Context Providers](/docs/template/components/context-providers) -- Layout theme integration
- [Dashboard Components](/docs/template/components/dashboard-components) -- Favorite counts in analytics
