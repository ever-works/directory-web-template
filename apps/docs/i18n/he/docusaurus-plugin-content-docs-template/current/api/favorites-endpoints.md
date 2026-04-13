---
id: favorites-endpoints
title: "מועדפים API Endpoints"
sidebar_label: "מועדפים"
sidebar_position: 13
---

# מועדפים API Endpoints

ה-API של מועדפים מאפשר למשתמשים מאומתים לנהל את רשימת הפריטים המועדפים האישית שלהם. כל מועדף מאחסן מטא נתונים של פריט (שם, אייקון, קטגוריה) לתצוגה מהירה ללא צורך בהצטרפות לשכבת התוכן.

**קבצי מקור:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## סיכום נקודות קצה

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|קבל|`/api/favorites`|מושב|רשום את כל המועדפים עבור המשתמש הנוכחי|
|פוסט|`/api/favorites`|מושב|הוסף פריט למועדפים|
|מחק|`/api/favorites/{itemSlug}`|מושב|הסר פריט מהמועדפים|

כל נקודות הקצה דורשות הפעלה מאומתת של משתמש וחיבור מסד נתונים עובד (נבדק באמצעות `checkDatabaseAvailability`).

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

## פרסם `/api/favorites`

מוסיף פריט למועדפים של המשתמש המאומת. כולל בדיקה כפולה כדי למנוע הוספת אותו פריט פעמיים.

### גוף הבקשה

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`itemSlug`|מחרוזת|**כן**|מזהה שבלול פריט ייחודי|
|`itemName`|מחרוזת|**כן**|שם תצוגה של פריט|
|`itemIconUrl`|מחרוזת|לא|כתובת URL לסמל של הפריט|
|`itemCategory`|מחרוזת|לא|שם הקטגוריה של הפריט|

גוף הבקשה מאומת באמצעות סכימת Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### בקשה לדוגמא

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### צורת תגובה

#### 201 -- נוצר

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

#### 400 - שגיאת אימות

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 - לא מורשה

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- קונפליקט (כפול)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### זיהוי כפול

לפני ההוספה, המטפל בודק אם יש מועדף קיים עם אותו משתמש ושבלול פריט:

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

## דוגמה לשימוש (זרימת עבודה מלאה)

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

## דרישות מסד נתונים

- מחייב שהטבלה `favorites` תתקיים בסכימת מסד הנתונים.
- `checkDatabaseAvailability()` נקרא בתחילת כל מטפל.
- תגובות שגיאה משתמשות ב-`safeErrorResponse` כדי למנוע דליפת פרטים פנימיים.

## קבצי מקור קשורים

|קובץ|מטרה|
|------|---------|
|`template/app/api/favorites/route.ts`|מטפלי GET (רשימה) ו-POST (הוסף).|
|`template/app/api/favorites/[itemSlug]/route.ts`|מחק מטפל|
|`template/lib/db/schema.ts`|`favorites` הגדרת טבלה|
|`template/lib/utils/database-check.ts`|בדיקת זמינות מסד נתונים|
|`template/lib/utils/api-error.ts`|כלי בטוח לתגובת שגיאה|
