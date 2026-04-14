---
id: reports-endpoints
title: דוחות נקודות קצה
sidebar_label: דוחות
sidebar_position: 20
---

# דוחות נקודות קצה

מערכת הדוחות מאפשרת למשתמשים מאומתים לסמן תוכן בלתי הולם ומספקת למנהלי מערכת כלים לסקור, לנהל ולפתור דוחות. דוחות תומכים בסוגי תוכן כולל פריטים והערות, עם מניעת כפילויות מובנית.

## סקירה כללית

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/reports`|פוסט|משתמש|שלח דוח תוכן|
|`/api/admin/reports`|קבל|מנהל מערכת|רשימת דוחות עם סינון|
|`/api/admin/reports/stats`|קבל|מנהל מערכת|קבל סטטיסטיקות דוחות|
|`/api/admin/reports/[id]`|קבל|מנהל מערכת|קבל דוח בודד|
|`/api/admin/reports/[id]`|PUT|מנהל מערכת|עדכן את מצב הדוח והרזולוציה|

## נקודות קצה ציבוריות

### שלח דוח

```
POST /api/reports
```

משתמשים מאומתים יכולים לדווח על פריטים או הערות בגין תוכן בלתי הולם. כל משתמש יכול לדווח על אותו תוכן פעם אחת בלבד (מניעת כפילויות באמצעות בדיקת `hasUserReportedContent`). משתמשים חסומים (מושעים או חסומים) מנועים מלהגיש דוחות.

**אימות:** נדרש (מבוסס הפעלה)

**גוף הבקשה:**

```json
{
  "contentType": "item",
  "contentId": "awesome-productivity-tool",
  "reason": "spam",
  "details": "This tool is promoting malicious software"
}
```

|שדה|הקלד|חובה|תיאור|
|---|---|---|---|
|`contentType`|מחרוזת|כן|סוג התוכן: `"item"` או `"comment"`|
|`contentId`|מחרוזת|כן|מזהה או שבלול של התוכן המדווח|
|`reason`|מחרוזת|כן|אחד מ: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`|
|`details`|מחרוזת|לא|הקשר נוסף לגבי הדו"ח|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "message": "Report submitted successfully",
  "report": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "awesome-productivity-tool",
    "reason": "spam",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

**תגובות שגיאה:**

|סטטוס|מצב|
|---|---|
| 400 |סוג תוכן לא חוקי, מזהה תוכן חסר או סיבה לא חוקית|
| 401 |המשתמש לא מאומת|
| 403 |נדרש פרופיל לקוח, או שהמשתמש מושעה/נאסר|
| 404 |פרופיל הלקוח לא נמצא|
| 409 |המשתמש כבר דיווח על תוכן זה|
| 500 |שגיאת שרת פנימית|

**מקור:** `template/app/api/reports/route.ts`

## נקודות קצה של מנהל מערכת

כל נקודות הקצה של המנהל דורשות `session.user.isAdmin` כדי להיות אמת.

### רשימת דוחות

```
GET /api/admin/reports
```

מחזירה רשימה מעומדת של דוחות תוכן עם מידע מדווח. תומך בסינון לפי סטטוס, סוג תוכן וסיבה, בתוספת חיפוש טקסט על פני מזהה תוכן, פרטים ושם/דוא"ל של הכתב.

**פרמטרי שאילתה:**

|פרמטר|הקלד|ברירת מחדל|תיאור|
|---|---|---|---|
|`page`|מספר שלם| 1 |מספר עמוד (מינימום 1)|
|`limit`|מספר שלם| 10 |תוצאות לכל עמוד (1-100)|
|`search`|מחרוזת| - |חפש על פני מזהה תוכן, פרטים, שם הכתב/דוא"ל|
|`status`|מחרוזת| - |מסנן: `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`|
|`contentType`|מחרוזת| - |מסנן: `"item"`, `"comment"`|
|`reason`|מחרוזת| - |מסנן: `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "rpt_abc123",
        "contentType": "item",
        "contentId": "some-item-slug",
        "reason": "spam",
        "status": "pending",
        "details": "Suspicious content",
        "reportedBy": "client_456",
        "createdAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

**מקור:** `template/app/api/admin/reports/route.ts`

### קבל סטטיסטיקות דוחות

```
GET /api/admin/reports/stats
```

מחזיר נתונים סטטיסטיים מצטברים לגבי דוחות, כולל ספירות לפי סטטוס, סוג תוכן וסיבה.

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "total": 156,
    "pendingCount": 23,
    "resolvedCount": 120,
    "byStatus": {
      "pending": 23,
      "reviewed": 10,
      "resolved": 120,
      "dismissed": 3
    },
    "byContentType": {
      "item": 100,
      "comment": 56
    },
    "byReason": {
      "spam": 80,
      "inappropriate": 45,
      "harassment": 20,
      "other": 11
    }
  }
}
```

**מקור:** `template/app/api/admin/reports/stats/route.ts`

### קבל דיווח לפי תעודת זהות

```
GET /api/admin/reports/[id]
```

מאחזר דוח בודד עם פרטים מלאים כולל מידע על כתב וסוקר.

**פרמטרי נתיב:**

|פרמטר|הקלד|תיאור|
|---|---|---|
|`id`|מחרוזת|מזהה דיווח|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "data": {
    "id": "rpt_abc123",
    "contentType": "item",
    "contentId": "some-item-slug",
    "reason": "spam",
    "status": "reviewed",
    "details": "Suspicious content",
    "reportedBy": "client_456",
    "reviewedBy": "admin_789",
    "reviewNote": "Confirmed as spam",
    "resolution": "content_removed",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-21T09:00:00.000Z"
  }
}
```

|סטטוס|מצב|
|---|---|
| 403 |לא מנהל|
| 404 |הדוח לא נמצא|

**מקור:** `template/app/api/admin/reports/[id]/route.ts`

### עדכון דוח

```
PUT /api/admin/reports/[id]
```

עדכון סטטוס, רזולוציה והערת סקירה של דוח. כאשר מוגדרת רזולוציה, המערכת מבצעת אוטומטית את פעולת הניהול המתאימה (הסרת תוכן, אזהרת משתמש, השעיה או איסור).

**גוף הבקשה:**

```json
{
  "status": "resolved",
  "resolution": "content_removed",
  "reviewNote": "Confirmed spam content, removed from listing"
}
```

|שדה|הקלד|חובה|תיאור|
|---|---|---|---|
|`status`|מחרוזת|לא|`"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`|
|`resolution`|מחרוזת|לא|`"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`|
|`reviewNote`|מחרוזת|לא|הערות מנהל לגבי הביקורת|

**פעולות מנחה לפי החלטה:**

הפעולות האוטומטיות הבאות מופעלות על סמך ערך הרזולוציה:

|רזולוציה|פעולה|
|---|---|
|`content_removed`|מתקשר ל`removeContent()` כדי להסיר את הפריט או ההערה שדווחו|
|`user_warned`|מתקשר ל`warnUser()` כדי להוציא אזהרה לבעל התוכן|
|`user_suspended`|מתקשר ל`suspendUser()` כדי להשעות את החשבון של בעל התוכן|
|`user_banned`|מתקשר ל`banUser()` כדי לחסום לצמיתות את בעל התוכן|
|`no_action`|לא ננקטת פעולות מתינות|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "message": "Report updated successfully",
  "data": {
    "id": "rpt_abc123",
    "status": "resolved",
    "resolution": "content_removed",
    "reviewNote": "Confirmed spam content"
  },
  "moderationResult": {
    "success": true,
    "message": "Content removed successfully"
  }
}
```

|סטטוס|מצב|
|---|---|
| 400 |סטטוס או ערך רזולוציה לא חוקיים; בעל התוכן לא נמצא עבור פעולות ברמת המשתמש|
| 403 |לא מנהל|
| 404 |הדוח לא נמצא|

**מקור:** `template/app/api/admin/reports/[id]/route.ts`

## מודל נתונים

דוחות משתמשים בסכומים הבאים המוגדרים ב-`lib/db/schema`:

- **ReportContentType:** `"item"`, `"comment"`
- **סיבה לדיווח:** `"spam"`, `"harassment"`, `"inappropriate"`, `"other"`
- **סטטוס דיווח:** `"pending"`, `"reviewed"`, `"resolved"`, `"dismissed"`
- **רזולוציית דוח:** `"content_removed"`, `"user_warned"`, `"user_suspended"`, `"user_banned"`, `"no_action"`

## אינטגרציה עם מודרציה

כאשר דוח נפתר ברזולוציה ברמת המשתמש (`user_warned`, `user_suspended`, `user_banned`), המערכת:

1. מחפש את בעל התוכן באמצעות `getContentOwner()`
2. מבצע את פונקציית המנחה המתאימה מ-`lib/services/moderation.service`
3. משתמש ב-`reviewNote` כסיבה לפעולת הניהול
4. רושם את תעודת הזהות של המנהל בתור המבקר

אם פעולת הניהול נכשלת, עדכון הדוח עדיין מצליח אך הכשל נרשם ביומן. השדה `moderationResult` בתגובה מציין אם הפעולה הצליחה.
