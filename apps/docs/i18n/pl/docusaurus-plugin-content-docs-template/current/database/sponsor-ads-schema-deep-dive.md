---
id: sponsor-ads-schema-deep-dive
title: "Szczegółowe informacje na temat schematu reklam sponsorskich"
sidebar_label: "Schemat reklam sponsorskich"
sidebar_position: 58
---

# Szczegółowe informacje na temat schematu reklam sponsorskich

## Przegląd

Moduł reklam sponsorskich umożliwia użytkownikom płacenie za promowane umieszczanie artykułów w serwisie. Implementuje pełny cykl życia: przesłanie, płatność, przegląd administracyjny, aktywne wyświetlanie i wygaśnięcie/anulowanie. System integruje się z infrastrukturą dostawców płatności i obsługuje zarówno tygodniowe, jak i miesięczne interwały sponsorskie.

**Plik źródłowy:** `template/lib/db/schema.ts`

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

## Wyliczenie stanu

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

## Wyliczenie interwału

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

## Przepływ pracy stanu

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

## Kluczowe decyzje projektowe

### Dwa klucze obce do `users`

W tabeli znajdują się dwa odniesienia do tabeli `users`:
1. **`userId` (CASCADE):** Użytkownik, który złożył wniosek i płaci za sponsoring. Usunięcie użytkownika powoduje usunięcie wszystkich jego reklam sponsorskich.
2. **`reviewedBy` (USTAW NULL):** Administrator, który zatwierdził/odrzucił. Jeśli administrator zostanie usunięty, rekord recenzji zostanie zachowany z recenzentem zerowym.

### Integracja płatności zewnętrznych

Kombinacja `paymentProvider` + `subscriptionId` ma unikalny indeks, odzwierciedlający wzór z tabeli `subscriptions`. Umożliwia to wyszukiwanie reklam sponsorów według ich zewnętrznego odniesienia do subskrypcji podczas przetwarzania webhooka.

### Kwota w dolarach

W przeciwieństwie do tabeli `subscriptions`, która przechowuje kwoty w centach, kolumna `sponsor_ads.amount` przechowuje wartości w całych dolarach. Należy pamiętać o tej różnicy podczas integracji z dostawcami usług płatniczych.

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

## Uwagi do projektu

- **Identyfikacja przedmiotu na podstawie ślimaka.** Podobnie jak wszystkie tabele odwołujące się do elementów, `itemSlug` przechowuje informację o zawartości przedmiotu, a nie klucz obcy bazy danych.
- **Unikalny dostawca+indeks subskrypcji.** Zapewnia brak duplikatów zapisów subskrypcji i umożliwia szybkie wyszukiwanie elementów webhook.
- **Miękkie zmiany statusu.** Zmiany statusu są śledzone za pomocą samej kolumny statusu. Aby uzyskać pełną ścieżkę audytu, rozważ połączenie z tabelą `activityLogs`.
- **Ręczne wygasanie.** Na poziomie bazy danych nie ma mechanizmu automatycznego wygaśnięcia. Zadanie cron lub moduł obsługi webhooka powinien okresowo sprawdzać i wygasać zaległe reklamy sponsorów.
