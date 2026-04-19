---
id: cron-api-endpoints
title: נקודות קצה של Cron API
sidebar_label: Cron API
sidebar_position: 59
---

# נקודות קצה של Cron API

ה-Cron API מספק נקודות קצה מתוזמנות של עבודה המופעלות על ידי Vercel Cron, מתזמנים חיצוניים או `BackgroundJobManager` הפנימי. כל נקודות הקצה של ה-cron דורשות אימות באמצעות משתנה הסביבה `CRON_SECRET` באמצעות אסימון `Bearer` בכותרת `Authorization`.

**ספריית מקור:** `template/app/api/cron/`

---

## Authentication

Cron endpoints use a shared secret for authorization:

- **Production:** The `CRON_SECRET` environment variable must be set. Requests must include `Authorization: Bearer <CRON_SECRET>`.
- **Development:** If `CRON_SECRET` is not configured, access is allowed without authentication for a frictionless local development experience.
- **Security:** All cron endpoints use `crypto.timingSafeEqual()` for constant-time comparison to prevent timing attacks.

**Unauthorized response (401):**

```json
{
  "success": false,
  "message": "Unauthorized - Invalid or missing cron secret"
}
```

---

## תצורת Vercel Cron

לוח הזמנים של הקרון מוגדר ב-`vercel.json`:

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

|איוב|לוח זמנים|תיאור|
|-----|----------|-------------|
|סינכרון תוכן|מדי יום בשעה 03:00 UTC|מסנכרן תוכן מה-CMS מבוסס Git|
|תזכורות על מנוי|מדי יום בשעה 9:00 UTC|שולח מיילים תזכורת לחידוש|
|תפוגת מנוי|מדי יום בחצות UTC|מעבד מנויים שפג תוקפם|

---

## Content Sync

Triggers a content synchronization from the Git-based CMS repository.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/cron/sync` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/sync/route.ts` |

### Response

**Status 200** -- Sync completed successfully.

```json
{
  "success": true,
  "timestamp": "2024-01-20T03:00:05.123Z",
  "duration": 5123,
  "message": "Sync completed successfully"
}
```

**Status 500** -- Sync failed.

```json
{
  "success": false,
  "timestamp": "2024-01-20T03:00:10.456Z",
  "duration": 10456,
  "message": "Cron sync failed",
  "details": "Error description"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | Whether the sync succeeded |
| `timestamp` | `string` (ISO 8601) | When the sync completed |
| `duration` | `number` | Duration in milliseconds |
| `message` | `string` | Human-readable status message |
| `details` | `string` (optional) | Additional details on failure |

### Response Headers

All responses include `Cache-Control: no-cache, no-store, must-revalidate` to prevent caching of sync results.

### curl Example

```bash
curl -s http://localhost:3000/api/cron/sync \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## תפוגת מנוי

מוצא ומעבד מנויים שפג תוקפם על ידי עדכון הסטטוס שלהם מ-`active` ל-`expired` ושליחת הודעות אימייל.

|רכוש|ערך|
|----------|-------|
|**שיטות**|`GET`, `POST`|
|**נתיב**|`/api/cron/subscription-expiration`|
|**אישור**|`CRON_SECRET` (אסימון נושא)|
|**מקור**|`cron/subscription-expiration/route.ts`|

### תגובה

**סטטוס 200** -- עובד בהצלחה.

```json
{
  "success": true,
  "message": "Processed 3 expired subscriptions",
  "data": {
    "processed": 3,
    "affectedUsers": [
      {
        "subscriptionId": "sub_abc123",
        "userId": "user_456",
        "planId": "standard"
      }
    ],
    "errors": [],
    "timestamp": "2024-01-20T00:00:05.123Z"
  }
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`data.processed`|`number`|מספר המנויים שעודכנו לפג תוקף|
|`data.affectedUsers`|`array`|רשימת המינויים המושפעים (ללא PII)|
|`data.errors`|`string[]`|כל שגיאה לא קטלנית (למשל, כשלים במשלוח דוא"ל)|
|`data.timestamp`|`string`|חותמת זמן עיבוד|

### שלבי עיבוד

1. מוצא מנויים פעילים לאחר תאריך הסיום שלהם.
2. מעדכן את הסטטוס מ-`active` ל-`expired`.
3. שולח הודעות דוא"ל על תפוגה באמצעות שירות הדוא"ל.
4. מחזיר סיכום -- כשלים בדוא"ל אינם גורמים לכל העבודה להיכשל.

### תלתל דוגמה

```bash
# Via GET
curl -s http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"

# Via POST (also supported for manual triggers)
curl -s -X POST http://localhost:3000/api/cron/subscription-expiration \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## Subscription Reminders

Sends renewal reminder emails to users with subscriptions nearing their renewal date.

| Property | Value |
|----------|-------|
| **Methods** | `GET`, `POST` |
| **Path** | `/api/cron/subscription-reminders` |
| **Auth** | `CRON_SECRET` (Bearer token) |
| **Source** | `cron/subscription-reminders/route.ts` |

### Response

**Status 200** -- Job completed successfully.

```json
{
  "message": "Subscription reminder job completed",
  "success": true,
  "sent": 5,
  "errors": []
}
```

**Status 207** -- Job completed with partial errors (Multi-Status).

```json
{
  "error": "Job completed with errors",
  "success": false,
  "sent": 3,
  "errors": ["Failed to send reminder to user_123"]
}
```

### curl Example

```bash
curl -s http://localhost:3000/api/cron/subscription-reminders \
  -H "Authorization: Bearer your-cron-secret-here"
```

---

## אתחול משרות רקע

מודול עבודות הרקע (`cron/jobs/background-jobs-init.ts`) אינו נקודת קצה של ממשק API אלא מודול אתחול יחיד המשמש להגדרת מצב התזמון בעת הפעלת האפליקציה.

**מקור:** `cron/jobs/background-jobs-init.ts`

### מצבי תזמון

|מצב|תיאור|
|------|-------------|
|`vercel`|משרות מטופלות על ידי Vercel Cron דרך `/api/cron/*` נקודות קצה|
|`local`|מתזמן פנימי (עבור פריסות באירוח עצמי)|
|`trigger-dev`|שילוב Trigger.dev עבור עבודות רקע מנוהלות|
|`disabled`|סנכרון ברקע מושבת (`DISABLE_AUTO_SYNC=true`)|

### שימוש

```typescript
import { ensureBackgroundJobsInitialized } from '@/app/api/cron/jobs/background-jobs-init';

// Called once from layout.tsx -- safe to call multiple times
await ensureBackgroundJobsInitialized();
```

### תכונות מפתח

- משתמש ב-`globalThis` למצב יחיד, ומבטיח שהאתחול פועל רק פעם אחת בכל תהליך.
- מדלג על אתחול במהלך בדיקות (`NODE_ENV=test`) ובונה (`NEXT_PHASE=phase-production-build`).
- אתחול נכשל מאפס את המצב כדי לאפשר ניסיון חוזר אוטומטי בשיחה הבאה.

---

## TypeScript Usage

```typescript
// Trigger content sync programmatically
async function triggerSync(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/sync', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();

  if (data.success) {
    console.log(`Sync completed in ${data.duration}ms`);
  } else {
    console.error('Sync failed:', data.message, data.details);
  }
}

// Check subscription expiration
async function processExpirations(cronSecret: string): Promise<void> {
  const res = await fetch('/api/cron/subscription-expiration', {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const data = await res.json();
  console.log(`Processed ${data.data.processed} expirations`);

  if (data.data.errors.length > 0) {
    console.warn('Non-fatal errors:', data.data.errors);
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Production: Yes, Dev: No | Shared secret for cron endpoint authentication |
| `DISABLE_AUTO_SYNC` | No | Set to `true` to disable automatic content sync |
