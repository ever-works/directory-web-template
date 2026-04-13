---
id: admin-users-endpoints
title: نقاط نهاية واجهة برمجة تطبيقات المستخدمين الإداريين
sidebar_label: المستخدمين الإداريين
sidebar_position: 36
---

# نقاط نهاية واجهة برمجة تطبيقات المستخدمين الإداريين

توفر واجهة برمجة تطبيقات المستخدمين نقاط نهاية لإدارة حسابات المستخدمين بما في ذلك الإنشاء والتحديثات وتغييرات الحالة وتعيين الأدوار والأدوات المساعدة للتحقق من الصحة. تتطلب كافة نقاط النهاية مصادقة المسؤول ما لم يُذكر خلاف ذلك.

## المسار الأساسي

```
/api/admin/users
```

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
| -------- | ----------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/users`|المشرف|الحصول على قائمة المستخدمين مقسمة إلى صفحات|
|`POST`|`/api/admin/users`|المشرف|إنشاء مستخدم جديد|
|`GET`|`/api/admin/users/stats`|المشرف|الحصول على إحصائيات المستخدم|
|`POST`|`/api/admin/users/check-email`|المشرف|التحقق من توفر البريد الإلكتروني|
|`POST`|`/api/admin/users/check-username`|المشرف|التحقق من توفر اسم المستخدم|
|`GET`|`/api/admin/users/{id}`|المشرف|الحصول على المستخدم عن طريق الهوية|
|`PUT`|`/api/admin/users/{id}`|المشرف|تحديث المستخدم|
|`DELETE`|`/api/admin/users/{id}`|المشرف|حذف المستخدم|

---

## List Users

```
GET /api/admin/users
```

Returns a paginated list of users with search, filtering, and sorting.

**Query Parameters:**

| Parameter         | Type    | Default  | Description                                              |
| ----------------- | ------- | -------- | -------------------------------------------------------- |
| `page`            | integer | `1`      | Page number (minimum: 1)                                  |
| `limit`           | integer | `10`     | Results per page (1--100)                                 |
| `search`          | string  | --       | Search by name, email, or username (max 100 chars)        |
| `role`            | string  | --       | Filter by role ID (max 50 chars)                          |
| `status`          | string  | --       | Filter: `active` or `inactive`                            |
| `sortBy`          | string  | `name`   | Sort field: `name`, `username`, `email`, `role`, `created_at` |
| `sortOrder`       | string  | `asc`    | Sort direction: `asc` or `desc`                           |
| `includeInactive` | boolean | `false`  | Include inactive users in results                         |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "user_123abc",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "title": "Senior Developer",
      "avatar": "https://example.com/avatars/john.jpg",
      "role": "admin",
      "status": "active",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z",
      "last_login": "2024-01-20T16:20:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## إنشاء مستخدم

```
POST /api/admin/users
```

إنشاء مستخدم جديد مع التحقق الشامل. يجب أن يكون الدور موجودًا في النظام (يتم التحقق من صحته مقابل جدول الأدوار).

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| ---------- | ------ | -------- | ---------------------------------------------------------- |
|`username`|سلسلة|نعم|3--30 حرفًا، أبجدية رقمية بالإضافة إلى `-` و`_`|
|`email`|سلسلة|نعم|تنسيق بريد إلكتروني صالح|
|`name`|سلسلة|نعم|الاسم الكامل (2-100 حرف)|
|`password`|سلسلة|نعم|الحد الأدنى 8 أحرف (تم التحقق من صحتها بواسطة Zod `passwordSchema`)|
|`role`|سلسلة|نعم|يجب أن يشير إلى معرف الدور الموجود|
|`title`|سلسلة|لا|المسمى الوظيفي (الحد الأقصى 100 حرف)|
|`avatar`|سلسلة|لا|عنوان URL للصورة الرمزية (500 حرف كحد أقصى)|

**مثال:**

```json
{
  "username": "johndoe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "password": "SecurePass123!",
  "role": "admin",
  "title": "Senior Developer",
  "avatar": "https://example.com/avatars/john.jpg"
}
```

**الرد (201):**

```json
{
  "success": true,
  "data": {
    "id": "user_123abc",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "admin",
    "status": "active",
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## Get User Statistics

```
GET /api/admin/users/stats
```

Returns comprehensive statistics for the admin dashboard.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "totalUsers": 1247,
    "activeUsers": 1156,
    "inactiveUsers": 91,
    "recentRegistrations": 67,
    "roleDistribution": {
      "admin": 5,
      "moderator": 23,
      "user": 1219
    },
    "averageLoginFrequency": 12.5,
    "topActiveUsers": [
      {
        "id": "user_123abc",
        "username": "johndoe",
        "name": "John Doe",
        "loginCount": 45,
        "lastLogin": "2024-01-20T16:20:00.000Z"
      }
    ]
  }
}
```

---

## التحقق من توفر البريد الإلكتروني

```
POST /api/admin/users/check-email
```

التحقق مما إذا كان عنوان البريد الإلكتروني قيد الاستخدام بالفعل. يدعم معلمة `excludeId` لسيناريوهات التحديث حيث يجب استبعاد البريد الإلكتروني للمستخدم الحالي من التحقق المكرر.

**نص الطلب:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**الرد (200):**

```json
{ "available": true, "exists": false }
```

---

## Check Username Availability

```
POST /api/admin/users/check-username
```

Checks whether a username is already in use. Same `excludeId` pattern as email check.

**Request Body:**

```json
{
  "username": "johndoe",
  "excludeId": "user_123abc"
}
```

**Response (200):**

```json
{ "available": false, "exists": true }
```

---

## الحصول على / تحديث / حذف المستخدم

### احصل على المستخدم

```
GET /api/admin/users/{id}
```

إرجاع معلومات الملف الشخصي الكاملة لمستخدم واحد.

### تحديث المستخدم

```
PUT /api/admin/users/{id}
```

تحديث جزئي - يتم تعديل الحقول المتوفرة فقط. التحقق من صحة تنسيق البريد الإلكتروني، وطول اسم المستخدم (3--50)، وطول الاسم (2--100)، وأن الدور موجود في النظام.

**نص الطلب (جميع الحقول اختيارية):**

```json
{
  "username": "johndoe_updated",
  "email": "john.updated@example.com",
  "name": "John Updated Doe",
  "title": "Lead Developer",
  "avatar": "https://example.com/avatars/john_new.jpg",
  "role": "moderator",
  "status": "active"
}
```

### حذف المستخدم

```
DELETE /api/admin/users/{id}
```

يحذف المستخدم نهائيًا. يتضمن حارسًا للحذف الذاتي: لا يمكن للمسؤول حذف حسابه الخاص.

**الرد (200):**

```json
{ "success": true, "message": "User deleted successfully" }
```

---

## Validation Rules

| Field      | Rule                                                        |
| ---------- | ----------------------------------------------------------- |
| `username` | 3--30 chars; regex `^[a-zA-Z0-9_-]{3,30}$` (create), 3--50 chars (update) |
| `email`    | Valid email format via `isValidEmail` utility                |
| `name`     | 2--100 characters                                           |
| `password` | Minimum 8 characters; validated by Zod `passwordSchema`     |
| `role`     | Must reference an existing role in the database              |
| `status`   | Must be `active` or `inactive`                              |
| `title`    | Maximum 100 characters                                      |
| `avatar`   | Maximum 500 characters                                      |

## Error Codes

| Status | Meaning                                           |
| ------ | ------------------------------------------------- |
| `400`  | Validation error, self-deletion, duplicate email/username |
| `401`  | Authentication required                            |
| `403`  | Admin privileges required                          |
| `404`  | User not found                                     |
| `500`  | Internal server error                              |

## Related Documentation

- [Admin Roles API](./admin-roles-endpoints.md) -- manage roles assigned to users
- [Authentication](../architecture/nextauth-configuration.md) -- session management and guards
- [Admin Clients API](./admin-clients-endpoints.md) -- client profile management
