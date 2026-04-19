---
id: payments-schema-deep-dive
title: "Задълбочено потапяне в схемата за плащания и абонаменти"
sidebar_label: "Схема за плащания"
sidebar_position: 53
---

# Задълбочено потапяне в схемата за плащания и абонаменти

## Преглед

Модулът за плащания управлява пълния жизнен цикъл на абонамента: доставчици на плащания, клиентски акаунти, абонаменти с пробна поддръжка, управление на автоматично подновяване и пълна одитна пътека на историята на абонамента. Системата поддържа множество доставчици на плащания (Stripe, Solidgate, LemonSqueezy, Polar).

**Изходен файл:** `template/lib/db/schema.ts`
**Константи:** `template/lib/constants/payment.ts`
**Файл за връзки:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## Таблица: `paymentProviders`

Регистър на поддържаните доставчици на плащания.

### Колони

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не|`crypto.randomUUID()`|Първичен ключ|
|`name`|`name`|`text`|не|`'stripe'`|Уникален|
|`isActive`|`is_active`|`boolean`|не|`true`| - |
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|не|`now()`| - |

### Индекси

|Име|Колони|Тип|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Уникален|
|`payment_provider_active_idx`|`isActive`|B-дърво|
|`payment_provider_created_at_idx`|`createdAt`|B-дърво|

### Поддържани доставчици (Enum)

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

## Таблица: `subscriptions`

Основната абонаментна таблица с цялостна поддръжка за пробни периоди, автоматично подновяване, анулиране и таксуване от няколко доставчика.

### Колони

|Колона|Име на БД|Тип|Nullable|По подразбиране|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|не|`crypto.randomUUID()`|Първичен ключ|
|`userId`|`userId`|`text`|не| - |FK -> `users.id` (КАСКАДА)|
|`planId`|`plan_id`|`text`|не|`'free'`|Идентификатор на плана|
|`status`|`status`|`text`|не|`'pending'`|Състояние на абонамента|
|`startDate`|`start_date`|`timestamp`|не|`now()`| - |
|`endDate`|`end_date`|`timestamp`|да| - | - |
|`paymentProvider`|`payment_provider`|`text`|не|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|да| - |ID на външен абонамент|
|`invoiceId`|`invoice_id`|`text`|да| - |ID на външна фактура|
|`amountDue`|`amount_due`|`integer`|да| `0` |В центове|
|`amountPaid`|`amount_paid`|`integer`|да| `0` |В центове|
|`priceId`|`price_id`|`text`|да| - |ID на външна цена|
|`customerId`|`customer_id`|`text`|да| - |ID на външен клиент|
|`currency`|`currency`|`text`|да|`'usd'`|ISO код на валутата|
|`amount`|`amount`|`integer`|да| `0` |В центове|
|`interval`|`interval`|`text`|да|`'month'`|Интервал на фактуриране|
|`intervalCount`|`interval_count`|`integer`|да| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|да| - | - |
|`trialEnd`|`trial_end`|`timestamp`|да| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|да|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|да|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|да| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|да| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|да| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|да|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|да| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|да| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|да| - | - |
|`metadata`|`metadata`|`text`|да| - |JSON низ|
|`createdAt`|`created_at`|`timestamp`|не|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|не|`now()`| - |

### Индекси

|Име|Колони|Тип|
|---|---|---|
|`user_subscription_idx`|`userId`|B-дърво|
|`subscription_status_idx`|`status`|B-дърво|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Уникален|
|`subscription_plan_idx`|`planId`|B-дърво|
|`subscription_created_at_idx`|`createdAt`|B-дърво|

### Проверете ограниченията

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Статус Enum

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### План Enum

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### TypeScript типове

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

## Диаграма на отношенията

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

## Примери за заявки

### Вземете активен абонамент за потребител

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

### Създайте нов абонамент

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

### Регистрирайте промяна на абонамента

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

### Намерете разплащателна сметка по клиентски идентификатор на Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
