---
id: payment-queries-deep-dive
title: 付款和订阅查询深入探讨
sidebar_label: 付款查询深入探讨
sidebar_position: 63
---

# 付款和订阅查询深入探讨

所有支付提供商管理、支付账户操作、订阅生命周期、自动续费和账单查询功能的综合参考。

## 概述

支付查询层分为两个互补的模块：

- **`payment.queries.ts`** -- 支付提供商 CRUD、支付账户管理和账户设置编排
- **`subscription.queries.ts`** -- 订阅生命周期（创建、更新、取消、过期）、计划管理、历史跟踪、自动续订和计费统计

## 源文件

```
lib/db/queries/payment.queries.ts
lib/db/queries/subscription.queries.ts
```

---

## Function Reference: payment.queries.ts

### Payment Provider Queries

#### `getPaymentProvider`

Gets a payment provider by ID.

```typescript
async function getPaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE id = ? LIMIT 1;
```

---

#### `getPaymentProviderByName`

按名称获取支付提供商（例如`'stripe'`、`'lemonsqueezy'`）。

```typescript
async function getPaymentProviderByName(name: string): Promise<OldPaymentProvider | null>
```

---

#### `getActivePaymentProviders`

Gets all active payment providers ordered by name.

```typescript
async function getActivePaymentProviders(): Promise<OldPaymentProvider[]>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE is_active = true ORDER BY name;
```

---

#### `createPaymentProvider`

创建新的支付提供商。

```typescript
async function createPaymentProvider(data: NewPaymentProvider): Promise<OldPaymentProvider>
```

---

#### `updatePaymentProvider`

Updates a payment provider's fields.

```typescript
async function updatePaymentProvider(
  id: string,
  data: Partial<NewPaymentProvider>
): Promise<OldPaymentProvider | null>
```

---

#### `deactivatePaymentProvider`

通过将 `isActive` 设置为 `false` 来停用支付提供商。

```typescript
async function deactivatePaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

---

### Payment Account Queries

#### `getPaymentAccountByUserId`

Gets a payment account by user ID and provider ID. Validates both the provider and user are active.

```typescript
async function getPaymentAccountByUserId(
  userId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

**SQL Pattern:**

```sql
SELECT payment_accounts.* FROM payment_accounts
INNER JOIN payment_providers ON payment_accounts.provider_id = payment_providers.id
INNER JOIN users ON payment_accounts.user_id = users.id
WHERE payment_accounts.user_id = ?
  AND payment_accounts.provider_id = ?
  AND payment_providers.is_active = true
LIMIT 1;
```

**Performance Notes:** Uses `INNER JOIN` to ensure both the provider is active and the user exists.

---

#### `getPaymentAccountByCustomerId`

通过外部客户 ID 从支付提供商获取支付帐户。

```typescript
async function getPaymentAccountByCustomerId(
  customerId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

---

#### `createPaymentAccount`

Creates a new payment account. Automatically sets `lastUsed` to current timestamp.

```typescript
async function createPaymentAccount(data: NewPaymentAccount): Promise<PaymentAccount>
```

---

#### `updatePaymentAccountLastUsed`

更新付款帐户上的 `lastUsed` 时间戳。

```typescript
async function updatePaymentAccountLastUsed(accountId: string): Promise<void>
```

---

#### `getUserPaymentAccountByProvider`

Gets a user's payment account by provider name (convenience function).

```typescript
async function getUserPaymentAccountByProvider(
  userId: string,
  providerName: string
): Promise<PaymentAccount | null>
```

Internally calls `getPaymentProviderByName` then `getPaymentAccountByUserId`.

---

### 支付账户编排

#### `ensurePaymentAccount`

确保用户和提供商存在支付帐户。如果提供商和帐户不存在，则创建它们；如果存在，则更新 `lastUsed`。

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**参数：**

|参数|类型|必填|描述|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|是的|提供商名称（例如`'stripe'`）|
|`userId`|`string`|是的|用户ID|
|`customerId`|`string`|是的|提供商处的客户 ID|
|`accountId`|`string`|否|提供商的帐户 ID|

**行为：**
1. 检查提供商是否存在；如果没有则创建
2. 检查用户+提供商的支付账户是否存在；如果找到则更新`lastUsed`
3. 如果未找到则创建新的付款帐户

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

`ensurePaymentAccount` 的增强版，具有客户 ID 更新逻辑。如果现有帐户上的 `customerId` 已更改，则会更新记录。

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**与 `ensurePaymentAccount` 相比的额外行为：**
- 检测更改的 `customerId` 并更新现有记录
- 提供带有堆栈跟踪的详细错误日志记录

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## 函数参考：subscription.queries.ts

### 订阅增删改查

#### `getUserActiveSubscription`

获取用户的活动订阅。

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**SQL 模式：**

```sql
SELECT * FROM subscriptions
WHERE user_id = ? AND status = 'active'
LIMIT 1;
```

---

#### `getUserSubscriptions`

Gets all subscriptions for a user, ordered by creation date descending.

```typescript
async function getUserSubscriptions(userId: string): Promise<Subscription[]>
```

---

#### `getSubscriptionByProviderSubscriptionId`

通过外部提供商的订阅 ID 查找订阅。

```typescript
async function getSubscriptionByProviderSubscriptionId(
  paymentProvider: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `getSubscriptionByUserIdAndSubscriptionId`

```typescript
async function getSubscriptionByUserIdAndSubscriptionId(
  userId: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `createSubscription`

```typescript
async function createSubscription(data: NewSubscription): Promise<Subscription>
```

自动将 `createdAt` 和 `updatedAt` 设置为当前时间戳。

---

#### `updateSubscription`

```typescript
async function updateSubscription(
  subscriptionId: string,
  data: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionBySubscriptionId`

通过提供商的 `subscriptionId` 字段（而不是内部 ID）更新订阅匹配。

```typescript
async function updateSubscriptionBySubscriptionId(
  updateData: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionStatus`

Updates subscription status with automatic `cancelledAt` timestamp when status is `CANCELLED`.

```typescript
async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  reason?: string
): Promise<Subscription | null>
```

---

#### `cancelSubscription`

立即或在周期结束时取消订阅。

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**行为：**
- 如果`cancelAtPeriodEnd` 是`true`：保持状态为`ACTIVE` 但设置`cancelAtPeriodEnd` 标志
- 如果`cancelAtPeriodEnd` 是`false`：立即将状态设置为`CANCELLED`

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### 计划管理

#### `getUserPlan`

获取用户的有效计划，检查是否过期。

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**返回：** 计划 ID 字符串（如果没有有效订阅或已过期，则默认为 `PaymentPlan.FREE`）

使用 `getEffectivePlan()` 实用程序来处理过期逻辑。

---

#### `getUserPlanWithExpiration`

Gets full plan details including expiration information.

```typescript
async function getUserPlanWithExpiration(userId: string): Promise<{
  planId: string;
  effectivePlan: string;
  isExpired: boolean;
  expiresAt: Date | null;
  status: string | null;
  subscriptionId: string | null;
}>
```

---

#### `hasActiveSubscription`

布尔检查活动订阅是否存在。

```typescript
async function hasActiveSubscription(userId: string): Promise<boolean>
```

---

### Expiration Management

#### `getSubscriptionsExpiringSoon`

Gets active subscriptions expiring within N days.

```typescript
async function getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]>
```

**SQL Pattern:**

```sql
SELECT * FROM subscriptions
WHERE status = 'active' AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getExpiredActiveSubscriptions`

获取已通过 `endDate` 但仍标记为活动的订阅。

```typescript
async function getExpiredActiveSubscriptions(): Promise<Subscription[]>
```

---

#### `updateExpiredSubscriptionsStatus`

Batch updates all expired-but-active subscriptions to `EXPIRED` status.

```typescript
async function updateExpiredSubscriptionsStatus(): Promise<Subscription[]>
```

---

### 自动续订查询

#### `getSubscriptionsDueForRenewalReminder`

获取需要续订提醒的订阅（有效、启用自动续订、N 天内到期、提醒尚未发送）。

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**SQL 模式：**

```sql
SELECT * FROM subscriptions
WHERE status = 'active'
  AND auto_renewal = true
  AND renewal_reminder_sent = false
  AND end_date >= NOW()
  AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getSubscriptionsToCancel`

Gets subscriptions with auto-renewal disabled whose period has ended.

```typescript
async function getSubscriptionsToCancel(): Promise<Subscription[]>
```

---

#### `setAutoRenewal`

切换自动续订。也相反地设置`cancelAtPeriodEnd`。

```typescript
async function setAutoRenewal(
  subscriptionId: string,
  enabled: boolean
): Promise<Subscription | null>
```

---

#### `markRenewalReminderSent` / `resetRenewalReminderSent`

```typescript
async function markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
async function resetRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
```

---

### 支付管理失败

#### `incrementFailedPaymentCount`

原子地增加失败的支付计数器。

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**SQL 模式：**

```sql
UPDATE subscriptions
SET failed_payment_count = COALESCE(failed_payment_count, 0) + 1,
    last_renewal_attempt = NOW()
WHERE id = ?;
```

---

#### `resetFailedPaymentCount`

Resets counter after successful payment.

```typescript
async function resetFailedPaymentCount(subscriptionId: string): Promise<Subscription | null>
```

---

#### `getSubscriptionsWithFailedPayments`

获取超过失败付款阈值的订阅。

```typescript
async function getSubscriptionsWithFailedPayments(
  threshold: number = 3
): Promise<Subscription[]>
```

---

#### `resetRenewalStateAtomic`

Atomically resets both `renewalReminderSent` and `failedPaymentCount` in a single UPDATE to ensure data consistency.

```typescript
async function resetRenewalStateAtomic(
  subscriptionId: string
): Promise<Subscription | null>
```

---

### 订阅历史

#### `createSubscriptionHistory`

创建订阅更改的历史记录条目。

```typescript
async function createSubscriptionHistory(
  data: NewSubscriptionHistory
): Promise<SubscriptionHistoryType>
```

---

#### `getSubscriptionHistory`

Gets history entries for a subscription, ordered by date descending.

```typescript
async function getSubscriptionHistory(
  subscriptionId: string
): Promise<SubscriptionHistoryType[]>
```

---

#### `logSubscriptionChange`

使用结构化数据记录订阅状态更改的便捷功能。

```typescript
async function logSubscriptionChange(
  subscriptionId: string,
  action: string,
  previousStatus?: string,
  newStatus?: string,
  previousPlan?: string,
  newPlan?: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<SubscriptionHistoryType>
```

---

### Statistics

#### `getSubscriptionStats`

Gets subscription statistics including totals and plan distribution.

```typescript
async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  cancelled: number;
  planDistribution: Array<{ planId: string; count: number }>;
}>
```

---

## 性能说明

1. **INNER JOIN 验证** -- `getPaymentAccountByUserId` 使用 INNER JOIN 在单个查询中验证提供者活动和用户存在。

2. **原子更新** -- `incrementFailedPaymentCount` 使用 `COALESCE` 进行空安全增量。 `resetRenewalStateAtomic` 在一次更新中重置多个字段。

3. **幂等帐户设置** -- `ensurePaymentAccount` 和 `setupUserPaymentAccount` 优雅地处理竞争条件，根据需要创建或更新。

4. **过期检查** -- `getUserPlan` 委托给 `getEffectivePlan()` 实用程序，该实用程序无需额外的数据库查询即可处理时区感知的过期逻辑。

## 使用示例

### Stripe 付款的 Webhook 处理程序

```typescript
import {
  ensurePaymentAccount,
  createSubscription,
  logSubscriptionChange,
} from '@/lib/db/queries';

// Ensure payment account exists
const account = await ensurePaymentAccount(
  'stripe', userId, stripeCustomerId
);

// Create subscription
const sub = await createSubscription({
  userId,
  planId: 'premium',
  status: 'active',
  paymentProvider: 'stripe',
  subscriptionId: stripeSubId,
  startDate: new Date(),
  endDate: endDate,
});

// Log the change
await logSubscriptionChange(sub.id, 'created', null, 'active', null, 'premium');
```

### 检查用户计划是否过期

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
