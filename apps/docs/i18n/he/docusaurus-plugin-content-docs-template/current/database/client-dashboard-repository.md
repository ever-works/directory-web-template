---
id: client-dashboard-repository
title: מאגר לוח המחוונים ללקוח
sidebar_label: מאגר לוח המחוונים ללקוח
sidebar_position: 19
---

# מאגר לוח המחוונים ללקוח

ה-`ClientDashboardRepository` צובר נתונים מאחסון הפריטים מבוסס Git וממסד הנתונים היחסי (הצבעות, הערות, צפיות) כדי לייצר נתונים סטטיסטיים מקיפים של לוח המחוונים עבור משתמשי לקוח בודדים.

**קובץ מקור:** `template/lib/repositories/client-dashboard.repository.ts`

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

## סוגים מיוצאים

### `DashboardStats`

סוג ההחזרה הראשי המכיל את כל מדדי לוח המחוונים:

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

### סוגים תומכים

|הקלד|שדות|מטרה|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|פעילות יומית לתרשימים|
|`SubmissionTimelineData`|`month`, `submissions`|ספירת הגשה חודשית|
|`EngagementOverviewData`|`week`, `votes`, `comments`|פירוט מעורבות שבועית|
|`StatusBreakdownData`|`status`, `value`, `color`|ספירות שאושרו/בהמתנה/נדחו|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|פריטים בעלי ביצועים מובילים|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|השוואה משבוע לשבוע|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|ביצועים לפי קטגוריות|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|תעריפי אישורים חודשיים|
|`SubmissionCalendarData`|`date`, `count`|נתוני מפת חום יומית להגשה|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|נתח אירוסין לכל פריט|

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

## שיטה ראשונית

### `getStats(userId): Promise<DashboardStats>`

נקודת הכניסה הראשית שבונה את מערך הנתונים המלא של לוח המחוונים עבור משתמש נתון.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**זרימת עיבוד:**

1. **פתור פרופיל לקוח** -- מתקשר ל`getClientProfileByUserId(userId)` כדי לקבל את ה-`clientProfileId`
2. **אחזר פריטי משתמש** -- טוען את כל הפריטים שלא נמחקו שנשלחו על ידי משתמש זה ממאגר Git
3. **חלץ פריט שבלולים** -- משמש כמפתחות הצטרפות עבור שאילתות מסד נתונים
4. **הפעל שאילתות מקבילות** -- מריץ 11 שאילתות בו זמנית באמצעות `Promise.all`:

|פונקציית שאילתה|מקור|הנתונים אוחזרו|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|סך כל ההצבעות על הפריטים של המשתמש|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|סך כל ההערות על הפריטים של המשתמש|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|פריטים שהמשתמש קיים איתם אינטראקציה|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|ספירת פעילות המשתמש הכוללת|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|נתוני מעורבות של 12 שבועות|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 ימים של נתוני פעילות|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|10 הפריטים המובילים לפי אירוסין|
|`getTotalViewsCount(slugs)`|`item-view.queries`|סך כל הצפיות בדפים|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|צפיות ב-7 הימים האחרונים|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 ימים של נתוני צפייה יומיים|
|`getViewsPerItem(slugs)`|`item-view.queries`|ספירת צפיות לכל שבלול פריט|

5. **חשב מדדים נגזרים** -- מעבד נתונים גולמיים לפורמטים מוכנים לתרשים

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

אוסף הגשות לפי חודש עבור 6 החודשים האחרונים. משתמש בחותמות זמן של `submitted_at` מנתוני פריט.

החזרות: `SubmissionTimelineData[]` עם קיצורי חודש (ינואר, פברואר וכו').

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

מצטרף לנתוני מעורבות (הצבעות, הערות) ממסד הנתונים עם מטא נתונים של פריטים מ-Git וספירת צפיות. מחזירה את 5 הפריטים המובילים.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

מחשב שינויים משבוע לשבוע עבור הצבעות, הערות, הגשות וצפיות. מחשבת שינוי באחוזים עם הגנה על חלוקה באפס (מחזירה 100% אם הקודם היה 0 והנוכחי חיובי).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

עוקב אחר שיעור האישור החודשי במהלך 6 החודשים האחרונים. מחזירה את ספירת הפריטים שאושרו, סך הפריטים ואחוז האישור.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

מחשב את אחוז נתח המעורבות עבור 10 הפריטים המובילים לפי סך המעורבות (הצבעות + הערות + צפיות).

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

## קבועים

|קבוע|ערכים|
|----------|--------|
|`STATUS_COLORS`|אושר: `#10B981`, בהמתנה: `#F59E0B`, נדחה: `#EF4444`|
|`ENGAGEMENT_COLORS`|צפיות: `#3B82F6`, הצבעות: `#10B981`, הערות: `#F59E0B`, שיתופים: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## דוגמה לשימוש

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
