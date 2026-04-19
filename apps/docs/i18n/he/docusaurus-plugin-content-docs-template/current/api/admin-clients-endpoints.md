---
id: admin-clients-endpoints
title: Admin Clients API נקודות קצה
sidebar_label: לקוחות מנהלים
sidebar_position: 38
---

# Admin Clients API נקודות קצה

ה-API של לקוחות מספק נקודות קצה לניהול פרופילי לקוחות, כולל יצירה, עדכונים, חיפוש מתקדם, פעולות בכמות גדולה, ניתוח לוח מחוונים וסטטיסטיקה מקיפה. לקוחות מייצגים פרופילי משתמש קצה המקושרים לחשבונות אימות. כל נקודות הקצה דורשות אימות מנהל.

## נתיב בסיס

```
/api/admin/clients
```

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
| -------- | --------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/clients`|מנהל מערכת|קבל רשימת לקוחות עם עימוד|
|`POST`|`/api/admin/clients`|מנהל מערכת|צור פרופיל לקוח חדש|
|`GET`|`/api/admin/clients/stats`|מנהל מערכת|קבל סטטיסטיקות לקוחות מקיפות|
|`GET`|`/api/admin/clients/dashboard`|מנהל מערכת|קבל נתונים משולבים של לוח המחוונים|
|`GET`|`/api/admin/clients/advanced-search`|מנהל מערכת|חיפוש מרובה מסננים מתקדם|
|`PUT`|`/api/admin/clients/bulk`|מנהל מערכת|עדכון פרופילי לקוחות בכמות גדולה|
|`DELETE`|`/api/admin/clients/bulk`|מנהל מערכת|מחיקת פרופילי לקוחות בכמות גדולה|
|`GET`|`/api/admin/clients/{clientId}`|מנהל מערכת|קבל לקוח לפי תעודת זהות|
|`PUT`|`/api/admin/clients/{clientId}`|מנהל מערכת|עדכן את פרופיל הלקוח|
|`DELETE`|`/api/admin/clients/{clientId}`|מנהל מערכת|מחק את פרופיל הלקוח|

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

## צור לקוח

```
POST /api/admin/clients
```

יוצר פרופיל לקוח חדש. אם לא קיים חשבון משתמש עבור האימייל שסופק, משתמש חדש נוצר אוטומטית עם סיסמה זמנית. מפעיל סנכרון CRM כאשר הוא מופעל.

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| ---------------- | ------- | -------- | -------------------------------------------- |
|`email`|מחרוזת|כן|כתובת אימייל של הלקוח|
|`displayName`|מחרוזת|לא|שם תצוגה (ברירת המחדל היא קידומת דוא"ל)|
|`username`|מחרוזת|לא|שם משתמש ייחודי|
|`bio`|מחרוזת|לא|ביוגרפיה של הלקוח|
|`jobTitle`|מחרוזת|לא|תואר עבודה|
|`company`|מחרוזת|לא|שם החברה|
|`industry`|מחרוזת|לא|מגזר התעשייה|
|`phone`|מחרוזת|לא|מספר טלפון|
|`website`|מחרוזת|לא|כתובת האתר|
|`location`|מחרוזת|לא|מיקום|
|`accountType`|מחרוזת|לא|`individual` (ברירת מחדל), `business`, `enterprise`|
|`status`|מחרוזת|לא|`active` (ברירת מחדל), `inactive`, `suspended`, `trial`|
|`plan`|מחרוזת|לא|`free` (ברירת מחדל), `standard`, `premium`|

**תגובה (200):**

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

## לוח מחוונים

```
GET /api/admin/clients/dashboard
```

מחזירה תגובה משולבת עם רשימת לקוחות מעומדת, נתונים סטטיסטיים מצטברים ומטא נתונים של עימוד. תומך בכל המסננים הבסיסיים בתוספת פרמטרים של טווח תאריכים.

**פרמטרי שאילתה (בנוסף לפרמטרים של רשימה):**

|פרמטר|הקלד|תיאור|
| --------------- | ------ | ------------------------------------------ |
|`createdAfter`|מחרוזת|תאריך ISO או `YYYY-MM-DD` -- נוצר לאחר|
|`createdBefore`|מחרוזת|תאריך ISO או `YYYY-MM-DD` -- נוצר לפני|

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

## פעולות בכמות גדולה

### עדכון בכמות גדולה

```
PUT /api/admin/clients/bulk
```

מעדכן פרופילי לקוחות מרובים בבקשה אחת. כל אובייקט לקוח חייב לכלול שדה `id` בתוספת השדות לעדכון. כשלים בודדים אינם מבטלים את כל האצווה.

**גוף הבקשה:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### מחיקה בכמות גדולה

```
DELETE /api/admin/clients/bulk
```

מוחק לצמיתות מספר פרופילי לקוחות. כל אובייקט במערך חייב לכלול שדה `id`.

**גוף הבקשה:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**תגובה (200) -- שתי נקודות הקצה בכמות גדולה:**

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

## כללי אימות

|שדה|כלל|
| ------------- | ---------------------------------------------------------- |
|`email`|נדרש ליצירה; פורמט אימייל חוקי|
|`status`|חייב להיות `active`, `inactive`, `suspended`, או `trial`|
|`plan`|חייב להיות `free`, `standard`, או `premium`|
|`accountType`|חייב להיות `individual`, `business`, או `enterprise`|
|`clients`|בכמות גדולה: מערך לא ריק עם `id` נדרש על כל אובייקט|

## קודי שגיאה

|סטטוס|משמעות|
| ------ | ------------------------------------------------------ |
| `400`  |שגיאת אימות, אימייל חסר, יצירת המשתמש נכשלה|
| `401`  |נדרש אימות|
| `403`  |נדרשות הרשאות מנהל|
| `404`  |הלקוח לא נמצא|
| `500`  |שגיאת שרת פנימית|

## תיעוד קשור

- [Admin Users API](./admin-users-endpoints.md) -- ניהול חשבון משתמש
- [Admin Roles API](./admin-roles-endpoints.md) -- ניהול תפקידים והרשאות
- [אימות](../architecture/nextauth-configuration.md) -- ניהול הפעלות ושמירה
