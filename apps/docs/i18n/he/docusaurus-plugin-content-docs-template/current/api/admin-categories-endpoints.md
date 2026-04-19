---
id: admin-categories-endpoints
title: Admin Category API נקודות קצה
sidebar_label: קטגוריות מנהל
sidebar_position: 30
---

# Admin Category API נקודות קצה

ה-API של Admin Categories מספק פעולות CRUD מלאות לניהול קטגוריות תוכן, כולל סידור מחדש וסנכרון מבוסס Git עם מאגר נתונים מרוחק. כל נקודות הקצה דורשות אימות מנהל באמצעות אימות מבוסס הפעלה.

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`GET`|`/api/admin/categories`|מנהל מערכת|רשימת קטגוריות (בעמודים)|
|`POST`|`/api/admin/categories`|מנהל מערכת|צור קטגוריה חדשה|
|`GET`|`/api/admin/categories/all`|מנהל מערכת|קבל את כל הקטגוריות (ממטמון התוכן)|
|`GET`|`/api/admin/categories/{id}`|מנהל מערכת|קבל קטגוריה בודדת לפי תעודת זהות|
|`PUT`|`/api/admin/categories/{id}`|מנהל מערכת|עדכן קטגוריה|
|`DELETE`|`/api/admin/categories/{id}`|מנהל מערכת|רך או קשה למחוק קטגוריה|
|`PUT`|`/api/admin/categories/reorder`|מנהל מערכת|סדר מחדש קטגוריות לפי מערך מזהה|
|`GET`|`/api/admin/categories/git`|מנהל מערכת|קבל סטטוס ריפו וקטגוריות של Git|
|`POST`|`/api/admin/categories/git`|מנהל מערכת|צור קטגוריה באמצעות Git commit|

## אימות

כל נקודות הקצה של ניהול הקטגוריות בודקות הפעלה פעילה עם הרשאות מנהל:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## נקודות קצה

### קבל `/api/admin/categories`

מחזירה רשימה מעומדת של קטגוריות עם סינון ומיון אופציונליים.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`page`|מספר שלם| `1` |מספר עמוד (מינימום: 1)|
|`limit`|מספר שלם| `10` |פריטים בעמוד (1--100)|
|`includeInactive`|מחרוזת|`"false"`|כלול קטגוריות לא פעילות|
|`sortBy`|מחרוזת|`"name"`|שדה מיון: `"name"` או `"id"`|
|`sortOrder`|מחרוזת|`"asc"`|כיוון מיון: `"asc"` או `"desc"`|

**תגובה (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### פרסם `/api/admin/categories`

יוצר קטגוריה חדשה. השדה `id` הוא אופציונלי וייווצר אוטומטית מהשם אם לא יסופק. מבטל מטמון תוכן עם הצלחה.

**גוף הבקשה:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`id`|מחרוזת|לא|שבלול ידידותי לכתובות אתרים (`^[a-z0-9-]+$`). נוצר אוטומטית אם הושמט.|
|`name`|מחרוזת|כן|שם תצוגה (2--100 תווים)|

**תגובה (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### קבל `/api/admin/categories/all`

מחזירה את כל הקטגוריות ממטמון התוכן עבור מקום נתון. שימושי עבור תפריטים נפתחים ובוררים של מנהל מערכת.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`locale`|מחרוזת|`"en"`|קוד מקומי לאחזור תוכן|

**תגובה (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### קבל `/api/admin/categories/{id}`

מאחזר קטגוריה בודדת לפי המזהה הייחודי שלה.

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

מעדכן את השם של קטגוריה קיימת. מבטל מטמון תוכן עם הצלחה.

**גוף הבקשה:**

```json
{ "name": "Productivity Tools" }
```

**תגובה (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### מחק `/api/admin/categories/{id}`

מוחק קטגוריה. כברירת מחדל מבצעת מחיקה רכה (נטרול). השתמש בפרמטר השאילתה `hard=true` למחיקה לצמיתות. מבטל מטמון תוכן עם הצלחה.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`hard`|מחרוזת|`"false"`|הגדר ל-`"true"` למחיקה לצמיתות|

**תגובה (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

מסדר מחדש קטגוריות על סמך מערך של מזהי קטגוריות. המיקום של כל מזהה במערך קובע את סדר התצוגה החדש שלו.

**גוף הבקשה:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**כללי אימות:**
- `categoryIds` חייב להיות מערך לא ריק
- כל הערכים חייבים להיות מחרוזות

**תגובה (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### קבל `/api/admin/categories/git`

שואב את הסטטוס והקטגוריות של מאגר Git ממאגר הנתונים המוגדר של GitHub. דורש משתני סביבה `DATA_REPOSITORY` ו-`GITHUB_TOKEN`.

**תגובה (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### פרסם `/api/admin/categories/git`

יוצר קטגוריה חדשה ומחייב אותה ישירות למאגר הנתונים של GitHub. דורש משתני סביבה `DATA_REPOSITORY` ו-`GH_TOKEN`.

**גוף הבקשה:**

```json
{ "id": "productivity", "name": "Productivity" }
```

הן `id` והן `name` נדרשים ליצירה מבוססת Git.

**תגובה (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## קודי שגיאה

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| `400` |פרמטרים לא חוקיים של עימוד|עמוד < 1 או הגבלה מחוץ ל-1--100|
| `400` |נדרש שם קטגוריה|חסר `name` בבקשת היצירה|
| `400` |מזהי קטגוריה חייבים להיות מערך|מטען הזמנה מחדש לא חוקי|
| `401` |לא מורשה. נדרשת גישת מנהל.|הפעלה חסרה או שאינה מנהלת|
| `404` |הקטגוריה לא נמצאה|מזהה קטגוריה לא חוקי|
| `409` |קטגוריה בשם זה כבר קיימת|שם כפול ביצירה/עדכון|
| `500` |DATA_REPOSITORY לא הוגדר|חסר env var עבור נקודות קצה של Git|
| `500` |אסימון GitHub לא מוגדר|חסר `GITHUB_TOKEN` או `GH_TOKEN`|

## אי תוקף מטמון

כל פעולות הכתיבה (יצירה, עדכון, מחיקה, סדר מחדש) התקשרו ל-`invalidateContentCaches()` כדי להבטיח שהשינויים גלויים באופן מיידי בכל האפליקציה.

## תיעוד קשור

- [סקירה כללית של נקודות קצה של מנהל מערכת](./admin-endpoints.md)
- [Category Public Endpoints](./category-endpoints.md)
- [דפוסי תגובה](./response-patterns.md)
- [בקש אימות](./request-validation.md)
