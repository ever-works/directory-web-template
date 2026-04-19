---
id: cron-endpoints
title: נקודות קצה של Cron Job API
sidebar_label: Cron Endpoints
sidebar_position: 6
---

# נקודות קצה של Cron Job API

התבנית כוללת שלוש נקודות קצה של עבודת cron הפועלות במרווחים מתוזמנים דרך Vercel Cron. נקודות קצה אלו מטפלות בסנכרון תוכן, תזכורות על מנוי ועיבוד תפוגה של מנוי.

## תצורת קרון

לוחות הזמנים של Cron מוגדרים ב-`vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/subscription-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/subscription-expiration",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## סינכרון תוכן (`/api/cron/sync`)

|שיטה|נתיב|לוח זמנים|תיאור|
|--------|------|----------|-------------|
|`GET`|`/api/cron/sync`|מדי יום בשעה 03:00 UTC|סנכרן מאגר תוכן מבוסס Git|

### מה זה עושה

עבודת הסינכרון מושכת את התוכן העדכני ביותר ממאגר הנתונים המוגדר של Git (`DATA_REPOSITORY`) ומעדכנת את מטמון התוכן המקומי. זה מבטיח שהאפליקציה משקפת כל שינוי שנעשה ישירות במאגר התוכן (למשל, באמצעות מיזוג יחסי ציבור של GitHub).

### תהליך סנכרון

```
1. Verify CRON_SECRET authorization
2. Check if sync is already in progress (mutex lock)
3. Pull latest changes from remote Git repository
4. Parse and validate updated YAML content files
5. Update local content cache
6. Return sync result with duration
```

### התנהגויות מפתח

- **נעילת Mutex**: רק סנכרון אחד יכול לפעול בכל פעם. בקשות במקביל נדחות עם הודעת סטטוס
- **זמן קצוב**: לפעולות סנכרון יש פסק זמן של 5 דקות כדי למנוע תהליכי בריחה
- **היגיון ניסיון חוזר**: סנכרון שנכשל נסה שוב עד 3 פעמים
- **מצב פיתוח**: ניתן לבטל את הסנכרון האוטומטי באמצעות משתנה הסביבה `DISABLE_AUTO_SYNC=true`

### תגובה

```json
{
  "success": true,
  "message": "Sync completed successfully",
  "duration": 4523
}
```

## תזכורות מנוי (`/api/cron/subscription-reminders`)

|שיטה|נתיב|לוח זמנים|תיאור|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-reminders`|מדי יום בשעה 9:00 UTC|שלח תזכורות לחידוש מנוי|

### מה זה עושה

שאילתות על מנויים שמתקרבים לתאריך החידוש שלהם ושולחת תזכורות בדוא"ל למנויים. זה עוזר להפחית נטישה בלתי רצונית על ידי התראה למשתמשים לפני עיבוד התשלום שלהם.

### היגיון תזכורת

```
1. Verify CRON_SECRET authorization
2. Query subscriptions renewing within reminder window
3. Filter out already-notified subscriptions
4. Send reminder emails via email notification service
5. Mark subscriptions as notified
6. Return count of reminders sent
```

### תזכורת Windows

חלונות תזכורת אופייניים:
- **7 ימים לפני החידוש**: תזכורת ראשונה
- **יום אחד לפני החידוש**: תזכורת אחרונה

### תגובה

```json
{
  "success": true,
  "message": "Subscription reminders sent",
  "data": {
    "reminders_sent": 15,
    "errors": 0
  }
}
```

## תפוגת מנוי (`/api/cron/subscription-expiration`)

|שיטה|נתיב|לוח זמנים|תיאור|
|--------|------|----------|-------------|
|`GET`|`/api/cron/subscription-expiration`|מדי יום בחצות UTC|עבד מנויים שפג תוקפם|

### מה זה עושה

מזהה מנויים לאחר תאריך התפוגה שלהם ומעדכן את הסטטוס שלהם. זה מטפל במינויים שבוטלו אך נותר להם זמן, כמו גם במינויים שלא הצליחו להתחדש.

### תהליך תפוגה

```
1. Verify CRON_SECRET authorization
2. Query subscriptions with expiration date in the past
3. Update subscription status to 'expired'
4. Revoke associated access/permissions
5. Send expiration notification emails
6. Log expiration events for audit trail
7. Return count of processed expirations
```

### תגובה

```json
{
  "success": true,
  "message": "Subscription expirations processed",
  "data": {
    "expired": 3,
    "errors": 0
  }
}
```

## משרות רקע (`/api/cron/jobs`)

הקובץ `background-jobs-init.ts` בספריית המשימות של cron מאתחל עיבוד עבודה ברקע. זה מגדיר את כל המשימות החוזרות שצריכות לפעול בזמן הריצה של היישום.

## אבטחה

### אימות CRON_SECRET

כל נקודות הקצה של ה-cron מאמתות כותרת `CRON_SECRET` או פרמטר שאילתה כדי למנוע ביצוע לא מורשה:

```typescript
// Typical cron authorization check
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### אישור Vercel Cron

בעת פריסה ב-Vercel, משימות cron נקראות אוטומטית על ידי מתזמן ה-cron של Vercel עם הכותרת המתאימה `CRON_SECRET`. הסוד מוגדר בלוח המחוונים של Vercel תחת הגדרות הפרויקט.

|משתנה סביבתי|תיאור|
|---------------------|-------------|
|`CRON_SECRET`|סוד משותף להרשאת משרת קרון|

### ביצוע ידני

ניתן להפעיל נקודות קצה של Cron באופן ידני לצורך ניפוי באגים על ידי הכללת `CRON_SECRET` בכותרת ההרשאה:

```bash
curl -H "Authorization: Bearer your-cron-secret" \
  https://your-app.vercel.app/api/cron/sync
```

## ניטור

### סטטוס סנכרון

ניתן לעקוב אחר מצב משימת הסינכרון באמצעות:
- `/api/version/sync` - מחזיר את זמן הסנכרון האחרון ואת התוצאה
- יומני שרת - פעולות סנכרון נרשמות עם הקידומת `[SYNC_MANAGER]`

### טיפול בשגיאות

כל עבודות ה-cron מיישמות טיפול מקיף בשגיאות:
- פעולות שנכשלו נרשמות עם פרטי השגיאה המלאים
- כשלים חלקיים אינם מונעים עיבוד של שאר הפריטים
- ספירת שגיאות כלולה בתגובה לניטור
- כשלים קריטיים מעוררים שגיאות מסוף עבור התראות צבירה של יומנים

## הפניה ללוח זמנים

|ביטוי קרון|משמעות|
|----------------|---------|
| `0 3 * * *` |כל יום בשעה 03:00 UTC|
| `0 9 * * *` |כל יום בשעה 9:00 UTC|
| `0 0 * * *` |כל יום בחצות UTC|

כל הזמנים הם ב-UTC. שקול את התפלגות אזור הזמן של בסיס המשתמש שלך בעת התאמת לוחות זמנים אלה.
