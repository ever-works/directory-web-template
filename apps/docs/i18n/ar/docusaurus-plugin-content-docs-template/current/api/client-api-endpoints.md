---
id: client-api-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات العميل
sidebar_label: واجهة برمجة تطبيقات العميل
sidebar_position: 58
---

# نقاط نهاية واجهة برمجة تطبيقات العميل

توفر Client API نقاط نهاية موثقة للمستخدمين المسجلين لإدارة العناصر المرسلة وعرض إحصائيات لوحة المعلومات والوصول إلى البيانات الجغرافية. تتطلب كافة نقاط النهاية المصادقة المستندة إلى الجلسة عبر `requireClientAuth()`.

** دليل المصدر: ** `template/app/api/client/`

---

## Authentication

Every endpoint in this group requires a valid user session. Unauthenticated requests receive:

**Status 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## إحصائيات لوحة القيادة

### احصل على إحصائيات لوحة التحكم

إرجاع إحصائيات لوحة التحكم الشاملة للمستخدم المصادق عليه.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`GET`|
|**المسار**|`/api/client/dashboard/stats`|
|**المصادقة**|الجلسة (المستخدم)|
|**المصدر**|`client/dashboard/stats/route.ts`|

#### الاستجابة

**الحالة 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

#### مثال الضفيرة

```bash
curl -s http://localhost:3000/api/client/dashboard/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Geographic Stats

Returns geographic coverage statistics for the authenticated user's items.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/geo-stats` |
| **Auth** | Session (user) |
| **Source** | `client/geo-stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/geo-stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### الحصول على إحداثيات العنصر

إرجاع الإحداثيات لجميع عناصر المستخدم التي تحتوي على بيانات الموقع، المناسبة لعرض الخريطة.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`GET`|
|**المسار**|`/api/client/items/coordinates`|
|**المصادقة**|الجلسة (المستخدم)|
|**المصدر**|`client/items/coordinates/route.ts`|

#### الاستجابة

**الحالة 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

#### مثال الضفيرة

```bash
curl -s http://localhost:3000/api/client/items/coordinates \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## Items Management

### List User Items

Returns a paginated list of items submitted by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items` |
| **Auth** | Session (user) |
| **Source** | `client/items/route.ts` |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `integer` | No | `1` | Page number (min: 1) |
| `limit` | `integer` | No | `10` | Items per page (1-100) |
| `status` | `string` | No | -- | Filter: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | No | -- | Search by item name or description |
| `sortBy` | `string` | No | -- | Sort field |
| `sortOrder` | `string` | No | -- | Sort direction |
| `deleted` | `boolean` | No | `false` | If `true`, returns soft-deleted items |

#### Response

**Status 200**

```json
{
  "success": true,
  "items": [ /* item objects */ ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
# List approved items, page 2
curl -s "http://localhost:3000/api/client/items?status=approved&page=2&limit=10" \
  -H "Cookie: next-auth.session-token=<session_token>"

# Search for items
curl -s "http://localhost:3000/api/client/items?search=productivity" \
  -H "Cookie: next-auth.session-token=<session_token>"

# List deleted items
curl -s "http://localhost:3000/api/client/items?deleted=true" \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### إنشاء عنصر

إنشاء إرسال عنصر جديد. تم تعيين العنصر على حالة `pending` لمراجعة المسؤول.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`POST`|
|**المسار**|`/api/client/items`|
|**المصادقة**|الجلسة (المستخدم)|
|**المصدر**|`client/items/route.ts`|

#### هيئة الطلب

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

|الميدان|اكتب|مطلوب|الوصف|
|-------|------|----------|-------------|
|`name`|`string`|نعم|اسم العنصر (3-100 حرف)|
|`description`|`string`|نعم|وصف العنصر (10-500 حرف)|
|`source_url`|`string` (URI)|نعم|عنوان URL/الرابط الرئيسي للعنصر|
|`category`|`سلسلة \|سلسلة []`|لا|اسم الفئة أو مجموعة من الفئات|
|`tags`|`string[]`|لا|مجموعة من سلاسل العلامات|
|`icon_url`|`string` (URI)|لا|عنوان URL لرمز العنصر|

#### الاستجابة

**الحالة 201**

```json
{
  "success": true,
  "item": { /* created item object */ },
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

**الحالة 400**--خطأ في التحقق

```json
{
  "success": false,
  "error": "Name must be at least 3 characters"
}
```

#### مثال الضفيرة

```bash
curl -s -X POST http://localhost:3000/api/client/items \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{
    "name": "Awesome Tool",
    "description": "A great productivity tool that helps teams collaborate effectively.",
    "source_url": "https://example.com",
    "category": "Productivity",
    "tags": ["collaboration"]
  }'
```

---

### Get Single Item

Returns details of a specific item owned by the authenticated user.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Item ID |

#### Response

**Status 200**

```json
{
  "success": true,
  "item": { /* item object */ },
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Status | Description |
|--------|-------------|
| 400 | Invalid item ID |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### تحديث العنصر

يقوم بتحديث عنصر يملكه المستخدم المصادق عليه. إذا تمت الموافقة على العنصر مسبقًا، فإن تحديثه يغير حالته إلى `pending` لإعادة المراجعة.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`PUT`|
|**المسار**|`/api/client/items/{id}`|
|**المصادقة**|الجلسة (المستخدم، المالك)|
|**المصدر**|`client/items/[id]/route.ts`|

#### هيئة الطلب

جميع الحقول اختيارية. يجب توفير حقل واحد على الأقل.

```json
{
  "name": "Updated Tool Name",
  "description": "Updated description with more details.",
  "source_url": "https://example.com/v2",
  "category": ["Productivity", "Developer Tools"],
  "tags": ["collaboration", "ai"],
  "icon_url": "https://example.com/new-icon.png"
}
```

#### الاستجابة

**الحالة 200**

```json
{
  "success": true,
  "item": { /* updated item object */ },
  "statusChanged": true,
  "previousStatus": "approved",
  "message": "Item updated successfully. Since it was previously approved, it has been moved to pending for re-review."
}
```

|الميدان|اكتب|الوصف|
|-------|------|-------------|
|`statusChanged`|`boolean`|`true` إذا تغيرت الحالة من معتمد إلى معلق|
|`previousStatus`|`string`|حالة العنصر قبل التحديث|

#### مثال الضفيرة

```bash
curl -s -X PUT http://localhost:3000/api/client/items/item_123 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "name": "Updated Tool Name" }'
```

---

### Delete Item (Soft Delete)

Soft-deletes an item owned by the authenticated user. The item is hidden but can be restored later.

| Property | Value |
|----------|-------|
| **Method** | `DELETE` |
| **Path** | `/api/client/items/{id}` |
| **Auth** | Session (user, owner) |
| **Source** | `client/items/[id]/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

| Status | Description |
|--------|-------------|
| 400 | Item is already deleted |
| 401 | Unauthorized |
| 403 | Not the item owner |
| 404 | Item not found |

---

### استعادة العنصر

استعادة عنصر تم حذفه مسبقًا.

|الملكية|القيمة|
|----------|-------|
|** الطريقة **|`POST`|
|**المسار**|`/api/client/items/{id}/restore`|
|**المصادقة**|الجلسة (المستخدم، المالك)|
|**المصدر**|`client/items/[id]/restore/route.ts`|

#### الاستجابة

**الحالة 200**

```json
{
  "success": true,
  "item": { /* restored item object */ },
  "message": "Item restored successfully"
}
```

|الحالة|الوصف|
|--------|-------------|
| 400 |لم يتم حذف العنصر (لا يمكن استعادة عنصر نشط)|
| 401 |غير مصرح به|
| 403 |وليس صاحب المادة|
| 404 |لم يتم العثور على العنصر|

#### مثال الضفيرة

```bash
curl -s -X POST http://localhost:3000/api/client/items/item_123/restore \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Get Submission Statistics

Returns statistics about the authenticated user's submissions grouped by status.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/client/items/stats` |
| **Auth** | Session (user) |
| **Source** | `client/items/stats/route.ts` |

#### Response

**Status 200**

```json
{
  "success": true,
  "stats": {
    "total": 12,
    "draft": 2,
    "pending": 3,
    "approved": 5,
    "rejected": 2,
    "deleted": 1
  }
}
```

#### curl Example

```bash
curl -s http://localhost:3000/api/client/items/stats \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

## استخدام تايب سكريبت

```typescript
import type { ClientCreateItemResponse } from '@/lib/types/client-item';

// Fetch dashboard stats
const dashboardRes = await fetch('/api/client/dashboard/stats');
const dashboard = await dashboardRes.json();

// Create a new item submission
const createRes = await fetch('/api/client/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My New Tool',
    description: 'A detailed description of what this tool does.',
    source_url: 'https://mytool.com',
    category: 'Productivity',
  }),
});
const created: ClientCreateItemResponse = await createRes.json();

// Update an item
const updateRes = await fetch(`/api/client/items/${itemId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Updated Name' }),
});
const updated = await updateRes.json();
if (updated.statusChanged) {
  console.log('Item moved back to pending for re-review');
}
```

## نمط الاستجابة للخطأ

تتبع جميع نقاط نهاية واجهة برمجة تطبيقات العميل شكل خطأ ثابت:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

تستخدم استجابات الأخطاء الأداة المساعدة `serverErrorResponse()`، والتي تقوم بتسجيل معلومات الخطأ التفصيلية من جانب الخادم أثناء إرجاع رسالة عامة فقط إلى العميل لمنع الكشف عن المعلومات.
