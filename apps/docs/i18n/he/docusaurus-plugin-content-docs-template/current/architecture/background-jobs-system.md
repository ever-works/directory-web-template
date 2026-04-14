---
id: background-jobs-system
title: מערכת עבודות רקע
sidebar_label: עבודות רקע
sidebar_position: 38
---

# מערכת עבודות רקע

התבנית כוללת מערכת עבודות רקע הניתנת להרחבה עם שלושה יישומים הניתנים להחלפה: מנהל מקומי לפיתוח מבוסס `setInterval`, אינטגרציה של Trigger.dev לייצור ומנהל ללא הפעלה להשבתת עבודות לחלוטין.

## מבנה הקובץ

```
lib/background-jobs/
  index.ts                      # Public API - exports types, factory, config
  types.ts                      # BackgroundJobManager interface, types
  config.ts                     # Trigger.dev configuration, scheduling mode
  job-factory.ts                # Factory function and singleton management
  local-job-manager.ts          # Local setInterval-based implementation
  trigger-dev-job-manager.ts    # Trigger.dev SDK integration
  noop-job-manager.ts           # No-op implementation for disabled mode
  initialize-jobs.ts            # Centralized job registration
  triggers/                     # Job-specific trigger definitions
    analytics.ts
    reports.ts
    subscriptions.ts
    sync.ts
```

## ממשק `BackgroundJobManager`

כל ההטמעות חולקות ממשק משותף:

```ts
export interface BackgroundJobManager {
  // Schedule by interval (milliseconds)
  scheduleJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    interval: number
  ): void;

  // Schedule by cron expression
  scheduleCronJob(
    id: string,
    name: string,
    job: () => void | Promise<void>,
    cronExpression: string
  ): void;

  // Manually trigger a job
  triggerJob(id: string): Promise<void>;

  // Stop a specific job
  stopJob(id: string): void;

  // Stop all jobs
  stopAllJobs(): void;

  // Get status of a specific job
  getJobStatus(id: string): JobStatus | undefined;

  // Get all job statuses
  getAllJobStatuses(): JobStatus[];

  // Get execution metrics
  getJobMetrics(): JobMetrics;
}
```

### סוגי סטטוס ומדדים

```ts
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

## מפעל עבודה (`job-factory.ts`)

המפעל יוצר את המנהל המתאים בהתבסס על הסביבה:

```ts
import { getJobManager, resetJobManager } from '@/lib/background-jobs';

// Get the singleton manager (created on first call)
const manager = getJobManager();

// Register a job
manager.scheduleJob(
  'cleanup',
  'Daily Cleanup',
  async () => { /* ... */ },
  24 * 60 * 60 * 1000 // 24 hours
);

// Reset (useful for testing)
resetJobManager();
```

### לוגיקה של בחירה

המפעל פועל לפי סדר עדיפות זה:

1. **NoOpJobManager** - אם `DISABLE_AUTO_SYNC=true` בפיתוח
2. **TriggerDevJobManager** - אם Trigger.dev מוגדר ומופעל במלואו בייצור
3. **LocalJobManager** - Fallback עבור כל שאר הסביבות

```ts
export function createJobManager(): BackgroundJobManager {
  if (coreConfig.NODE_ENV === 'development' && process.env.DISABLE_AUTO_SYNC === 'true') {
    return new NoOpJobManager();
  }

  if (shouldUseTriggerDev()) {
    return new TriggerDevJobManager(getTriggerDevConfig());
  }

  return new LocalJobManager();
}
```

## LocalJobManager

משתמש ב-`setInterval` לתזמון. אידיאלי לפיתוח ופריסה באירוח עצמי:

```ts
const manager = new LocalJobManager();

// Interval-based scheduling
manager.scheduleJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, 5 * 60 * 1000); // Every 5 minutes

// Cron-based scheduling (converted to interval internally)
manager.scheduleCronJob('cleanup', 'Nightly Cleanup', async () => {
  await runCleanup();
}, '0 0 * * *'); // Daily at midnight
```

### המרת קרון למרווח

ה-`LocalJobManager` ממיר ביטויי cron נפוצים למרווחים משוערים:

|דפוס קרון|מרווח|
|-------------|----------|
| `*/30 * * * * *` |30 שניות|
| `*/2 * * * *` |2 דקות|
| `*/5 * * * *` |5 דקות|
| `*/10 * * * *` |10 דקות|
| `*/15 * * * *` |15 דקות|
| `0 * * * *` |שעה אחת|
| `0 9 * * *` |24 שעות|
|אחר|דקה אחת (ברירת מחדל)|

### שומרי הוצאה להורג

המנהל המקומי מונע ביצועים חופפים. אם עבודה כבר פועלת כאשר המרווח שלה מופעל, הביצוע ידלג:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

רושם משרות עם Trigger.dev SDK לביצוע מבוסס ענן. בייצור, התזמון והביצוע בפועל מטופלים על ידי העובד Trigger.dev, לא טיימרים מקומיים.

```ts
const config: TriggerDevConfig = {
  enabled: true,
  apiKey: 'tr_dev_...',
  apiUrl: 'https://api.trigger.dev',
  environment: 'production',
  isFullyConfigured: true,
  isPartiallyConfigured: false,
};

const manager = new TriggerDevJobManager(config);

// Jobs are registered with Trigger.dev schedules
manager.scheduleCronJob('sync', 'Repository Sync', async () => {
  await syncRepository();
}, '*/5 * * * *');
```

### איך זה עובד

1. `scheduleJob` ממיר את המרווח לביטוי cron
2. `registerTask` טוען בעצלתיים `@trigger.dev/sdk` ומתקשר ל`schedules.task()`
3. מטפל הריצה מתעד מדדים כאשר הוא מבוצע על ידי העובד Trigger.dev
4. `stopJob` מנקה רק מצב מקומי (לוחות זמנים מרוחקים מנוהלים דרך לוח המחוונים של Trigger.dev)

## NoOpJobManager

כל הפעולות הן ללא פעולות. משמש כאשר עבודות רקע מושבתות:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## תצורה (`config.ts`)

### תצורת Trigger.dev

```ts
import { getTriggerDevConfig, shouldUseTriggerDev } from '@/lib/background-jobs';

const config = getTriggerDevConfig();
// => {
//   enabled: boolean,
//   apiKey: string | undefined,
//   apiUrl: string,           // default: 'https://api.trigger.dev'
//   environment: string,      // default: 'development'
//   isFullyConfigured: boolean, // apiKey AND apiUrl present
//   isPartiallyConfigured: boolean,
// }

if (shouldUseTriggerDev()) {
  // Use Trigger.dev (fully configured + enabled + production)
}
```

### מצב תזמון

הפונקציה `getSchedulingMode` קובעת באיזו מערכת להשתמש:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

סדר עדיפות:

1. **נכים** - `DISABLE_AUTO_SYNC` זה נכון
2. **trigger-dev** - מוגדר ומופעל במלואו בייצור
3. **vercel** - פועל על פלטפורמת Vercel
4. **מקומי** - נפילה

## רישום עבודה (`initialize-jobs.ts`)

כל משרות הרקע נרשמות באופן מרכזי באמצעות `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### משרות רשומות

|מזהה משרה|שם|לוח זמנים|תיאור|
|--------|------|----------|-------------|
|`repository-sync`|סנכרון מאגר|כל 5 דקות|מסנכרן את תוכן ה-CMS מבוסס Git|
|`subscription-renewal-reminder`|תזכורת לחידוש מנוי|מדי יום בשעה 9:00 בבוקר|שולח תזכורות למנויים שפג תוקפם|
|`subscription-expired-cleanup`|ניקוי תפוגת מנוי|מדי יום בחצות|מעבד ויפוג מינויים למועד האחרון|

### סינגלטון גארד

פונקציית האתחול כוללת מגן יחיד למניעת רישום כפול:

```ts
let isInitialized = false;

export async function initializeBackgroundJobs(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (isInitialized) return;
  isInitialized = true;

  const { getJobManager } = await import('@/lib/background-jobs');
  const manager = getJobManager();

  // Register jobs with dynamic imports to prevent webpack bundling issues
  manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
    const { syncManager } = await import('@/lib/services/sync-service');
    await syncManager.performSync();
  }, 5 * 60 * 1000);

  // ... more jobs
}
```

ייבוא דינמי בתוך התקשרויות חוזרות לעבודה מונע מה-webpack לנתח את שרשרת התלות המלאה בזמן הבנייה.

## משתני סביבה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|עבור Trigger.dev|מפתח API עבור Trigger.dev|
|`TRIGGER_DEV_API_URL`|לא|כתובת URL מותאמת אישית של ממשק API (ברירת מחדל: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|לא|אפשר Trigger.dev (ברירת מחדל: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|לא|שם הסביבה (ברירת מחדל: `development`)|
|`DISABLE_AUTO_SYNC`|לא|הגדר ל-`true` כדי להשבית את כל עבודות הרקע|
|`VERCEL`|הגדרה אוטומטית|הגדר ל-`1` על ידי פלטפורמת Vercel|

## קבצים קשורים

- `lib/background-jobs/index.ts` - ייצוא API ציבורי
- `lib/background-jobs/types.ts` - הגדרות ממשק וסוג
- `lib/background-jobs/config.ts` - עוזרי תצורה
- `lib/background-jobs/job-factory.ts` - מפעל וסינגלטון
- `lib/background-jobs/local-job-manager.ts` - יישום מקומי
- `lib/background-jobs/trigger-dev-job-manager.ts` - יישום Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - יישום ללא הפעלה
- `lib/background-jobs/initialize-jobs.ts` - רישום למשרה
- `lib/services/sync-service.ts` - שירות סנכרון מאגר
- `lib/services/subscription-jobs.ts` - הטמעת עבודות מנוי
