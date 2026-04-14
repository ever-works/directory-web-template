---
id: sponsor-ads-schema-deep-dive
title: "Sponsoradvertentieschema Deep Dive"
sidebar_label: "Schema voor sponsoradvertenties"
sidebar_position: 58
---

# Sponsoradvertentieschema Deep Dive

## Overzicht

Met de module voor sponsoradvertenties kunnen gebruikers betalen voor de gepromote plaatsing van items op de site. Het implementeert een volledige levenscyclus: indiening, betaling, beheerdersbeoordeling, actieve weergave en verval/annulering. Het systeem kan worden geïntegreerd met de infrastructuur van de betalingsprovider en ondersteunt zowel wekelijkse als maandelijkse sponsorintervallen.

**Bronbestand:** `template/lib/db/schema.ts`

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

## Status Enum

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

## Interval Enum

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

## Statuswerkstroom

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

## Belangrijke ontwerpbeslissingen

### Twee buitenlandse sleutels voor `users`

De tabel heeft twee verwijzingen naar de `users` tabel:
1. **`userId` (CASCADE):** De gebruiker die de sponsoring heeft ingediend en betaald. Als u de gebruiker verwijdert, worden alle sponsoradvertenties verwijderd.
2. **`reviewedBy` (SET NULL):** De beheerder die heeft goedgekeurd/afgewezen. Als de beheerder wordt verwijderd, blijft de beoordelingsrecord behouden met een nulreviewer.

### Externe betalingsintegratie

De combinatie `paymentProvider` + `subscriptionId` heeft een unieke index, die het patroon in de `subscriptions` tabel weerspiegelt. Hierdoor kunt u sponsoradvertenties opzoeken op basis van hun externe abonnementsreferentie tijdens de webhookverwerking.

### Bedrag in dollars

In tegenstelling tot de tabel `subscriptions` waarin bedragen in centen worden opgeslagen, slaat de kolom `sponsor_ads.amount` waarden op in hele dollars. Houd rekening met dit verschil bij de integratie met betalingsproviders.

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

## Ontwerpnotities

- **Itemidentificatie door slug.** Net als alle tabellen die naar items verwijzen, slaat `itemSlug` de inhoudsslug van het item op, niet een externe databasesleutel.
- **Unieke provider+abonnementsindex.** Zorgt ervoor dat er geen dubbele abonnementsrecords zijn en maakt snelle webhook-zoekopdrachten mogelijk.
- **Zachte statusovergangen.** Statuswijzigingen worden bijgehouden via de statuskolom zelf. Voor een volledig audittraject kunt u overwegen om te koppelen met de `activityLogs` tabel.
- **Handmatige vervaldatum.** Er is geen automatisch vervalmechanisme op databaseniveau. Een cronjob of webhook-handler moet periodiek controleren op achterstallige sponsoradvertenties en deze laten verlopen.
