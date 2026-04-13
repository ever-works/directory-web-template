---
id: favorites-api-endpoints
title: نقاط نهاية API المفضلة
sidebar_label: واجهة برمجة التطبيقات المفضلة
sidebar_position: 62
---

# نقاط نهاية API المفضلة

تسمح واجهة API المفضلة للمستخدمين المعتمدين بإدارة العناصر المفضلة لديهم. يمكن للمستخدمين إدراج العناصر وإضافتها وإزالتها من قائمة المفضلة الشخصية الخاصة بهم. تقوم السجلات المفضلة بتخزين بيانات تعريف العنصر (الاسم والرمز والفئة) للعرض السريع دون الانضمام إلى جدول العناصر.

** دليل المصدر: ** `template/app/api/favorites/`

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

## قائمة مفضلات المستخدم

إرجاع كافة العناصر المفضلة بواسطة المستخدم المصادق عليه.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`GET`|
|**المسار**|`/api/favorites`|
|**المصادقة**|الجلسة (المستخدم)|
|**المصدر**|`favorites/route.ts`|

### الاستجابة

**الحالة 200**

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

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`favorites[].id`|`string`|معرف السجل المفضل|
|`favorites[].userId`|`string`|المستخدم الذي وضع العنصر في المفضلة|
|`favorites[].itemSlug`|`string`|معرف سبيكة العنصر|
|`favorites[].itemName`|`string`|اسم عرض العنصر|
|`favorites[].itemIconUrl`|`سلسلة \|فارغة`|عنوان URL لرمز العنصر|
|`favorites[].itemCategory`|`سلسلة \|فارغة`|فئة السلعة|
|`favorites[].createdAt`|`string` (آيزو 8601)|عندما تم تفضيل العنصر|
|`favorites[].updatedAt`|`سلسلة \|فارغة`|الطابع الزمني للتحديث الأخير|

يتم ترتيب المفضلة بواسطة `createdAt` (الأقدم أولاً).

### مثال الضفيرة

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

## إزالة المفضلة

إزالة عنصر معين من قائمة المفضلة للمستخدم المصادق عليه.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`DELETE`|
|**المسار**|`/api/favorites/{itemSlug}`|
|**المصادقة**|الجلسة (المستخدم)|
|**المصدر**|`favorites/[itemSlug]/route.ts`|

### معلمات المسار

|المعلمة|اكتب|الوصف|
|-----------|------|-------------|
|`itemSlug`|`string`|معرف سبيكة العنصر المراد إزالته من المفضلة|

### الردود

**الحالة 200** -- تمت إزالة المفضلة بنجاح.

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

**الحالة 404** - لم يتم العثور على المفضلة.

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### مثال الضفيرة

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
