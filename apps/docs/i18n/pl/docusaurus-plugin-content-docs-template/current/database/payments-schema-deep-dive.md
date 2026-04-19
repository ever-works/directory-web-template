---
id: payments-schema-deep-dive
title: "Szczegółowe informacje na temat schematu płatności i subskrypcji"
sidebar_label: "Schemat płatności"
sidebar_position: 53
---

# Szczegółowe informacje na temat schematu płatności i subskrypcji

## Przegląd

Moduł płatności obsługuje pełny cykl życia subskrypcji: dostawców płatności, konta klientów, subskrypcje ze wsparciem próbnym, zarządzanie automatycznym odnawianiem i pełną ścieżkę audytu historii subskrypcji. System obsługuje wielu dostawców płatności (Stripe, Solidgate, LemonSqueezy, Polar).

**Plik źródłowy:** `template/lib/db/schema.ts`
**Stałe:** `template/lib/constants/payment.ts`
**Plik relacji:** `template/lib/db/migrations/relations.ts`

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

Rejestr obsługiwanych dostawców płatności.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`name`|`name`|`text`|Nie|`'stripe'`|Wyjątkowy|
|`isActive`|`is_active`|`boolean`|Nie|`true`| - |
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Wyjątkowy|
|`payment_provider_active_idx`|`isActive`|Drzewo B|
|`payment_provider_created_at_idx`|`createdAt`|Drzewo B|

### Obsługiwani dostawcy (Enum)

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

Podstawowa tabela subskrypcji z kompleksową obsługą wersji próbnych, automatycznego odnawiania, anulowania i rozliczeń między wieloma dostawcami.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`userId`|`userId`|`text`|Nie| - |FK -> `users.id` (KASKADA)|
|`planId`|`plan_id`|`text`|Nie|`'free'`|Identyfikator planu|
|`status`|`status`|`text`|Nie|`'pending'`|Stan subskrypcji|
|`startDate`|`start_date`|`timestamp`|Nie|`now()`| - |
|`endDate`|`end_date`|`timestamp`|Tak| - | - |
|`paymentProvider`|`payment_provider`|`text`|Nie|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|Tak| - |Zewnętrzny identyfikator subskrypcji|
|`invoiceId`|`invoice_id`|`text`|Tak| - |Zewnętrzny identyfikator faktury|
|`amountDue`|`amount_due`|`integer`|Tak| `0` |W centach|
|`amountPaid`|`amount_paid`|`integer`|Tak| `0` |W centach|
|`priceId`|`price_id`|`text`|Tak| - |Zewnętrzny identyfikator ceny|
|`customerId`|`customer_id`|`text`|Tak| - |Zewnętrzny identyfikator klienta|
|`currency`|`currency`|`text`|Tak|`'usd'`|Kod waluty ISO|
|`amount`|`amount`|`integer`|Tak| `0` |W centach|
|`interval`|`interval`|`text`|Tak|`'month'`|Interwał rozliczeniowy|
|`intervalCount`|`interval_count`|`integer`|Tak| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|Tak| - | - |
|`trialEnd`|`trial_end`|`timestamp`|Tak| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|Tak|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|Tak|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|Tak| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|Tak| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|Tak| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|Tak|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|Tak| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|Tak| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|Tak| - | - |
|`metadata`|`metadata`|`text`|Tak| - |Ciąg JSON|
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`user_subscription_idx`|`userId`|Drzewo B|
|`subscription_status_idx`|`status`|Drzewo B|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Wyjątkowy|
|`subscription_plan_idx`|`planId`|Drzewo B|
|`subscription_created_at_idx`|`createdAt`|Drzewo B|

### Sprawdź ograniczenia

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Wyliczenie stanu

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### Planuj wyliczenie

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### Typy TypeScriptu

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

## Schemat relacji

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

## Przykłady zapytań

### Uzyskaj aktywną subskrypcję dla użytkownika

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

### Utwórz nową subskrypcję

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

### Zarejestruj zmianę subskrypcji

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

### Znajdź konto płatnicze według identyfikatora klienta Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
