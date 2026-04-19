---
id: admin-queries-deep-dive
title: Задълбочено гмуркане на заявки за администриране и табло за управление
sidebar_label: Администраторски запитвания Deep Dive
sidebar_position: 62
---

# Задълбочено гмуркане на заявки за администриране и табло за управление

Изчерпателна справка за данни от таблото на администратора, управление на клиенти, разширено търсене, статистика и функции за заявки за отчитане.

## Преглед

Административният слой за заявки захранва административното табло с оптимизирани заявки в два основни модула:

- **`dashboard.queries.ts`** -- Статистика на таблото за управление, показатели за ангажираност, седмични/дневни диаграми и най-ефективни елементи
- **`client.queries.ts`** (администраторска секция) -- Списък на клиенти с пагиниране, данни на таблото за управление на администратора, разширено търсене с 20+ филтърни измерения и изчерпателна статистика

## Изходни файлове

```
lib/db/queries/dashboard.queries.ts
lib/db/queries/client.queries.ts
```

---

## Function Reference: dashboard.queries.ts

### `getVotesReceivedCount`

Gets total votes received on a set of items.

```typescript
async function getVotesReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description                      |
|-------------|------------|----------|----------------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs to count for |

**Returns:** `Promise<number>` -- Total vote count

**SQL Pattern:**

```sql
SELECT count(*) FROM votes WHERE item_id IN (...);
```

---

### `getCommentsReceivedCount`

Получава общия брой неизтрити коментари, получени за набор от елементи.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|да|Масив от охлюви за артикули, за които да се брои|

**SQL модел:**

```sql
SELECT count(*) FROM comments
WHERE item_id IN (...) AND deleted_at IS NULL;
```

---

### `getUniqueItemsInteractedCount`

Gets count of unique items a user has interacted with (voted or commented on).

```typescript
async function getUniqueItemsInteractedCount(
  clientProfileId: string
): Promise<number>
```

**Parameters:**

| Parameter         | Type     | Required | Description       |
|-------------------|----------|----------|-------------------|
| `clientProfileId` | `string` | Yes      | Client profile ID |

**Returns:** `Promise<number>` -- Count of unique items (approximate, may double-count items with both vote and comment)

**SQL Pattern:** Runs two `COUNT(DISTINCT item_id)` queries on `votes` and `comments` tables, then sums results.

**Note:** This is an approximation metric. For exact unique counts, a `UNION` query would be needed.

---

### `getUserTotalActivityCount`

Получава общия брой активности на потребителя (гласове + коментари, направени от потребителя).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|да|ID на клиентския профил|

---

### `getWeeklyEngagementData`

Gets weekly engagement data (votes and comments received on user's items) for charting.

```typescript
async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description                 |
|-------------|------------|----------|---------|-----------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs         |
| `weeks`     | `number`   | No       | `12`    | Number of weeks to fetch    |

**Returns:** Array of `{ week: 'W1', votes: 5, comments: 3 }` objects

**SQL Pattern:**

```sql
SELECT to_char(created_at, 'IYYY-IW') as week, count(*)
FROM votes
WHERE item_id IN (...) AND created_at >= ?
GROUP BY to_char(created_at, 'IYYY-IW')
ORDER BY to_char(created_at, 'IYYY-IW');
```

**Performance Notes:**
- Runs two separate GROUP BY queries for votes and comments, then merges in-memory
- Uses ISO week format (`IYYY-IW`) for consistent week numbering across year boundaries
- Returns empty data (zeros) for weeks with no activity

---

### `getDailyActivityData`

Получава ежедневни данни за дейността за диаграма на активността (последните N дни).

```typescript
async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<Array<{
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}>>
```

**Параметри:**

|Параметър|Тип|Задължително|По подразбиране|Описание|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|да| --      |ID на клиентския профил|
|`itemSlugs`|`string[]`|да| --      |Предмет охлюви|
|`days`|`number`|не| `7`     |Брой дни|

**Връща:** Дневен масив с `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**SQL Pattern:** Използва `EXTRACT(DOW FROM created_at)` за независимо от локала групиране по дни от седмицата.

**Забележка:** `submissions` и `views` полетата са контейнери (винаги `0`); действителното изпълнение е в слоя хранилище.

---

### `getTopItemsEngagement`

Gets top performing items ranked by total engagement (votes + comments).

```typescript
async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description               |
|-------------|------------|----------|---------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs       |
| `limit`     | `number`   | No       | `5`     | Maximum items to return   |

**Returns:** Array sorted by total engagement descending

---

### `getRecentSubmissionsCount`

Функция за контейнер. Елементите се съхраняват в Git, а не в базата данни.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Връща:** Винаги `0`. Действителното внедряване е в слоя хранилище.

---

## Function Reference: client.queries.ts (Admin Section)

### `getClientProfiles`

Gets paginated client profiles with authentication data. Excludes admin users from results.

```typescript
async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**SQL Pattern:**
- Uses `LEFT JOIN` on `userRoles` and `roles` to exclude admin users (`WHERE roles.id IS NULL`)
- Uses subquery for `accountProvider` to avoid duplicate rows from multiple OAuth accounts
- Supports `ILIKE` search across username, displayName, company, name, and email
- Provider filter uses an `EXISTS` subquery on the accounts table

---

### `getClientProfileStats`

Получава основна статистика на клиентския профил.

```typescript
async function getClientProfileStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
}>
```

---

### `getEnhancedClientStats`

Gets comprehensive statistics with multiple dimensions including provider distribution, activity metrics, and growth rates.

```typescript
async function getEnhancedClientStats(): Promise<{
  overview: { total, active, inactive, suspended, trial };
  byProvider: { credentials, google, github, facebook, twitter, linkedin, other };
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
  byStatus: Record<string, number>;
  activity: { newThisWeek, newThisMonth, activeThisWeek, activeThisMonth };
  growth: { weeklyGrowth, monthlyGrowth };
}>
```

**SQL Pattern:** Uses a multi-dimensional `GROUP BY` across status, plan, accountType, and provider in a single query, then calculates activity metrics with date-range filters.

**Performance Notes:**
- Executes multiple queries for different metrics
- All queries exclude admin users via `LEFT JOIN` on roles
- Growth rates are calculated as percentages of total

---

### `getAdminDashboardData`

Оптимизирана крайна точка на таблото за управление на администратора, която връща клиенти, статистика и страници с едно извикване. Намалява обиколките на базата данни.

```typescript
async function getAdminDashboardData(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}): Promise<{
  clients: ClientProfileWithAuth[];
  stats: { /* full EnhancedClientStats */ };
  pagination: { page, totalPages, total, limit };
}>
```

**Поддържани филтри:**
- Текстово търсене (КАКТО в 5 полета)
- Състояние, план, тип акаунт
- Доставчик на удостоверяване (EXISTS подзаявка)
- Период от време (създаден/актуализиран след/преди)

---

### `advancedClientSearch`

Full-featured search with 20+ filter dimensions, sorting, and metadata tracking.

```typescript
async function advancedClientSearch(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  dateRange?: { startDate?: Date; endDate?: Date };
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  emailDomain?: string;
  companySearch?: string;
  locationSearch?: string;
  industrySearch?: string;
  minSubmissions?: number;
  maxSubmissions?: number;
  hasAvatar?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'email' | 'company' | 'totalSubmissions';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  clients: ClientProfileWithAuth[];
  pagination: { page, totalPages, total, limit };
  searchMetadata: { appliedFilters: string[], searchTime: number, resultCount: number };
}>
```

**Unique Features:**
- **Email domain filter**: `ILIKE '%@example.com%'`
- **Boolean presence filters**: `hasAvatar`, `hasWebsite`, `hasPhone` check for non-null, non-empty values
- **Numeric range filters**: `minSubmissions`, `maxSubmissions`
- **Search metadata**: Returns list of applied filters and result count
- **Configurable sorting**: 6 sort fields with ascending/descending order

**Performance Notes:**
- All ILIKE patterns use proper SQL escaping for special characters (`%`, `_`, `\`)
- Admin users are excluded via LEFT JOIN pattern
- Uses `COUNT(DISTINCT)` for accurate totals with JOINs

---

## Бележки за ефективността

1. **Модел за изключване на администратори** -- Всички заявки за списъци използват `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` за последователно изключване на администраторски потребители от клиентски изгледи.

2. **Подзаявка за доставчик** -- Използва `(SELECT provider FROM accounts WHERE ... LIMIT 1)` подзаявка вместо JOIN, за да се избегне умножаване на редове от множество OAuth акаунти.

3. **Правилно екраниране на SQL** -- Всички входове за търсене на текст се екранират за специални символи ILIKE (`%`, `_`, `\`), за да се предотврати въвеждането на SQL чрез термини за търсене.

4. **Обработка на седмицата по ISO** -- `getWeeklyEngagementData` използва персонализиран помощник `getISOWeekString`, който съответства на `to_char(date, 'IYYY-IW')` на PostgreSQL за правилно обработване на годината на седмицата по ISO в границите на годината.

## Примери за използване

### Зареждане на администраторското табло

```typescript
import { getAdminDashboardData } from '@/lib/db/queries';

const dashboard = await getAdminDashboardData({
  page: 1,
  limit: 25,
  search: 'acme',
  status: 'active',
});

// dashboard.clients -- paginated client list
// dashboard.stats   -- full statistics
// dashboard.pagination -- page metadata
```

### Разширено търсене на клиенти

```typescript
import { advancedClientSearch } from '@/lib/db/queries';

const results = await advancedClientSearch({
  page: 1,
  limit: 10,
  emailDomain: 'company.com',
  plan: 'premium',
  hasAvatar: true,
  sortBy: 'totalSubmissions',
  sortOrder: 'desc',
});

console.log(results.searchMetadata.appliedFilters);
// ['Email domain: company.com', 'Plan: premium', 'Has avatar: true']
```
