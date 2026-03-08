---
id: client-dashboard-repository
title: Client Dashboard Repository
sidebar_label: Client Dashboard Repository
sidebar_position: 19
---

# Client Dashboard Repository

The `ClientDashboardRepository` aggregates data from the Git-based item storage and the relational database (votes, comments, views) to produce comprehensive dashboard statistics for individual client users.

**Source file:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Exported Types

### `DashboardStats`

The primary return type containing all dashboard metrics:

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

### Supporting Types

| Type | Fields | Purpose |
|------|--------|---------|
| `ActivityData` | `date`, `submissions`, `views`, `engagement` | Daily activity for charts |
| `SubmissionTimelineData` | `month`, `submissions` | Monthly submission counts |
| `EngagementOverviewData` | `week`, `votes`, `comments` | Weekly engagement breakdown |
| `StatusBreakdownData` | `status`, `value`, `color` | Approved/Pending/Rejected counts |
| `TopItem` | `id`, `title`, `views`, `votes`, `comments` | Top performing items |
| `PeriodComparisonData` | `thisWeek`, `lastWeek`, `change` | Week-over-week comparison |
| `CategoryPerformanceData` | `category`, `itemCount`, `totalEngagement`, `avgEngagement` | Performance by category |
| `ApprovalTrendData` | `month`, `approved`, `total`, `rate` | Monthly approval rates |
| `SubmissionCalendarData` | `date`, `count` | Daily submission heatmap data |
| `EngagementDistributionData` | `id`, `title`, `slug`, `engagement`, `percentage` | Engagement share per item |

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

## Primary Method

### `getStats(userId): Promise<DashboardStats>`

The main entry point that builds the complete dashboard dataset for a given user.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Processing flow:**

1. **Resolve client profile** -- calls `getClientProfileByUserId(userId)` to obtain the `clientProfileId`
2. **Fetch user items** -- loads all non-deleted items submitted by this user from the Git repository
3. **Extract item slugs** -- used as join keys for database queries
4. **Execute parallel queries** -- runs 11 queries simultaneously via `Promise.all`:

| Query Function | Source | Data Retrieved |
|----------------|--------|---------------|
| `getVotesReceivedCount(slugs)` | `dashboard.queries` | Total votes on user's items |
| `getCommentsReceivedCount(slugs)` | `dashboard.queries` | Total comments on user's items |
| `getUniqueItemsInteractedCount(profileId)` | `dashboard.queries` | Items the user interacted with |
| `getUserTotalActivityCount(profileId)` | `dashboard.queries` | Total user activity count |
| `getWeeklyEngagementData(slugs, 12)` | `dashboard.queries` | 12 weeks of engagement data |
| `getDailyActivityData(profileId, slugs, 7)` | `dashboard.queries` | 7 days of activity data |
| `getTopItemsEngagement(slugs, 10)` | `dashboard.queries` | Top 10 items by engagement |
| `getTotalViewsCount(slugs)` | `item-view.queries` | Total page views |
| `getRecentViewsCount(slugs, 7)` | `item-view.queries` | Views in last 7 days |
| `getDailyViewsData(slugs, 14)` | `item-view.queries` | 14 days of daily view data |
| `getViewsPerItem(slugs)` | `item-view.queries` | View counts per item slug |

5. **Calculate derived metrics** -- processes raw data into chart-ready formats

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Aggregates submissions by month for the last 6 months. Uses `submitted_at` timestamps from item data.

Returns: `SubmissionTimelineData[]` with month abbreviations (Jan, Feb, etc.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Joins engagement data (votes, comments) from the database with item metadata from Git and view counts. Returns the top 5 items.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Computes week-over-week changes for votes, comments, submissions, and views. Calculates percentage change with division-by-zero protection (returns 100% if previous was 0 and current is positive).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Tracks the monthly approval rate over the last 6 months. Returns the count of approved items, total items, and the approval percentage.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Computes the engagement share percentage for the top 10 items by total engagement (votes + comments + views).

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

## Constants

| Constant | Values |
|----------|--------|
| `STATUS_COLORS` | Approved: `#10B981`, Pending: `#F59E0B`, Rejected: `#EF4444` |
| `ENGAGEMENT_COLORS` | views: `#3B82F6`, votes: `#10B981`, comments: `#F59E0B`, shares: `#8B5CF6` |
| `MONTH_NAMES` | `['Jan', 'Feb', ..., 'Dec']` |

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Usage Example

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
