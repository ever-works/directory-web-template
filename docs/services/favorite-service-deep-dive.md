---
id: favorite-service-deep-dive
title: Favorite Service Deep Dive
sidebar_label: Favorite Service (Deep Dive)
sidebar_position: 57
---

# Favorite Service Deep Dive

## Overview

The Favorites system allows authenticated users to bookmark items for quick access. Unlike most services in the template, favorites do not have a dedicated service class. Instead, the functionality is implemented across:

- **API Routes** -- Direct Drizzle ORM queries in Next.js route handlers
- **React Hook** -- `useFavorites()` with React Query for client-side state management and optimistic updates
- **Database Schema** -- `favorites` table in PostgreSQL

This pattern keeps the favorites feature lightweight while still providing a robust user experience.

## Source Files

| File | Path |
|------|------|
| GET/POST Route | `template/app/api/favorites/route.ts` |
| DELETE Route | `template/app/api/favorites/[itemSlug]/route.ts` |
| React Hook | `template/hooks/use-favorites.ts` |
| Button Component | `template/components/favorite-button.tsx` |
| Favorites Page | `template/components/favorites/favorites-client.tsx` |

## Architecture

```
FavoriteButton / FavoritesPage (React)
        |
   useFavorites() hook (React Query + optimistic updates)
        |
   serverClient (HTTP)
        |
  ┌─────┼──────────────┐
  │     │              │
GET   POST           DELETE
/api/favorites    /api/favorites/{itemSlug}
        |
   Drizzle ORM
        |
   PostgreSQL (favorites table)
```

## Data Model

```typescript
interface Favorite {
  id: string;           // Auto-generated UUID
  userId: string;       // Owner user ID
  itemSlug: string;     // Reference to the item
  itemName: string;     // Denormalized for display
  itemIconUrl?: string; // Denormalized for display
  itemCategory?: string;// Denormalized for display
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

Item metadata (`itemName`, `itemIconUrl`, `itemCategory`) is denormalized into the favorites table so that favorite lists can be rendered without joining to the items data source (which is Git-based, not in the database).

## API Reference

### `GET /api/favorites`

Returns all favorites for the authenticated user, ordered by creation date.

**Authentication:** Required (session-based)

**Response (200):**
```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123",
      "userId": "user_456",
      "itemSlug": "awesome-tool",
      "itemName": "Awesome Tool",
      "itemIconUrl": "https://...",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

**Error responses:** 401 (Unauthorized), 500 (Internal Server Error)

### `POST /api/favorites`

Adds an item to the user's favorites.

**Request body (validated with Zod):**
```typescript
{
  itemSlug: string;     // Required, min 1 char
  itemName: string;     // Required, min 1 char
  itemIconUrl?: string; // Optional
  itemCategory?: string;// Optional
}
```

**Duplicate protection:** Checks for existing favorite with the same `userId` + `itemSlug`. Returns 409 if already favorited.

**Response (201):** Returns the created favorite object.

**Error responses:** 400 (Validation error), 401 (Unauthorized), 409 (Already favorited), 500 (Server error)

### `DELETE /api/favorites/{itemSlug}`

Removes an item from the user's favorites.

**Path parameter:** `itemSlug` -- The slug of the item to unfavorite.

**Existence check:** Verifies the favorite exists for the current user before deleting. Returns 404 if not found.

**Response (200):** `{ success: true, message: "Favorite removed successfully" }`

**Error responses:** 401 (Unauthorized), 404 (Not found), 500 (Server error)

## React Hook -- `useFavorites()`

### Overview

The `useFavorites` hook provides a complete client-side API with optimistic updates, error rollback, and toast notifications.

### Feature Flag Integration

The hook respects the `favorites` feature flag. Queries are only enabled when both the user is logged in AND the feature is active:

```typescript
enabled: !!user?.id && features.favorites
```

### Query Configuration

- **Query key:** `['favorites']`
- **Stale time:** 5 minutes
- **Enabled:** Only when user is authenticated and feature flag is on

### Returned API

```typescript
{
  favorites: Favorite[];       // Current favorites array
  isLoading: boolean;          // Initial loading state
  error: Error | null;         // Query error
  refetch: () => void;         // Manual refetch
  isFavorited: (slug: string) => boolean;  // Check if item is favorited
  toggleFavorite: (data: AddFavoriteRequest) => void;  // Toggle favorite
  addFavorite: (data: AddFavoriteRequest) => void;     // Add favorite
  removeFavorite: (slug: string) => void;              // Remove favorite
  isAdding: boolean;           // Add mutation pending
  isRemoving: boolean;         // Remove mutation pending
}
```

### Optimistic Updates

**Add favorite flow:**
1. Cancel pending refetches
2. Snapshot current favorites
3. Insert optimistic favorite with `temp-{timestamp}` ID
4. On success: replace temp favorite with real data from server
5. On error: restore snapshot, show toast error

**Remove favorite flow:**
1. Cancel pending refetches
2. Snapshot current favorites
3. Filter out the removed item immediately
4. On error: restore snapshot, show toast error
5. On success: show toast confirmation

This design avoids `invalidateQueries` after mutations, relying entirely on optimistic updates for instant UI feedback.

### Duplicate Prevention

The `addFavorite` `onSuccess` handler checks for duplicates before updating cache:
1. If a temp favorite exists for the slug, replace it with the real one
2. If no temp but a real favorite already exists, replace it
3. Otherwise, append the new favorite

## Error Handling

- **Database unavailability:** Checked at the start of every API route with `checkDatabaseAvailability()`
- **Authentication:** Returns 401 if no session
- **Validation:** Zod schema validation returns 400 with detailed error messages
- **Duplicate detection:** Returns 409 on duplicate add
- **Not found:** Returns 404 on delete of non-existent favorite
- **Server errors:** Wrapped with `safeErrorResponse()` to prevent leaking internal details

## Usage Examples

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon_url,
        itemCategory: item.category[0],
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

```tsx
// Displaying the favorites list
function FavoritesList() {
  const { favorites, isLoading } = useFavorites();

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {favorites.map(fav => (
        <li key={fav.id}>{fav.itemName}</li>
      ))}
    </ul>
  );
}
```
