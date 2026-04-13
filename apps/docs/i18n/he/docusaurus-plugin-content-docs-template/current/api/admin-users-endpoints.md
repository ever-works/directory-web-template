---
id: admin-users-endpoints
title: Admin Users API נקודות קצה
sidebar_label: מנהלי משתמשים
sidebar_position: 36
---

# Admin Users API נקודות קצה

ה-Users API מספק נקודות קצה לניהול חשבונות משתמש, כולל יצירה, עדכונים, שינויי סטטוס, הקצאת תפקידים וכלי עזר לאימות. כל נקודות הקצה דורשות אימות מנהל אלא אם צוין אחרת.

## נתיב בסיס

```
/api/admin/users
```

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
| -------- | ----------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/users`|מנהל מערכת|קבל רשימת משתמשים עם עימוד|
|`POST`|`/api/admin/users`|מנהל מערכת|צור משתמש חדש|
|`GET`|`/api/admin/users/stats`|מנהל מערכת|קבל נתונים סטטיסטיים של משתמשים|
|`POST`|`/api/admin/users/check-email`|מנהל מערכת|בדוק את זמינות האימייל|
|`POST`|`/api/admin/users/check-username`|מנהל מערכת|בדוק את זמינות שם המשתמש|
|`GET`|`/api/admin/users/{id}`|מנהל מערכת|קבל משתמש לפי תעודת זהות|
|`PUT`|`/api/admin/users/{id}`|מנהל מערכת|עדכן משתמש|
|`DELETE`|`/api/admin/users/{id}`|מנהל מערכת|מחק משתמש|

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

## צור משתמש

```
POST /api/admin/users
```

יוצר משתמש חדש עם אימות מקיף. התפקיד חייב להתקיים במערכת (אומת מול טבלת התפקידים).

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| ---------- | ------ | -------- | ---------------------------------------------------------- |
|`username`|מחרוזת|כן|3--30 תווים, אלפאנומרי פלוס `-` ו-`_`|
|`email`|מחרוזת|כן|פורמט אימייל חוקי|
|`name`|מחרוזת|כן|שם מלא (2--100 תווים)|
|`password`|מחרוזת|כן|מינימום 8 תווים (אומת על ידי Zod `passwordSchema`)|
|`role`|מחרוזת|כן|יש להפנות למזהה תפקיד קיים|
|`title`|מחרוזת|לא|שם המשרה (מקסימום 100 תווים)|
|`avatar`|מחרוזת|לא|כתובת אתר של דמות (מקסימום 500 תווים)|

**דוגמה:**

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

**תגובה (201):**

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

## בדוק זמינות אימייל

```
POST /api/admin/users/check-email
```

בודק אם כתובת אימייל כבר נמצאת בשימוש. תומך בפרמטר `excludeId` עבור תרחישי עדכון שבהם יש להוציא את האימייל של המשתמש הנוכחי מהבדיקה הכפולה.

**גוף הבקשה:**

```json
{
  "email": "john.doe@example.com",
  "excludeId": "user_123abc"
}
```

**תגובה (200):**

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

## קבל / עדכן / מחק משתמש

### קבל משתמש

```
GET /api/admin/users/{id}
```

מחזיר מידע מלא על הפרופיל עבור משתמש בודד.

### עדכן משתמש

```
PUT /api/admin/users/{id}
```

עדכון חלקי -- רק שדות מסופקים משתנים. מאמת את פורמט האימייל, אורך שם המשתמש (3--50), אורך השם (2--100), וכי התפקיד קיים במערכת.

**גוף הבקשה (כל השדות אופציונליים):**

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

### מחק משתמש

```
DELETE /api/admin/users/{id}
```

מוחק משתמש לצמיתות. כולל מגן מחיקה עצמית: מנהל לא יכול למחוק את החשבון שלו.

**תגובה (200):**

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
