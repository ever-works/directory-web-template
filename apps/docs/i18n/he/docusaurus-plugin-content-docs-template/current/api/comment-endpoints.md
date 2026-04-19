---
id: comment-endpoints
title: הערות נקודות קצה
sidebar_label: הערות
sidebar_position: 24
---

# הערות נקודות קצה

מערכת ההערות מספקת נקודות קצה ליצירה, קריאה, עדכון ומחיקה של הערות על פריטים. הערות כוללות דירוג של 1-5 כוכבים ותומכות הן בגישה ציבורית (קריאה) והן בפעולות מאומתות (יצירה/עריכה/מחיקה). נקודות קצה של מנהל מספקות יכולות ניהול.

## סקירה כללית

### נקודות קצה ציבוריות

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/items/[slug]/comments`|קבל|ציבורי|רשום הערות לפריט|
|`/api/items/[slug]/comments/rating`|קבל|ציבורי|קבל סטטיסטיקות דירוג מצטברות|
|`/api/items/[slug]/comments/rating/[commentId]`|קבל|ציבורי|קבל דירוג של תגובה אחת|

### נקודות קצה מאומתות

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/items/[slug]/comments`|פוסט|משתמש|צור הערה חדשה|
|`/api/items/[slug]/comments/[commentId]`|PUT|בעלים|עדכן תגובה משלך|
|`/api/items/[slug]/comments/[commentId]`|מחק|בעלים|מחק תגובה משלך|
|`/api/items/[slug]/comments/rating/[commentId]`|תיקון|משתמש|עדכן דירוג של תגובה|

### נקודות קצה של מנהל מערכת

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/admin/comments`|קבל|מנהל מערכת|רשום את כל ההערות עם עימוד|
|`/api/admin/comments/[id]`|קבל|מנהל מערכת|קבל תגובה באמצעות תעודת זהות|
|`/api/admin/comments/[id]`|PUT|מנהל מערכת|עדכן את תוכן ההערות|
|`/api/admin/comments/[id]`|מחק|מנהל מערכת|רך-מחק תגובה|

## נקודות קצה ציבוריות

### רשימת הערות לפריט

```
GET /api/items/[slug]/comments
```

מחזירה את כל ההערות לפריט ספציפי כולל פרטי פרופיל משתמש. אין צורך באימות.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|---|---|---|
|`slug`|מחרוזת|שבלול פריט|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**מקור:** `template/app/api/items/[slug]/comments/route.ts`

### קבל סטטיסטיקת דירוג

```
GET /api/items/[slug]/comments/rating
```

מחזירה את הדירוג הממוצע ואת המספר הכולל של דירוגים עבור פריט. סופר רק תגובות שלא נמחקו.

**תגובת הצלחה (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

מחזירה `averageRating: 0` ו-`totalRatings: 0` כאשר אין דירוגים.

**מקור:** `template/app/api/items/[slug]/comments/rating/route.ts`

## נקודות קצה מאומתות

### צור תגובה

```
POST /api/items/[slug]/comments
```

יוצר הערה חדשה עם דירוג על פריט. דורש אימות ופרופיל לקוח חוקי. משתמשים חסומים מנועים מלהגיב.

**אימות:** נדרש

**גוף הבקשה:**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

|שדה|הקלד|חובה|אילוצים|
|---|---|---|---|
|`content`|מחרוזת|כן|חייב להיות לא ריק לאחר חיתוך|
|`rating`|מספר שלם|כן|חייב להיות בין 1 ל-5 כולל|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

|סטטוס|מצב|
|---|---|
| 400 |תוכן ריק או דירוג לא חוקי|
| 401 |לא מאומת|
| 403 |המשתמש מושעה או נאסר|
| 404 |פרופיל הלקוח לא נמצא|

**מקור:** `template/app/api/items/[slug]/comments/route.ts`

### עדכן תגובה

```
PUT /api/items/[slug]/comments/[commentId]
```

מעדכן את התוכן ו/או הדירוג של תגובה קיימת. רק מחבר התגובה יכול לעדכן את התגובה שלו. יש לספק לפחות אחד מ-`content` או `rating`.

**אימות:** נדרש (חייב להיות בעל התגובה)

**גוף הבקשה:**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

|שדה|הקלד|חובה|אילוצים|
|---|---|---|---|
|`content`|מחרוזת|לא|1-1000 תווים|
|`rating`|מספר שלם|לא|חייב להיות בין 1 ל-5|

התגובה כוללת את ההערה המעודכנת עם חותמת זמן `editedAt`.

|סטטוס|מצב|
|---|---|
| 400 |לא סופקו שדות, תוכן ארוך מדי או דירוג לא חוקי|
| 401 |לא מאומת|
| 404 |התגובה לא נמצאה או שהמשתמש אינו המחבר|

**מקור:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### מחק תגובה

```
DELETE /api/items/[slug]/comments/[commentId]
```

רך-מוחק תגובה. רק מחבר התגובה יכול למחוק את התגובה שלו. התגובה מסומנת בחותמת זמן `deletedAt` במקום להסיר אותה לצמיתות.

**אימות:** נדרש (חייב להיות בעל התגובה)

**תגובת הצלחה:** 204 ללא תוכן

|סטטוס|מצב|
|---|---|
| 401 |לא מאומת|
| 404 |התגובה לא נמצאה, כבר נמחקה או לא בבעלות המשתמש|

**מקור:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### עדכון דירוג הערות

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

מעדכן רק את הדירוג של תגובה ספציפית.

**גוף הבקשה:**

```json
{
  "rating": 4
}
```

**מקור:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## נקודות קצה של מנהל מערכת

כל נקודות הקצה של המנהל דורשות `session.user.isAdmin` כדי להיות אמת.

### רשום את כל התגובות

```
GET /api/admin/comments
```

מחזירה רשימה מעומדת של כל ההערות (למעט אלה שנמחקו באופן רך) עם פרטי משתמש. תומך בחיפוש על פני תוכן הערות, שם משתמש ודוא"ל משתמש.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|---|---|---|---|
|`page`|מספר שלם| 1 |מספר עמוד|
|`limit`|מספר שלם| 10 |תוצאות לכל עמוד (1-100)|
|`search`|מחרוזת| - |חפש בתוכן, שם משתמש או דוא"ל|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
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

**מקור:** `template/app/api/admin/comments/route.ts`

### קבל תגובה לפי תעודת זהות

```
GET /api/admin/comments/[id]
```

מאחזר הערה ספציפית עם פרטי משתמש מלא.

**מקור:** `template/app/api/admin/comments/[id]/route.ts`

### הערה עדכון מנהל

```
PUT /api/admin/comments/[id]
```

מאפשר למנהלי מערכת לעדכן את התוכן של כל תגובה, ללא קשר לבעלות.

**גוף הבקשה:**

```json
{
  "content": "This content has been moderated by an administrator."
}
```

**מקור:** `template/app/api/admin/comments/[id]/route.ts`

### מנהל מערכת מחק תגובה

```
DELETE /api/admin/comments/[id]
```

רך-מוחק כל תגובה. התגובה חייבת להתקיים ולא להימחק כבר.

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

|סטטוס|מצב|
|---|---|
| 403 |לא מנהל|
| 404 |התגובה לא נמצאה או שכבר נמחקה|

**מקור:** `template/app/api/admin/comments/[id]/route.ts`

## פרטי יישום מרכזיים

- **מחיקה רכה:** כל המחיקות מוגדרות `deletedAt` במקום הסרת רשומות. שאילתות מסננות תגובות שנמחקו דרך `isNull(comments.deletedAt)`.
- **אימות בעלות:** נקודות קצה של משתמשים מאמתות שמזהה פרופיל הלקוח של המשתמש המאומת תואם לשדה `userId` של התגובה.
- **מניעת משתמשים חסומים:** הסימון `isUserBlocked()` מונע ממשתמשים מושעים או חסומים ליצור הערות.
- **חיפוש (אדמין):** משתמש ב-ILIKE לחיפוש חסר רגישות לאותיות גדולות עם בריחה נכונה של תווים כלליים של SQL (`%` ו-`_`).
