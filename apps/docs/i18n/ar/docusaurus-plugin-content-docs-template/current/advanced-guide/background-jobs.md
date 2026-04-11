---
id: background-jobs
title: وظائف الخلفية
sidebar_label: وظائف الخلفية
sidebar_position: 4
---

# وظائف الخلفية

يتضمن قالب Ever Works نظامًا قويًا لوظائف الخلفية مع بنية قابلة للتوصيل تدعم الواجهات الخلفية للجدولة المتعددة. يتم تشغيل المهام تلقائيًا لمهام مثل مزامنة المستودع وإدارة الاشتراكات وتسخين ذاكرة التخزين المؤقت للتحليلات.

## نظرة عامة على الهندسة المعمارية

يتبع نظام المهام الخلفية **نمط الإستراتيجية** مع واجهة مشتركة وثلاثة تطبيقات قابلة للتبديل:

| مكون | ملف | الغرض |
|---|---|---|
| `BackgroundJobManager` | `lib/background-jobs/types.ts` | واجهة العقد لجميع المديرين |
| `LocalJobManager` | 4ـ | 5- الجدولة المبنية على التطوير |
| 6ـ | `lib/background-jobs/trigger-dev-job-manager.ts` | تكامل Trigger.dev SDK v4 للإنتاج |
| 8ـ | `lib/background-jobs/noop-job-manager.ts` | عدم التشغيل الصامت للبيئات المعطلة |
| `job-factory.ts` | `lib/background-jobs/job-factory.ts` | المصنع + منطق إنشاء المفردة |
| ‹‹١٢› | 13 ــ | جدولة وضع القرار |
| 14 ــ | `lib/background-jobs/initialize-jobs.ts` | التسجيل المركزي للوظائف |

### دقة وضع الجدولة

يحدد النظام المدير الذي سيتم استخدامه بناءً على تكوين البيئة، باتباع ترتيب أولويات صارم:

```
1. Disabled    -- DISABLE_AUTO_SYNC=true  --> NoOpJobManager
2. Trigger.dev -- Fully configured + production --> TriggerDevJobManager
3. Vercel      -- Running on Vercel platform   --> Vercel Cron (via vercel.json)
4. Local       -- Fallback for all other envs  --> LocalJobManager
```

منطق القرار يعيش في `lib/background-jobs/config.ts` :

```typescript
export function getSchedulingMode(): SchedulingMode {
  if (disableAutoSync) return 'disabled';
  if (shouldUseTriggerDev()) return 'trigger-dev';
  if (isVercelEnvironment()) return 'vercel';
  return 'local';
}
```

## واجهةBackgroundJobManager

يقوم جميع المديرين بتنفيذ نفس الواجهة المحددة في `lib/background-jobs/types.ts` :

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

### أنواع المفاتيح

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

## مصنع العمل وسينجلتون

يقوم المصنع في `lib/background-jobs/job-factory.ts` بإنشاء المدير المناسب ويكشف عن المفرد:

```typescript
import { getJobManager } from '@/lib/background-jobs';

const manager = getJobManager();
manager.scheduleJob('my-job', 'My Job', async () => {
  // job logic
}, 60_000);
```

يضمن المفرد وجود مثيل مدير واحد فقط لكل عملية. استخدم `resetJobManager()` في الاختبارات لمسح المثيل.

## LocalJobManager (التطوير)

يستخدم "1" "2" و"3" للجدولة. وهو يوفر:

- **منع التداخل**: لتخطي التنفيذ إذا كان التشغيل السابق لنفس المهمة لا يزال قيد التقدم.
- **تتبع المقاييس**: يتتبع إجمالي عمليات التنفيذ، وعدد النجاح/الفشل، ومتوسط ​​المدة.
- **تحويل Cron إلى فاصل زمني**: لتحويل تعبيرات cron الشائعة إلى فواصل زمنية بالمللي ثانية للجدولة المحلية التقريبية.
- **وضع التطوير الهادئ**: يقلل من ضوضاء التسجيل عند `NODE_ENV=development` .

تحويلات كرون المدعومة:

| تعبير كرون | الفاصل |
|---|---|
| 5 ــ | 30 ثانية |
| 6ـ | 2 دقيقة |
| `*/5 * * * *` | 5 دقائق |
| 8ـ | 15 دقيقة |
| `0 * * * *` | 1 ساعة |
| `0 9 * * *` | 24 ساعة |

## TriggerDevJobManager (الإنتاج)

يقوم 11 بتسجيل الجداول باستخدام Trigger.dev SDK v4. السلوكيات الرئيسية:

- **لا يوجد مؤقتات محلية**: لا يعمل 12 - تتم معالجة التنفيذ الفعلي من خلال العملية المنفذة Trigger.dev.
- **تحميل SDK البطيء**: يتم استيراد 13 ديناميكيًا لمنع مشكلات التجميع.
- **تحويل الفاصل الزمني إلى cron**: تحويل الفواصل الزمنية بالمللي ثانية إلى تعبيرات cron لواجهة برمجة التطبيقات Trigger.dev.
- **تسجيل القياس**: يسجل مقاييس التنفيذ عندما يستدعي العامل معالج التشغيل.

### التكوين

قم بتعيين متغيرات البيئة التالية لتمكين Trigger.dev:

```bash
TRIGGER_DEV_API_KEY=tr_dev_xxxxx
TRIGGER_DEV_API_URL=https://api.trigger.dev   # optional, defaults to this
TRIGGER_DEV_ENABLED=true
TRIGGER_DEV_ENVIRONMENT=production             # or staging
```

يتم تفعيل المدير فقط عند استيفاء جميع هذه الشروط:
1. تم ضبط كل من `TRIGGER_DEV_API_KEY` و `TRIGGER_DEV_API_URL` ( `isFullyConfigured` )
2. 3 هو 4
3. 5 هو 6

## NoOpJobManager (معطل)

عندما يتم ضبط `DISABLE_AUTO_SYNC=true` قيد التطوير، يتجاهل 8 بصمت جميع مكالمات الجدولة. كل طريقة محظورة، وتبقى المقاييس عند الصفر. وهذا مفيد ل:

- تشغيل خادم التطوير بدون ضجيج في الخلفية
- تصحيح ميزات الواجهة الأمامية فقط
- تقليل استخدام الموارد أثناء تطوير واجهة المستخدم

## الوظائف المسجلة

يتم تسجيل الوظائف مركزيا في 9. تعمل هذه الوحدة أثناء بدء تشغيل التطبيق عبر ربط الأجهزة.

### الوظائف الأساسية

| معرف الوظيفة | الاسم | الجدول الزمني | الوصف |
|---|---|---|---|
| `repository-sync` | مزامنة المستودع | كل 5 دقائق | مزامنة المحتوى من مستودع CMS المستند إلى Git |
| `subscription-renewal-reminder` | تذكير بتجديد الاشتراك | يومياً الساعة 9:00 صباحاً | يرسل تذكيرات عبر البريد الإلكتروني للاشتراكات التي تنتهي صلاحيتها خلال 7 أيام |
| ‹‹١٢› | تنظيف انتهاء الاشتراك | يومياً عند منتصف الليل | يعالج وينتهي الاشتراكات بعد تاريخ انتهائها |

### وظائف التحليلات

مسجل بـ 13 في 14:

| معرف الوظيفة | الاسم | الفاصل |
|---|---|---|
| `analytics-user-growth` | تجميع نمو المستخدم | 10 دقائق |
| 16 ــ | تجميع اتجاهات النشاط | 5 دقائق |
| `analytics-top-items` | أعلى العناصر الترتيب | 15 دقيقة |
| 18 ــ | تحديث النشاط الأخير | 2 دقيقة |
| 19 ــ | تحديث مقاييس الأداء | 30 ثانية |
| 20 ــ | تنظيف ذاكرة التخزين المؤقت | 1 ساعة |

### تشغيل تعريفات معرف المهمة

يتم تعريف معرفات المهام وجداول cron في 21:

| ملف | معرفات المهام | الغرض |
|---|---|---|
| ‹٢٢› | ‹٢٣› | تحليلات تسخين ذاكرة التخزين المؤقت وتنظيفها |
| ‹٢٤› | 25 ــ | مزامنة المستودع |
| ‹٢٦› | ‹٢٧› | إدارة دورة حياة الاشتراك |
| 28 ــ | ‹٢٩› | إنشاء التقرير المجدول |

## تكامل فيرسيل كرون

عند النشر إلى Vercel، يمكن أيضًا تشغيل وظائف الخلفية عبر Vercel Cron Jobs التي تم تكوينها في 30:

```json
{
  "crons": [
    { "path": "/api/cron/sync", "schedule": "0 3 * * *" },
    { "path": "/api/cron/subscription-reminders", "schedule": "0 9 * * *" },
    { "path": "/api/cron/subscription-expiration", "schedule": "0 0 * * *" }
  ]
}
```

تصل نقاط النهاية هذه إلى مسارات واجهة برمجة التطبيقات (API) التي تنفذ نفس منطق الوظيفة، مما يوفر آلية جدولة أصلية للنظام الأساسي على Vercel.

## إضافة وظيفة خلفية جديدة

### الخطوة 1: تحديد معرفات المهام (اختياري)

إنشاء ملف أو تحديثه في `lib/background-jobs/triggers/` :

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

### الخطوة الثانية: تنفيذ الوظيفة الوظيفية

قم بإنشاء منطق الوظيفة في `lib/services/` :

```typescript
// lib/services/my-feature-jobs.ts
export async function myFeatureCleanupJob(): Promise<void> {
  // Your cleanup logic here
  console.log('[MyFeature] Running cleanup job...');
}
```

### الخطوة 3: قم بالتسجيل في التهيئة-jobs.ts

أضف الوظيفة إلى `lib/background-jobs/initialize-jobs.ts` :

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

**هام**: استخدم 0 ديناميكي داخل رد الاتصال بالمهمة لمنع حزمة الويب من تجميع وحدات Node.js أثناء مرحلة الإنشاء.

### الخطوة 4: إضافة Vercel Cron (اختياري)

في حالة النشر على Vercel، قم بإضافة نقطة نهاية cron إلى `vercel.json` وقم بإنشاء مسار API المقابل:

```json
{ "path": "/api/cron/my-feature-cleanup", "schedule": "0 2 * * *" }
```

## المراقبة والتصحيح

### التحقق من حالة الوظيفة

```typescript
const manager = getJobManager();
const allStatuses = manager.getAllJobStatuses();
const metrics = manager.getJobMetrics();

console.log('Active jobs:', allStatuses.length);
console.log('Total executions:', metrics.totalExecutions);
console.log('Success rate:', (metrics.successfulJobs / metrics.totalExecutions * 100).toFixed(1) + '%');
```

### التشغيل اليدوي للمهمة

```typescript
const manager = getJobManager();
await manager.triggerJob('repository-sync');
```

### تعطيل الوظائف في مجال التنمية

قم بتعيين متغير البيئة لتخطي جميع وظائف الخلفية:

```bash
DISABLE_AUTO_SYNC=true
```

يؤدي هذا إلى تنشيط الزر 0 الذي يتجاهل جميع مكالمات الجدولة بصمت.

## أفضل الممارسات

1. **استخدم دائمًا عمليات الاستيراد الديناميكية** في عمليات رد الاتصال للوظائف المسجلة في `initialize-jobs.ts` لمنع مشكلات تجميع حزمة الويب.
2. **الحفاظ على وظائف الوظيفة غير فعالة** - قد يتم تشغيل المهام أكثر من مرة إذا كان هناك تداخل في التوقيت أو إعادة المحاولة.
3. **استخدم التسجيل المنظم** ببادئة `[JobName]` لتسهيل تصفية السجل.
4. **إرجاع كائنات النتيجة** من وظائف الوظيفة (مثل `JobResult` في `subscription-jobs.ts` ) من أجل إمكانية الملاحظة.
5. **تعامل مع الأخطاء بأمان** - يرصد المدير الأخطاء ويسجلها، ولكن يجب أن يتعامل منطق وظيفتك مع حالات الفشل الجزئية.
6. **اختبر مع LocalJobManager** قيد التطوير قبل النشر إلى Trigger.dev.
