---
id: favorites-api-endpoints
title: מועדפים API Endpoints
sidebar_label: API של מועדפים
sidebar_position: 62
---

# מועדפים API Endpoints

ה-API של מועדפים מאפשר למשתמשים מאומתים לנהל את הפריטים המועדפים עליהם. משתמשים יכולים לרשום, להוסיף ולהסיר פריטים מרשימת המועדפים האישית שלהם. רשומות מועדפות מאחסנות מטא נתונים של פריט (שם, סמל, קטגוריה) לתצוגה מהירה מבלי להצטרף לטבלת הפריטים.

**ספריית מקור:** `template/app/api/favorites/`

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

## רשימת מועדפים של משתמשים

מחזירה את כל הפריטים המועדפים על ידי המשתמש המאומת.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`GET`|
|**נתיב**|`/api/favorites`|
|**אישור**|הפעלה (משתמש)|
|**מקור**|`favorites/route.ts`|

### תגובה

**סטטוס 200**

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

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`favorites[].id`|`string`|מזהה רשומה מועדפת|
|`favorites[].userId`|`string`|משתמש שהעדיף את הפריט|
|`favorites[].itemSlug`|`string`|מזהה שבלול פריט|
|`favorites[].itemName`|`string`|שם תצוגה של פריט|
|`favorites[].itemIconUrl`|`מחרוזת \|null`|כתובת האתר של סמל הפריט|
|`favorites[].itemCategory`|`מחרוזת \|null`|קטגוריית פריטים|
|`favorites[].createdAt`|`string` (ISO 8601)|מתי הפריט היה מועדף|
|`favorites[].updatedAt`|`מחרוזת \|null`|חותמת זמן של עדכון אחרון|

המועדפים מסודרים לפי `createdAt` (הישן ביותר ראשון).

### תלתל דוגמה

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

## הסר מועדף

מסיר פריט ספציפי מרשימת המועדפים של המשתמש המאומת.

|רכוש|ערך|
|----------|-------|
|**שיטה**|`DELETE`|
|**נתיב**|`/api/favorites/{itemSlug}`|
|**אישור**|הפעלה (משתמש)|
|**מקור**|`favorites/[itemSlug]/route.ts`|

### פרמטרי נתיב

|פרמטר|הקלד|תיאור|
|-----------|------|-------------|
|`itemSlug`|`string`|מזהה שבלול פריט להסרה מהמועדפים|

### תגובות

**סטטוס 200** -- המועדף הוסר בהצלחה.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**סטטוס 404** -- מועדף לא נמצא.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### תלתל דוגמה

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
