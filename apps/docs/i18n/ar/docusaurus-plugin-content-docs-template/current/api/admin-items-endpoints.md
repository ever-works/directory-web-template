---
id: admin-items-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات عناصر الإدارة
sidebar_label: عناصر المشرف
sidebar_position: 37
---

# نقاط نهاية واجهة برمجة تطبيقات عناصر الإدارة

توفر واجهة برمجة تطبيقات العناصر نقاط نهاية لإدارة قوائم الدليل بما في ذلك الإنشاء والتحديثات ومراجعة سير العمل (الموافقة/الرفض) وسجل التدقيق والعمليات المجمعة والإحصائيات. تتقدم العناصر خلال دورة حياة الحالات `draft` و`pending` و`approved` و`rejected`. تتطلب كافة نقاط النهاية مصادقة المسؤول.

## المسار الأساسي

```
/api/admin/items
```

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
| -------- | ------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/items`|المشرف|الحصول على قائمة العناصر المرقّمة|
|`POST`|`/api/admin/items`|المشرف|إنشاء عنصر جديد|
|`GET`|`/api/admin/items/stats`|المشرف|الحصول على إحصائيات البند|
|`POST`|`/api/admin/items/bulk`|المشرف|الموافقة الجماعية أو الرفض أو الحذف|
|`GET`|`/api/admin/items/{id}`|المشرف|الحصول على العنصر عن طريق المعرف|
|`PUT`|`/api/admin/items/{id}`|المشرف|تحديث العنصر|
|`DELETE`|`/api/admin/items/{id}`|المشرف|حذف العنصر نهائيًا|
|`POST`|`/api/admin/items/{id}/review`|المشرف|الموافقة على عنصر أو رفضه|
|`GET`|`/api/admin/items/{id}/history`|المشرف|الحصول على سجل تدقيق العنصر|

---

## List Items

```
GET /api/admin/items
```

Returns a paginated list of items with search, filtering by status/category/tags, and sorting.

**Query Parameters:**

| Parameter    | Type    | Default      | Description                                              |
| ------------ | ------- | ------------ | -------------------------------------------------------- |
| `page`       | integer | `1`          | Page number (minimum: 1)                                  |
| `limit`      | integer | `10`         | Results per page (1--100)                                 |
| `search`     | string  | --           | Search items by name or description                       |
| `status`     | string  | --           | Filter: `draft`, `pending`, `approved`, `rejected`        |
| `categories` | string  | --           | Comma-separated category slugs                            |
| `tags`       | string  | --           | Comma-separated tag slugs                                 |
| `sortBy`     | string  | `updated_at` | Sort field: `name`, `updated_at`, `status`, `submitted_at`|
| `sortOrder`  | string  | `desc`       | Sort direction: `asc` or `desc`                           |

**Response (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## إنشاء عنصر

```
POST /api/admin/items
```

ينشئ عنصرًا جديدًا مع عمليات فحص مكررة على كل من المعرف والحلقة الثابتة. يقوم بتشغيل مزامنة CRM (إذا تم تمكينها) وفهرسة الموقع (إذا تم تمكينها).

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| ------------ | -------- | -------- | ---------------------------------------------- |
|`id`|سلسلة|نعم|معرف العنصر الفريد|
|`name`|سلسلة|نعم|اسم العنصر|
|`slug`|سلسلة|نعم|سبيكة صديقة لعنوان URL (يجب أن تكون فريدة)|
|`description`|سلسلة|نعم|وصف السلعة|
|`source_url`|سلسلة|نعم|عنوان URL المصدر للعنصر|
|`category`|سلسلة []|لا|مجموعة من فئة الرخويات|
|`tags`|سلسلة []|لا|مجموعة من العلامات الرخويات|
|`brand`|سلسلة|لا|اسم العلامة التجارية (يستخدم لمزامنة شركة CRM)|
|`featured`|منطقية|لا|العلامة المميزة (الافتراضي: `false`)|
|`icon_url`|سلسلة|لا|عنوان URL للرمز|
|`status`|سلسلة|لا|الحالة الأولية (الافتراضي: `draft`)|
|`location`|كائن|لا|بيانات الموقع للفهرسة الجغرافية|

**الرد (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Get Item Statistics

```
GET /api/admin/items/stats
```

Returns counts by status. Supports optional filters to scope the statistics.

**Query Parameters:**

| Parameter    | Type   | Description                        |
| ------------ | ------ | ---------------------------------- |
| `search`     | string | Filter stats by search term        |
| `categories` | string | Comma-separated category slugs     |
| `tags`       | string | Comma-separated tag slugs          |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## الإجراءات السائبة

```
POST /api/admin/items/bulk
```

إجراء الموافقة المجمعة أو الرفض أو الحذف لما يصل إلى 100 عنصر. تتم معالجة كل عنصر على حدة؛ لا يؤدي الفشل الجزئي إلى إحباط العملية بأكملها. يرسل إشعارات بالبريد الإلكتروني إلى مقدمي الطلبات بشأن الموافقة/الرفض.

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| -------- | -------- | ------------------ | ---------------------------------------------------- |
|`action`|سلسلة|نعم|`approve`، `reject`، أو `delete`|
|`ids`|سلسلة []|نعم|معرفات العناصر المراد معالجتها (1--100، بدون تكرار)|
|`reason`|سلسلة|نعم (لـ `reject`)|سبب الرفض (الحد الأدنى 10 أحرف)|

**الرد (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Item

### Get Item

```
GET /api/admin/items/{id}
```

Returns complete item details including metadata, categories, tags, review notes, and engagement metrics.

### Update Item

```
PUT /api/admin/items/{id}
```

Partial update -- only provided fields are modified. Triggers CRM sync when `brand` is provided and location re-indexing when location data changes.

**Request Body (all fields optional):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Delete Item

```
DELETE /api/admin/items/{id}
```

Permanently deletes an item and removes it from the location index (if enabled). This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## مراجعة البند

```
POST /api/admin/items/{id}/review
```

يوافق على البند أو يرفضه. يسجل قرار المراجعة مع الملاحظات الاختيارية. يرسل إشعارًا بالبريد الإلكتروني إلى المرسل الأصلي (إذا كان المرسل مستخدمًا مسجلاً).

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| -------------- | ------ | -------- | ------------------------------------ |
|`status`|سلسلة|نعم|`approved` أو `rejected`|
|`review_notes`|سلسلة|لا|شرح قرار المراجعة|

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Get Item Audit History

```
GET /api/admin/items/{id}/history
```

Returns the complete audit trail for an item, including creation, updates, status changes, reviews, deletions, and restorations.

**Query Parameters:**

| Parameter | Type    | Default | Description                                                            |
| --------- | ------- | ------- | ---------------------------------------------------------------------- |
| `page`    | integer | `1`     | Page number                                                             |
| `limit`   | integer | `20`    | Results per page (max 100)                                              |
| `action`  | string  | --      | Comma-separated filter: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## قواعد التحقق من الصحة

|الميدان|القاعدة|
| ------------ | ---------------------------------------------------------- |
|`id`|مطلوب؛ يجب أن تكون فريدة في جميع العناصر|
|`name`|مطلوب للخلق|
|`slug`|مطلوب؛ يجب أن تكون فريدة في جميع العناصر|
|`description`|مطلوب للخلق|
|`source_url`|مطلوب للخلق. تنسيق URL صالح|
|`status`|يجب أن يكون `draft` أو `pending` أو `approved` أو `rejected`|
|`reason`|مطلوبة للرفض بالجملة؛ الحد الأدنى 10 أحرف|
|`ids`|مجمعة: 1--100 سلسلة فريدة غير فارغة|
|`action`|عامل تصفية السجل: أنواع إجراءات التدقيق الصالحة فقط|

## رموز الخطأ

|الحالة|معنى|
| ------ | -------------------------------------------------------- |
| `400`  |خطأ في التحقق من الصحة، معلمات غير صالحة، حقول مفقودة|
| `401`  |المصادقة مطلوبة|
| `403`  |امتيازات المسؤول المطلوبة|
| `404`  |لم يتم العثور على العنصر|
| `409`  |معرف العنصر المكرر أو سبيكة|
| `500`  |خطأ داخلي في الخادم|

## الوثائق ذات الصلة

- [واجهة برمجة تطبيقات أدوار المشرف](./admin-roles-endpoints.md) - إدارة الأدوار المخصصة للمستخدمين
- [واجهة برمجة تطبيقات المستخدمين الإداريين](./admin-users-endpoints.md) - إدارة حساب المستخدم
- [المصادقة](../architecture/nextauth-configuration.md) - إدارة الجلسة والحراس
