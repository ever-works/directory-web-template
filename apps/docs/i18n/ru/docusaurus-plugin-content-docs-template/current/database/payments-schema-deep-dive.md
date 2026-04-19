---
id: payments-schema-deep-dive
title: "Подробное описание схемы платежей и подписок"
sidebar_label: "Схема платежей"
sidebar_position: 53
---

# Подробное описание схемы платежей и подписок

## Обзор

Модуль платежей обрабатывает полный жизненный цикл подписки: поставщики платежей, учетные записи клиентов, подписки с пробной поддержкой, управление автоматическим продлением и полный контроль истории подписки. Система поддерживает несколько поставщиков платежей (Stripe, Solidgate, LemonSqueezy, Polar).

**Исходный файл:** `template/lib/db/schema.ts`
**Константы:** `template/lib/constants/payment.ts`
**Файл отношений:** `template/lib/db/migrations/relations.ts`

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

Реестр поддерживаемых платежных систем.

### Столбцы

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Нет|`crypto.randomUUID()`|Первичный ключ|
|`name`|`name`|`text`|Нет|`'stripe'`|Уникальный|
|`isActive`|`is_active`|`boolean`|Нет|`true`| - |
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Нет|`now()`| - |

### Индексы

|Имя|Столбцы|Тип|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Уникальный|
|`payment_provider_active_idx`|`isActive`|B-дерево|
|`payment_provider_created_at_idx`|`createdAt`|B-дерево|

### Поддерживаемые поставщики (перечисление)

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

Основная таблица подписок с комплексной поддержкой пробных версий, автоматического продления, отмены и выставления счетов нескольким поставщикам.

### Столбцы

|Столбец|Имя БД|Тип|Обнуляемый|По умолчанию|Ограничения|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Нет|`crypto.randomUUID()`|Первичный ключ|
|`userId`|`userId`|`text`|Нет| - |ФК -> `users.id` (КАСКАД)|
|`planId`|`plan_id`|`text`|Нет|`'free'`|Идентификатор плана|
|`status`|`status`|`text`|Нет|`'pending'`|Статус подписки|
|`startDate`|`start_date`|`timestamp`|Нет|`now()`| - |
|`endDate`|`end_date`|`timestamp`|Да| - | - |
|`paymentProvider`|`payment_provider`|`text`|Нет|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|Да| - |Идентификатор внешней подписки|
|`invoiceId`|`invoice_id`|`text`|Да| - |Идентификатор внешнего счета-фактуры|
|`amountDue`|`amount_due`|`integer`|Да| `0` |В центах|
|`amountPaid`|`amount_paid`|`integer`|Да| `0` |В центах|
|`priceId`|`price_id`|`text`|Да| - |Внешний идентификатор цены|
|`customerId`|`customer_id`|`text`|Да| - |Внешний идентификатор клиента|
|`currency`|`currency`|`text`|Да|`'usd'`|Код валюты ISO|
|`amount`|`amount`|`integer`|Да| `0` |В центах|
|`interval`|`interval`|`text`|Да|`'month'`|Платежный интервал|
|`intervalCount`|`interval_count`|`integer`|Да| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|Да| - | - |
|`trialEnd`|`trial_end`|`timestamp`|Да| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|Да|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|Да|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|Да| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|Да| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|Да| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|Да|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|Да| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|Да| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|Да| - | - |
|`metadata`|`metadata`|`text`|Да| - |JSON-строка|
|`createdAt`|`created_at`|`timestamp`|Нет|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Нет|`now()`| - |

### Индексы

|Имя|Столбцы|Тип|
|---|---|---|
|`user_subscription_idx`|`userId`|B-дерево|
|`subscription_status_idx`|`status`|B-дерево|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Уникальный|
|`subscription_plan_idx`|`planId`|B-дерево|
|`subscription_created_at_idx`|`createdAt`|B-дерево|

### Проверить ограничения

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Перечисление статуса

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### План перечисления

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### Типы TypeScript

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

## Диаграмма отношений

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

## Примеры запросов

### Получить активную подписку для пользователя

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

### Создать новую подписку

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

### Зарегистрировать изменение подписки

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

### Найдите платежный счет по идентификатору клиента Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
