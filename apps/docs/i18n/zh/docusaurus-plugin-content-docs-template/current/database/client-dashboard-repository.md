---
id: client-dashboard-repository
title: 客户端仪表板存储库
sidebar_label: 客户端仪表板存储库
sidebar_position: 19
---

# 客户端仪表板存储库

`ClientDashboardRepository` 聚合来自基于 Git 的项目存储和关系数据库（投票、评论、视图）的数据，为各个客户端用户生成全面的仪表板统计数据。

**源文件：** `template/lib/repositories/client-dashboard.repository.ts`

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

## 导出类型

### `DashboardStats`

包含所有仪表板指标的主要返回类型：

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

### 配套类型

|类型|领域|目的|
|------|--------|---------|
|`ActivityData`|`date`、`submissions`、`views`、`engagement`|图表的每日活动|
|`SubmissionTimelineData`|`month`、`submissions`|每月提交次数|
|`EngagementOverviewData`|`week`、`votes`、`comments`|每周参与度细分|
|`StatusBreakdownData`|`status`、`value`、`color`|批准/待定/拒绝计数|
|`TopItem`|`id`、`title`、`views`、`votes`、`comments`|表现最好的项目|
|`PeriodComparisonData`|`thisWeek`、`lastWeek`、`change`|每周比较|
|`CategoryPerformanceData`|`category`、`itemCount`、`totalEngagement`、`avgEngagement`|按类别划分的表现|
|`ApprovalTrendData`|`month`、`approved`、`total`、`rate`|每月批准率|
|`SubmissionCalendarData`|`date`、`count`|每日提交热图数据|
|`EngagementDistributionData`|`id`、`title`、`slug`、`engagement`、`percentage`|每个项目的参与度份额|

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

## 主要方法

### `getStats(userId): Promise<DashboardStats>`

为给定用户构建完整仪表板数据集的主要入口点。

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**处理流程：**

1. **解析客户端配置文件** -- 调用`getClientProfileByUserId(userId)` 获取`clientProfileId`
2. **获取用户项目** -- 从 Git 存储库加载该用户提交的所有未删除的项目
3. **提取项目段** -- 用作数据库查询的连接键
4. **执行并行查询** -- 通过 `Promise.all` 同时运行 11 个查询：

|查询功能|来源|检索到的数据|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|用户项目的总投票数|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|用户项目的总评论数|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|用户与之交互的项目|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|用户活动总数|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 周的参与度数据|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 天的活动数据|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|按参与度排名前 10 的项目|
|`getTotalViewsCount(slugs)`|`item-view.queries`|总页面浏览量|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|过去 7 天内的观看次数|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14天每日浏览数据|
|`getViewsPerItem(slugs)`|`item-view.queries`|查看每个项目 slug 的计数|

5. **计算派生指标**——将原始数据处理为图表就绪格式

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

按月汇总过去 6 个月的提交内容。使用项目数据中的 `submitted_at` 时间戳。

返回：`SubmissionTimelineData[]`，带有月份缩写（Jan、Feb 等）。

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

将数据库中的参与数据（投票、评论）与 Git 中的项目元数据和查看计数连接起来。返回前 5 个项目。

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

计算投票、评论、提交和观点的每周变化。计算除零保护的百分比变化（如果先前为 0 并且当前为正，则返回 100%）。

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

跟踪过去 6 个月的每月支持率。返回批准的项目数、项目总数以及批准百分比。

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

按总参与度（投票 + 评论 + 观看次数）计算前 10 个项目的参与度份额百分比。

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

## 常数

|常数|价值观|
|----------|--------|
|`STATUS_COLORS`|已批准：`#10B981`，待定：`#F59E0B`，已拒绝：`#EF4444`|
|`ENGAGEMENT_COLORS`|浏览量：`#3B82F6`，投票：`#10B981`，评论：`#F59E0B`，分享：`#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## 使用示例

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
