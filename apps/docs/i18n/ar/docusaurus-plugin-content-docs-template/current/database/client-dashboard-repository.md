---
id: client-dashboard-repository
title: مستودع لوحة تحكم العميل
sidebar_label: مستودع لوحة تحكم العميل
sidebar_position: 19
---

# مستودع لوحة تحكم العميل

يقوم `ClientDashboardRepository` بتجميع البيانات من تخزين العناصر المستندة إلى Git وقاعدة البيانات العلائقية (الأصوات والتعليقات وطرق العرض) لإنتاج إحصائيات لوحة معلومات شاملة لمستخدمي العميل الفرديين.

**الملف المصدر:** `template/lib/repositories/client-dashboard.repository.ts`

---

## Architecture Overview

```
Client Dashboard UI
        |
  API Route / Server Action
        |
  ClientDashboardRepository
        |
  +-----+-----+-----+-----+
  |           |             |
ItemRepository  DB Queries  View Queries
  (Git)       (dashboard)   (item-view)
```

The repository orchestrates parallel queries across two data sources:

1. **Git-based items** -- via `ItemRepository` for submission data
2. **PostgreSQL** -- via specialized query functions for votes, comments, views, and engagement data

---

## الأنواع المصدرة

### `DashboardStats`

نوع الإرجاع الأساسي الذي يحتوي على جميع مقاييس لوحة المعلومات:

```ts
interface DashboardStats {
  totalSubmissions: number;
  totalViews: number;
  totalVotesReceived: number;
  totalCommentsReceived: number;
  viewsAvailable: boolean;
  recentActivity: { newSubmissions: number; newViews: number };
  uniqueItemsInteracted: number;
  totalActivity: number;
  activityChartData: ActivityData[];
  engagementChartData: Array<{ name: string; value: number; color: string }>;
  submissionTimeline: SubmissionTimelineData[];
  engagementOverview: EngagementOverviewData[];
  statusBreakdown: StatusBreakdownData[];
  topItems: TopItem[];
  periodComparison: PeriodComparisonData;
  categoryPerformance: CategoryPerformanceData[];
  approvalTrend: ApprovalTrendData[];
  submissionCalendar: SubmissionCalendarData[];
  engagementDistribution: EngagementDistributionData[];
}
```

### الأنواع الداعمة

|اكتب|الحقول|الغرض|
|------|--------|---------|
|`ActivityData`|`date`، `submissions`، `views`، `engagement`|النشاط اليومي للرسوم البيانية|
|`SubmissionTimelineData`|`month`، `submissions`|عدد التقديمات الشهرية|
|`EngagementOverviewData`|`week`، `votes`، `comments`|انهيار المشاركة الأسبوعية|
|`StatusBreakdownData`|`status`، `value`، `color`|التهم المعتمدة/المعلقة/المرفوضة|
|`TopItem`|`id`، `title`، `views`، `votes`، `comments`|العناصر الأعلى أداءً|
|`PeriodComparisonData`|`thisWeek`، `lastWeek`، `change`|مقارنة أسبوع بعد أسبوع|
|`CategoryPerformanceData`|`category`، `itemCount`، `totalEngagement`، `avgEngagement`|الأداء حسب الفئة|
|`ApprovalTrendData`|`month`، `approved`، `total`، `rate`|معدلات الموافقة الشهرية|
|`SubmissionCalendarData`|`date`، `count`|تقديم بيانات خريطة الحرارة اليومية|
|`EngagementDistributionData`|`id`، `title`، `slug`، `engagement`، `percentage`|حصة المشاركة لكل عنصر|

---

## Class Definition

```ts
export class ClientDashboardRepository {
  private itemRepository: ItemRepository;

  constructor() {
    this.itemRepository = new ItemRepository();
  }
}
```

---

## الطريقة الأولية

### `getStats(userId): Promise<DashboardStats>`

نقطة الإدخال الرئيسية التي تقوم بإنشاء مجموعة بيانات لوحة المعلومات الكاملة لمستخدم معين.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**تدفق المعالجة:**

1. **حل ملف تعريف العميل**--استدعاء `getClientProfileByUserId(userId)` للحصول على `clientProfileId`
2. **جلب عناصر المستخدم** - تحميل جميع العناصر غير المحذوفة التي أرسلها هذا المستخدم من مستودع Git
3. **استخراج الارتباطات الثابتة للعناصر** - تستخدم كمفاتيح ربط لاستعلامات قاعدة البيانات
4. ** تنفيذ استعلامات متوازية ** - تشغيل 11 استعلامًا في وقت واحد عبر `Promise.all`:

|وظيفة الاستعلام|المصدر|تم استرجاع البيانات|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|إجمالي الأصوات على عناصر المستخدم|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|إجمالي التعليقات على عناصر المستخدم|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|العناصر التي تفاعل معها المستخدم|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|إجمالي عدد أنشطة المستخدم|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 أسبوعًا من بيانات المشاركة|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 أيام من بيانات النشاط|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|أفضل 10 عناصر حسب المشاركة|
|`getTotalViewsCount(slugs)`|`item-view.queries`|إجمالي مشاهدات الصفحة|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|المشاهدات في آخر 7 أيام|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 يومًا من بيانات العرض اليومية|
|`getViewsPerItem(slugs)`|`item-view.queries`|عرض التهم لكل سبيكة البند|

5. **حساب المقاييس المشتقة** - يعالج البيانات الأولية في تنسيقات جاهزة للرسم البياني

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

تجميع الطلبات المقدمة حسب الشهر لآخر 6 أشهر. يستخدم `submitted_at` الطوابع الزمنية من بيانات العنصر.

المرتجعات: `SubmissionTimelineData[]` مع اختصارات الأشهر (يناير، فبراير، وما إلى ذلك).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

ضم بيانات المشاركة (الأصوات والتعليقات) من قاعدة البيانات مع بيانات تعريف العنصر من Git وعدد مرات العرض. إرجاع أعلى 5 عناصر.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

يحسب التغييرات أسبوع بعد أسبوع للتصويتات والتعليقات وعمليات الإرسال، وجهات النظر. لحساب النسبة المئوية للتغير مع حماية القسمة على الصفر (إرجاع 100% إذا كانت القيمة السابقة 0 والحالية موجبة).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

يتتبع معدل الموافقة الشهرية خلال آخر 6 أشهر. إرجاع عدد العناصر المعتمدة وإجمالي العناصر ونسبة الموافقة.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

حساب نسبة مشاركة المشاركة لأفضل 10 عناصر من خلال إجمالي المشاركة (الأصوات + التعليقات + المشاهدات).

---

## Singleton Pattern

```ts
let clientDashboardRepositoryInstance: ClientDashboardRepository | null = null;

export function getClientDashboardRepository(): ClientDashboardRepository {
  if (!clientDashboardRepositoryInstance) {
    clientDashboardRepositoryInstance = new ClientDashboardRepository();
  }
  return clientDashboardRepositoryInstance;
}
```

Use `getClientDashboardRepository()` for the singleton instance rather than constructing directly.

---

## الثوابت

|ثابت|القيم|
|----------|--------|
|`STATUS_COLORS`|تمت الموافقة عليه: `#10B981`، معلق: `#F59E0B`، مرفوض: `#EF4444`|
|`ENGAGEMENT_COLORS`|المشاهدات: `#3B82F6`، الأصوات: `#10B981`، التعليقات: `#F59E0B`، المشاركات: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## مثال الاستخدام

```ts
import { getClientDashboardRepository } from '@/lib/repositories/client-dashboard.repository';

const dashboardRepo = getClientDashboardRepository();
const stats = await dashboardRepo.getStats('user-abc-123');

// Access metrics
console.log(stats.totalSubmissions);
console.log(stats.periodComparison.change.votes); // e.g. +15 (%)
console.log(stats.categoryPerformance);
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/item.repository.ts` | Git-based item data source |
| `lib/db/queries/dashboard.queries.ts` | Database query functions for engagement |
| `lib/db/queries/item-view.queries.ts` | Database query functions for page views |
| `lib/db/queries/client.queries.ts` | Client profile lookup |
| `lib/types/item.ts` | `ItemData` type definition |
