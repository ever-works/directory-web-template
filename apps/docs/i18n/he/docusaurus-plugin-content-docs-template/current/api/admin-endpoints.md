---
id: admin-endpoints
title: נקודות קצה של ממשק API
sidebar_label: נקודות קצה של מנהל מערכת
sidebar_position: 1
---

# נקודות קצה של ממשק API

ממשק ה-API לניהול מכיל כ-60 מטפלי נתיבים ב-19 קבוצות משאבים. כל נקודות הקצה של המנהל מוגנות על ידי תוכנת האמצע `withAdminAuth`, המאמתת הן את האימות והן את הקצאת תפקיד המנהל באמצעות שאילתת מסד נתונים.

## אימות

כל נקודת קצה של מנהל מערכת דורשת:

1. מפגש JWT חוקי (נבדק באמצעות `auth()`)
2. תפקיד מנהל בטבלה `user_roles` (נבדק באמצעות `isAdmin()` מ-`lib/db/roles.ts`)

בקשות לא מאומתות מקבלות תגובה `401`. בקשות מאומתות אך שאינן מנהלות מקבלות תגובה `403`.

## קבוצות משאבים

### קטגוריות (`/api/admin/categories`)

נהל קטגוריות תוכן עם התמדה מבוססת Git.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/categories`|רשימת קטגוריות עם עימוד|
|`POST`|`/api/admin/categories`|צור קטגוריה חדשה|
|`GET`|`/api/admin/categories/all`|קבל את כל הקטגוריות (ללא עימוד)|
|`POST`|`/api/admin/categories/git`|סנכרן קטגוריות עם מאגר Git|
|`POST`|`/api/admin/categories/reorder`|סדר מחדש את עמדות הקטגוריות|
|`GET`|`/api/admin/categories/[id]`|קבל קטגוריה לפי תעודת זהות|
|`PUT`|`/api/admin/categories/[id]`|עדכן קטגוריה|
|`DELETE`|`/api/admin/categories/[id]`|מחק קטגוריה|

### לקוחות (`/api/admin/clients`)

נהל חשבונות משתמש ופרופילים של לקוחות.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/clients`|רשום פרופילי לקוחות עם עימוד|
|`POST`|`/api/admin/clients/advanced-search`|חיפוש לקוחות מתקדם עם מסננים|
|`POST`|`/api/admin/clients/bulk`|פעולות בכמות גדולה על לקוחות|
|`GET`|`/api/admin/clients/dashboard`|נתונים סטטיסטיים של לוח המחוונים ללקוח|
|`GET`|`/api/admin/clients/stats`|נתונים סטטיסטיים מצטברים של לקוחות|
|`GET`|`/api/admin/clients/[clientId]`|קבל את פרטי פרופיל הלקוח|
|`PUT`|`/api/admin/clients/[clientId]`|עדכן את פרופיל הלקוח|
|`DELETE`|`/api/admin/clients/[clientId]`|מחק חשבון לקוח|

### אוספים (`/api/admin/collections`)

ניהול אוספי פריטים שנאספו.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/collections`|רשום את כל האוספים|
|`POST`|`/api/admin/collections`|צור אוסף חדש|
|`GET`|`/api/admin/collections/[id]`|קבלו פרטי איסוף|
|`PUT`|`/api/admin/collections/[id]`|עדכון אוסף|
|`DELETE`|`/api/admin/collections/[id]`|מחק אוסף|
|`GET`|`/api/admin/collections/[id]/items`|רשימת פריטים באוסף|
|`PUT`|`/api/admin/collections/[id]/items`|עדכן פריטי אוסף|

### הערות (`/api/admin/comments`)

מתן הערות משתמשים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/comments`|רשום הערות עם מסנני ניהול|
|`GET`|`/api/admin/comments/[id]`|קבל פרטי תגובה|
|`PUT`|`/api/admin/comments/[id]`|עדכן תגובה (אשר/דחה)|
|`DELETE`|`/api/admin/comments/[id]`|מחק תגובה|

### חברות (`/api/admin/companies`)

נהל פרופילי חברה המקושרים לפריטים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/companies`|רשימת חברות|
|`POST`|`/api/admin/companies`|צור חברה|
|`GET`|`/api/admin/companies/[id]`|קבל פרטי חברה|
|`PUT`|`/api/admin/companies/[id]`|עדכן את החברה|
|`DELETE`|`/api/admin/companies/[id]`|מחק חברה|

### לוח מחוונים (`/api/admin/dashboard`)

ניתוח מצטבר של לוח המחוונים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/dashboard/stats`|נתונים סטטיסטיים של סיכום לוח המחוונים|

### פריטים נבחרים (`/api/admin/featured-items`)

נהל את הדגשים של פריטים מומלצים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/featured-items`|רשימת פריטים נבחרים|
|`POST`|`/api/admin/featured-items`|הצג פריט|
|`GET`|`/api/admin/featured-items/[id]`|קבל פרטי פריט מומלצים|
|`PUT`|`/api/admin/featured-items/[id]`|עדכן את הגדרות הפריטים המוצגים|
|`DELETE`|`/api/admin/featured-items/[id]`|הסר מהמוצגים|

### Geo Analytics (`/api/admin/geo-analytics`)

ניתוח גיאוגרפי ונתוני הפצת מבקרים.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/geo-analytics`|קבל נתוני ניתוח גיאוגרפיים|

### פריטים (`/api/admin/items`)

ניהול תוכן פריט מלא.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/items`|רשימת פריטים עם מסננים ועימוד|
|`POST`|`/api/admin/items`|צור פריט חדש|
|`POST`|`/api/admin/items/bulk`|פעולות פריטים בכמות גדולה (אישור, דחייה, מחיקה)|
|`GET`|`/api/admin/items/stats`|סטטיסטיקה מצטברת של פריט|
|`GET`|`/api/admin/items/[id]`|קבל פרטי פריט|
|`PUT`|`/api/admin/items/[id]`|עדכן פריט|
|`DELETE`|`/api/admin/items/[id]`|מחק פריט|
|`GET`|`/api/admin/items/[id]/history`|קבל היסטוריית ביקורת פריט|
|`POST`|`/api/admin/items/[id]/review`|שלח סקירת פריט (אשר/דחה)|

### אינדקס מיקום (`/api/admin/location-index`)

נהל אינדקס של חיפוש מיקום גיאוגרפי.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`POST`|`/api/admin/location-index`|בנה מחדש את אינדקס חיפוש המיקום|

### ניווט (`/api/admin/navigation`)

תצורת ניווט של מנהל מערכת.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/navigation`|קבל מבנה ניווט|
|`PUT`|`/api/admin/navigation`|עדכן ניווט|

### התראות (`/api/admin/notifications`)

ניהול הודעות מנהל.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/notifications`|רשום הודעות מנהל|
|`POST`|`/api/admin/notifications/mark-all-read`|סמן את כל ההתראות כנקראו|
|`POST`|`/api/admin/notifications/[id]/read`|סמן הודעה בודדת כנקראה|

### דוחות (`/api/admin/reports`)

ניהול דוחות תוכן ומתווך.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/reports`|רשימת דוחות תוכן|
|`GET`|`/api/admin/reports/stats`|דווח על סטטיסטיקה|
|`GET`|`/api/admin/reports/[id]`|קבל פרטי דוח|
|`PUT`|`/api/admin/reports/[id]`|עדכון סטטוס דוח (פתור, סגור)|

### תפקידים (`/api/admin/roles`)

ניהול תפקידים והרשאות עבור RBAC.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/roles`|רשום תפקידים עם עימוד|
|`POST`|`/api/admin/roles`|צור תפקיד חדש|
|`GET`|`/api/admin/roles/active`|קבל תפקידים פעילים בלבד|
|`GET`|`/api/admin/roles/stats`|סטטיסטיקת תפקידים|
|`GET`|`/api/admin/roles/[id]`|קבל פרטי תפקיד|
|`PUT`|`/api/admin/roles/[id]`|עדכון תפקיד|
|`DELETE`|`/api/admin/roles/[id]`|מחק תפקיד (מחיקה רכה)|
|`GET`|`/api/admin/roles/[id]/permissions`|קבל הרשאות תפקיד|
|`PUT`|`/api/admin/roles/[id]/permissions`|עדכן הרשאות תפקיד|

### הגדרות (`/api/admin/settings`)

ניהול הגדרות אפליקציה.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/settings`|קבל את כל ההגדרות|
|`PUT`|`/api/admin/settings`|עדכן הגדרות|
|`GET`|`/api/admin/settings/map-status`|קבל סטטוס תכונת מפה|

### מודעות חסות (`/api/admin/sponsor-ads`)

מתן חסות לפרסומות.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/sponsor-ads`|רשום מודעות חסות|
|`GET`|`/api/admin/sponsor-ads/[id]`|קבל פרטי מודעה|
|`PUT`|`/api/admin/sponsor-ads/[id]`|עדכן מודעה|
|`POST`|`/api/admin/sponsor-ads/[id]/approve`|אשר את מודעת החסות|
|`POST`|`/api/admin/sponsor-ads/[id]/reject`|דחה מודעת חסות|
|`POST`|`/api/admin/sponsor-ads/[id]/cancel`|בטל מודעת חסות|

### תגים (`/api/admin/tags`)

ניהול תגי תוכן.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/tags`|רשימת תגים עם עימוד|
|`POST`|`/api/admin/tags`|צור תג חדש|
|`GET`|`/api/admin/tags/all`|קבל את כל התגים (ללא עימוד)|
|`GET`|`/api/admin/tags/[id]`|קבל פרטי תג|
|`PUT`|`/api/admin/tags/[id]`|עדכון תג|
|`DELETE`|`/api/admin/tags/[id]`|מחק תג|

### עשרים CRM (`/api/admin/twenty-crm`)

תצורה ובדיקה של שילוב CRM.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/twenty-crm/config`|קבל תצורת CRM|
|`PUT`|`/api/admin/twenty-crm/config`|עדכון תצורת CRM|
|`POST`|`/api/admin/twenty-crm/test-connection`|בדוק חיבור CRM|

### משתמשים (`/api/admin/users`)

ניהול משתמש מנהל.

|שיטה|נתיב|תיאור|
|--------|------|-------------|
|`GET`|`/api/admin/users`|רשום משתמשים עם עימוד|
|`POST`|`/api/admin/users`|צור משתמש חדש|
|`GET`|`/api/admin/users/stats`|סטטיסטיקות משתמשים|
|`GET`|`/api/admin/users/check-email`|בדוק את זמינות האימייל|
|`GET`|`/api/admin/users/check-username`|בדוק את זמינות שם המשתמש|
|`GET`|`/api/admin/users/[id]`|קבל פרטי משתמש|
|`PUT`|`/api/admin/users/[id]`|עדכן משתמש|
|`DELETE`|`/api/admin/users/[id]`|מחק משתמש|

## דפוסים נפוצים

### פעולות בכמות גדולה

מספר משאבים תומכים בפעולות בכמות גדולה באמצעות POST עם מערך של מזהים:

```json
POST /api/admin/items/bulk
{
  "action": "approve",
  "ids": ["item-1", "item-2", "item-3"]
}
```

### נקודות קצה לסטטיסטיקה

רוב קבוצות המשאבים כוללות `/stats` נקודת קצה המחזירה ספירות מצטברות:

```json
GET /api/admin/items/stats
{
  "success": true,
  "data": {
    "total": 1250,
    "published": 980,
    "pending": 120,
    "rejected": 50,
    "draft": 100
  }
}
```

### היסטוריית ביקורת

פריטים תומכים במעקב אחר היסטוריית ביקורת דרך נקודת הקצה `/[id]/history`, מתעדים מי ביצע שינויים ומתי.
