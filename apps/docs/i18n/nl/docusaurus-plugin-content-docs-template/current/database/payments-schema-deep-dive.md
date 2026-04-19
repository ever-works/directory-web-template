---
id: payments-schema-deep-dive
title: "Betalingen en abonnementen Schema Deep Dive"
sidebar_label: "Betalingsschema"
sidebar_position: 53
---

# Betalingen en abonnementen Schema Deep Dive

## Overzicht

De betalingsmodule verzorgt de volledige levenscyclus van abonnementen: betalingsproviders, klantaccounts, abonnementen met proefondersteuning, beheer van automatische verlenging en een volledig audittraject van de abonnementsgeschiedenis. Het systeem ondersteunt meerdere betalingsproviders (Stripe, Solidgate, LemonSqueezy, Polar).

**Bronbestand:** `template/lib/db/schema.ts`
**Constanten:** `template/lib/constants/payment.ts`
**Relatiebestand:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## Tabel: `paymentProviders`

Register van ondersteunde betalingsproviders.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`name`|`name`|`text`|Nee|`'stripe'`|Uniek|
|`isActive`|`is_active`|`boolean`|Nee|`true`| - |
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Uniek|
|`payment_provider_active_idx`|`isActive`|B-boom|
|`payment_provider_created_at_idx`|`createdAt`|B-boom|

### Ondersteunde providers (Enum)

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

## Tabel: `subscriptions`

De belangrijkste abonnementstabel met uitgebreide ondersteuning voor proefperioden, automatische verlenging, opzegging en facturering via meerdere providers.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`userId`|`userId`|`text`|Nee| - |FK -> `users.id` (CASCADE)|
|`planId`|`plan_id`|`text`|Nee|`'free'`|Plan-ID|
|`status`|`status`|`text`|Nee|`'pending'`|Abonnementsstatus|
|`startDate`|`start_date`|`timestamp`|Nee|`now()`| - |
|`endDate`|`end_date`|`timestamp`|Ja| - | - |
|`paymentProvider`|`payment_provider`|`text`|Nee|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|Ja| - |Externe abonnements-ID|
|`invoiceId`|`invoice_id`|`text`|Ja| - |Externe factuur-ID|
|`amountDue`|`amount_due`|`integer`|Ja| `0` |In centen|
|`amountPaid`|`amount_paid`|`integer`|Ja| `0` |In centen|
|`priceId`|`price_id`|`text`|Ja| - |Externe prijs-ID|
|`customerId`|`customer_id`|`text`|Ja| - |Externe klant-ID|
|`currency`|`currency`|`text`|Ja|`'usd'`|ISO-valutacode|
|`amount`|`amount`|`integer`|Ja| `0` |In centen|
|`interval`|`interval`|`text`|Ja|`'month'`|Factureringsinterval|
|`intervalCount`|`interval_count`|`integer`|Ja| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|Ja| - | - |
|`trialEnd`|`trial_end`|`timestamp`|Ja| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|Ja|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|Ja|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|Ja| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|Ja| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|Ja| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|Ja|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|Ja| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|Ja| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|Ja| - | - |
|`metadata`|`metadata`|`text`|Ja| - |JSON-tekenreeks|
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`user_subscription_idx`|`userId`|B-boom|
|`subscription_status_idx`|`status`|B-boom|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Uniek|
|`subscription_plan_idx`|`planId`|B-boom|
|`subscription_created_at_idx`|`createdAt`|B-boom|

### Controleer beperkingen

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Status Enum

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### Plan Enum

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### TypeScript-typen

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

## Relatiediagram

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

## Voorbeelden van zoekopdrachten

### Ontvang een actief abonnement voor een gebruiker

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

### Maak een nieuw abonnement aan

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

### Een abonnementswijziging registreren

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

### Zoek een betaalrekening op basis van Stripe-klant-ID

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
