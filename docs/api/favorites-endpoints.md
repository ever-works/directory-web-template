---
id: favorites-endpoints
title: "Favorites API Endpoints"
sidebar_label: "Favorites"
sidebar_position: 13
---

# Favorites API Endpoints

The Favorites API allows authenticated users to manage their personal list of favorite items. Each favorite stores item metadata (name, icon, category) for quick display without requiring a join to the content layer.

**Source files:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/favorites` | Session | List all favorites for the current user |
| POST | `/api/favorites` | Session | Add an item to favorites |
| DELETE | `/api/favorites/{itemSlug}` | Session | Remove an item from favorites |

All endpoints require an authenticated user session and a working database connection (checked via `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Returns all items favorited by the authenticated user, ordered by creation date (oldest first).

### Request

No query parameters or body required. Authentication is provided via session cookie.

### Response Shape

#### 200 -- Success

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

#### 401 -- Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Server Error

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Adds an item to the authenticated user's favorites. Includes duplicate checking to prevent adding the same item twice.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemSlug` | string | **Yes** | Unique item slug identifier |
| `itemName` | string | **Yes** | Item display name |
| `itemIconUrl` | string | No | URL to the item's icon |
| `itemCategory` | string | No | Category name for the item |

The request body is checked by `validateFavoriteInput` (`apps/web/lib/validations/favorite.ts`).
The body must be a JSON object. Every string is trimmed, then checked:

| Field | Rule |
|-------|------|
| `itemSlug` | Required, non-blank string, at most 200 characters |
| `itemName` | Required, non-blank string, at most 300 characters |
| `itemIconUrl` | Optional string, at most 2048 characters; absent, `null` or blank means "not set" |
| `itemCategory` | Optional string, at most 200 characters; absent, `null` or blank means "not set" |

No field may contain a NUL character.

### Request Example

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Response Shape

#### 201 -- Created

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

#### 400 -- Validation Error

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required"
}
```

A body that breaks the rules above answers `400` with this shape; `details` names the first field
that failed. A body that is not valid JSON answers `400` with
`{ "success": false, "error": "Invalid JSON body" }`.

#### 401 -- Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflict (Duplicate)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Duplicate Detection

Before inserting, the handler checks for an existing favorite with the same user and item slug:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

Two adds of the same item can both pass this check (a double click). The insert uses
`onConflictDoNothing()` against the `(userId, itemSlug)` unique index, and an insert that returns
no row also answers `409`, instead of a `500` from the unique violation.

---

## DELETE `/api/favorites/{itemSlug}`

Removes a specific item from the authenticated user's favorites list.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itemSlug` | string | **Yes** | The slug of the item to remove |

### Response Shape

#### 200 -- Successfully Removed

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- Unauthorized

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- Not Found

Returned when the favorite does not exist or does not belong to the current user:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### How It Works

The handler verifies ownership before deleting. It first queries for a matching favorite owned by the current user, then deletes only if found:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Usage Example (Full Workflow)

```ts
// 1. List current favorites
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Add a new favorite
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();

// 3. Remove a favorite
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Database Requirements

- Requires the `favorites` table to exist in the database schema.
- `checkDatabaseAvailability()` is called at the start of each handler.
- Error responses use `safeErrorResponse` to avoid leaking internal details.

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/favorites/route.ts` | GET (list) and POST (add) handlers |
| `template/app/api/favorites/[itemSlug]/route.ts` | DELETE handler |
| `template/lib/db/schema.ts` | `favorites` table definition |
| `template/lib/utils/database-check.ts` | Database availability check |
| `template/lib/utils/api-error.ts` | Safe error response utility |
