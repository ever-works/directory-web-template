---
id: admin-roles-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات أدوار المشرف
sidebar_label: أدوار المشرف
sidebar_position: 35
---

# نقاط نهاية واجهة برمجة تطبيقات أدوار المشرف

توفر واجهة API الأدوار نقاط نهاية لإدارة أدوار المستخدم والأذونات المرتبطة بها. تتحكم الأدوار في مستويات الوصول عبر التطبيق ويمكن تعيينها للمستخدمين من خلال [Admin Users API](./admin-users-endpoints.md).

## المسار الأساسي

```
/api/admin/roles
```

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
| -------- | --------------------------------- | -------- | ------------------------------------ |
|`GET`|`/api/admin/roles`|المشرف|الحصول على قائمة الأدوار مرقّمة الصفحات|
|`POST`|`/api/admin/roles`|المشرف|إنشاء دور جديد|
|`GET`|`/api/admin/roles/active`|عام|احصل على جميع الأدوار النشطة|
|`GET`|`/api/admin/roles/stats`|المشرف|الحصول على إحصائيات الدور|
|`GET`|`/api/admin/roles/{id}`|المشرف|احصل على دور واحد عن طريق المعرف|
|`PUT`|`/api/admin/roles/{id}`|المشرف|تحديث الدور|
|`DELETE`|`/api/admin/roles/{id}`|المشرف|حذف دور (ناعم أو صعب)|
|`GET`|`/api/admin/roles/{id}/permissions`|المشرف|الحصول على أذونات للدور|
|`PUT`|`/api/admin/roles/{id}/permissions`|المشرف|تحديث الأذونات للدور|

---

## List Roles

```
GET /api/admin/roles
```

Returns a paginated list of roles with optional filtering and sorting.

**Query Parameters:**

| Parameter   | Type    | Default  | Description                                   |
| ----------- | ------- | -------- | --------------------------------------------- |
| `page`      | integer | `1`      | Page number (minimum: 1)                       |
| `limit`     | integer | `10`     | Results per page (1--100)                      |
| `status`    | string  | --       | Filter by `active` or `inactive`               |
| `sortBy`    | string  | `name`   | Sort field: `name`, `id`, `created_at`         |
| `sortOrder` | string  | `asc`    | Sort direction: `asc` or `desc`                |

**Response (200):**

```json
{
  "success": true,
  "roles": [
    {
      "id": "admin",
      "name": "Administrator",
      "description": "Full system administrator with all permissions",
      "status": "active",
      "isAdmin": true,
      "permissions": ["users.read", "users.write", "roles.read", "roles.write"],
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

---

## إنشاء دور

```
POST /api/admin/roles
```

يخلق دورا جديدا. يتم إنشاء معرف الدور تلقائيًا من الاسم عن طريق التسوية وإزالة علامات التشكيل والتحويل إلى ارتباط ثابت آمن لعنوان URL (64 حرفًا كحد أقصى). يتم رفض الأسماء المكررة (بما في ذلك السجلات المحذوفة مبدئيًا).

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| ------------- | ------- | -------- | ---------------------------------- |
|`name`|سلسلة|نعم|اسم الدور (3--100 حرف)|
|`description`|سلسلة|نعم|وصف الدور (بحد أقصى 500 حرف)|
|`status`|سلسلة|لا|`active` (افتراضي) أو `inactive`|
|`isAdmin`|منطقية|لا|علامة امتيازات المسؤول (الافتراضي: `false`)|

**مثال:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**الرد (201):**

```json
{
  "success": true,
  "data": {
    "id": "content-moderator",
    "name": "Content Moderator",
    "description": "Responsible for moderating user-generated content",
    "status": "active",
    "isAdmin": false,
    "permissions": [],
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Role created successfully"
}
```

---

## Get Active Roles

```
GET /api/admin/roles/active
```

Returns all roles with `active` status. Commonly used to populate role dropdowns in user management forms. No authentication required.

**Response (200):**

```json
{
  "roles": [
    { "id": "admin", "name": "Administrator", "status": "active", "isAdmin": true, "permissions": [...] },
    { "id": "moderator", "name": "Moderator", "status": "active", "isAdmin": false, "permissions": [...] }
  ]
}
```

---

## احصل على إحصائيات الدور

```
GET /api/admin/roles/stats
```

إرجاع إحصائيات مجمعة حول الأدوار. يتطلب جلسة المشرف.

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "averagePermissions": 4.2
  }
}
```

---

## Get / Update / Delete Role

### Get Role

```
GET /api/admin/roles/{id}
```

Returns full details for a single role including permissions, status, and timestamps.

### Update Role

```
PUT /api/admin/roles/{id}
```

Partial update -- only provided fields are changed. Validates name length (3--100) and description length (max 500).

**Request Body (all fields optional):**

```json
{
  "name": "Senior Moderator",
  "description": "Senior content moderator with enhanced permissions",
  "status": "active",
  "isAdmin": false
}
```

### Delete Role

```
DELETE /api/admin/roles/{id}?hard=false
```

| Parameter | Type   | Default | Description                              |
| --------- | ------ | ------- | ---------------------------------------- |
| `hard`    | string | `false` | `true` for permanent removal, `false` for soft delete (marks inactive) |

---

## أذونات الدور

### احصل على الأذونات

```
GET /api/admin/roles/{id}/permissions
```

إرجاع مصفوفة الأذونات وبيانات تعريف الدور الأساسي.

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### تحديث الأذونات

```
PUT /api/admin/roles/{id}/permissions
```

يستبدل مجموعة الأذونات بأكملها. يتم التحقق من صحة كل سلسلة إذن مقابل تعريفات إذن النظام. يتم إرجاع أذونات غير صالحة في استجابة الخطأ.

**نص الطلب:**

```json
{
  "permissions": ["users.read", "items.read", "items.moderate", "comments.moderate"]
}
```

---

## Validation Rules

| Field         | Rule                                                    |
| ------------- | ------------------------------------------------------- |
| `name`        | 3--100 characters; used to derive a unique slug ID      |
| `description` | Maximum 500 characters                                  |
| `status`      | Must be `active` or `inactive`                          |
| `permissions` | Array of strings; each must be a valid system permission |

## Error Codes

| Status | Meaning                                          |
| ------ | ------------------------------------------------ |
| `400`  | Validation error (invalid params, missing fields) |
| `401`  | Authentication required                           |
| `403`  | Admin privileges required                         |
| `404`  | Role not found                                    |
| `409`  | Duplicate role name / ID conflict                 |
| `500`  | Internal server error                             |

## Related Documentation

- [Admin Users API](./admin-users-endpoints.md) -- assign roles to users
- [Authentication](../architecture/nextauth-configuration.md) -- session and admin guard details
- [Permissions System](../architecture/permissions-system.md) -- permission definitions and validation
