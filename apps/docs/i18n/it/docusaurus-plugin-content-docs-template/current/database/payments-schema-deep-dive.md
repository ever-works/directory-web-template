---
id: payments-schema-deep-dive
title: "Approfondimento sullo schema di pagamenti e abbonamenti"
sidebar_label: "Schema dei pagamenti"
sidebar_position: 53
---

# Approfondimento sullo schema di pagamenti e abbonamenti

## Panoramica

Il modulo pagamenti gestisce l'intero ciclo di vita dell'abbonamento: fornitori di servizi di pagamento, account cliente, abbonamenti con supporto di prova, gestione del rinnovo automatico e un audit trail completo della cronologia degli abbonamenti. Il sistema supporta più fornitori di pagamenti (Stripe, Solidgate, LemonSqueezy, Polar).

**File sorgente:** `template/lib/db/schema.ts`
**Costanti:** `template/lib/constants/payment.ts`
**File delle relazioni:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## Tabella: `paymentProviders`

Registro dei fornitori di servizi di pagamento supportati.

### Colonne

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Chiave primaria|
|`name`|`name`|`text`|No|`'stripe'`|Unico|
|`isActive`|`is_active`|`boolean`|No|`true`| - |
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Indici

|Nome|Colonne|Digitare|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Unico|
|`payment_provider_active_idx`|`isActive`|B-albero|
|`payment_provider_created_at_idx`|`createdAt`|B-albero|

### Provider supportati (enumerazione)

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

## Tabella: `subscriptions`

La tabella di abbonamento principale con supporto completo per prove, rinnovo automatico, annullamento e fatturazione multiprovider.

### Colonne

|Colonna|Nome del DB|Digitare|Nullabile|Predefinito|Vincoli|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Chiave primaria|
|`userId`|`userId`|`text`|No| - |FK -> `users.id` (CASCATA)|
|`planId`|`plan_id`|`text`|No|`'free'`|Identificatore del piano|
|`status`|`status`|`text`|No|`'pending'`|Stato dell'abbonamento|
|`startDate`|`start_date`|`timestamp`|No|`now()`| - |
|`endDate`|`end_date`|`timestamp`|Sì| - | - |
|`paymentProvider`|`payment_provider`|`text`|No|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|Sì| - |ID abbonamento esterno|
|`invoiceId`|`invoice_id`|`text`|Sì| - |ID fattura esterna|
|`amountDue`|`amount_due`|`integer`|Sì| `0` |In centesimi|
|`amountPaid`|`amount_paid`|`integer`|Sì| `0` |In centesimi|
|`priceId`|`price_id`|`text`|Sì| - |ID prezzo esterno|
|`customerId`|`customer_id`|`text`|Sì| - |ID cliente esterno|
|`currency`|`currency`|`text`|Sì|`'usd'`|Codice valuta ISO|
|`amount`|`amount`|`integer`|Sì| `0` |In centesimi|
|`interval`|`interval`|`text`|Sì|`'month'`|Intervallo di fatturazione|
|`intervalCount`|`interval_count`|`integer`|Sì| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|Sì| - | - |
|`trialEnd`|`trial_end`|`timestamp`|Sì| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|Sì|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|Sì|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|Sì| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|Sì| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|Sì| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|Sì|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|Sì| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|Sì| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|Sì| - | - |
|`metadata`|`metadata`|`text`|Sì| - |Stringa JSON|
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Indici

|Nome|Colonne|Digitare|
|---|---|---|
|`user_subscription_idx`|`userId`|B-albero|
|`subscription_status_idx`|`status`|B-albero|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Unico|
|`subscription_plan_idx`|`planId`|B-albero|
|`subscription_created_at_idx`|`createdAt`|B-albero|

### Controlla i vincoli

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Enumerazione stato

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### Pianifica l'enumerazione

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### Tipi di TypeScript

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

## Diagramma delle relazioni

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

## Esempi di query

### Ottieni un abbonamento attivo per un utente

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

### Crea un nuovo abbonamento

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

### Registra una modifica all'abbonamento

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

### Trova un conto di pagamento in base all'ID cliente Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
