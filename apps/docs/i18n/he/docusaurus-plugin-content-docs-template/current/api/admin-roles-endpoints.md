---
id: admin-roles-endpoints
title: Admin Rolls API
sidebar_label: תפקידי מנהל
sidebar_position: 35
---

# Admin Rolls API

ממשק API של תפקידים מספק נקודות קצה לניהול תפקידי משתמשים וההרשאות הקשורות אליהם. תפקידים שולטים ברמות הגישה בכל האפליקציה וניתן להקצות אותם למשתמשים באמצעות [Admin Users API](./admin-users-endpoints.md).

## נתיב בסיס

```
/api/admin/roles
```

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
| -------- | --------------------------------- | -------- | ------------------------------------ |
|`GET`|`/api/admin/roles`|מנהל מערכת|קבל רשימת תפקידים מעומדת|
|`POST`|`/api/admin/roles`|מנהל מערכת|צור תפקיד חדש|
|`GET`|`/api/admin/roles/active`|ציבורי|קבל את כל התפקידים הפעילים|
|`GET`|`/api/admin/roles/stats`|מנהל מערכת|קבל סטטיסטיקת תפקידים|
|`GET`|`/api/admin/roles/{id}`|מנהל מערכת|קבל תפקיד בודד לפי תעודת זהות|
|`PUT`|`/api/admin/roles/{id}`|מנהל מערכת|עדכן תפקיד|
|`DELETE`|`/api/admin/roles/{id}`|מנהל מערכת|מחק תפקיד (רך או קשה)|
|`GET`|`/api/admin/roles/{id}/permissions`|מנהל מערכת|קבל הרשאות לתפקיד|
|`PUT`|`/api/admin/roles/{id}/permissions`|מנהל מערכת|עדכן הרשאות עבור תפקיד|

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

## צור תפקיד

```
POST /api/admin/roles
```

יוצר תפקיד חדש. מזהה התפקיד נוצר אוטומטית מהשם על ידי נורמליזציה, הסרת תווים דיאקריטיים והמרה לשלולית בטוחה ב-URL (מקסימום 64 תווים). שמות כפולים (כולל רשומות שנמחקו בצורה רכה) נדחים.

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| ------------- | ------- | -------- | ---------------------------------- |
|`name`|מחרוזת|כן|שם תפקיד (3--100 תווים)|
|`description`|מחרוזת|כן|תיאור התפקיד (מקסימום 500 תווים)|
|`status`|מחרוזת|לא|`active` (ברירת מחדל) או `inactive`|
|`isAdmin`|בוליאני|לא|דגל הרשאות מנהל (ברירת מחדל: `false`)|

**דוגמה:**

```json
{
  "name": "Content Moderator",
  "description": "Responsible for moderating user-generated content",
  "status": "active",
  "isAdmin": false
}
```

**תגובה (201):**

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

## קבל סטטיסטיקת תפקידים

```
GET /api/admin/roles/stats
```

מחזיר נתונים סטטיסטיים מצטברים לגבי תפקידים. דורש הפעלת מנהל.

**תגובה (200):**

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

## הרשאות תפקיד

### קבל הרשאות

```
GET /api/admin/roles/{id}/permissions
```

מחזירה את מערך ההרשאות ואת המטא נתונים של תפקידים בסיסיים.

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "permissions": ["users.read", "users.write", "roles.read"],
    "role": { "id": "moderator", "name": "Moderator", "description": "..." }
  }
}
```

### עדכון הרשאות

```
PUT /api/admin/roles/{id}/permissions
```

מחליף את כל מערך ההרשאות. כל מחרוזת הרשאה מאומתת מול הגדרות הרשאות המערכת. הרשאות לא חוקיות מוחזרות בתגובת השגיאה.

**גוף הבקשה:**

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
