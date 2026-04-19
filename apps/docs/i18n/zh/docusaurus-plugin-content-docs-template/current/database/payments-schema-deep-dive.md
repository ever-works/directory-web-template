---
id: payments-schema-deep-dive
title: "付款和订阅架构深入探讨"
sidebar_label: "支付模式"
sidebar_position: 53
---

# 付款和订阅架构深入探讨

## 概述

支付模块处理完整的订阅生命周期：支付提供商、客户帐户、试用支持订阅、自动续订管理以及完整的订阅历史审计跟踪。该系统支持多个支付提供商（Stripe、Solidgate、LemonSqueezy、Polar）。

**源文件：** `template/lib/db/schema.ts`
**常数：** `template/lib/constants/payment.ts`
**关系文件：** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## 表：`paymentProviders`

支持的支付提供商的注册表。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`name`|`name`|`text`|否|`'stripe'`|独特|
|`isActive`|`is_active`|`boolean`|否|`true`| - |
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`paymentProviders_name_unique`|`name`|独特|
|`payment_provider_active_idx`|`isActive`|B树|
|`payment_provider_created_at_idx`|`createdAt`|B树|

### 支持的提供商（枚举）

```typescript
export enum PaymentProvider {
    STRIPE = 'stripe',
    SOLIDGATE = 'solidgate',
    LEMONSQUEEZY = 'lemonsqueezy',
    POLAR = 'polar'
}
```

---

## Table: `paymentAccounts`

Links users to their external payment provider customer accounts.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `providerId` | `providerId` | `text` | No | - | FK -> `paymentProviders.id` (CASCADE) |
| `customerId` | `customerId` | `text` | No | - | External customer ID |
| `accountId` | `accountId` | `text` | Yes | - | Optional account identifier |
| `lastUsed` | `lastUsed` | `timestamp` | Yes | - | - |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `user_provider_unique_idx` | `(userId, providerId)` | Unique |
| `customer_provider_unique_idx` | `(customerId, providerId)` | Unique |
| `payment_account_customer_id_idx` | `customerId` | B-tree |
| `payment_account_provider_idx` | `providerId` | B-tree |
| `payment_account_created_at_idx` | `createdAt` | B-tree |

### Key Constraints

- **One account per provider per user:** The `user_provider_unique_idx` ensures a user can only have one customer account per payment provider.
- **Unique customer IDs per provider:** The `customer_provider_unique_idx` ensures no duplicate customer IDs within a provider.

---

## 表：`subscriptions`

核心订阅表全面支持试用、自动续订、取消和多提供商计费。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`userId`|`userId`|`text`|否| - |FK -> `users.id`（级联）|
|`planId`|`plan_id`|`text`|否|`'free'`|计划标识符|
|`status`|`status`|`text`|否|`'pending'`|订阅状态|
|`startDate`|`start_date`|`timestamp`|否|`now()`| - |
|`endDate`|`end_date`|`timestamp`|是的| - | - |
|`paymentProvider`|`payment_provider`|`text`|否|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|是的| - |外部订阅 ID|
|`invoiceId`|`invoice_id`|`text`|是的| - |外部发票 ID|
|`amountDue`|`amount_due`|`integer`|是的| `0` |以美分为单位|
|`amountPaid`|`amount_paid`|`integer`|是的| `0` |以美分为单位|
|`priceId`|`price_id`|`text`|是的| - |外部价格 ID|
|`customerId`|`customer_id`|`text`|是的| - |外部客户 ID|
|`currency`|`currency`|`text`|是的|`'usd'`|ISO 货币代码|
|`amount`|`amount`|`integer`|是的| `0` |以美分为单位|
|`interval`|`interval`|`text`|是的|`'month'`|计费间隔|
|`intervalCount`|`interval_count`|`integer`|是的| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|是的| - | - |
|`trialEnd`|`trial_end`|`timestamp`|是的| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|是的|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|是的|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|是的| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|是的| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|是的| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|是的|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|是的| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|是的| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|是的| - | - |
|`metadata`|`metadata`|`text`|是的| - |JSON 字符串|
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`user_subscription_idx`|`userId`|B树|
|`subscription_status_idx`|`status`|B树|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|独特|
|`subscription_plan_idx`|`planId`|B树|
|`subscription_created_at_idx`|`createdAt`|B树|

### 检查约束

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### 状态枚举

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### 计划枚举

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### TypeScript 类型

```typescript
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionWithUser = Subscription & {
    user: typeof users.$inferSelect;
};
```

---

## Table: `subscriptionHistory`

Immutable audit trail of every subscription lifecycle event.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `subscriptionId` | `subscription_id` | `text` | No | - | FK -> `subscriptions.id` (CASCADE) |
| `action` | `action` | `text` | No | - | Event description |
| `previousStatus` | `previous_status` | `text` | Yes | - | Status before change |
| `newStatus` | `new_status` | `text` | Yes | - | Status after change |
| `previousPlan` | `previous_plan` | `text` | Yes | - | Plan before change |
| `newPlan` | `new_plan` | `text` | Yes | - | Plan after change |
| `reason` | `reason` | `text` | Yes | - | - |
| `metadata` | `metadata` | `text` | Yes | - | JSON string |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `subscription_history_idx` | `subscriptionId` | B-tree |
| `subscription_action_idx` | `action` | B-tree |
| `subscription_history_created_at_idx` | `createdAt` | B-tree |

### TypeScript Types

```typescript
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
```

---

## 关系图

```mermaid
erDiagram
    users ||--o{ paymentAccounts : "has many"
    users ||--o{ subscriptions : "has many"
    paymentProviders ||--o{ paymentAccounts : "has many"
    subscriptions ||--o{ subscriptionHistory : "has many"

    paymentProviders {
        text id PK
        text name UK
        boolean is_active
    }

    paymentAccounts {
        text id PK
        text userId FK
        text providerId FK
        text customerId
    }

    subscriptions {
        text id PK
        text userId FK
        text plan_id
        text status
        text payment_provider
        text subscription_id
        integer amount
        text currency
        boolean auto_renewal
        timestamp start_date
        timestamp end_date
    }

    subscriptionHistory {
        text id PK
        text subscription_id FK
        text action
        text previous_status
        text new_status
        timestamp created_at
    }
```

---

## Subscription Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : User signs up
    pending --> active : Payment confirmed
    active --> paused : User pauses
    paused --> active : User resumes
    active --> cancelled : User cancels
    active --> expired : Period ends (no renewal)
    cancelled --> [*]
    expired --> [*]
    pending --> cancelled : Payment fails
```

---

## 查询示例

### 获取用户的有效订阅

```typescript
import { db } from '@/lib/db/drizzle';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const activeSub = await db
    .select()
    .from(subscriptions)
    .where(
        and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
        )
    )
    .limit(1);
```

### 创建新订阅

```typescript
await db.insert(subscriptions).values({
    userId,
    planId: 'standard',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: stripeSubscription.id,
    customerId: stripeCustomer.id,
    priceId: stripePriceId,
    amount: 1999, // $19.99 in cents
    currency: 'usd',
    interval: 'month',
});
```

### 记录订阅更改

```typescript
await db.insert(subscriptionHistory).values({
    subscriptionId: sub.id,
    action: 'plan_upgrade',
    previousStatus: 'active',
    newStatus: 'active',
    previousPlan: 'free',
    newPlan: 'standard',
    reason: 'User upgraded via billing page',
});
```

### 通过 Stripe 客户 ID 查找付款账户

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
