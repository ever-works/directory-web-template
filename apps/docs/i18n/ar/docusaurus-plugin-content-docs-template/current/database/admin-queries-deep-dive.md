---
id: admin-queries-deep-dive
title: استعلامات الإدارة ولوحة المعلومات نظرة عميقة
sidebar_label: استفسارات المشرف الغوص العميق
sidebar_position: 62
---

# استعلامات الإدارة ولوحة المعلومات نظرة عميقة

مرجع شامل لبيانات لوحة تحكم المسؤول وإدارة العملاء والبحث المتقدم والإحصاءات ووظائف الاستعلام عن التقارير.

## نظرة عامة

تعمل طبقة استعلام المسؤول على تشغيل لوحة معلومات الإدارة باستعلامات محسنة عبر وحدتين أساسيتين:

- **`dashboard.queries.ts`** - إحصائيات لوحة التحكم، ومقاييس التفاعل، والرسوم البيانية الأسبوعية/اليومي، والعناصر ذات الأداء الأفضل
- **`client.queries.ts`** (قسم المسؤول) - قائمة العملاء مع ترقيم الصفحات، وبيانات لوحة تحكم المسؤول، والبحث المتقدم مع أكثر من 20 بُعدًا للتصفية، وإحصائيات شاملة

## ملفات المصدر

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

يحصل على إجمالي التعليقات غير المحذوفة الواردة على مجموعة من العناصر.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|نعم|مجموعة من العناصر البزاقة التي يجب الاعتماد عليها|

** نمط SQL: **

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

يحصل على إجمالي عدد أنشطة المستخدم (الأصوات + التعليقات التي أدلى بها المستخدم).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|نعم|معرف ملف تعريف العميل|

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

يحصل على بيانات النشاط اليومي لمخطط النشاط (آخر N أيام).

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

**المعلمات:**

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|نعم| --      |معرف ملف تعريف العميل|
|`itemSlugs`|`string[]`|نعم| --      |رخويات العنصر|
|`days`|`number`|لا| `7`     |عدد الأيام|

** العوائد: ** مصفوفة يومية مع `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**نمط SQL:** يستخدم `EXTRACT(DOW FROM created_at)` لتجميع أيام الأسبوع المستقلة عن اللغة.

**ملاحظة:** الحقول `submissions` و`views` هي عناصر نائبة (دائمًا `0`)؛ التنفيذ الفعلي موجود في طبقة المستودع.

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

وظيفة العنصر النائب. يتم تخزين العناصر في Git، وليس في قاعدة البيانات.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**المرتجعات:** دائمًا `0`. التنفيذ الفعلي موجود في طبقة المستودع.

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

يحصل على إحصائيات الملف الشخصي الأساسية للعميل.

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

نقطة نهاية محسنة للوحة تحكم المشرف التي تُرجع العملاء والإحصائيات وترقيم الصفحات في مكالمة واحدة. يقلل من رحلات قاعدة البيانات ذهابًا وإيابًا.

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

**المرشحات المدعومة:**
- البحث عن النص (ILIKE عبر 5 حقول)
- الحالة، الخطة، نوع الحساب
- موفر المصادقة (استعلام فرعي موجود)
- النطاق الزمني (تم الإنشاء/التحديث بعد/قبل)

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

## ملاحظات الأداء

1. **نمط استبعاد المسؤول** - تستخدم جميع استعلامات القائمة `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` لاستبعاد المستخدمين الإداريين باستمرار من طرق عرض العميل.

2. **استعلام فرعي للموفر** - يستخدم `(SELECT provider FROM accounts WHERE ... LIMIT 1)` استعلام فرعي بدلاً من JOIN لتجنب مضاعفة الصفوف من حسابات OAuth المتعددة.

3. **الهروب الصحيح من SQL** - يتم الهروب من جميع مدخلات البحث عن النص لأحرف ILIKE الخاصة (`%`، `_`، `\`) لمنع إدخال SQL من خلال مصطلحات البحث.

4. ** معالجة أسبوع ISO ** - يستخدم `getWeeklyEngagementData` مساعدًا مخصصًا `getISOWeekString` يطابق `to_char(date, 'IYYY-IW')` PostgreSQL للتعامل الصحيح مع سنة أسبوع ISO عند حدود السنة.

## أمثلة الاستخدام

### جارٍ تحميل لوحة تحكم المشرف

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

### بحث متقدم عن العميل

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
