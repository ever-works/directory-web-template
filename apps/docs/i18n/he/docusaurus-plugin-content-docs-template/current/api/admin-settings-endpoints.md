---
id: admin-settings-endpoints
title: הגדרות מנהל מערכת נקודות קצה
sidebar_label: הגדרות מנהל מערכת
sidebar_position: 23
---

# הגדרות מנהל מערכת נקודות קצה

ממשק ה-API של הגדרות הניהול מספק נקודות קצה לקריאה ושינוי של תצורת האתר המאוחסנת ב-`config.yml`. זה כולל הגדרות כלליות וסטטוס ספק המפה. כל נקודות הקצה דורשות אימות מנהל.

## סקירה כללית

|נקודת קצה|שיטה|Auth|תיאור|
|---|---|---|---|
|`/api/admin/settings`|קבל|מנהל מערכת|קבל את כל ההגדרות|
|`/api/admin/settings`|תיקון|מנהל מערכת|עדכן הגדרה ספציפית|
|`/api/admin/settings/map-status`|קבל|מנהל מערכת|קבל סטטוס תצורה של ספק מפות|

## קבל הגדרות

```
GET /api/admin/settings
```

מאחזר את הקטע `settings` המלא מהקובץ `config.yml` של האתר.

**אימות:** נדרש מנהל מערכת (דרך `getCachedApiSession`)

**תגובת הצלחה (200):**

```json
{
  "settings": {
    "theme": "light",
    "itemsPerPage": 20,
    "enableComments": true,
    "enableVoting": true,
    "enableNewsletter": true,
    "mapProvider": "mapbox",
    "defaultLanguage": "en"
  }
}
```

הצורה המדויקת של האובייקט `settings` תלויה בתצורת `config.yml` של האתר. נקודת הקצה מחזירה את כל מה שמאוחסן תחת המקש `settings`.

|סטטוס|מצב|
|---|---|
| 401 |לא מאומת כמנהל|
| 500 |קריאת התצורה נכשלה|

**מקור:** `template/app/api/admin/settings/route.ts`

## עדכן הגדרה

```
PATCH /api/admin/settings
```

מעדכן ערך הגדרה יחיד בקטע `settings` של `config.yml`. המפתח עובר טווח אוטומטי למרחב השמות `settings` (למשל, מתן עדכוני מפתח `"theme"` `settings.theme` בקובץ התצורה).

**אימות:** נדרש מנהל מערכת

**גוף הבקשה:**

```json
{
  "key": "itemsPerPage",
  "value": 30
}
```

|שדה|הקלד|חובה|תיאור|
|---|---|---|---|
|`key`|מחרוזת|כן|מפתח ההגדרה לעדכון (ביחס ל-`settings.`)|
|`value`|כל|כן|הערך החדש עבור ההגדרה|

**תגובת הצלחה (200):**

```json
{
  "success": true,
  "key": "itemsPerPage",
  "value": 30
}
```

העדכון נמשך באמצעות `configManager.updateNestedKey()`, אשר משנה את הקובץ `config.yml` הבסיסי. המפתח מקבל קידומת אוטומטית של `settings.` לפני שהוא מועבר למנהל התצורה.

**תגובות שגיאה:**

|סטטוס|מצב|
|---|---|
| 400 |חסר שדה `key` בגוף הבקשה|
| 401 |לא מאומת כמנהל|
| 500 |כתיבת התצורה נכשלה|

**מקור:** `template/app/api/admin/settings/route.ts`

## סטטוס ספק מפות

### קבל סטטוס מפה

```
GET /api/admin/settings/map-status
```

מחזירה את סטטוס התצורה של ספקי מפות נתמכים מבלי לחשוף מפתחות API בפועל. זה מאפשר ללוח המחוונים לניהול להראות אילו ספקי מפות זמינים לשימוש.

**אימות:** נדרש מנהל מערכת

**תגובת הצלחה (200):**

```json
{
  "status": {
    "mapbox": {
      "isConfigured": true,
      "isPreviewAvailable": true,
      "name": "Mapbox"
    },
    "google": {
      "isConfigured": false,
      "isPreviewAvailable": false,
      "name": "Google Maps"
    }
  }
}
```

|שדה|הקלד|תיאור|
|---|---|---|
|`mapbox.isConfigured`|בוליאני|האם `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` מוגדר|
|`mapbox.isPreviewAvailable`|בוליאני|זהה ל-`isConfigured` -- תצוגה מקדימה דורשת את האסימון|
|`google.isConfigured`|בוליאני|האם `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` מוגדר|
|`google.isPreviewAvailable`|בוליאני|אותו דבר כמו `isConfigured`|

נקודת הקצה בודקת את נוכחותם של משתני סביבה:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` עבור Mapbox
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` עבור מפות Google

לא נחשפים ערכי מפתח בפועל בתגובה.

|סטטוס|מצב|
|---|---|
| 401 |לא מאומת כמנהל|
| 500 |שגיאת שרת פנימית|

**מקור:** `template/app/api/admin/settings/map-status/route.ts`

## ארכיטקטורת תצורה

מערכת ההגדרות בנויה על הסינגלטון `configManager` מ-`lib/config-manager`:

- **אחסון:** ההגדרות מאוחסנות בקובץ תצורה של YAML (`config.yml`)
- **גישה:** השיטה `configManager.getConfig()` קוראת את התצורה המלאה
- **עדכונים:** השיטה `configManager.updateNestedKey()` משנה מפתחות מקוננים ספציפיים
- **שמירה במטמון:** הפעלות נשמרות במטמון באמצעות `getCachedApiSession()` לביצועים

כל עדכוני ההגדרות נמצאים תחת מרחב השמות `settings` בקובץ התצורה. זה מונע שינוי מקרי של מפתחות תצורה ברמה העליונה באמצעות ממשק API של הגדרות.
