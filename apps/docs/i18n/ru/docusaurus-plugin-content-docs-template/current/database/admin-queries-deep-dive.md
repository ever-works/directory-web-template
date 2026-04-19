---
id: admin-queries-deep-dive
title: Подробное описание запросов администратора и информационной панели
sidebar_label: Подробное описание запросов администратора
sidebar_position: 62
---

# Подробное описание запросов администратора и информационной панели

Комплексный справочник по данным панели администратора, управлению клиентами, расширенному поиску, статистике и функциям запросов отчетов.

## Обзор

Уровень запросов администратора обеспечивает панель администрирования оптимизированными запросами к двум основным модулям:

- **`dashboard.queries.ts`** – статистика информационной панели, показатели вовлеченности, еженедельные/дневные графики и наиболее эффективные элементы.
- **`client.queries.ts`** (раздел администратора) — список клиентов с нумерацией страниц, данными панели администратора, расширенным поиском с более чем 20 параметрами фильтра и подробной статистикой.

## Исходные файлы

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

Получает общее количество неудаленных комментариев, полученных к набору элементов.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|Да|Массив элементов, которые нужно учитывать|

**Шаблон SQL:**

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

Получает общее количество активности пользователя (голоса + комментарии, оставленные пользователем).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|Да|Идентификатор профиля клиента|

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

Получает данные о ежедневной активности для диаграммы активности (последние N дней).

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

**Параметры:**

|Параметр|Тип|Требуется|По умолчанию|Описание|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|Да| --      |Идентификатор профиля клиента|
|`itemSlugs`|`string[]`|Да| --      |Слизни предметов|
|`days`|`number`|Нет| `7`     |Количество дней|

**Возвраты:** Ежедневный массив с `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**Шаблон SQL:** Использует `EXTRACT(DOW FROM created_at)` для группировки по дням недели, не зависящих от локали.

**Примечание.** Поля `submissions` и `views` являются заполнителями (всегда `0`); фактическая реализация находится на уровне репозитория.

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

Функция заполнителя. Элементы хранятся в Git, а не в базе данных.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Возвраты:** Всегда `0`. Фактическая реализация находится на уровне репозитория.

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

Получает базовую статистику профиля клиента.

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

Оптимизированная конечная точка панели администратора, которая возвращает клиентов, статистику и нумерацию страниц за один вызов. Уменьшает количество обращений к базе данных.

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

**Поддерживаемые фильтры:**
- Текстовый поиск (ILIKE по 5 полям)
- Статус, план, тип счета
- Поставщик аутентификации (подзапрос EXISTS)
- Диапазон дат (создан/обновлен после/до)

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

## Примечания по производительности

1. **Шаблон исключения администраторов** – во всех запросах на листинг используется `LEFT JOIN userRoles / roles WHERE roles.id IS NULL`, чтобы последовательно исключать пользователей с правами администратора из представлений клиента.

2. **Подзапрос для поставщика** – вместо JOIN используется подзапрос `(SELECT provider FROM accounts WHERE ... LIMIT 1)`, чтобы избежать умножения строк из нескольких учетных записей OAuth.

3. **Правильное экранирование SQL** – все входные данные текстового поиска экранируются специальными символами ILIKE (`%`, `_`, `\`), чтобы предотвратить внедрение SQL через условия поиска.

4. **Обработка недель ISO** — `getWeeklyEngagementData` использует специальный помощник `getISOWeekString`, который соответствует `to_char(date, 'IYYY-IW')` PostgreSQL, для правильной обработки года недели ISO на границах года.

## Примеры использования

### Загрузка панели администратора

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

### Расширенный поиск клиентов

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
