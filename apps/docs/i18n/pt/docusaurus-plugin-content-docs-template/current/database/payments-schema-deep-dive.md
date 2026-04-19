---
id: payments-schema-deep-dive
title: "Aprofundamento do esquema de pagamentos e assinaturas"
sidebar_label: "Esquema de pagamentos"
sidebar_position: 53
---

# Aprofundamento do esquema de pagamentos e assinaturas

## Visão geral

O módulo de pagamentos lida com todo o ciclo de vida da assinatura: provedores de pagamento, contas de clientes, assinaturas com suporte de avaliação, gerenciamento de renovação automática e uma trilha de auditoria completa do histórico de assinaturas. O sistema oferece suporte a vários provedores de pagamento (Stripe, Solidgate, LemonSqueezy, Polar).

**Arquivo fonte:** `template/lib/db/schema.ts`
**Constantes:** `template/lib/constants/payment.ts`
**Arquivo de relações:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## Tabela: `paymentProviders`

Registro de provedores de pagamento suportados.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`name`|`name`|`text`|Não|`'stripe'`|Único|
|`isActive`|`is_active`|`boolean`|Não|`true`| - |
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Único|
|`payment_provider_active_idx`|`isActive`|Árvore B|
|`payment_provider_created_at_idx`|`createdAt`|Árvore B|

### Provedores Suportados (Enum)

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

## Tabela: `subscriptions`

A tabela principal de assinaturas com suporte abrangente para avaliações, renovação automática, cancelamento e cobrança de vários provedores.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`userId`|`userId`|`text`|Não| - |FK -> `users.id` (CASCADA)|
|`planId`|`plan_id`|`text`|Não|`'free'`|Identificador do plano|
|`status`|`status`|`text`|Não|`'pending'`|Status da assinatura|
|`startDate`|`start_date`|`timestamp`|Não|`now()`| - |
|`endDate`|`end_date`|`timestamp`|Sim| - | - |
|`paymentProvider`|`payment_provider`|`text`|Não|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|Sim| - |ID de assinatura externa|
|`invoiceId`|`invoice_id`|`text`|Sim| - |ID da fatura externa|
|`amountDue`|`amount_due`|`integer`|Sim| `0` |Em centavos|
|`amountPaid`|`amount_paid`|`integer`|Sim| `0` |Em centavos|
|`priceId`|`price_id`|`text`|Sim| - |ID de preço externo|
|`customerId`|`customer_id`|`text`|Sim| - |ID do cliente externo|
|`currency`|`currency`|`text`|Sim|`'usd'`|Código de moeda ISO|
|`amount`|`amount`|`integer`|Sim| `0` |Em centavos|
|`interval`|`interval`|`text`|Sim|`'month'`|Intervalo de cobrança|
|`intervalCount`|`interval_count`|`integer`|Sim| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|Sim| - | - |
|`trialEnd`|`trial_end`|`timestamp`|Sim| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|Sim|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|Sim|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|Sim| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|Sim| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|Sim| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|Sim|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|Sim| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|Sim| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|Sim| - | - |
|`metadata`|`metadata`|`text`|Sim| - |Cadeia JSON|
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`user_subscription_idx`|`userId`|Árvore B|
|`subscription_status_idx`|`status`|Árvore B|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Único|
|`subscription_plan_idx`|`planId`|Árvore B|
|`subscription_created_at_idx`|`createdAt`|Árvore B|

### Verifique as restrições

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Enumeração de status

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### Enumeração do plano

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### Tipos de TypeScript

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

## Diagrama de Relações

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

## Exemplos de consulta

### Obtenha assinatura ativa para um usuário

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

### Crie uma nova assinatura

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

### Registrar uma alteração de assinatura

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

### Encontre uma conta de pagamento por ID de cliente Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
