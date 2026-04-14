---
id: client-dashboard-repository
title: Хранилище на клиентското табло
sidebar_label: Хранилище на клиентското табло
sidebar_position: 19
---

# Хранилище на клиентското табло

`ClientDashboardRepository` агрегира данни от базираното на Git хранилище на елементи и релационната база данни (гласове, коментари, изгледи), за да създаде изчерпателна статистика на таблото за отделни клиентски потребители.

**Изходен файл:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Експортирани типове

### `DashboardStats`

Основният тип връщане, съдържащ всички показатели на таблото за управление:

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

### Поддържащи типове

|Тип|Полета|Цел|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Ежедневна активност за класации|
|`SubmissionTimelineData`|`month`, `submissions`|Месечното подаване се брои|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Седмична разбивка на ангажираността|
|`StatusBreakdownData`|`status`, `value`, `color`|Брой одобрени/предстоящи/отхвърлени|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Артикули с най-висока ефективност|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Сравнение седмица след седмица|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Изпълнение по категории|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Месечни нива на одобрение|
|`SubmissionCalendarData`|`date`, `count`|Ежедневно подаване на данни от топлинна карта|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Дял на ангажираност за артикул|

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

## Основен метод

### `getStats(userId): Promise<DashboardStats>`

Основната входна точка, която изгражда пълния набор от данни на таблото за даден потребител.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Поток на обработка:**

1. **Разрешете клиентски профил** -- обажда се на `getClientProfileByUserId(userId)`, за да получите `clientProfileId`
2. **Извличане на потребителски елементи** -- зарежда всички неизтрити елементи, изпратени от този потребител от хранилището на Git
3. **Извличане на охлюви за елементи** -- използвани като ключове за присъединяване за заявки към база данни
4. **Изпълнявайте паралелни заявки** -- изпълнява 11 заявки едновременно чрез `Promise.all`:

|Функция за заявка|Източник|Данните са извлечени|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Общ брой гласове за артикулите на потребителя|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Общ брой коментари за артикули на потребителя|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Елементи, с които потребителят е взаимодействал|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Общ брой потребителски активности|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|12 седмици данни за ангажираност|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|7 дни данни за дейността|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Топ 10 артикула по ангажираност|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Общо показвания на страници|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Преглеждания през последните 7 дни|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|14 дни ежедневни данни за гледане|
|`getViewsPerItem(slugs)`|`item-view.queries`|Брой прегледи на елемент|

5. **Изчисляване на извлечени показатели** -- обработва необработените данни във формати, готови за графики

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Обединява подаванията по месеци за последните 6 месеца. Използва `submitted_at` времеви клейма от данни за елемент.

Връща: `SubmissionTimelineData[]` със съкращения на месеците (януари, февруари и т.н.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Обединява данни за ангажираност (гласове, коментари) от базата данни с метаданни за артикул от Git и брой прегледи. Връща първите 5 елемента.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Изчислява промените всяка седмица за гласове, коментари, предложения и мнения. Изчислява процентна промяна със защита от деление на нула (връща 100%, ако предишният е бил 0 и текущият е положителен).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Проследява месечния процент на одобрение през последните 6 месеца. Връща броя на одобрените артикули, общия брой на артикулите и процента на одобрение.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Изчислява процента на ангажираност за първите 10 артикула по обща ангажираност (гласове + коментари + показвания).

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

## Константи

|Константа|Ценности|
|----------|--------|
|`STATUS_COLORS`|Одобрено: `#10B981`, чакащо: `#F59E0B`, отхвърлено: `#EF4444`|
|`ENGAGEMENT_COLORS`|гледания: `#3B82F6`, гласове: `#10B981`, коментари: `#F59E0B`, споделяния: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Пример за използване

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
