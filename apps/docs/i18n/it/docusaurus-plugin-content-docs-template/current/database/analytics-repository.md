---
id: analytics-repository
title: Repository di analisi amministrative
sidebar_label: Archivio di analisi
sidebar_position: 18
---

# Repository ottimizzato per l'analisi amministrativa

La classe `AdminAnalyticsOptimizedRepository` fornisce query di analisi ad alte prestazioni per il dashboard di amministrazione. Utilizza SQL non elaborato tramite Drizzle ORM con una cache TTL in memoria per ridurre il carico del database per i parametri a cui si accede frequentemente.

**File sorgente:** `template/lib/repositories/admin-analytics-optimized.repository.ts`

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

## Interfacce esportate

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

## Metodi di interrogazione

### `getUserGrowthTrends(months?): Promise<UserGrowthTrend[]>`

Restituisce le tendenze mensili di registrazione degli utenti con i totali cumulativi.

```ts
async getUserGrowthTrends(months: number = 12): Promise<UserGrowthTrend[]>
```

|Parametro|Digitare|Predefinito|Gamma|
|-----------|------|---------|-------|
|`months`|`number`| `12` | 1 -- 120 |

**Modello SQL:** Utilizza un CTE (`monthly_counts`) per raggruppare `users.created_at` per `DATE_TRUNC('month', ...)`, quindi una funzione finestra cumulativa (`SUM(...) OVER (ORDER BY month_start)`) per calcolare i totali parziali. I risultati sono limitati al numero di mesi richiesto e ordinati in modo crescente.

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

Restituisce gli elementi classificati in base al conteggio totale dei voti.

```ts
async getTopItems(limit: number = 10): Promise<TopItem[]>
```

|Parametro|Digitare|Predefinito|Gamma|
|-----------|------|---------|-------|
|`limit`|`number`| `10` | 1 -- 1000 |

**Modello SQL:** Utilizza un CTE con la funzione finestra `ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC)` per classificare gli elementi in base al conteggio dei voti, quindi filtra fino ai primi N.

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

Esegue tutte e quattro le query di analisi in parallelo tramite `Promise.all` per prestazioni di caricamento del dashboard ottimali.

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

Tutti i parametri di input vengono fissati entro limiti di sicurezza prima dell'esecuzione.

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

## Monitoraggio delle prestazioni

### `getQueryPerformanceStats(): Promise<PerfStats>`

Restituisce la percentuale di riscontri della cache e le statistiche sulla tempistica delle query.

```ts
async getQueryPerformanceStats(): Promise<{
  cacheHitRate: number;       // 0.0 - 1.0
  totalQueries: number;
  cachedQueries: number;
  averageQueryTime: number;   // milliseconds
}>
```

> **Nota:** Attualmente restituisce dati fittizi. In produzione, integrazione con il monitoraggio delle prestazioni effettive.

---

## Input Validation

All public methods clamp numeric inputs to safe bounds using `Math.max` and `Math.min` to prevent excessively large queries:

- Months: 1 to 120
- Days: 1 to 365
- Limits: 1 to 500/1000

---

## Esempio di utilizzo

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
