---
id: sponsor-ads-schema-deep-dive
title: "Задълбочено потапяне в схемата за реклами на спонсори"
sidebar_label: "Схема за спонсориране на реклами"
sidebar_position: 58
---

# Задълбочено потапяне в схемата за реклами на спонсори

## Преглед

Модулът за спонсорски реклами позволява на потребителите да плащат за промотирано поставяне на артикули на сайта. Той прилага пълен жизнен цикъл: подаване, плащане, администраторски преглед, активно показване и изтичане/анулиране. Системата се интегрира с инфраструктурата на доставчика на плащания и поддържа както седмични, така и месечни интервали на спонсорство.

**Изходен файл:** `template/lib/db/schema.ts`

---

## Table: `sponsor_ads`

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| **User/Submitter** | | | | | |
| `userId` | `user_id` | `text` | No | - | FK -> `users.id` (CASCADE) |
| **Item** | | | | | |
| `itemSlug` | `item_slug` | `text` | No | - | Item being sponsored |
| **Sponsorship Details** | | | | | |
| `status` | `status` | `text (enum)` | No | `'pending_payment'` | See status enum |
| `interval` | `interval` | `text (enum)` | No | - | `weekly`, `monthly` |
| **Pricing** | | | | | |
| `amount` | `amount` | `integer` | No | - | In dollars |
| `currency` | `currency` | `text` | No | `'usd'` | ISO currency code |
| **Payment** | | | | | |
| `paymentProvider` | `payment_provider` | `text` | No | - | Provider name |
| `subscriptionId` | `subscription_id` | `text` | Yes | - | External subscription ID |
| `customerId` | `customer_id` | `text` | Yes | - | External customer ID |
| **Subscription Period** | | | | | |
| `startDate` | `start_date` | `timestamp` | Yes | - | - |
| `endDate` | `end_date` | `timestamp` | Yes | - | - |
| **Admin Review** | | | | | |
| `reviewedBy` | `reviewed_by` | `text` | Yes | - | FK -> `users.id` (SET NULL) |
| `reviewedAt` | `reviewed_at` | `timestamp` | Yes | - | - |
| `rejectionReason` | `rejection_reason` | `text` | Yes | - | - |
| **Cancellation** | | | | | |
| `cancelledAt` | `cancelled_at` | `timestamp` | Yes | - | - |
| `cancelReason` | `cancel_reason` | `text` | Yes | - | - |
| **Timestamps** | | | | | |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Foreign Keys

| Column | References | On Delete |
|---|---|---|
| `user_id` | `users.id` | CASCADE |
| `reviewed_by` | `users.id` | SET NULL |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `sponsor_ads_user_id_idx` | `userId` | B-tree |
| `sponsor_ads_item_slug_idx` | `itemSlug` | B-tree |
| `sponsor_ads_status_idx` | `status` | B-tree |
| `sponsor_ads_interval_idx` | `interval` | B-tree |
| `sponsor_ads_provider_subscription_idx` | `(paymentProvider, subscriptionId)` | Unique |
| `sponsor_ads_start_date_idx` | `startDate` | B-tree |
| `sponsor_ads_end_date_idx` | `endDate` | B-tree |
| `sponsor_ads_created_at_idx` | `createdAt` | B-tree |

---

## Статус Enum

```typescript
export const SponsorAdStatus = {
    PENDING_PAYMENT: 'pending_payment', // User submitted, waiting for payment
    PENDING: 'pending',                 // User paid, waiting for admin review
    REJECTED: 'rejected',               // Admin rejected
    ACTIVE: 'active',                   // Admin approved, displaying on site
    EXPIRED: 'expired',                 // Subscription period ended
    CANCELLED: 'cancelled'              // Cancelled by user or admin
} as const;

export type SponsorAdStatusValues =
    (typeof SponsorAdStatus)[keyof typeof SponsorAdStatus];
```

## Интервал Enum

```typescript
export const SponsorAdInterval = {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly'
} as const;

export type SponsorAdIntervalValues =
    (typeof SponsorAdInterval)[keyof typeof SponsorAdInterval];
```

---

## TypeScript Types

```typescript
export type SponsorAd = typeof sponsorAds.$inferSelect;
export type NewSponsorAd = typeof sponsorAds.$inferInsert;
```

---

## Работен процес на състоянието

```mermaid
stateDiagram-v2
    [*] --> pending_payment : User submits sponsorship request
    pending_payment --> pending : Payment confirmed
    pending_payment --> cancelled : Payment fails / user cancels
    pending --> active : Admin approves
    pending --> rejected : Admin rejects
    active --> expired : End date reached
    active --> cancelled : User or admin cancels
    rejected --> [*]
    expired --> [*]
    cancelled --> [*]
```

---

## Relations Diagram

```mermaid
erDiagram
    users ||--o{ sponsor_ads : "submits"
    users ||--o{ sponsor_ads : "reviews (admin)"

    sponsor_ads {
        text id PK
        text user_id FK
        text item_slug
        text status
        text interval
        integer amount
        text currency
        text payment_provider
        text subscription_id
        text customer_id
        timestamp start_date
        timestamp end_date
        text reviewed_by FK
        timestamp reviewed_at
        text rejection_reason
        timestamp cancelled_at
    }
```

---

## Ключови дизайнерски решения

### Два външни ключа към `users`

Таблицата има две препратки към таблицата `users`:
1. **`userId` (CASCADE):** Потребителят, който е изпратил и плаща за спонсорството. Изтриването на потребителя изтрива всички негови реклами на спонсори.
2. **`reviewedBy` (SET NULL):** Администраторът, който е одобрил/отхвърлил. Ако администраторът бъде изтрит, записът за преглед се запазва с нулев рецензент.

### Интеграция на външни плащания

Комбинацията `paymentProvider` + `subscriptionId` има уникален индекс, отразяващ модела в таблицата `subscriptions`. Това позволява търсене на спонсорски реклами по техния външен абонаментен препратка по време на обработка на webhook.

### Сума в долари

За разлика от таблицата `subscriptions`, която съхранява суми в центове, колоната `sponsor_ads.amount` съхранява стойности в цели долари. Имайте предвид тази разлика, когато се интегрирате с доставчици на плащания.

---

## Query Examples

### Create a sponsor ad request

```typescript
import { db } from '@/lib/db/drizzle';
import { sponsorAds, SponsorAdStatus } from '@/lib/db/schema';

await db.insert(sponsorAds).values({
    userId,
    itemSlug: 'my-tool-slug',
    status: SponsorAdStatus.PENDING_PAYMENT,
    interval: 'monthly',
    amount: 49,
    currency: 'usd',
    paymentProvider: 'stripe',
});
```

### Confirm payment (update status)

```typescript
await db
    .update(sponsorAds)
    .set({
        status: SponsorAdStatus.PENDING,
        subscriptionId: stripeSubscription.id,
        customerId: stripeCustomer.id,
        updatedAt: new Date(),
    })
    .where(eq(sponsorAds.id, sponsorAdId));
```

### Admin approves a sponsor ad

```typescript
await db
    .update(sponsorAds)
    .set({
        status: SponsorAdStatus.ACTIVE,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        updatedAt: new Date(),
    })
    .where(eq(sponsorAds.id, sponsorAdId));
```

### Admin rejects a sponsor ad

```typescript
await db
    .update(sponsorAds)
    .set({
        status: SponsorAdStatus.REJECTED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        rejectionReason: 'Content does not meet advertising guidelines.',
        updatedAt: new Date(),
    })
    .where(eq(sponsorAds.id, sponsorAdId));
```

### Get active sponsor ads for display

```typescript
import { and, eq, lte, gte } from 'drizzle-orm';

const now = new Date();
const activeAds = await db
    .select()
    .from(sponsorAds)
    .where(
        and(
            eq(sponsorAds.status, SponsorAdStatus.ACTIVE),
            lte(sponsorAds.startDate, now),
            gte(sponsorAds.endDate, now)
        )
    );
```

### Find sponsor ad by Stripe subscription ID

```typescript
const ad = await db
    .select()
    .from(sponsorAds)
    .where(
        and(
            eq(sponsorAds.paymentProvider, 'stripe'),
            eq(sponsorAds.subscriptionId, stripeSubscriptionId)
        )
    )
    .limit(1);
```

### Get pending reviews for admin dashboard

```typescript
const pendingReviews = await db
    .select()
    .from(sponsorAds)
    .where(eq(sponsorAds.status, SponsorAdStatus.PENDING))
    .orderBy(asc(sponsorAds.createdAt));
```

### Expire sponsor ads past their end date

```typescript
await db
    .update(sponsorAds)
    .set({
        status: SponsorAdStatus.EXPIRED,
        updatedAt: new Date(),
    })
    .where(
        and(
            eq(sponsorAds.status, SponsorAdStatus.ACTIVE),
            lte(sponsorAds.endDate, new Date())
        )
    );
```

---

## Бележки по дизайна

- **Идентификация на артикул чрез slug.** Както всички таблици за препращане към артикул, `itemSlug` съхранява slug съдържанието на елемента, а не външен ключ на база данни.
- **Уникален доставчик+абонаментен индекс.** Гарантира липса на дублиращи се абонаментни записи и позволява бързи търсения на уебкукички.
- **Меки преходи на състоянието.** Промените в състоянието се проследяват чрез самата колона за състояние. За пълна одитна пътека помислете за сдвояване с таблицата `activityLogs`.
- **Ръчно изтичане.** Няма автоматичен механизъм за изтичане на ниво база данни. Задание на cron или манипулатор на webhook трябва периодично да проверява за просрочени спонсорски реклами и да изтече.
