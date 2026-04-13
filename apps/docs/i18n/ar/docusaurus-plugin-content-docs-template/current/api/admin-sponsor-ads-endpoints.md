---
id: admin-sponsor-ads-endpoints
title: نقاط نهاية API لإعلانات الراعي الإداري
sidebar_label: إعلانات الراعي الإداري
sidebar_position: 39
---

# نقاط نهاية API لإعلانات الراعي الإداري

توفر Sponsor Ads API نقاط نهاية لإدارة الإعلانات المدعومة بما في ذلك إدراج الإعلانات وعرضها والموافقة عليها ورفضها وإلغائها. تتقدم الإعلانات الداعمة عبر دورة حياة الحالات `pending_payment` و`pending` و`active` و`rejected` و`expired` و`cancelled`. تتطلب كافة نقاط النهاية مصادقة المسؤول.

## المسار الأساسي

```
/api/admin/sponsor-ads
```

## ملخص الطريق

|الطريقة|المسار|مصادقة|الوصف|
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/sponsor-ads`|المشرف|الحصول على قائمة إعلانات الجهات الراعية مقسمة إلى صفحات|
|`GET`|`/api/admin/sponsor-ads/{id}`|المشرف|الحصول على إعلان الراعي عن طريق الهوية|
|`DELETE`|`/api/admin/sponsor-ads/{id}`|المشرف|حذف اعلان الراعي نهائيا|
|`POST`|`/api/admin/sponsor-ads/{id}/approve`|المشرف|الموافقة على إعلان الراعي وتفعيله|
|`POST`|`/api/admin/sponsor-ads/{id}/reject`|المشرف|رفض إعلان الراعي|
|`POST`|`/api/admin/sponsor-ads/{id}/cancel`|المشرف|إلغاء إعلان الراعي|

---

## List Sponsor Ads

```
GET /api/admin/sponsor-ads
```

Returns a paginated list of sponsor ads with optional filtering by status and billing interval. Also returns aggregate statistics for the admin dashboard. Query parameters are validated with Zod.

**Query Parameters:**

| Parameter   | Type    | Default     | Description                                                          |
| ----------- | ------- | ----------- | -------------------------------------------------------------------- |
| `page`      | integer | `1`         | Page number (minimum: 1)                                              |
| `limit`     | integer | `10`        | Results per page (1--100)                                             |
| `status`    | string  | --          | Filter: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval`  | string  | --          | Filter: `weekly` or `monthly`                                         |
| `search`    | string  | --          | Search sponsor ads by text                                            |
| `sortBy`    | string  | `createdAt` | Sort field: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status`|
| `sortOrder` | string  | `desc`      | Sort direction: `asc` or `desc`                                       |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## الحصول على إعلان الراعي

```
GET /api/admin/sponsor-ads/{id}
```

يُرجع إعلانًا راعيًا محددًا بتفاصيل كاملة بما في ذلك معلومات المستخدم المرتبطة.

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Delete Sponsor Ad

```
DELETE /api/admin/sponsor-ads/{id}
```

Permanently deletes a sponsor ad. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## الموافقة على إعلان الراعي

```
POST /api/admin/sponsor-ads/{id}/approve
```

الموافقة على إعلان الراعي وتفعيله. يمكن الموافقة على الإعلانات في حالة `pending` مباشرة. بالنسبة للإعلانات بالحالة `pending_payment`، قم بتعيين `forceApprove` إلى `true` للموافقة دون تأكيد الدفع.

**نص الطلب (اختياري):**

|الميدان|اكتب|مطلوب|الوصف|
| -------------- | ------- | -------- | --------------------------------------------------- |
|`forceApprove`|منطقية|لا|اضبط على `true` للموافقة بدون دفع (لحالة `pending_payment`)|

**مثال:**

```json
{
  "forceApprove": true
}
```

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

** ردود الأخطاء: **

|الحالة|خطأ|الوصف|
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  |`PAYMENT_NOT_RECEIVED`|الإعلان لديه حالة `pending_payment`؛ استخدم `forceApprove`|
| `400`  |`Cannot approve...`|حالة الإعلان لا تسمح بالموافقة|
| `404`  |`Sponsor ad not found`|لا يوجد إعلان بالمعرف المحدد|

---

## Reject Sponsor Ad

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rejects a pending sponsor ad with a mandatory reason. Only ads in `pending` or `pending_payment` status can be rejected. The rejection reason is validated with Zod (`rejectSponsorAdSchema`).

**Request Body:**

| Field             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `rejectionReason` | string | Yes      | Reason for rejection (10--500 characters)|

**Example:**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## إلغاء إعلان الراعي

```
POST /api/admin/sponsor-ads/{id}/cancel
```

إلغاء إعلان راعي موجود في حالة `pending`، أو `pending_payment`، أو `active`. يمكن تقديم سبب إلغاء اختياري. تم التحقق من صحته بواسطة Zod (`cancelSponsorAdSchema`).

**نص الطلب (اختياري):**

|الميدان|اكتب|مطلوب|الوصف|
| -------------- | ------ | -------- | --------------------------------------- |
|`cancelReason`|سلسلة|لا|سبب الإلغاء (الحد الأقصى 500 حرف)|

**مثال:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**الرد (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Status Lifecycle

Sponsor ads follow this status lifecycle:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Created by user, awaiting payment confirmation.
- **`pending`** -- Payment received, awaiting admin review.
- **`active`** -- Approved and currently running.
- **`rejected`** -- Declined by admin with a reason.
- **`expired`** -- Reached end date automatically.
- **`cancelled`** -- Cancelled by admin or user.

---

## قواعد التحقق من الصحة

|الميدان|القاعدة|
| ----------------- | ------------------------------------------------------ |
|`status`|يجب أن تكون حالة إعلان الراعي صالحة|
|`interval`|يجب أن يكون `weekly` أو `monthly`|
|`rejectionReason`|مطلوب للرفض. 10-500 حرف|
|`cancelReason`|اختياري للإلغاء؛ الحد الأقصى 500 حرف|
|`forceApprove`|منطقية؛ مناسب فقط لحالة `pending_payment`|
|`sortBy`|يجب أن يكون `createdAt` أو `updatedAt` أو `startDate` أو `endDate` أو `status`|
|`sortOrder`|يجب أن يكون `asc` أو `desc`|

## رموز الخطأ

|الحالة|معنى|
| ------ | ------------------------------------------------------ |
| `400`  |خطأ في التحقق، حالة انتقال غير صالحة، لم يتم استلام الدفعة|
| `401`  |المصادقة مطلوبة|
| `403`  |امتيازات المسؤول المطلوبة|
| `404`  |لم يتم العثور على إعلان الراعي|
| `500`  |خطأ داخلي في الخادم|

## الوثائق ذات الصلة

- [واجهة برمجة تطبيقات المستخدمين الإداريين](./admin-users-endpoints.md) - إدارة حساب المستخدم
- [واجهة برمجة تطبيقات Admin Clients](./admin-clients-endpoints.md) - إدارة ملف تعريف العميل
- [المصادقة](../architecture/nextauth-configuration.md) - إدارة الجلسة والحراس
