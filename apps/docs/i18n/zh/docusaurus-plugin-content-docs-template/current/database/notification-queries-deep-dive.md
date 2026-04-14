---
id: notification-queries-deep-dive
title: 通知和活动查询深入探讨
sidebar_label: 通知查询深入探讨
sidebar_position: 67
---

# 通知和活动查询深入探讨

所有与通知相关的数据库查询功能的综合参考，包括新闻通讯订阅管理、活动日志记录和用户首选项。

## 概述

通知查询层管理用户通信和活动跟踪：

- **`newsletter.queries.ts`** -- 时事通讯订阅 CRUD、订阅/取消订阅流程和统计
- **`activity.queries.ts`** -- 用户登录和上次登录跟踪的活动日志记录

## 源文件

```
lib/db/queries/newsletter.queries.ts
lib/db/queries/activity.queries.ts
```

---

## Function Reference: newsletter.queries.ts

### `createNewsletterSubscription`

Creates a new newsletter subscription. Normalizes the email to lowercase before storage.

```typescript
async function createNewsletterSubscription(
  email: string,
  source: string = 'footer'
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Default    | Description                        |
|-----------|----------|----------|------------|------------------------------------|
| `email`   | `string` | Yes      | --         | Subscriber email                   |
| `source`  | `string` | No       | `'footer'` | Source of subscription (e.g., `'footer'`, `'popup'`, `'api'`) |

**Returns:** `Promise<NewsletterSubscription | null>` -- Created subscription or `null` on error

**SQL Pattern:**

```sql
INSERT INTO newsletter_subscriptions (email, source)
VALUES (?, ?) RETURNING *;
```

**Error Handling:** Catches and logs all errors, returning `null` instead of throwing. This prevents newsletter signup failures from crashing the page.

---

### `getNewsletterSubscriptionByEmail`

通过电子邮件地址检索时事通讯订阅。

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**参数：**

|参数|类型|必填|描述|
|-----------|----------|----------|------------------|
|`email`|`string`|是的|订阅者电子邮件|

**返回：** 订阅记录或`null`（若未找到）

**SQL 模式：**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**注意：** 电子邮件在查找之前已标准化（小写、修剪）。

---

### `updateNewsletterSubscription`

Updates specific fields on a newsletter subscription.

```typescript
async function updateNewsletterSubscription(
  email: string,
  updates: Partial<Pick<NewsletterSubscription, 'isActive' | 'unsubscribedAt'>>
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Description                               |
|-----------|----------|----------|-------------------------------------------|
| `email`   | `string` | Yes      | Subscriber email                          |
| `updates` | `object` | Yes      | Fields to update (`isActive`, `unsubscribedAt`) |

**Returns:** Updated subscription or `null` on error

---

### `unsubscribeFromNewsletter`

通过将 `isActive` 设置为 `false` 并记录取消订阅时间戳，取消订阅时事通讯的电子邮件。

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL 模式：**

```sql
UPDATE newsletter_subscriptions
SET is_active = false, unsubscribed_at = NOW()
WHERE email = ?
RETURNING *;
```

---

### `resubscribeToNewsletter`

Resubscribes an email by setting `isActive` to `true` and clearing the `unsubscribedAt` timestamp.

```typescript
async function resubscribeToNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL Pattern:**

```sql
UPDATE newsletter_subscriptions
SET is_active = true, unsubscribed_at = NULL
WHERE email = ?
RETURNING *;
```

---

### `getNewsletterStats`

获取时事通讯订阅统计信息。

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**退货：**
- `totalActive` -- 当前活动订阅的计数
- `recentSubscriptions` -- 过去 30 天内的订阅计数

**SQL 模式：**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**错误处理：** 出错时返回`{ totalActive: 0, recentSubscriptions: 0 }`。

---

## Function Reference: activity.queries.ts

### `logActivity`

Logs an activity event to the activity logs table.

```typescript
async function logActivity(
  type: ActivityType,
  id?: string,
  entityType: 'user' | 'client' = 'user',
  ipAddress?: string
): Promise<void>
```

**Parameters:**

| Parameter    | Type                     | Required | Default  | Description                           |
|--------------|--------------------------|----------|----------|---------------------------------------|
| `type`       | `ActivityType`           | Yes      | --       | Activity type enum value              |
| `id`         | `string`                 | No       | --       | User ID or Client Profile ID          |
| `entityType` | `'user'` \| `'client'`   | No       | `'user'` | Whether this is a user or client activity |
| `ipAddress`  | `string`                 | No       | --       | IP address of the request             |

**Behavior:**
- If `entityType` is `'user'`: sets `userId` field, `clientId` is `null`
- If `entityType` is `'client'`: sets `clientId` field, `userId` is `null`
- IP address defaults to empty string if not provided

**SQL Pattern:**

```sql
INSERT INTO activity_logs (user_id, client_id, action, ip_address)
VALUES (?, ?, ?, ?);
```

---

### `getLastLoginActivity`

获取用户或客户端的最新登录活动。

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**参数：**

|参数|类型|必填|默认|描述|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|是的| --         |用户 ID 或客户配置文件 ID|
|`entityType`|`'user'` \|`'client'`|否|`'client'`|要查询的实体类型|

**返回：** `Promise<ActivityLog | null>` -- 上次登录活动或 `null`（如果未找到登录）

**SQL 模式：**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**注意：** 为了向后兼容，默认`entityType` 是`'client'`（不是`'user'`）。

---

## Internal Helpers

### `normalizeEmail` (newsletter.queries.ts)

Private helper that normalizes email addresses for consistent lookups.

```typescript
function normalizeEmail(email: string): string
// Returns: email.toLowerCase().trim()
```

All newsletter functions normalize emails before database operations.

---

## 性能说明

1. **优雅的错误处理** - 所有新闻通讯函数都将操作包装在 try-catch 块中，并返回`null`/默认值而不是抛出异常。这可以防止与新闻通讯相关的错误影响主应用程序流程。

2. **电子邮件规范化** - 电子邮件在存储和查找之前始终采用小写形式并进行修剪，防止因大小写差异而导致重复订阅。

3. **基于时间间隔的查询** -- `getNewsletterStats` 使用 PostgreSQL `INTERVAL` 语法进行基于时间的过滤，通过在 `subscribed_at` 上建立适当的索引可以提高效率。

4. **双实体支持** -- 活动日志记录通过单个表支持`user`（管理员）和`client`（最终用户）实体，并使用空列来区分实体类型。

## 使用示例

### 时事通讯订阅流程

```typescript
import {
  getNewsletterSubscriptionByEmail,
  createNewsletterSubscription,
  resubscribeToNewsletter,
} from '@/lib/db/queries';

const email = 'user@example.com';
const existing = await getNewsletterSubscriptionByEmail(email);

if (!existing) {
  // New subscriber
  await createNewsletterSubscription(email, 'footer');
} else if (!existing.isActive) {
  // Previously unsubscribed, resubscribe
  await resubscribeToNewsletter(email);
} else {
  // Already subscribed
  console.log('Already subscribed');
}
```

### 记录用户活动

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### 在仪表板上显示上次登录

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
