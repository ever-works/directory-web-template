---
id: admin-comments-endpoints
title: Admin Comments API Pointpoints
sidebar_label: הערות מנהל
sidebar_position: 31
---

# Admin Comments API Pointpoints

ממשק ה-API של Admin Comments מספק יכולות ניהול לניהול הערות משתמשים. מנהלי מערכת יכולים לרשום, להציג, לעדכן ולמחוק תגובות בצורה רכה. כל נקודות הקצה משתמשות בזמן הריצה של Node.js ודורשות זמינות של מסד נתונים. בדיקות אימות משתמשות ב-`403 Forbidden` עבור משתמשים שאינם מנהלי מערכת.

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`GET`|`/api/admin/comments`|מנהל מערכת|רשימת הערות (בעמודים, ניתנות לחיפוש)|
|`GET`|`/api/admin/comments/{id}`|מנהל מערכת|קבל תגובה אחת עם פרטי משתמש|
|`PUT`|`/api/admin/comments/{id}`|מנהל מערכת|עדכן את תוכן ההערות|
|`DELETE`|`/api/admin/comments/{id}`|מנהל מערכת|מחיקת תגובה רכה|

## אימות

נקודות קצה של ניהול הערות מאמתות את סטטוס המנהל ומחזירות `403 Forbidden` (לא `401`) עבור משתמשים שאינם מנהלי מערכת:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## דרישת מסד נתונים

נקודות הקצה של ההערות בודקות את זמינות מסד הנתונים לפני עיבוד בקשות:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

אם מסד הנתונים אינו מוגדר, תגובת שגיאה מתאימה מוחזרת לפני כל בדיקת אימות.

## נקודות קצה

### קבל `/api/admin/comments`

מחזירה רשימה מעומדת של הערות עם פרטי משתמש משויכים. תומך בחיפוש טקסט מלא על פני תוכן הערות, שמות משתמשים והודעות דוא"ל של משתמשים. רק תגובות שלא נמחקו מוחזרות.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|-----------|------|---------|-------------|
|`page`|מספר שלם| `1` |מספר עמוד לעימוד|
|`limit`|מספר שלם| `10` |הערות לכל עמוד (1--100)|
|`search`|מחרוזת| `""` |חפש בתוכן, שם משתמש או דוא"ל|

**התנהגות חיפוש:**

שאילתת החיפוש מותאמת ללא רגישות רישיות (באמצעות `ILIKE`) כנגד:
- תוכן תגובה
- שם תצוגה של משתמש
- כתובת אימייל של משתמש

תווים מיוחדים `%`, `_`, ו-`\` מוחלפים כדי למנוע הזרקת דפוס SQL.

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### קבל `/api/admin/comments/{id}`

מאחזר הערה ספציפית לפי המזהה שלה עם מידע מלא על פרופיל המשתמש. כולל הצטרפות שמאלית לטבלה `clientProfiles` עבור נתוני משתמשים.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|-----------|------|-------------|
|`id`|מחרוזת|מזהה ייחודי של הערה|

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**User Fallback:** אם פרופיל המשתמש לא נמצא (משתמש שנמחק), מוחזר אובייקט מציין מיקום:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

מעדכן את התוכן של תגובה ספציפית. ניתן לשנות רק את השדה `content`. התגובה חייבת להיות קיימת ולא להימחק באופן רך.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|-----------|------|-------------|
|`id`|מחרוזת|מזהה ייחודי של הערה|

**גוף הבקשה:**

```json
{
  "content": "This is an updated comment with more details."
}
```

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`content`|מחרוזת|כן|טקסט תגובה חדש (לא חייב להיות ריק לאחר חיתוך)|

**כללי אימות:**
- חובה `content` ואסור להיות ריק או רווח לבן בלבד
- הערת היעד חייבת להתקיים ואסור שתהיה לה חותמת זמן `deletedAt`

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### מחק `/api/admin/comments/{id}`

מבצע מחיקה רכה של הערה על ידי הגדרת חותמת הזמן `deletedAt`. התגובה חייבת להתקיים ולא להימחק כבר. הערות שנמחקו ברכות אינן נכללות בכל שאילתות הרשימה.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|-----------|------|-------------|
|`id`|מחרוזת|מזהה ייחודי של הערה|

**תגובה (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## מודל נתונים של הערות

|שדה|הקלד|ניתן לבטל|תיאור|
|-------|------|----------|-------------|
|`id`|מחרוזת|לא|מזהה הערה ייחודי|
|`content`|מחרוזת|לא|תוכן טקסט הערה|
|`rating`|מספר שלם|כן|ערך דירוג (1--5)|
|`userId`|מחרוזת|לא|מזהה משתמש מחבר|
|`itemId`|מחרוזת|לא|מזהה פריט משויך|
|`createdAt`|תאריך שעה|כן|חותמת זמן ליצירה|
|`updatedAt`|תאריך שעה|כן|חותמת זמן של עדכון אחרון|
|`deletedAt`|תאריך שעה|כן|חותמת זמן מחיקה רכה (0 אם פעילה)|

## קודי שגיאה

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| `400` |תוכן נדרש|תוכן ריק או חסר בעדכון|
| `403` |אסור|משתמש שאינו מנהל מנסה גישה|
| `404` |התגובה לא נמצאה|מזהה לא חוקי או שכבר נמחק באופן רך|
| `500` |שגיאת שרת פנימית|כשל במסד נתונים או בשרת|

## הערות יישום

- הערות משתמשות ב**מחיקה רכה** -- השדה `deletedAt` מוגדר במקום להסיר את השורה. זה שומר על שלמות הנתונים ומאפשר שחזור פוטנציאלי.
- כל שאילתות הרשימה מסננות עם `isNull(comments.deletedAt)` כדי לא לכלול הערות שנמחקו.
- נתוני המשתמש נשלפים באמצעות `LEFT JOIN` ב-`clientProfiles`, מה שמבטיח שעדיין ניתן לאחזר הערות ממשתמשים שנמחקו.
- ה-`runtime` מוגדר ל-`"nodejs"` עבור מסלולים אלה (לא Edge).

## תיעוד קשור

- [סקירה כללית של נקודות קצה של מנהל מערכת](./admin-endpoints.md)
- [Comment Public Endpoints](./comment-endpoints.md)
- [דפוסי תגובה](./response-patterns.md)
- [בקש אימות](./request-validation.md)
