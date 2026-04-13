---
id: admin-notifications-endpoints
title: Admin Notifications API נקודות קצה
sidebar_label: הודעות מנהל
sidebar_position: 33
---

# Admin Notifications API נקודות קצה

ממשק ה-API של Admin Notifications מנהל הודעות בתוך האפליקציה עבור משתמשי מנהל מערכת. הוא תומך ברישום הודעות עם ספירות שלא נקראו, יצירת הודעות חדשות עבור משתמשים ספציפיים וסימון הודעות כנקראו (ביחיד או בכמות גדולה). הודעות מאוחסנות במסד הנתונים ומוגדרות למשתמשים בודדים.

## סיכום מסלול

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`GET`|`/api/admin/notifications`|מנהל מערכת|רשימת הודעות עבור מנהל המערכת הנוכחי|
|`POST`|`/api/admin/notifications`|מאומת|צור הודעה חדשה|
|`PATCH`|`/api/admin/notifications/{id}/read`|מאומת|סמן הודעה בודדת כנקראה|
|`PATCH`|`/api/admin/notifications/mark-all-read`|מאומת|סמן את כל ההתראות כנקראו|

## אימות

נקודות הקצה של ההתראה משתמשות בשתי רמות של אימות:

**אדמין בלבד (רשימת GET):** דורש גם אימות וגם תפקיד מנהל.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**משתמש מאומת (POST, PATCH):** דורש הפעלה חוקית אך אינו דורש תפקיד מנהל. נקודות הקצה לסמן כקריאה הן בהיקף של ההתראות של המשתמש המאומת עצמו.

## נקודות קצה

### קבל `/api/admin/notifications`

מאחזר את 50 ההודעות האחרונות עבור משתמש המנהל המאומת, ממוין לפי תאריך היצירה (החדש ביותר ראשון). מחזירה גם את הספירה הכוללת של התראות שלא נקראו.

**תגובה (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**פרטי התנהגות:**
- מקסימום 50 הודעות מוחזרות לכל בקשה
- התוצאות מסודרות לפי `createdAt` יורד (החדש ביותר ראשון)
- `unreadCount` מחושב בנפרד על ידי ספירת הודעות כאשר `isRead = false`
- היקף ההתראות מיועד למזהה המשתמש המאומת

### פרסם `/api/admin/notifications`

יוצר הודעה חדשה עבור משתמש שצוין. השדה `data` מקבל אובייקט שיהיה מחרוזת JSON לפני האחסון. נקודת קצה זו אינה דורשת הרשאות מנהל -- כל משתמש מאומת יכול ליצור הודעות (בדרך כלל נקראות על ידי המערכת באופן פנימי).

**גוף הבקשה:**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

|שדה|הקלד|חובה|תיאור|
|-------|------|----------|-------------|
|`type`|מחרוזת|כן|מזהה סוג הודעה (לדוגמה, `"item_approved"`, `"comment_received"`)|
|`title`|מחרוזת|כן|כותרת הודעה קצרה|
|`message`|מחרוזת|כן|הודעת הודעה מלאה|
|`userId`|מחרוזת|כן|מקד לזיהוי משתמש כדי לקבל את ההודעה|
|`data`|חפץ|לא|מטא נתונים נוספים (מחרוזת JSON באחסון)|

**תגובה (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

מסמן הודעה ספציפית כנקראה. מגדיר `isRead` ל-`true`, מתעד את חותמת הזמן הנוכחית ב-`readAt`, ומעדכן `updatedAt`. רק בעל ההתראה יכול לסמן את ההתראות שלו -- השאילתה מסננת לפי מזהה התראה וגם לפי מזהה משתמש מאומת.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|-----------|------|-------------|
|`id`|מחרוזת|מזהה ייחודי להודעה|

**תגובה (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

מסמן את כל ההתראות שלא נקראו עבור המשתמש המאומת כנקראו בפעולה אחת בכמות גדולה. עדכונים `isRead`, `readAt`, ו-`updatedAt` עבור כל התראה תואמת. מחזירה את ספירת ההתראות שעודכנו.

**תגובה (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**פרטי התנהגות:**
- מעדכן רק התראות שבו `isRead = false` עבור המשתמש הנוכחי
- `updatedCount` עשוי להיות `0` אם אין התראות שלא נקראו
- כל ההתראות התואמות מתעדכנות בשאילתת מסד נתונים אחת

## מודל נתוני הודעה

|שדה|הקלד|ניתן לבטל|תיאור|
|-------|------|----------|-------------|
|`id`|מחרוזת|לא|מזהה הודעה ייחודי|
|`userId`|מחרוזת|לא|מזהה המשתמש שקיבל את ההודעה|
|`type`|מחרוזת|לא|סוג הודעה (לדוגמה, `"item_approved"`, `"comment_received"`)|
|`title`|מחרוזת|לא|כותרת תצוגה קצרה|
|`message`|מחרוזת|לא|הודעת הודעה מלאה|
|`data`|מחרוזת|כן|מטא נתונים נוספים במחרוזת JSON|
|`isRead`|בוליאני|לא|האם ההודעה נקראה|
|`readAt`|תאריך שעה|כן|חותמת זמן כאשר מסומן כנקראה|
|`createdAt`|תאריך שעה|לא|חותמת זמן ליצירה|
|`updatedAt`|תאריך שעה|כן|חותמת זמן של עדכון אחרון|

## קודי שגיאה

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| `400` |חסרים שדות חובה|חסר בפוסט סוג, כותרת, הודעה או UserId|
| `400` |נדרש מזהה הודעה|PATCH עם פרמטר מזהה ריק|
| `401` |לא מורשה|אין הפעלה פעילה|
| `403` |אסור|משתמש שאינו מנהל בנקודת הקצה של רשימת GET|
| `404` |ההודעה לא נמצאה|מזהה או הודעה לא חוקיים שייכים למשתמש אחר|
| `500` |שגיאת שרת פנימית|כשל במסד נתונים או בשרת|

## סוגי הודעות נפוצים

השדה `type` הוא מחרוזת בצורה חופשית, אך היישום משתמש בדרך כלל בערכים הבאים:

|הקלד|תיאור|
|------|-------------|
|`item_approved`|פריט אושר על ידי מנהל|
|`item_rejected`|פריט נדחה|
|`comment_received`|הערה חדשה פורסמה על פריט|
|`submission_received`|התקבלה הגשת פריט חדש|

## תיעוד קשור

- [סקירה כללית של נקודות קצה של מנהל מערכת](./admin-endpoints.md)
- [דפוסי תגובה](./response-patterns.md)
- [בקש אימות](./request-validation.md)
