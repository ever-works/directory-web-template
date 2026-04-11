---
id: cron-jobs
title: הגדרת משימות Cron
sidebar_label: משימות Cron
sidebar_position: 8
---

# הגדרת משימות Cron

תבנית Ever Works תומכת בשלושה מנגנונים לתזמון משימות רקע, הנבחרים אוטומטית בהתאם לסביבת הריצה.

## איך זה עובד

### עדיפות המנגנונים

```typescript
// Priority order (highest to lowest):
// 1. Trigger.dev  — when TRIGGER_SECRET_KEY is set
// 2. Vercel Crons — when VERCEL=1 (auto-set by Vercel platform)
// 3. Local setInterval — fallback for development
```

### זיהוי סביבה אוטומטי

המערכת מזהה אוטומטית את המנגנון הנכון:

- **Trigger.dev**: כאשר `TRIGGER_SECRET_KEY` מוגדר
- **Vercel Crons**: כאשר `VERCEL=1` (מוגדר אוטומטית על ידי Vercel)
- **Local setInterval**: בכל המקרים האחרים (פיתוח מקומי)

## משימות רשומות

קיימות שלוש משימות cron רשומות במערכת:

| משימה | נקודת קצה | לוח זמנים | מטרה |
|-------|-----------|-----------|------|
| סנכרון מאגר | `/api/cron/sync` | `*/5 * * * *` | סנכרון תוכן כל 5 דקות |
| תזכורות מנוי | `/api/cron/subscription-reminders` | `0 9 * * *` | שליחת תזכורות יומית בשעה 9:00 |
| תפוגת מנוי | `/api/cron/subscription-expiration` | `0 0 * * *` | טיפול במנויים שפגו בחצות |

## הגדרת Vercel Crons

### vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "*/5 * * * *"
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

### משתנה הסביבה CRON_SECRET

מטעמי אבטחה, Vercel חותם על כל קריאת cron עם כותרת `Authorization`. אותו מפתח סודי משמש בשני הצדדים:

```bash
# In Vercel project settings (Environment Variables)
CRON_SECRET=your-secret-here  # openssl rand -base64 32
```

כל נקודת קצה API מאמתת את המפתח הסודי:

```typescript
// app/api/cron/sync/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

## אימות

### שלב 1: לוח הבקרה של Vercel

```
https://vercel.com/{TEAM}/{PROJECT}/settings/cron-jobs
```

ודא ש-3 משימות cron מוצגות עם לוחות הזמנים הנכונים.

### שלב 2: יומני קריאות

```
https://vercel.com/{TEAM}/{PROJECT}/logs?requestPaths=%2Fapi%2Fcron%2Fsync
```

### שלב 3: יומני אפליקציה

בעת הפעלת האפליקציה:
```
[BackgroundJobs] Vercel cron mode - jobs handled by /api/cron/sync endpoint
```

בכל סנכרון:
```
[CRON_SYNC] Vercel cron sync triggered
[CRON_SYNC] Completed in XXXms: Repository synced successfully
```

### שלב 4: בדיקה ידנית

```bash
curl -X GET https://yourdomain.com/api/cron/sync \
  -H "Authorization: Bearer $CRON_SECRET"
```

תגובה צפויה:
```json
{
  "success": true,
  "message": "Sync completed",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "duration": 1234
}
```

## פתרון בעיות

### משימות לא רצות

1. ודא ש-`vercel.json` מפרט את כל 3 משימות ה-cron
2. ודא ש-`CRON_SECRET` מוגדר במשתני הסביבה של Vercel
3. ודא שמשתני Trigger.dev **לא** מוגדרים (אחרת הם יקבלו עדיפות)

### שגיאת 401 Unauthorized

```bash
# Generate a new secret
openssl rand -base64 32

# Add to Vercel
vercel env add CRON_SECRET

# Redeploy
vercel --prod
```

### ביצוע תכוף מדי

בדוק אם אין רשומות כפולות ב-`vercel.json` — כל נתיב צריך להופיע פעם אחת בלבד.

## מדריך מעבר

### מקומי ← Vercel Crons

1. הוסף רשומות cron ל-`vercel.json`
2. צור `CRON_SECRET` והגדר אותו
3. פרוס מחדש ל-Vercel

### Vercel → Trigger.dev

```bash
# Install Trigger.dev
pnpm add @trigger.dev/sdk

# Set the environment variable
TRIGGER_SECRET_KEY=your-trigger-secret

# Deploy your trigger jobs
npx trigger.dev@latest deploy
```

### Trigger.dev → Vercel Crons

```bash
# Remove Trigger.dev environment variables
vercel env rm TRIGGER_SECRET_KEY
vercel env rm TRIGGER_API_KEY

# Redeploy
vercel --prod
```
