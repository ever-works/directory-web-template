---
id: payments-schema-deep-dive
title: "סכמת תשלומים ומנויים Deep Dive"
sidebar_label: "סכימת תשלומים"
sidebar_position: 53
---

# סכמת תשלומים ומנויים Deep Dive

## סקירה כללית

מודול התשלומים מטפל במחזור החיים המלא של המנוי: ספקי תשלומים, חשבונות לקוחות, מנויים עם תמיכת ניסיון, ניהול חידוש אוטומטי ומסלול ביקורת מלא של היסטוריית מנויים. המערכת תומכת במספר ספקי תשלום (Stripe, Solidgate, LemonSqueezy, Polar).

**קובץ מקור:** `template/lib/db/schema.ts`
**קבועים:** `template/lib/constants/payment.ts`
**קובץ יחסים:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## טבלה: `paymentProviders`

רישום של ספקי תשלומים נתמכים.

### עמודות

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא|`crypto.randomUUID()`|מפתח ראשי|
|`name`|`name`|`text`|לא|`'stripe'`|ייחודי|
|`isActive`|`is_active`|`boolean`|לא|`true`| - |
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|לא|`now()`| - |

### אינדקסים

|שם|עמודות|הקלד|
|---|---|---|
|`paymentProviders_name_unique`|`name`|ייחודי|
|`payment_provider_active_idx`|`isActive`|B-עץ|
|`payment_provider_created_at_idx`|`createdAt`|B-עץ|

### ספקים נתמכים (Enum)

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

## טבלה: `subscriptions`

טבלת המנויים המרכזית עם תמיכה מקיפה בנסיונות, חידוש אוטומטי, ביטול וחיוב מרובה ספקים.

### עמודות

|עמודה|שם DB|הקלד|ניתן לבטל|ברירת מחדל|אילוצים|
|---|---|---|---|---|---|
|`id`|`id`|`text`|לא|`crypto.randomUUID()`|מפתח ראשי|
|`userId`|`userId`|`text`|לא| - |FK -> `users.id` (CASCADE)|
|`planId`|`plan_id`|`text`|לא|`'free'`|מזהה תוכנית|
|`status`|`status`|`text`|לא|`'pending'`|סטטוס מנוי|
|`startDate`|`start_date`|`timestamp`|לא|`now()`| - |
|`endDate`|`end_date`|`timestamp`|כן| - | - |
|`paymentProvider`|`payment_provider`|`text`|לא|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|כן| - |מזהה מנוי חיצוני|
|`invoiceId`|`invoice_id`|`text`|כן| - |מזהה חשבונית חיצונית|
|`amountDue`|`amount_due`|`integer`|כן| `0` |בסנטים|
|`amountPaid`|`amount_paid`|`integer`|כן| `0` |בסנטים|
|`priceId`|`price_id`|`text`|כן| - |מזהה מחיר חיצוני|
|`customerId`|`customer_id`|`text`|כן| - |זיהוי לקוח חיצוני|
|`currency`|`currency`|`text`|כן|`'usd'`|קוד מטבע ISO|
|`amount`|`amount`|`integer`|כן| `0` |בסנטים|
|`interval`|`interval`|`text`|כן|`'month'`|מרווח חיוב|
|`intervalCount`|`interval_count`|`integer`|כן| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|כן| - | - |
|`trialEnd`|`trial_end`|`timestamp`|כן| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|כן|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|כן|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|כן| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|כן| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|כן| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|כן|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|כן| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|כן| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|כן| - | - |
|`metadata`|`metadata`|`text`|כן| - |מחרוזת JSON|
|`createdAt`|`created_at`|`timestamp`|לא|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|לא|`now()`| - |

### אינדקסים

|שם|עמודות|הקלד|
|---|---|---|
|`user_subscription_idx`|`userId`|B-עץ|
|`subscription_status_idx`|`status`|B-עץ|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|ייחודי|
|`subscription_plan_idx`|`planId`|B-עץ|
|`subscription_created_at_idx`|`createdAt`|B-עץ|

### בדוק אילוצים

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### מצב מצב

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### תוכנית Enum

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### סוגי TypeScript

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

## תרשים יחסים

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

## דוגמאות לשאילתות

### קבל מנוי פעיל עבור משתמש

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

### צור מנוי חדש

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

### רשום שינוי מנוי

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

### מצא חשבון תשלום לפי מספר לקוח של Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
