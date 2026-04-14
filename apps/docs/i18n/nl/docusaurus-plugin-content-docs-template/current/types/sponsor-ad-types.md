---
id: sponsor-ad-types
title: Definities van sponsoradvertentietypen
sidebar_label: Sponsoradvertentietypen
sidebar_position: 8
---

# Definities van sponsoradvertentietypen

**Bron:** `lib/types/sponsor-ad.ts`

De sponsoradvertentiemodule definieert typen voor het sponsor- en advertentiesysteem. Sponsors kunnen items promoten via wekelijkse of maandelijkse advertentieruimtes met een volledige levenscyclus van betaling tot goedkeuring, activering en vervaldatum.

## Typ aliassen

### `SponsorAdStatus`

Levenscyclusstatussen voor een sponsoradvertentie:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Status|Beschrijving|
|--------|-------------|
|`pending_payment`|Advertentie gemaakt, in afwachting van voltooiing van de betaling|
|`pending`|Betaling ontvangen, in afwachting van goedkeuring door de beheerder|
|`rejected`|De beheerder heeft het sponsorverzoek afgewezen|
|`active`|Goedgekeurd en momenteel weergegeven|
|`expired`|Actieve periode is afgelopen|
|`cancelled`|Geannuleerd door de sponsor of beheerder|

### `SponsorAdIntervalType`

Opties voor factureringsintervallen:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Weergavetypen

### `SponsorWithItem`

Een sponsoradvertentie met de bijbehorende artikelgegevens voor UI-weergave. Het veld `item` kan `null` zijn als het gekoppelde item niet meer bestaat.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Verzoektypen

### `CreateSponsorAdRequest`

Payload voor het maken van een nieuwe sponsoradvertentie.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Payload voor het bijwerken van een bestaande sponsoradvertentie. Wordt voornamelijk gebruikt door beheerdersactiviteiten.

```typescript
interface UpdateSponsorAdRequest {
  id: string;
  status?: SponsorAdStatus;
  startDate?: Date;
  endDate?: Date;
  subscriptionId?: string;
  customerId?: string;
}
```

### `ApproveSponsorAdRequest`

Payload voor het goedkeuren van een sponsoradvertentie die in behandeling is.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Payload voor het met een reden afwijzen van een sponsoradvertentie.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Payload voor het annuleren van een actieve of in behandeling zijnde sponsoradvertentie.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Reactietypen

### `SponsorAdResponse`

Gediscrimineerde vakbondsreactie op advertenties met één sponsor:

```typescript
type SponsorAdResponse =
  | {
      success: true;
      data: SponsorAd;
      message?: string;
    }
  | { success: false; error: string };
```

### `SponsorAdListResponse`

Gediscrimineerde vakbondsreactie voor gepagineerde sponsoradvertentielijsten:

```typescript
type SponsorAdListResponse =
  | {
      success: true;
      data: { sponsorAds: SponsorAd[] };
      meta: {
        page: number;
        totalPages: number;
        total: number;
        limit: number;
      };
    }
  | { success: false; error: string };
```

## Query-opties

### `SponsorAdListOptions`

Queryparameters voor het filteren en pagineren van sponsoradvertentielijsten.

```typescript
interface SponsorAdListOptions {
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  userId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

## Statistieken typen

### `SponsorAdStats`

Verzamel statistieken voor het sponsoradvertentiedashboard.

```typescript
interface SponsorAdStats {
  overview: {
    total: number;
    pendingPayment: number;
    pending: number;
    active: number;
    rejected: number;
    expired: number;
    cancelled: number;
  };
  byInterval: {
    weekly: number;
    monthly: number;
  };
  revenue: {
    totalRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
  };
}
```

## Dashboardtypen

### `SponsorAdDashboardResponse`

Gecombineerd antwoord voor het admin-sponsordashboard, inclusief de lijst, paginering en statistieken.

```typescript
interface SponsorAdDashboardResponse {
  success: boolean;
  data: {
    sponsorAds: SponsorAd[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
    };
    stats: SponsorAdStats;
  };
  error?: string;
}
```

## Uitgebreide typen

### `SponsorAdWithUser`

Sponsoradvertentie verrijkt met gebruikers- en reviewergegevens, gebruikt in beheerdersdetailweergaven.

```typescript
interface SponsorAdWithUser extends SponsorAd {
  user?: {
    id: string;
    email: string | null;
    image: string | null;
  };
  reviewer?: {
    id: string;
    email: string | null;
  } | null;
}
```

## Gebruiksvoorbeelden

### Een sponsoradvertentie maken

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Sponsoradvertenties filteren

```typescript
import type { SponsorAdListOptions } from '@/lib/types/sponsor-ad';

const options: SponsorAdListOptions = {
  status: 'active',
  interval: 'monthly',
  sortBy: 'startDate',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};
```

### Omgaan met gediscrimineerde vakbondsreacties

```typescript
import type { SponsorAdResponse } from '@/lib/types/sponsor-ad';

async function approveSponsor(id: string): Promise<void> {
  const res = await fetch(`/api/admin/sponsor-ads/${id}/approve`, {
    method: 'POST',
  });
  const data: SponsorAdResponse = await res.json();

  if (data.success) {
    console.log('Approved:', data.data.id);
    if (data.message) {
      console.log('Message:', data.message);
    }
  } else {
    console.error('Failed:', data.error);
  }
}
```

### Dashboardstatistieken weergeven

```typescript
import type { SponsorAdStats } from '@/lib/types/sponsor-ad';

function renderStats(stats: SponsorAdStats) {
  const activeRate = stats.overview.total > 0
    ? (stats.overview.active / stats.overview.total * 100).toFixed(1)
    : '0';

  return {
    totalAds: stats.overview.total,
    activePercentage: `${activeRate}%`,
    weeklyRevenue: `$${stats.revenue.weeklyRevenue.toFixed(2)}`,
    monthlyRevenue: `$${stats.revenue.monthlyRevenue.toFixed(2)}`,
  };
}
```

## Ontwerpnotities

### Levenscyclus van sponsoradvertenties

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Sponsor maakt advertentie en initieert de betaling (`pending_payment`)
2. Nadat de betaling is voltooid, wordt de advertentie verplaatst naar `pending` voor beheerdersbeoordeling
3. Beheerder keurt goed (`active`) of wijst af (`rejected`)
4. Actieve advertenties verlopen automatisch wanneer `endDate` verstrijkt
5. Sponsors of beheerders kunnen op elk moment annuleren

### Gediscrimineerde reacties van de Unie

De typen `SponsorAdResponse` en `SponsorAdListResponse` gebruiken gediscrimineerde vakbonden op basis van het veld `success`. Dit maakt typeveilige foutafhandeling in TypeScript mogelijk:

```typescript
// TypeScript narrows the type based on success check
if (response.success) {
  // TypeScript knows response.data exists here
  console.log(response.data);
} else {
  // TypeScript knows response.error exists here
  console.error(response.error);
}
```

## Gerelateerde typen

- [`ItemData`](./item-types.md) - Het item dat wordt gesponsord (waarnaar wordt verwezen met `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Type databaseschema van `lib/db/schema`
