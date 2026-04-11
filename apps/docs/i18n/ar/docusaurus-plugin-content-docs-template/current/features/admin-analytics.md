---
id: admin-analytics
title: تحليلات المشرف
sidebar_label: تحليلات المشرف
sidebar_position: 32
---

#تحليلات إدارية

يوفر نظام تحليلات المسؤول إحصائيات على مستوى النظام الأساسي، ومقاييس المشاركة، وتتبع نمو المستخدم، ومعالجة بيانات الخلفية. فهو يجمع بين استعلامات قاعدة البيانات في الوقت الفعلي والتجمعات المخزنة مؤقتًا وتكامل PostHog الاختياري للتحليلات الشاملة.

## نظرة عامة على الهندسة المعمارية

| الوحدة | المسار | الغرض |
|--------|------|---------|
| مستودع احصائيات المشرف | `lib/repositories/admin-stats.repository.ts` | إحصائيات لوحة القيادة الأساسية |
| استعلامات لوحة التحكم | `lib/db/queries/dashboard.queries.ts` | استعلامات تجميع المشاركة |
| استعلامات المشاركة | `lib/db/queries/engagement.queries.ts` | مقاييس لكل عنصر |
| معالج الخلفية التحليلية | `lib/services/analytics-background-processor.ts` | جدولة المهام الخلفية |
| عميل التحليلات | 4ـ | تكامل PostHog/Sentry من جانب العميل |
| خدمة PostHog API | 5 ــ | استعلامات PostHog من جانب الخادم |
| تصدير التحليلات | 6ـ | وظيفة تصدير البيانات |
| التقارير المجدولة | `lib/services/analytics-scheduled-reports.service.ts` | توليد التقرير الآلي |

## إحصائيات لوحة تحكم المشرف

يجمع "8" أربع فئات من الإحصائيات باستخدام "9" لتحميل البيانات المرنة:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### إحصائيات المستخدم

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

تستخدم الاستعلامات حدود التاريخ المقيسة بالتوقيت العالمي المنسق (UTC) لضمان الحصول على نتائج متسقة بغض النظر عن المنطقة الزمنية للخادم:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### إحصائيات التقديم

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

تم الجلب من الطريقة `ItemRepository.getStats()` نظرًا لأن العناصر موجودة في نظام إدارة المحتوى المستند إلى Git.

### إحصائيات النشاط

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

يتم الحصول على طرق العرض من PostHog عند تكوينها، وتعود إلى الصفر:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### إحصائيات النشرة الإخبارية

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## معالجة تحليلات الخلفية

يقوم `AnalyticsBackgroundProcessor` بجدولة ست وظائف متكررة:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| الوظيفة | الفاصل | الغرض |
|-----|----------|---------|
| تجميع نمو المستخدم | 10 دقائق | تحديث اتجاهات نمو المستخدم |
| تجميع اتجاهات النشاط | 5 دقائق | تحديثات السلسلة الزمنية للمشاركة |
| أعلى العناصر الترتيب | 15 دقيقة | إعادة حساب تصنيفات شعبية العنصر |
| تحديث النشاط الأخير | 2 دقيقة | تحديث أحدث خلاصة النشاط |
| تحديث مقاييس الأداء | 30 ثانية | يقوم بتحديث بيانات الأداء في الوقت الحقيقي |
| تنظيف ذاكرة التخزين المؤقت | 1 ساعة | يزيل التجميعات المخزنة مؤقتًا التي لا معنى لها |

يمكن تعطيل الوظائف عن طريق الإعداد `DISABLE_AUTO_SYNC=true` .

تتتبع كل وظيفة حالتها الخاصة:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## مقاييس المشاركة

### مقاييس لكل عنصر

تقوم الدالة 0 بجلب جميع المقاييس بالتوازي:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

تنفيذ أربعة استعلامات متوازية:

1. عرض الأعداد من `item_views` 2. صافي درجات التصويت من `votes` (التصويت الإيجابي = +1، التصويت السلبي = -1)
3. الأعداد المفضلة من `favorites` 4. عدد التعليقات ومتوسط التقييمات من `comments` (باستثناء المحذوفة مبدئيًا)

### نقاط الشعبية

يتم تسجيل العناصر باستخدام خوارزمية لوغاريتمية:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## التحليلات من جانب العميل

تدير الفئة المفردة 0 في 1 التتبع من جانب العميل:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### موفري تتبع الاستثناءات

تدعم وحدة التحليلات ثلاثة تكوينات لتتبع الاستثناءات:

| مقدم | الوصف |
|----------|------------|
| `posthog` | تم إرسال الأخطاء إلى PostHog فقط |
| `sentry` | الأخطاء المرسلة إلى Sentry فقط |
| `both` | تم إرسال الأخطاء إلى كل من PostHog وSentry |

يتم تحديد الموفر من -3 مع الرجوع التلقائي في حالة عدم توفر الموفر الذي تم تكوينه.

### تكوين PostHog

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

تتحكم معدلات أخذ العينات في النسبة المئوية للجلسات التي يتم تتبعها وتكوينها عبر متغيرات البيئة.

## استعلامات بيانات لوحة المعلومات

### اتجاهات المشاركة الأسبوعية

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

يستخدم PostgreSQL `to_char(date, 'IYYY-IW')` لتجميع أسابيع ISO.

### توزيع النشاط اليومي

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### العناصر ذات الأداء الأعلى

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

يتم ترتيب العناصر حسب إجمالي المشاركة (الأصوات بالإضافة إلى التعليقات).

## تحميل البيانات المرنة

تستخدم الطريقة `getAllStats` 1 لضمان أن الأعطال الجزئية لا تؤدي إلى كسر لوحة المعلومات:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## متطلبات الإذن

يتم تحديد ميزات التحليلات بواسطة نظام الأذونات:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

الوصول إلى الميزات المستندة إلى الخطة:

| ميزة | مجاني | قياسي | بريميوم |
|---------|------|----------|---------|
| عرض الإحصائيات | لا | نعم | نعم |
| تحليلات متقدمة | لا | لا | نعم |

## الوثائق ذات الصلة

- [خلفية التحليلات](/docs/template/services/analytics-background) -- تفاصيل معالجة الخلفية
- [خدمة PostHog](/docs/template/services/posthog-service) - واجهة برمجة التطبيقات من جانب خادم PostHog
- [خدمة التصدير](/docs/template/services/export-service) -- تصدير البيانات
- [خدمة النشاط](/docs/template/services/activity-service) -- تتبع نشاط المستخدم
- [خدمة المشاركة](/docs/template/services/engagement-services) -- نقاط الشعبية
