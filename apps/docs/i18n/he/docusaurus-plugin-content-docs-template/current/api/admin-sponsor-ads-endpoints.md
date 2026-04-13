---
id: admin-sponsor-ads-endpoints
title: Admin Sponsor Ads API נקודות קצה
sidebar_label: מודעות חסות מנהל
sidebar_position: 39
---

# Admin Sponsor Ads API נקודות קצה

ה-Sponser Ads API מספק נקודות קצה לניהול פרסומות ממומנות כולל רישום, צפייה, אישור, דחייה וביטול מודעות. מודעות חסות מתקדמות לאורך מחזור חיים של סטטוסים `pending_payment`, `pending`, `active`, `rejected`, `expired` ו-`cancelled`. כל נקודות הקצה דורשות אימות מנהל.

## נתיב בסיס

```
/api/admin/sponsor-ads
```

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/sponsor-ads`|מנהל מערכת|קבל רשימת מודעות חסות מעומדת|
|`GET`|`/api/admin/sponsor-ads/{id}`|מנהל מערכת|קבל מודעת חסות לפי תעודת זהות|
|`DELETE`|`/api/admin/sponsor-ads/{id}`|מנהל מערכת|מחק את מודעת החסות לצמיתות|
|`POST`|`/api/admin/sponsor-ads/{id}/approve`|מנהל מערכת|אשר והפעל מודעת חסות|
|`POST`|`/api/admin/sponsor-ads/{id}/reject`|מנהל מערכת|דחה מודעת חסות|
|`POST`|`/api/admin/sponsor-ads/{id}/cancel`|מנהל מערכת|בטל מודעת חסות|

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

## קבל מודעת חסות

```
GET /api/admin/sponsor-ads/{id}
```

מחזירה מודעת חסות ספציפית עם פרטים מלאים כולל פרטי המשתמש המשויכים.

**תגובה (200):**

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

## אשר מודעת חסות

```
POST /api/admin/sponsor-ads/{id}/approve
```

מאשר ומפעיל מודעת חסות. ניתן לאשר ישירות מודעות בסטטוס `pending`. עבור מודעות בסטטוס `pending_payment`, הגדר את `forceApprove` ל-`true` כדי לאשר ללא אישור תשלום.

**גוף הבקשה (אופציונלי):**

|שדה|הקלד|חובה|תיאור|
| -------------- | ------- | -------- | --------------------------------------------------- |
|`forceApprove`|בוליאני|לא|הגדר ל-`true` כדי לאשר ללא תשלום (עבור סטטוס `pending_payment`)|

**דוגמה:**

```json
{
  "forceApprove": true
}
```

**תגובה (200):**

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

**תגובות שגיאה:**

|סטטוס|שגיאה|תיאור|
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  |`PAYMENT_NOT_RECEIVED`|למודעה יש סטטוס `pending_payment`; השתמש `forceApprove`|
| `400`  |`Cannot approve...`|סטטוס המודעה אינו מאפשר אישור|
| `404`  |`Sponsor ad not found`|לא קיימת מודעה עם המזהה הנתון|

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

## בטל מודעת חסות

```
POST /api/admin/sponsor-ads/{id}/cancel
```

מבטל מודעת חסות שנמצאת בסטטוס `pending`, `pending_payment`, או `active`. ניתן לספק סיבת ביטול אופציונלית. מאומת עם Zod (`cancelSponsorAdSchema`).

**גוף הבקשה (אופציונלי):**

|שדה|הקלד|חובה|תיאור|
| -------------- | ------ | -------- | --------------------------------------- |
|`cancelReason`|מחרוזת|לא|סיבת הביטול (מקסימום 500 תווים)|

**דוגמה:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**תגובה (200):**

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

## כללי אימות

|שדה|כלל|
| ----------------- | ------------------------------------------------------ |
|`status`|חייב להיות סטטוס מודעת חסות חוקי|
|`interval`|חייב להיות `weekly` או `monthly`|
|`rejectionReason`|נדרש לדחייה; 10--500 תווים|
|`cancelReason`|אופציונלי לביטול; מקסימום 500 תווים|
|`forceApprove`|בוליאנית; רלוונטי רק לסטטוס `pending_payment`|
|`sortBy`|חייב להיות `createdAt`, `updatedAt`, `startDate`, `endDate`, או `status`|
|`sortOrder`|חייב להיות `asc` או `desc`|

## קודי שגיאה

|סטטוס|משמעות|
| ------ | ------------------------------------------------------ |
| `400`  |שגיאת אימות, מעבר סטטוס לא חוקי, תשלום לא התקבל|
| `401`  |נדרש אימות|
| `403`  |נדרשות הרשאות מנהל|
| `404`  |מודעת חסות לא נמצאה|
| `500`  |שגיאת שרת פנימית|

## תיעוד קשור

- [Admin Users API](./admin-users-endpoints.md) -- ניהול חשבון משתמש
- [Admin Clients API](./admin-clients-endpoints.md) -- ניהול פרופיל לקוח
- [אימות](../architecture/nextauth-configuration.md) -- ניהול הפעלות ושמירה
