---
id: admin-items-endpoints
title: Admin Items API Points
sidebar_label: פריטי מנהל
sidebar_position: 37
---

# Admin Items API Points

The Items API provides endpoints for managing directory listings including creation, updates, review workflows (approve/reject), audit history, bulk operations, and statistics. פריטים מתקדמים במחזור חיים של סטטוסים `draft`, `pending`, `approved` ו-`rejected`. כל נקודות הקצה דורשות אימות מנהל.

## נתיב בסיס

```
/api/admin/items
```

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
| -------- | ------------------------------------- | ----- | ------------------------------------ |
|`GET`|`/api/admin/items`|מנהל מערכת|קבל רשימת פריטים מעומדים|
|`POST`|`/api/admin/items`|מנהל מערכת|צור פריט חדש|
|`GET`|`/api/admin/items/stats`|מנהל מערכת|קבל נתונים סטטיסטיים של פריטים|
|`POST`|`/api/admin/items/bulk`|מנהל מערכת|אישור, דחייה או מחיקה בכמות גדולה|
|`GET`|`/api/admin/items/{id}`|מנהל מערכת|קבל פריט לפי תעודת זהות|
|`PUT`|`/api/admin/items/{id}`|מנהל מערכת|עדכן פריט|
|`DELETE`|`/api/admin/items/{id}`|מנהל מערכת|מחק את הפריט לצמיתות|
|`POST`|`/api/admin/items/{id}/review`|מנהל מערכת|אשר או דחה פריט|
|`GET`|`/api/admin/items/{id}/history`|מנהל מערכת|קבל היסטוריית ביקורת פריט|

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

## צור פריט

```
POST /api/admin/items
```

יוצר פריט חדש עם בדיקות כפולות גם בתעודת הזהות וגם בשבלול. מפעיל סנכרון CRM (אם מופעל) ואינדקס מיקום (אם מופעל).

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| ------------ | -------- | -------- | ---------------------------------------------- |
|`id`|מחרוזת|כן|מזהה פריט ייחודי|
|`name`|מחרוזת|כן|שם הפריט|
|`slug`|מחרוזת|כן|שבלול ידידותי לכתובות אתרים (חייב להיות ייחודי)|
|`description`|מחרוזת|כן|תיאור הפריט|
|`source_url`|מחרוזת|כן|כתובת האתר של המקור של הפריט|
|`category`|מחרוזת[]|לא|מערך של קטגוריות שבלולים|
|`tags`|מחרוזת[]|לא|מערך של שבלולים תג|
|`brand`|מחרוזת|לא|שם מותג (משמש לסנכרון חברת CRM)|
|`featured`|בוליאני|לא|דגל נבחר (ברירת מחדל: `false`)|
|`icon_url`|מחרוזת|לא|כתובת אתר של סמל|
|`status`|מחרוזת|לא|מצב התחלתי (ברירת מחדל: `draft`)|
|`location`|חפץ|לא|נתוני מיקום לאינדקס גיאוגרפי|

**תגובה (201):**

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

## פעולות בכמות גדולה

```
POST /api/admin/items/bulk
```

מבצע אישור, דחייה או מחיקה בכמות גדולה של עד 100 פריטים. כל פריט מעובד בנפרד; כשלים חלקיים אינם מבטלים את כל הפעולה. שולח הודעות אימייל לשולחים על אישור/דחיה.

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| -------- | -------- | ------------------ | ---------------------------------------------------- |
|`action`|מחרוזת|כן|`approve`, `reject`, או `delete`|
|`ids`|מחרוזת[]|כן|מזהי פריט לעיבוד (1--100, ללא כפילויות)|
|`reason`|מחרוזת|כן (עבור `reject`)|סיבת הדחייה (מינימום 10 תווים)|

**תגובה (200):**

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

## סקירת פריט

```
POST /api/admin/items/{id}/review
```

מאשר או דוחה פריט. מתעד את החלטת הביקורת עם הערות אופציונליות. שולח הודעת דוא"ל למגיש המקורי (אם המגיש הוא משתמש רשום).

**גוף הבקשה:**

|שדה|הקלד|חובה|תיאור|
| -------------- | ------ | -------- | ------------------------------------ |
|`status`|מחרוזת|כן|`approved` או `rejected`|
|`review_notes`|מחרוזת|לא|הסבר על החלטת הביקורת|

**תגובה (200):**

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

## כללי אימות

|שדה|כלל|
| ------------ | ---------------------------------------------------------- |
|`id`|נדרש; חייב להיות ייחודי בכל הפריטים|
|`name`|נדרש ליצירה|
|`slug`|נדרש; חייב להיות ייחודי בכל הפריטים|
|`description`|נדרש ליצירה|
|`source_url`|נדרש ליצירה; פורמט כתובת אתר חוקי|
|`status`|חייב להיות `draft`, `pending`, `approved`, או `rejected`|
|`reason`|נדרש לדחייה בתפזורת; מינימום 10 תווים|
|`ids`|בתפזורת: 1--100 מחרוזות ייחודיות שאינן ריקות|
|`action`|מסנן היסטוריה: סוגי פעולות ביקורת חוקיים בלבד|

## קודי שגיאה

|סטטוס|משמעות|
| ------ | -------------------------------------------------------- |
| `400`  |שגיאת אימות, פרמטרים לא חוקיים, שדות חסרים|
| `401`  |נדרש אימות|
| `403`  |נדרשות הרשאות מנהל|
| `404`  |פריט לא נמצא|
| `409`  |כפול מזהה פריט או שבלול|
| `500`  |שגיאת שרת פנימית|

## תיעוד קשור

- [Admin Roles API](./admin-roles-endpoints.md) -- נהל תפקידים שהוקצו למשתמשים
- [Admin Users API](./admin-users-endpoints.md) -- ניהול חשבון משתמש
- [אימות](../architecture/nextauth-configuration.md) -- ניהול הפעלות ושמירה
