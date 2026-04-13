---
id: admin-clients-endpoints
title: نقاط نهاية API لعملاء الإدارة
sidebar_label: عملاء المشرف
sidebar_position: 38
---

# نقاط نهاية API لعملاء الإدارة

توفر واجهة برمجة تطبيقات العملاء نقاط نهاية لإدارة ملفات تعريف العملاء بما في ذلك الإنشاء والتحديثات والبحث المتقدم والعمليات المجمعة وتحليلات لوحة المعلومات والإحصائيات الشاملة. يمثل العملاء ملفات تعريف المستخدم النهائي المرتبطة بحسابات المصادقة. تتطلب كافة نقاط النهاية مصادقة المسؤول.

## المسار الأساسي

```
/api/admin/clients
```

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
| -------- | --------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/clients`|المشرف|الحصول على قائمة عملاء مرقّمة الصفحات|
|`POST`|`/api/admin/clients`|المشرف|إنشاء ملف تعريف عميل جديد|
|`GET`|`/api/admin/clients/stats`|المشرف|احصل على إحصائيات شاملة للعملاء|
|`GET`|`/api/admin/clients/dashboard`|المشرف|احصل على بيانات لوحة القيادة المجمعة|
|`GET`|`/api/admin/clients/advanced-search`|المشرف|بحث متقدم متعدد التصفية|
|`PUT`|`/api/admin/clients/bulk`|المشرف|تحديث ملفات تعريف العملاء بشكل جماعي|
|`DELETE`|`/api/admin/clients/bulk`|المشرف|حذف ملفات تعريف العملاء بشكل جماعي|
|`GET`|`/api/admin/clients/{clientId}`|المشرف|الحصول على العميل عن طريق الهوية|
|`PUT`|`/api/admin/clients/{clientId}`|المشرف|تحديث الملف الشخصي للعميل|
|`DELETE`|`/api/admin/clients/{clientId}`|المشرف|حذف ملف تعريف العميل|

---

## List Clients

```
GET /api/admin/clients
```

Returns a paginated list of client profiles with basic filtering.

**Query Parameters:**

| Parameter     | Type    | Default | Description                                            |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page`        | integer | `1`     | Page number (minimum: 1)                                |
| `limit`       | integer | `10`    | Results per page (1--100)                               |
| `search`      | string  | --      | Search by name or email                                 |
| `status`      | string  | --      | Filter: `active`, `inactive`, `suspended`, `trial`      |
| `plan`        | string  | --      | Filter: `free`, `standard`, `premium`                   |
| `accountType` | string  | --      | Filter: `individual`, `business`, `enterprise`          |
| `provider`    | string  | --      | Filter by authentication provider                       |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## إنشاء عميل

```
POST /api/admin/clients
```

يقوم بإنشاء ملف تعريف عميل جديد. إذا لم يكن هناك حساب مستخدم للبريد الإلكتروني المقدم، فسيتم إنشاء مستخدم جديد تلقائيًا بكلمة مرور مؤقتة. يقوم بتشغيل مزامنة CRM عند تمكينها.

**نص الطلب:**

|الميدان|اكتب|مطلوب|الوصف|
| ---------------- | ------- | -------- | -------------------------------------------- |
|`email`|سلسلة|نعم|عنوان البريد الإلكتروني للعميل|
|`displayName`|سلسلة|لا|اسم العرض (الإعدادات الافتراضية لبادئة البريد الإلكتروني)|
|`username`|سلسلة|لا|اسم مستخدم فريد|
|`bio`|سلسلة|لا|سيرة العميل|
|`jobTitle`|سلسلة|لا|المسمى الوظيفي|
|`company`|سلسلة|لا|اسم الشركة|
|`industry`|سلسلة|لا|قطاع الصناعة|
|`phone`|سلسلة|لا|رقم الهاتف|
|`website`|سلسلة|لا|عنوان URL لموقع الويب|
|`location`|سلسلة|لا|الموقع|
|`accountType`|سلسلة|لا|`individual` (افتراضي)، `business`، `enterprise`|
|`status`|سلسلة|لا|`active` (افتراضي)، `inactive`، `suspended`، `trial`|
|`plan`|سلسلة|لا|`free` (افتراضي)، `standard`، `premium`|

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Get Client Statistics

```
GET /api/admin/clients/stats
```

Returns comprehensive analytics across all clients, grouped by overview, growth, plans, account types, engagement, demographics, and authentication providers.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## لوحة القيادة

```
GET /api/admin/clients/dashboard
```

إرجاع استجابة مجمعة مع قائمة عملاء مقسمة إلى صفحات وإحصائيات مجمعة وبيانات تعريف مقسمة إلى صفحات. يدعم جميع المرشحات الأساسية بالإضافة إلى معلمات النطاق الزمني.

**معلمات الاستعلام (بالإضافة إلى معلمات القائمة):**

|المعلمة|اكتب|الوصف|
| --------------- | ------ | ------------------------------------------ |
|`createdAfter`|سلسلة|تاريخ ISO أو `YYYY-MM-DD` - تم إنشاؤه بعد ذلك|
|`createdBefore`|سلسلة|تاريخ ISO أو `YYYY-MM-DD` - تم إنشاؤه من قبل|

---

## Advanced Search

```
GET /api/admin/clients/advanced-search
```

Performs a multi-dimensional search across client profiles. In addition to the basic list filters, supports field-specific searches, numeric ranges, boolean flags, and date ranges. Returns search metadata including applied filters and execution time.

**Additional Query Parameters:**

| Parameter          | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy`           | string  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | string  | `asc` or `desc`                                |
| `createdAfter`     | string  | ISO date-time filter                           |
| `createdBefore`    | string  | ISO date-time filter                           |
| `emailDomain`      | string  | Filter by email domain (e.g., `example.com`)   |
| `companySearch`    | string  | Search within company names                    |
| `locationSearch`   | string  | Search within locations                        |
| `industrySearch`   | string  | Search within industries                       |
| `minSubmissions`   | integer | Minimum submission count                       |
| `maxSubmissions`   | integer | Maximum submission count                       |
| `emailVerified`    | boolean | Filter by email verification status            |
| `twoFactorEnabled` | boolean | Filter by 2FA status                          |
| `hasAvatar`        | boolean | Filter clients with/without avatar             |
| `hasWebsite`       | boolean | Filter clients with/without website            |
| `hasPhone`         | boolean | Filter clients with/without phone              |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## العمليات السائبة

### تحديث بالجملة

```
PUT /api/admin/clients/bulk
```

يقوم بتحديث ملفات تعريف العملاء المتعددة في طلب واحد. يجب أن يتضمن كل كائن عميل حقل `id` بالإضافة إلى الحقول المطلوب تحديثها. لا تؤدي حالات الفشل الفردية إلى إحباط الدفعة بأكملها.

**نص الطلب:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### حذف بالجملة

```
DELETE /api/admin/clients/bulk
```

يحذف ملفات تعريف العملاء المتعددة بشكل دائم. يجب أن يتضمن كل كائن في المصفوفة حقلاً `id`.

**نص الطلب:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**الاستجابة (200) - كلا نقطتي النهاية المجمعتين:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Client

### Get Client

```
GET /api/admin/clients/{clientId}
```

Returns the complete client profile including display name, company, plan, account type, and activity timestamps.

### Update Client

```
PUT /api/admin/clients/{clientId}
```

Partial update -- only provided fields are modified. Triggers CRM sync when company or profile data changes.

**Request Body (all fields optional):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Delete Client

```
DELETE /api/admin/clients/{clientId}
```

Permanently deletes a client profile. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## قواعد التحقق من الصحة

|الميدان|القاعدة|
| ------------- | ---------------------------------------------------------- |
|`email`|مطلوب للخلق. تنسيق بريد إلكتروني صالح|
|`status`|يجب أن يكون `active` أو `inactive` أو `suspended` أو `trial`|
|`plan`|يجب أن يكون `free` أو `standard` أو `premium`|
|`accountType`|يجب أن يكون `individual` أو `business` أو `enterprise`|
|`clients`|مجمع: صفيف غير فارغ مع `id` مطلوب لكل كائن|

## رموز الخطأ

|الحالة|معنى|
| ------ | ------------------------------------------------------ |
| `400`  |خطأ في التحقق من الصحة، بريد إلكتروني مفقود، فشل إنشاء المستخدم|
| `401`  |المصادقة مطلوبة|
| `403`  |امتيازات المسؤول المطلوبة|
| `404`  |لم يتم العثور على العميل|
| `500`  |خطأ داخلي في الخادم|

## الوثائق ذات الصلة

- [واجهة برمجة تطبيقات المستخدمين الإداريين](./admin-users-endpoints.md) - إدارة حساب المستخدم
- [واجهة برمجة تطبيقات أدوار المشرف](./admin-roles-endpoints.md) - إدارة الأدوار والأذونات
- [المصادقة](../architecture/nextauth-configuration.md) - إدارة الجلسة والحراس
