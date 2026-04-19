---
id: admin-queries-deep-dive
title: 管理和仪表板查询深入探讨
sidebar_label: 管理员查询深入探讨
sidebar_position: 62
---

# 管理和仪表板查询深入探讨

管理仪表板数据、客户管理、高级搜索、统计和报告查询功能的综合参考。

## 概述

管理查询层通过跨两个主要模块的优化查询为管理仪表板提供支持：

- **`dashboard.queries.ts`** -- 仪表板统计数据、参与度指标、每周/每日图表和表现最佳的项目
- **`client.queries.ts`**（管理部分）——带分页的客户列表、管理仪表板数据、具有 20 多个过滤维度的高级搜索以及全面的统计数据

## 源文件

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

获取针对一组项目收到的未删除评论总数。

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**参数：**

|参数|类型|必填|描述|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|是的|要计数的物品块数组|

**SQL 模式：**

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

获取用户的总活动计数（投票+用户发表的评论）。

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**参数：**

|参数|类型|必填|描述|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|是的|客户档案 ID|

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

获取活动图表的每日活动数据（最近 N 天）。

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

**参数：**

|参数|类型|必填|默认|描述|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|是的| --      |客户档案 ID|
|`itemSlugs`|`string[]`|是的| --      |物品子弹|
|`days`|`number`|否| `7`     |天数|

**返回：** 每日数组`{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**SQL 模式：** 使用 `EXTRACT(DOW FROM created_at)` 进行与区域设置无关的星期几分组。

**注意：** `submissions` 和 `views` 字段是占位符（始终为 `0`）；实际的实现是在存储库层。

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

占位符功能。项目存储在 Git 中，而不是数据库中。

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**返回：** 始终`0`。实际的实现是在存储库层。

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

获取基本的客户资料统计数据。

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

优化的管理仪表板端点，可在一次调用中返回客户端、统计信息和分页。减少数据库往返。

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

**支持的过滤器：**
- 文本搜索（ILIKE 跨 5 个字段）
- 状态、计划、账户类型
- 身份验证提供者（EXISTS 子查询）
- 日期范围（创建/更新时间晚于/之前）

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

## 性能说明

1. **管理员排除模式** -- 所有列表查询都使用 `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` 从客户端视图中一致排除管理员用户。

2. **提供者的子查询** -- 使用 `(SELECT provider FROM accounts WHERE ... LIMIT 1)` 子查询而不是 JOIN 以避免来自多个 OAuth 帐户的行乘法。

3. **正确的 SQL 转义** - 所有文本搜索输入都针对 ILIKE 特殊字符（`%`、`_`、`\`）进行转义，以防止通过搜索项进行 SQL 注入。

4. **ISO 周处理** -- `getWeeklyEngagementData` 使用与 PostgreSQL 的 `to_char(date, 'IYYY-IW')` 匹配的自定义 `getISOWeekString` 帮助程序，以在年边界进行正确的 ISO 周年处理。

## 使用示例

### 加载管理仪表板

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

### 高级客户搜索

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
