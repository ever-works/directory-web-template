---
id: client-dashboard-repository
title: Репозиторий панели управления клиента
sidebar_label: Репозиторий панели управления клиента
sidebar_position: 19
---

# Репозиторий панели управления клиента

`ClientDashboardRepository` объединяет данные из хранилища элементов Git и реляционной базы данных (голоса, комментарии, просмотры) для создания комплексной статистики информационной панели для отдельных пользователей клиента.

**Исходный файл:** `template/lib/repositories/client-dashboard.repository.ts`

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

## Экспортированные типы

### `DashboardStats`

Основной тип возвращаемого значения, содержащий все показатели информационной панели:

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

### Поддерживаемые типы

|Тип|Поля|Цель|
|------|--------|---------|
|`ActivityData`|`date`, `submissions`, `views`, `engagement`|Ежедневная активность для графиков|
|`SubmissionTimelineData`|`month`, `submissions`|Ежемесячная подача считается|
|`EngagementOverviewData`|`week`, `votes`, `comments`|Еженедельная разбивка вовлеченности|
|`StatusBreakdownData`|`status`, `value`, `color`|Количество одобренных/ожидающих/отклоненных|
|`TopItem`|`id`, `title`, `views`, `votes`, `comments`|Самые эффективные товары|
|`PeriodComparisonData`|`thisWeek`, `lastWeek`, `change`|Сравнение по неделям|
|`CategoryPerformanceData`|`category`, `itemCount`, `totalEngagement`, `avgEngagement`|Производительность по категориям|
|`ApprovalTrendData`|`month`, `approved`, `total`, `rate`|Ежемесячные ставки одобрения|
|`SubmissionCalendarData`|`date`, `count`|Данные тепловой карты ежедневной отправки|
|`EngagementDistributionData`|`id`, `title`, `slug`, `engagement`, `percentage`|Доля вовлеченности по каждому элементу|

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

## Основной метод

### `getStats(userId): Promise<DashboardStats>`

Основная точка входа, которая создает полный набор данных информационной панели для данного пользователя.

```ts
async getStats(userId: string): Promise<DashboardStats>
```

**Последовательность обработки:**

1. **Разрешение профиля клиента** — вызывает `getClientProfileByUserId(userId)`, чтобы получить `clientProfileId`.
2. **Извлечь пользовательские элементы** — загружает все неудаленные элементы, отправленные этим пользователем, из репозитория Git.
3. **Извлечение фрагментов элементов** – используется в качестве ключей соединения для запросов к базе данных.
4. **Выполнять параллельные запросы** — одновременно запускает 11 запросов через `Promise.all`:

|Функция запроса|Источник|Полученные данные|
|----------------|--------|---------------|
|`getVotesReceivedCount(slugs)`|`dashboard.queries`|Общее количество голосов за товары пользователя|
|`getCommentsReceivedCount(slugs)`|`dashboard.queries`|Всего комментариев к материалам пользователя|
|`getUniqueItemsInteractedCount(profileId)`|`dashboard.queries`|Элементы, с которыми взаимодействовал пользователь|
|`getUserTotalActivityCount(profileId)`|`dashboard.queries`|Общее количество активности пользователей|
|`getWeeklyEngagementData(slugs, 12)`|`dashboard.queries`|Данные о взаимодействии за 12 недель|
|`getDailyActivityData(profileId, slugs, 7)`|`dashboard.queries`|Данные о активности за 7 дней|
|`getTopItemsEngagement(slugs, 10)`|`dashboard.queries`|Топ-10 товаров по вовлеченности|
|`getTotalViewsCount(slugs)`|`item-view.queries`|Всего просмотров страниц|
|`getRecentViewsCount(slugs, 7)`|`item-view.queries`|Просмотры за последние 7 дней|
|`getDailyViewsData(slugs, 14)`|`item-view.queries`|Данные о ежедневных просмотрах за 14 дней|
|`getViewsPerItem(slugs)`|`item-view.queries`|Количество просмотров для каждого фрагмента элемента|

5. **Расчет производных показателей** – обработка необработанных данных в форматы, готовые для диаграмм.

---

## Private Calculation Methods

### `calculateStatusBreakdown(items)`

Counts items by status (approved, pending, rejected) and assigns color codes.

Returns: `StatusBreakdownData[]` with hex colors (`#10B981`, `#F59E0B`, `#EF4444`).

---

### `calculateSubmissionTimeline(items)`

Объединяет представленные материалы по месяцам за последние 6 месяцев. Использует метки времени `submitted_at` из данных элемента.

Возвращает: `SubmissionTimelineData[]` с сокращениями месяцев (январь, февраль и т. д.).

---

### `calculateRecentSubmissions(items, days)`

Counts items submitted within the last N days.

---

### `mapTopItems(engagement, items, viewsPerItem)`

Объединяет данные взаимодействия (голоса, комментарии) из базы данных с метаданными элемента из Git и количеством просмотров. Возвращает первые 5 элементов.

---

### `injectViewsIntoActivityData(activityData, dailyViewsMap)`

Merges daily view counts from the `dailyViewsMap` into the activity chart data array by matching date strings.

---

### `calculatePeriodComparison(engagementOverview, items, dailyViewsMap)`

Вычисляет еженедельные изменения голосов, комментариев, материалов и просмотров. Вычисляет процентное изменение с защитой деления на ноль (возвращает 100 %, если предыдущее значение было 0, а текущее значение положительное).

---

### `calculateCategoryPerformance(items, topItemsEngagement, viewsPerItem)`

Groups items by category and aggregates engagement (votes + comments + views). Items with multiple categories are counted for each category. Returns the top 5 categories sorted by average engagement.

---

### `calculateApprovalTrend(items)`

Отслеживает ежемесячный уровень одобрения за последние 6 месяцев. Возвращает количество утвержденных элементов, общее количество элементов и процент утверждения.

---

### `calculateSubmissionCalendar(items)`

Generates a 90-day calendar heatmap dataset showing daily submission counts.

---

### `calculateEngagementDistribution(items, topItemsEngagement, viewsPerItem)`

Вычисляет процентную долю вовлеченности для 10 лучших элементов по общему числу вовлеченности (голоса + комментарии + просмотры).

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

## Константы

|Константа|Ценности|
|----------|--------|
|`STATUS_COLORS`|Одобрено: `#10B981`, Ожидается: `#F59E0B`, Отклонено: `#EF4444`|
|`ENGAGEMENT_COLORS`|просмотры: `#3B82F6`, голоса: `#10B981`, комментарии: `#F59E0B`, акции: `#8B5CF6`|
|`MONTH_NAMES`|`['Jan', 'Feb', ..., 'Dec']`|

---

## Empty State Handling

When a user has no client profile, the repository returns a complete `DashboardStats` object with all values zeroed out via `getEmptyStats()`. This includes properly structured empty arrays for all chart data so the UI can render empty-state charts without null checks.

---

## Пример использования

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
