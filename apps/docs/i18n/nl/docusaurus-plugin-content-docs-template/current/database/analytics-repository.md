---
id: analytics-repository
title: Opslagplaats voor beheerdersanalyses
sidebar_label: Analytics-opslagplaats
sidebar_position: 18
---

# Geoptimaliseerde opslagplaats voor beheerdersanalyse

De klasse `AdminAnalyticsOptimizedRepository` biedt hoogwaardige analysequery's voor het beheerdersdashboard. Het maakt gebruik van onbewerkte SQL via Drizzle ORM met een in-memory TTL-cache om de databasebelasting voor vaak gebruikte statistieken te verminderen.

**Bronbestand:** `template/lib/repositories/admin-analytics-optimized.repository.ts`

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

## Geëxporteerde interfaces

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

## Querymethoden

### `getUserGrowthTrends(months?): Promise<UserGrowthTrend[]>`

Retourneert maandelijkse trends in gebruikersregistratie met cumulatieve totalen.

```ts
async getUserGrowthTrends(months: number = 12): Promise<UserGrowthTrend[]>
```

|Parameter|Typ|Standaard|Bereik|
|-----------|------|---------|-------|
|`months`|`number`| `12` | 1 -- 120 |

**SQL-patroon:** Gebruikt een CTE (`monthly_counts`) om `users.created_at` te groeperen op `DATE_TRUNC('month', ...)`, en vervolgens een cumulatieve vensterfunctie (`SUM(...) OVER (ORDER BY month_start)`) om lopende totalen te berekenen. Resultaten zijn beperkt tot het gevraagde aantal maanden en oplopend gerangschikt.

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

Retourneert items gerangschikt op basis van het totale aantal stemmen.

```ts
async getTopItems(limit: number = 10): Promise<TopItem[]>
```

|Parameter|Typ|Standaard|Bereik|
|-----------|------|---------|-------|
|`limit`|`number`| `10` | 1 -- 1000 |

**SQL-patroon:** Gebruikt een CTE met `ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)` vensterfunctie om items te rangschikken op basis van het aantal stemmen, en filtert vervolgens naar de bovenste N.

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

Voert alle vier analysequery's parallel uit via `Promise.all` voor optimale laadprestaties van dashboards.

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

Alle invoerparameters worden vóór uitvoering binnen veilige grenzen gehouden.

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

## Prestatiebewaking

### `getQueryPerformanceStats(): Promise<PerfStats>`

Retourneert het cachetrefferpercentage en statistieken over de timing van zoekopdrachten.

```ts
async getQueryPerformanceStats(): Promise<{
  cacheHitRate: number;       // 0.0 - 1.0
  totalQueries: number;
  cachedQueries: number;
  averageQueryTime: number;   // milliseconds
}>
```

> **Opmerking:** Retourneert momenteel nepgegevens. Integreer in de productie met daadwerkelijke prestatiemonitoring.

---

## Input Validation

All public methods clamp numeric inputs to safe bounds using `Math.max` and `Math.min` to prevent excessively large queries:

- Months: 1 to 120
- Days: 1 to 365
- Limits: 1 to 500/1000

---

## Gebruiksvoorbeeld

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
