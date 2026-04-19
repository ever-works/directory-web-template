---
id: background-jobs-system
title: نظام وظائف الخلفية
sidebar_label: وظائف الخلفية
sidebar_position: 38
---

# نظام وظائف الخلفية

يتضمن القالب نظام وظائف خلفية قابل للتوسيع مع ثلاثة تطبيقات قابلة للتبديل: مدير محلي للتطوير يعتمد على `setInterval`، وتكامل Trigger.dev للإنتاج، ومدير no-op لتعطيل الوظائف بالكامل.

## هيكل الملف

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

## واجهة `BackgroundJobManager`

تشترك جميع التطبيقات في واجهة مشتركة:

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

### أنواع الحالة والمقاييس

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

## مصنع الوظائف (`job-factory.ts`)

يقوم المصنع بإنشاء المدير المناسب بناءً على البيئة:

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

### منطق الاختيار

يتبع المصنع ترتيب الأولوية هذا:

1. **NoOpJobManager** - إذا كان `DISABLE_AUTO_SYNC=true` قيد التطوير
2. **TriggerDevJobManager** - إذا تم تكوين Trigger.dev بالكامل وتمكينه في الإنتاج
3. **LocalJobManager** - احتياطي لجميع البيئات الأخرى

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

يستخدم `setInterval` للجدولة. مثالية للتطوير وعمليات النشر المستضافة ذاتيًا:

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

### تحويل كرون إلى الفاصل الزمني

يقوم `LocalJobManager` بتحويل تعبيرات cron الشائعة إلى فترات تقريبية:

|نمط كرون|الفاصل الزمني|
|-------------|----------|
| `*/30 * * * * *` |30 ثانية|
| `*/2 * * * *` |2 دقيقة|
| `*/5 * * * *` |5 دقائق|
| `*/10 * * * *` |10 دقائق|
| `*/15 * * * *` |15 دقيقة|
| `0 * * * *` |1 ساعة|
| `0 9 * * *` |24 ساعة|
|أخرى|1 دقيقة (افتراضي)|

### حراس التنفيذ

يمنع المدير المحلي عمليات التنفيذ المتداخلة. إذا كانت المهمة قيد التشغيل بالفعل عند إطلاق الفاصل الزمني الخاص بها، فسيتم تخطي التنفيذ:

```ts
if (jobStatus.status === 'running') {
  // Skip - already running
  return;
}
```

## TriggerDevJobManager

يسجل المهام باستخدام Trigger.dev SDK للتنفيذ المستند إلى السحابة. في الإنتاج، تتم معالجة الجدولة الفعلية والتنفيذ بواسطة عامل Trigger.dev، وليس بواسطة أجهزة ضبط الوقت المحلية.

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

### كيف يعمل

1. `scheduleJob` يحول الفاصل الزمني إلى تعبير cron
2. `registerTask` يقوم بتحميل `@trigger.dev/sdk` بتكاسل ويتصل بـ@@TOK002@@@
3. يسجل معالج التشغيل المقاييس عند تنفيذها بواسطة عامل Trigger.dev
4. `stopJob` يمسح الحالة المحلية فقط (تتم إدارة الجداول الزمنية البعيدة عبر لوحة معلومات Trigger.dev)

## NoOpJobManager

جميع العمليات ليست عمليات. يُستخدم عند تعطيل وظائف الخلفية:

```ts
const manager = new NoOpJobManager();

manager.scheduleJob('sync', 'Sync', async () => { /* never called */ }, 60000);
manager.getAllJobStatuses(); // => []
manager.getJobMetrics(); // => { totalExecutions: 0, ... }
```

## التكوين (`config.ts`)

### تكوين Trigger.dev

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

### وضع الجدولة

تحدد الدالة `getSchedulingMode` النظام الذي سيتم استخدامه:

```ts
import { getSchedulingMode } from '@/lib/background-jobs/config';

const mode = getSchedulingMode();
// => 'trigger-dev' | 'vercel' | 'local' | 'disabled'
```

ترتيب الأولوية:

1. **معطل** - `DISABLE_AUTO_SYNC` صحيح
2. **trigger-dev** - تم تكوينه وتمكينه بالكامل في الإنتاج
3. **vercel** - يعمل على منصة Vercel
4. **محلي** - احتياطي

## تسجيل الوظائف (`initialize-jobs.ts`)

يتم تسجيل جميع وظائف الخلفية مركزيًا عبر `initializeBackgroundJobs`:

```ts
import { initializeBackgroundJobs } from '@/lib/background-jobs/initialize-jobs';

// Call once during app startup
await initializeBackgroundJobs();
```

### وظائف مسجلة

|معرف الوظيفة|الاسم|الجدول الزمني|الوصف|
|--------|------|----------|-------------|
|`repository-sync`|مزامنة المستودع|كل 5 دقائق|مزامنة محتوى CMS المستند إلى Git|
|`subscription-renewal-reminder`|تذكير تجديد الاشتراك|يومياً الساعة 9:00 صباحاً|يرسل تذكيرات لانتهاء صلاحية الاشتراكات|
|`subscription-expired-cleanup`|تنظيف انتهاء الاشتراك|يومياً عند منتصف الليل|يعالج وينتهي الاشتراكات التي فات موعد استحقاقها|

### حارس سينجلتون

تشتمل وظيفة التهيئة على حارس فردي لمنع التسجيل المزدوج:

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

تمنع الواردات الديناميكية داخل عمليات الاسترجاعات الوظيفية حزمة الويب من تحليل سلسلة التبعية الكاملة في وقت الإنشاء.

## متغيرات البيئة

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`TRIGGER_DEV_API_KEY`|بالنسبة إلى Trigger.dev|مفتاح API لـ Trigger.dev|
|`TRIGGER_DEV_API_URL`|لا|عنوان URL المخصص لواجهة برمجة التطبيقات (الافتراضي: `https://api.trigger.dev`)|
|`TRIGGER_DEV_ENABLED`|لا|تمكين Trigger.dev (الافتراضي: `false`)|
|`TRIGGER_DEV_ENVIRONMENT`|لا|اسم البيئة (الافتراضي: `development`)|
|`DISABLE_AUTO_SYNC`|لا|اضبط على `true` لتعطيل جميع وظائف الخلفية|
|`VERCEL`|ضبط تلقائي|اضبط على `1` بواسطة منصة Vercel|

## الملفات ذات الصلة

- `lib/background-jobs/index.ts` - صادرات واجهة برمجة التطبيقات العامة
- `lib/background-jobs/types.ts` - تعريفات الواجهة والنوع
- `lib/background-jobs/config.ts` - مساعدو التكوين
- `lib/background-jobs/job-factory.ts` - المصنع والمفرد
- `lib/background-jobs/local-job-manager.ts` - التنفيذ المحلي
- `lib/background-jobs/trigger-dev-job-manager.ts` - تنفيذ Trigger.dev
- `lib/background-jobs/noop-job-manager.ts` - التنفيذ بدون عملية
- `lib/background-jobs/initialize-jobs.ts` - التسجيل الوظيفي
- `lib/services/sync-service.ts` - خدمة مزامنة المستودع
- `lib/services/subscription-jobs.ts` - تنفيذ مهام الاشتراك
