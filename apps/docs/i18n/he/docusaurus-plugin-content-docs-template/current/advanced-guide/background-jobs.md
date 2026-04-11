---
id: background-jobs
title: עבודות רקע
sidebar_label: עבודות רקע
sidebar_position: 4
---

# משרות רקע

תבנית Ever Works כוללת מערכת עבודה רקע חזקה עם ארכיטקטורה ניתנת לחיבור התומכת במספר נקודות אחורי של תזמון. משימות פועלות באופן אוטומטי עבור משימות כגון סנכרון מאגר, ניהול מנויים והתחממות מטמון ניתוח.

## סקירה כללית של אדריכלות

מערכת עבודת הרקע עוקבת אחר **דפוס אסטרטגיה** עם ממשק `BackgroundJobManager` משותף ושלושה יישומים הניתנים להחלפה:

| רכיב | קובץ | מטרה |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | חוזה ממשק לכל המנהלים |
| `LocalJobManager` | `lib/background-jobs/local-job-manager.ts` | תזמון לפיתוח מבוסס `setInterval` |
| `TriggerDevJobManager` | `lib/background-jobs/trigger-dev-job-manager.ts` | שילוב Trigger.dev SDK v4 לייצור |
| `NoOpJobManager` | `lib/background-jobs/noop-job-manager.ts` | ללא הפעלה שקטה עבור סביבות נכים |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | היגיון יצירת מפעל + יחיד |
| `config.ts` | `lib/background-jobs/config.ts` | רזולוציית מצב תזמון |
| `initialize-jobs.ts` | `lib/background-jobs/initialize-jobs.ts` | רישום עבודה מרוכז |

### רזולוציית מצב תזמון

המערכת קובעת באיזה מנהל להשתמש בהתבסס על תצורת הסביבה, לפי סדר עדיפות קפדני:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

היגיון הרזולוציה חי ב- `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## ממשק BackgroundJobManager

כל המנהלים מיישמים את אותו ממשק המוגדר ב- `lib/background-jobs/types.ts` :

```typescript
interface BackgroundJobManager {
  scheduleJob(id: string, name: string, job: () => void | Promise<void>, interval: number): void;
  scheduleCronJob(id: string, name: string, job: () => void | Promise<void>, cronExpression: string): void;
  triggerJob(id: string): Promise<void>;
  stopJob(id: string): void;
  stopAllJobs(): void;
  getJobStatus(id: string): JobStatus | undefined;
  getAllJobStatuses(): JobStatus[];
  getJobMetrics(): JobMetrics;
}
```

### סוגי מפתחות

```typescript
type JobStatusType = 'running' | 'completed' | 'failed' | 'scheduled' | 'stopped';

interface JobStatus {
  id: string;
  name: string;
  status: JobStatusType;
  lastRun: Date | null;
  nextRun: Date | null;
  duration: number;
  error?: string;
}

interface JobMetrics {
  totalExecutions: number;
  successfulJobs: number;
  failedJobs: number;
  averageJobDuration: number;
  lastCleanup: Date;
}
```

## ג'וב מפעל וסינגלטון

המפעל ב `lib/background-jobs/job-factory.ts` יוצר את המנהל המתאים וחושף יחיד:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

הסינגלטון מבטיח שקיים רק מופע מנהל אחד בכל תהליך. השתמש ב- `resetJobManager()` בבדיקות כדי לנקות את המופע.

## LocalJobManager (פיתוח)

ה- `LocalJobManager` משתמש ב- `setInterval` ו- `setTimeout` לתזמון. הוא מספק:

- **מניעת חפיפה**: דילוג על ביצוע אם ריצה קודמת של אותה עבודה עדיין בעיצומה.
- **מעקב אחר מדדים**: עוקב אחר סך כל הביצועים, ספירת הצלחות/כישלונות ומשך זמן ממוצע.
- **המרת קרון למרווח**: ממירה ביטויי קרון נפוצים למרווחים של אלפיות שנייה לתזמון מקומי משוער.
- **מצב פיתוח שקט**: מפחית רעשי רישום כאשר `NODE_ENV=development` .

המרות קרון נתמכות:

| ביטוי קרון | מרווח |
|---|---|
| `*/30 * * * * *` | 30 שניות |
| `*/2 * * * *` | 2 דקות |
| `*/5 * * * *` | 5 דקות |
| `*/15 * * * *` | 15 דקות |
| `0 * * * *` | 1 שעה |
| `0 9 * * *` | 24 שעות |

## TriggerDevJobManager (הפקה)

ה- `TriggerDevJobManager` רושם לוחות זמנים עם Trigger.dev SDK v4. התנהגויות מפתח:

- **ללא טיימרים מקומיים**: לא פועל `setInterval` -- ביצוע בפועל מטופל על ידי תהליך העבודה Trigger.dev.
- **טעינת SDK עצלה**: מייבא באופן דינמי את `@trigger.dev/sdk` כדי למנוע בעיות חבילה.
- **המרה מרווח ל-cron**: ממירה מרווחי אלפיות שניות לביטויי cron עבור ה-API של Trigger.dev.
- **רישום מדדים**: מתעד מדדי ביצוע כאשר העובד מפעיל את מטפל הריצה.

### תצורה

הגדר את משתני הסביבה הבאים כדי להפעיל את Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

המנהל מופעל רק כאשר מתקיימים כל התנאים הבאים:
1. `TRIGGER_DEV_API_KEY` ו- `TRIGGER_DEV_API_URL` מוגדרים שניהם ( `isFullyConfigured` )
2. `TRIGGER_DEV_ENABLED` הוא `true` 3. `NODE_ENV` הוא `production` ## NoOpJobManager (מושבת)

כאשר `DISABLE_AUTO_SYNC=true` מוגדר בפיתוח, ה- `NoOpJobManager` מתעלם בשקט מכל שיחות התזמון. כל שיטה היא ללא הפעלה, והמדדים נשארים באפס. זה שימושי עבור:

- הפעלת שרת הפיתוח ללא רעשי רקע
- איתור באגים בתכונות חזיתיות בלבד
- הפחתת השימוש במשאבים במהלך פיתוח ממשק המשתמש

## משרות רשומות

משרות נרשמות באופן מרכזי ב- `lib/background-jobs/initialize-jobs.ts` . מודול זה פועל במהלך הפעלת האפליקציה באמצעות וו המכשור.

### משרות ליבה

| מזהה משרה | שם | לוח זמנים | תיאור |
|---|---|---|---|
| `repository-sync` | סנכרון מאגר | כל 5 דקות | מסנכרן תוכן ממאגר CMS מבוסס Git |
| `subscription-renewal-reminder` | תזכורת לחידוש מנוי | מדי יום בשעה 9:00 בבוקר | שולח תזכורות בדוא"ל עבור מנויים שיפוג בעוד 7 ימים |
| `subscription-expired-cleanup` | ניקוי תפוגת מנוי | מדי יום בחצות | מעבד ומפוג מנויים לאחר תאריך הסיום שלהם |

### משרות באנליטיקה

נרשם על ידי `AnalyticsBackgroundProcessor` ב- `lib/services/analytics-background-processor.ts` :

| מזהה משרה | שם | מרווח |
|---|---|---|
| `analytics-user-growth` | צבירת גידול משתמשים | 10 דקות |
| `analytics-activity-trends` | צבירת מגמות פעילות | 5 דקות |
| `analytics-top-items` | דירוג פריטים מובילים | 15 דקות |
| `analytics-recent-activity` | עדכון פעילות אחרון | 2 דקות |
| `analytics-performance-metrics` | עדכון מדדי ביצועים | 30 שניות |
| `analytics-cache-cleanup` | ניקוי מטמון | 1 שעה |

### הגדרות מזהה משימות מפעיל

מזהי משימות ולוחות זמנים של cron מוגדרים ב- `lib/background-jobs/triggers/` :

| קובץ | מזהי משימה | מטרה |
|---|---|---|
| `analytics.ts` | `AnalyticsTaskIds` | חימום וניקוי המטמון של Analytics |
| `sync.ts` | `SyncTaskIds` | סנכרון מאגר |
| `subscriptions.ts` | `SubscriptionTaskIds` | ניהול מחזור חיים של מנוי |
| `reports.ts` | `ReportTaskIds` | הפקת דוחות מתוזמנת |

## שילוב Vercel Cron

בעת פריסה ל-Vercel, ניתן להפעיל עבודות רקע באמצעות Vercel Cron Jobs המוגדרות ב- `vercel.json` :

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

נקודות קצה אלו פוגעות בנתיבי API שמבצעים את אותה היגיון עבודה, ומספקות מנגנון תזמון מקורי לפלטפורמה ב-Vercel.

## הוספת עבודת רקע חדשה

### שלב 1: הגדר מזהי משימות (אופציונלי)

צור או עדכן קובץ ב- `lib/background-jobs/triggers/` :

```typescript
// lib/background-jobs/triggers/my-feature.ts
export const MyFeatureTaskIds = {
  cleanup: 'my-feature-cleanup',
  notify: 'my-feature-notify',
} as const;

export const MyFeatureCrons: Record<keyof typeof MyFeatureTaskIds, string> = {
  cleanup: '0 2 * * *',   // Daily at 2 AM
  notify: '*/30 * * * *', // Every 30 minutes
};
```

### שלב 2: יישם את פונקציית העבודה

צור את היגיון העבודה ב- `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### שלב 3: הרשמה ב-initiize-jobs.ts

הוסף את העבודה ל- `lib/background-jobs/initialize-jobs.ts` :

```typescript
manager.scheduleCronJob(
  'my-feature-cleanup',
  'My Feature Cleanup',
  async () => {
    const { myFeatureCleanupJob } = await import('@/lib/services/my-feature-jobs');
    await myFeatureCleanupJob();
  },
  '0 2 * * *'
);
```

**חשוב**: השתמש ב- `import()` דינמי בתוך החזרה לעבודה כדי למנוע מ-webpack לאגד מודולי Node.js במהלך שלב הבנייה.

### שלב 4: הוסף Vercel Cron (אופציונלי)

אם פריסה ב-Vercel, הוסף נקודת קצה cron ל- `vercel.json` וצור את מסלול ה-API המתאים:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## ניטור וניפוי באגים

### בדיקת סטטוס עבודה

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### הפעלת עבודה ידנית

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### השבתת משרות בפיתוח

הגדר את משתנה הסביבה כדי לדלג על כל עבודות הרקע:

```bash
DISABLE_AUTO_SYNC=true
```

פעולה זו מפעילה את `NoOpJobManager` , אשר מתעלם בשקט מכל שיחות תזמון.

## שיטות עבודה מומלצות

1. **השתמש תמיד בייבוא דינמי** בהתקשרות חוזרת לעבודה הרשומה ב- `initialize-jobs.ts` כדי למנוע בעיות של חבילת חבילות אינטרנט.
2. **שמור על פונקציות עבודה אדישות** -- משימות עשויות לפעול יותר מפעם אחת אם יש חפיפות תזמון או ניסיונות חוזרים.
3. **השתמש ברישום מובנה** עם קידומת `[JobName]` לסינון יומן קל יותר.
4. **החזרת אובייקטי תוצאה** מפונקציות עבודה (כמו `JobResult` ב `subscription-jobs.ts` ) לצורך צפייה.
5. **טפל בשגיאות בחן** -- המנהל תופס ומתעד שגיאות, אך היגיון העבודה שלך אמור להתמודד עם כשלים חלקיים.
6. **בדוק עם LocalJobManager** בפיתוח לפני הפריסה ל-Trigger.dev.
