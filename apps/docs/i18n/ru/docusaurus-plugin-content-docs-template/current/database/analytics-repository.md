---
id: analytics-repository
title: Репозиторий административной аналитики
sidebar_label: Репозиторий аналитики
sidebar_position: 18
---

# Оптимизированный репозиторий Admin Analytics

Класс `AdminAnalyticsOptimizedRepository` предоставляет высокопроизводительные аналитические запросы для панели администратора. Он использует необработанный SQL через Drizzle ORM с кэшем TTL в памяти, чтобы снизить нагрузку на базу данных для часто используемых метрик.

**Исходный файл:** `template/lib/repositories/admin-analytics-optimized.repository.ts`

---

## Architecture Overview

```
Admin Dashboard UI
        |
  API Route Handler
        |
  AdminAnalyticsOptimizedRepository
        |
    SimpleCache (in-memory TTL)
        |
    Drizzle ORM (raw SQL)
        |
    PostgreSQL
```

All queries use `db.execute(sql\`...\`)` with parameterized inputs for SQL injection safety. Results are cached with configurable TTLs per query type.

---

## Экспортированные интерфейсы

### `UserGrowthTrend`

```ts
interface UserGrowthTrend {
  month: string;    // e.g. "Jan 2025"
  users: number;    // new users that month
  active: number;   // cumulative total
}
```

### `ActivityTrend`

```ts
interface ActivityTrend {
  day: string;      // e.g. "Mar 5"
  views: number;    // always 0 (views not tracked in current schema)
  votes: number;
  comments: number;
}
```

### `TopItem`

```ts
interface TopItem {
  name: string;
  views: number;     // always 0 (views not tracked)
  votes: number;
  category?: string;
}
```

### `RecentActivity`

```ts
interface RecentActivity {
  type: 'user_signup' | 'submission' | 'comment' | 'vote';
  description: string;
  timestamp: string;   // ISO 8601
  user?: string;
}
```

---

## Cache System

The repository uses a `SimpleCache` class -- an in-memory `Map`-based cache with TTL expiration.

### Cache Keys and TTLs

| Cache Key | TTL | Description |
|-----------|-----|-------------|
| `user_growth` | 10 minutes | User growth trend data |
| `activity_trends` | 5 minutes | Daily activity data |
| `top_items` | 15 minutes | Top items by vote count |
| `recent_activity` | 2 minutes | Recent activity feed |
| `user_stats` | 10 minutes | Aggregate user statistics |
| `activity_stats` | 5 minutes | Aggregate activity statistics |

### Cache Methods

```ts
cache.set(key: string, data: any, ttl: number): void
cache.get(key: string): any | null
cache.clear(): void
cache.invalidate(pattern: string): void   // deletes keys containing pattern
```

---

## Методы запроса

### `getUserGrowthTrends(months?): Promise<UserGrowthTrend[]>`

Возвращает ежемесячные тенденции регистрации пользователей с совокупными итоговыми значениями.

```ts
async getUserGrowthTrends(months: number = 12): Promise<UserGrowthTrend[]>
```

|Параметр|Тип|По умолчанию|Диапазон|
|-----------|------|---------|-------|
|`months`|`number`| `12` | 1 -- 120 |

**Шаблон SQL:** Использует CTE (`monthly_counts`) для группировки `users.created_at` по `DATE_TRUNC('month', ...)`, затем накопительную оконную функцию (`SUM(...) OVER (ORDER BY month_start)`) для вычисления текущих итогов. Результаты ограничены запрошенным количеством месяцев и упорядочены по возрастанию.

```sql
WITH monthly_counts AS (
  SELECT DATE_TRUNC('month', created_at) AS month_start,
         COUNT(*) AS new_users
  FROM users WHERE deleted_at IS NULL
  GROUP BY DATE_TRUNC('month', created_at)
),
cum_counts AS (
  SELECT month_start, new_users,
         SUM(new_users) OVER (ORDER BY month_start) AS cumulative_users
  FROM monthly_counts
)
SELECT * FROM (
  SELECT * FROM cum_counts ORDER BY month_start DESC LIMIT $1
) t ORDER BY month_start ASC
```

---

### `getActivityTrends(days?): Promise<ActivityTrend[]>`

Returns daily vote and comment activity for the specified number of days.

```ts
async getActivityTrends(days: number = 7): Promise<ActivityTrend[]>
```

| Parameter | Type | Default | Range |
|-----------|------|---------|-------|
| `days` | `number` | `7` | 1 -- 365 |

**SQL pattern:** Uses `UNION ALL` to combine daily counts from `votes` and `comments` tables, then pivots with conditional `SUM(CASE WHEN ...)` aggregation. Missing days are filled with zeros by generating a complete date range in JavaScript and using an O(1) `Map` lookup.

---

### `getTopItems(limit?): Promise<TopItem[]>`

Возвращает элементы, ранжированные по общему количеству голосов.

```ts
async getTopItems(limit: number = 10): Promise<TopItem[]>
```

|Параметр|Тип|По умолчанию|Диапазон|
|-----------|------|---------|-------|
|`limit`|`number`| `10` | 1 -- 1000 |

**Шаблон SQL:** использует CTE с оконной функцией `ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)` для ранжирования элементов по количеству голосов, а затем фильтрует до N верхних значений.

```sql
WITH item_rankings AS (
  SELECT item_id, COUNT(*) as vote_count,
         ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC) as rank
  FROM votes GROUP BY item_id
)
SELECT item_id, vote_count, rank
FROM item_rankings WHERE rank <= $1
ORDER BY rank ASC
```

---

### `getRecentActivity(limit?): Promise<RecentActivity[]>`

Returns a mixed feed of recent user signups, comments, and votes.

```ts
async getRecentActivity(limit: number = 10): Promise<RecentActivity[]>
```

| Parameter | Type | Default | Range |
|-----------|------|---------|-------|
| `limit` | `number` | `10` | 1 -- 500 |

**SQL pattern:** Uses parenthesized `UNION ALL` subqueries, each with their own `ORDER BY ... DESC LIMIT N` clause, pulling roughly one-third of the total limit from each source (users, comments, votes). The final result is ordered by `activity_time DESC` and limited.

---

### `getBatchAnalytics(options?): Promise<BatchResult>`

Выполняет все четыре аналитических запроса параллельно через `Promise.all` для оптимальной производительности загрузки информационной панели.

```ts
async getBatchAnalytics(options?: {
  userGrowthMonths?: number;     // default 12, max 120
  activityTrendDays?: number;    // default 7, max 365
  topItemsLimit?: number;        // default 10, max 1000
  recentActivityLimit?: number;  // default 10, max 500
}): Promise<{
  userGrowth: UserGrowthTrend[];
  activityTrends: ActivityTrend[];
  topItems: TopItem[];
  recentActivity: RecentActivity[];
}>
```

Все входные параметры перед выполнением фиксируются в безопасных границах.

---

## Cache Management

### `clearCache(): Promise<void>`

Clears all cached data. Useful after data mutations that affect analytics.

### `invalidateCache(pattern): Promise<void>`

Selectively removes cache entries whose keys contain the given pattern string.

```ts
await repo.invalidateCache('user_growth');  // clears user growth caches
```

---

## Мониторинг производительности

### `getQueryPerformanceStats(): Promise<PerfStats>`

Возвращает частоту попаданий в кэш и статистику времени запроса.

```ts
async getQueryPerformanceStats(): Promise<{
  cacheHitRate: number;       // 0.0 - 1.0
  totalQueries: number;
  cachedQueries: number;
  averageQueryTime: number;   // milliseconds
}>
```

> **Примечание.** В настоящее время возвращает фиктивные данные. В производстве интегрируйтесь с реальным мониторингом производительности.

---

## Input Validation

All public methods clamp numeric inputs to safe bounds using `Math.max` and `Math.min` to prevent excessively large queries:

- Months: 1 to 120
- Days: 1 to 365
- Limits: 1 to 500/1000

---

## Пример использования

```ts
import { AdminAnalyticsOptimizedRepository } from '@/lib/repositories/admin-analytics-optimized.repository';

const analytics = new AdminAnalyticsOptimizedRepository();

// Load everything for the dashboard in one call
const dashboard = await analytics.getBatchAnalytics({
  userGrowthMonths: 6,
  activityTrendDays: 30,
  topItemsLimit: 5,
  recentActivityLimit: 20,
});

// Individual queries (cached)
const trends = await analytics.getUserGrowthTrends(12);
const activity = await analytics.getActivityTrends(7);

// Cache management
await analytics.clearCache();
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/db/drizzle.ts` | Database connection (`db`) and Drizzle instance |
| `drizzle-orm` | `sql` template tag for parameterized queries |
| `lib/repositories/client-dashboard.repository.ts` | Client-facing dashboard (complementary) |
