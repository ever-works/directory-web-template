---
id: favorites-api-endpoints
title: Favorites API Endpoints
sidebar_label: Favorites API
sidebar_position: 62
---

# Favorites API Endpoints

The Favorites API allows authenticated users to manage their favorite items. Users can list, add, and remove items from their personal favorites list. Favorite records store item metadata (name, icon, category) for quick display without joining to the items table.

**Source directory:** `template/app/api/favorites/`

---

## Authentication

All favorites endpoints require session-based authentication. Unauthenticated requests receive:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

---

## List User Favorites

Returns all items favorited by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/favorites` |
| **Auth** | Session (user) |
| **Source** | `favorites/route.ts` |

### Response

**Status 200**

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `favorites[].id` | `string` | Favorite record ID |
| `favorites[].userId` | `string` | User who favorited the item |
| `favorites[].itemSlug` | `string` | Item slug identifier |
| `favorites[].itemName` | `string` | Item display name |
| `favorites[].itemIconUrl` | `string \| null` | Item icon URL |
| `favorites[].itemCategory` | `string \| null` | Item category |
| `favorites[].createdAt` | `string` (ISO 8601) | When the item was favorited |
| `favorites[].updatedAt` | `string \| null` | Last update timestamp |

Favorites are ordered by `createdAt` (oldest first).

### curl Example

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Add Favorite

Adds an item to the authenticated user's favorites list.

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/favorites` |
| **Auth** | Session (user) |
| **Source** | `favorites/route.ts` |

### Request Body

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemSlug` | `string` | Yes | Unique item slug identifier (min 1 char) |
| `itemName` | `string` | Yes | Item display name (min 1 char) |
| `itemIconUrl` | `string` | No | Item icon URL |
| `itemCategory` | `string` | No | Item category |

### Responses

**Status 201** -- Favorite added successfully.

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**Status 400** -- Invalid request data.

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

**Status 409** -- Item already in favorites.

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### curl Example

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity"
  }'
```

---

## Remove Favorite

Removes a specific item from the authenticated user's favorites list.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/favorites/{itemSlug}` |
| **Auth** | Session (user) |
| **Source** | `favorites/[itemSlug]/route.ts` |

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemSlug` | `string` | Item slug identifier to remove from favorites |

### Responses

**Status 200** -- Favorite removed successfully.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**Status 404** -- Favorite not found.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### curl Example

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/awesome-productivity-tool \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## TypeScript Usage

```typescript
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl: string | null;
  itemCategory: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// List all favorites
async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  const data = await res.json();
  return data.favorites;
}

// Add to favorites
async function addFavorite(item: {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (res.status === 409) {
    throw new Error('Item is already in favorites');
  }

  const data = await res.json();
  return data.favorite;
}

// Remove from favorites
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('Favorite not found');
  }
}

// Toggle favorite
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite({ itemSlug, itemName });
  }
}
```

### Implementation Notes

- The favorites table uses a compound uniqueness check on `(userId, itemSlug)` to prevent duplicates.
- Item metadata (`itemName`, `itemIconUrl`, `itemCategory`) is stored in the favorites record itself, enabling fast display without additional queries.
- Deletion checks ownership -- a user can only remove favorites they own.
- Database availability is checked at the start of each request via `checkDatabaseAvailability()`.
- Validation errors return Zod error details in the `details` field.
