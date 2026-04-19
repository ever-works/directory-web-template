---
id: favorites-endpoints
title: "نقاط نهاية API المفضلة"
sidebar_label: "المفضلة"
sidebar_position: 13
---

# نقاط نهاية API المفضلة

تسمح واجهة API المفضلة للمستخدمين المعتمدين بإدارة قائمتهم الشخصية من العناصر المفضلة. يقوم كل عنصر مفضل بتخزين البيانات التعريفية (الاسم والأيقونة والفئة) للعرض السريع دون الحاجة إلى الانضمام إلى طبقة المحتوى.

**الملفات المصدرية:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## ملخص نقطة النهاية

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|احصل على|`/api/favorites`|جلسة|قائمة بجميع المفضلة للمستخدم الحالي|
|بريد|`/api/favorites`|جلسة|إضافة عنصر إلى المفضلة|
|حذف|`/api/favorites/{itemSlug}`|جلسة|إزالة عنصر من المفضلة|

تتطلب جميع نقاط النهاية جلسة مستخدم تمت مصادقتها واتصالاً بقاعدة بيانات عاملة (يتم التحقق عبر `checkDatabaseAvailability`).

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

## نشر `/api/favorites`

إضافة عنصر إلى مفضلات المستخدم المصادق عليه. يتضمن فحصًا مكررًا لمنع إضافة نفس العنصر مرتين.

### هيئة الطلب

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`itemSlug`|سلسلة|** نعم **|معرف سبيكة العنصر الفريد|
|`itemName`|سلسلة|** نعم **|اسم عرض العنصر|
|`itemIconUrl`|سلسلة|لا|عنوان URL لرمز العنصر|
|`itemCategory`|سلسلة|لا|اسم الفئة للعنصر|

يتم التحقق من صحة نص الطلب باستخدام مخطط Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### طلب مثال

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### شكل الاستجابة

#### 201--منشأ

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

#### 400--خطأ في التحقق

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 - غير مصرح به

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- الصراع (مكرر)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### كشف التكرارات

قبل الإدراج، يتحقق المعالج من وجود مفضلة موجودة بنفس المستخدم والعنصر الثابت:

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

## مثال الاستخدام (سير العمل الكامل)

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

## متطلبات قاعدة البيانات

- يتطلب وجود الجدول `favorites` في مخطط قاعدة البيانات.
- يتم استدعاء `checkDatabaseAvailability()` في بداية كل معالج.
- تستخدم استجابات الخطأ `safeErrorResponse` لتجنب تسرب التفاصيل الداخلية.

## ملفات المصدر ذات الصلة

|ملف|الغرض|
|------|---------|
|`template/app/api/favorites/route.ts`|معالجات GET (قائمة) وPOST (إضافة).|
|`template/app/api/favorites/[itemSlug]/route.ts`|حذف المعالج|
|`template/lib/db/schema.ts`|`favorites` تعريف الجدول|
|`template/lib/utils/database-check.ts`|التحقق من توافر قاعدة البيانات|
|`template/lib/utils/api-error.ts`|أداة الاستجابة الآمنة للأخطاء|
