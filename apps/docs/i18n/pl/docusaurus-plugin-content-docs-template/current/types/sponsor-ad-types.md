---
id: sponsor-ad-types
title: Definicje typów reklam sponsora
sidebar_label: Typy reklam sponsora
sidebar_position: 8
---

# Definicje typów reklam sponsora

**Źródło:** `lib/types/sponsor-ad.ts`

Moduł reklam sponsorskich definiuje typy dla systemu sponsoringowo-reklamowego. Sponsorzy mogą promować przedmioty za pośrednictwem cotygodniowych lub miesięcznych boksów reklamowych z pełnym cyklem życia, od płatności poprzez zatwierdzenie, aktywację i wygaśnięcie.

## Wpisz aliasy

### `SponsorAdStatus`

Stany cyklu życia reklamy sponsora:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Stan|Opis|
|--------|-------------|
|`pending_payment`|Ogłoszenie utworzono i oczekuje na zakończenie płatności|
|`pending`|Płatność otrzymana, oczekuje na zatwierdzenie przez administratora|
|`rejected`|Administrator odrzucił prośbę o sponsorowanie|
|`active`|Zatwierdzone i aktualnie wyświetlane|
|`expired`|Aktywny okres dobiegł końca|
|`cancelled`|Anulowane przez sponsora lub administratora|

### `SponsorAdIntervalType`

Opcje interwałów rozliczeniowych:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Typy wyświetlaczy

### `SponsorWithItem`

Reklama sponsora z powiązanymi danymi przedmiotu do wyświetlania w interfejsie użytkownika. Pole `item` może mieć wartość `null`, jeśli powiązany element już nie istnieje.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Typy żądań

### `CreateSponsorAdRequest`

Ładunek umożliwiający utworzenie nowej reklamy sponsora.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Ładunek umożliwiający aktualizację istniejącej reklamy sponsora. Używany głównie przez administratorów.

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

Ładunek umożliwiający zatwierdzenie oczekującej reklamy sponsora.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Ładunek za odrzucenie reklamy sponsora z podaniem powodu.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Ładunek umożliwiający anulowanie aktywnej lub oczekującej reklamy sponsora.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Typy odpowiedzi

### `SponsorAdResponse`

Dyskryminowana reakcja związku na działania reklamowe jednego sponsora:

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

Dyskryminowana reakcja związku na podzielone na strony listy reklam sponsorów:

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

## Opcje zapytania

### `SponsorAdListOptions`

Parametry zapytania do filtrowania i paginacji list reklam sponsorów.

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

## Typy statystyk

### `SponsorAdStats`

Zbiorcze statystyki dla panelu reklam sponsora.

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

## Typy pulpitów nawigacyjnych

### `SponsorAdDashboardResponse`

Połączona odpowiedź dla panelu administratora sponsora, w tym lista, paginacja i statystyki.

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

## Typy rozszerzone

### `SponsorAdWithUser`

Reklama sponsora wzbogacona o dane użytkownika i recenzenta, wykorzystywana w widokach szczegółów administratora.

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

## Przykłady użycia

### Tworzenie reklamy sponsora

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtrowanie reklam sponsorów

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

### Radzenie sobie z dyskryminowanymi reakcjami związkowymi

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

### Wyświetlanie statystyk panelu

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

## Uwagi do projektu

### Cykl życia reklamy sponsora

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Sponsor tworzy reklamę i inicjuje płatność (`pending_payment`)
2. Po zakończeniu płatności reklama zostanie przeniesiona do `pending` w celu sprawdzenia przez administratora
3. Administrator zatwierdza (`active`) lub odrzuca (`rejected`)
4. Aktywne reklamy wygasają automatycznie po przejściu `endDate`
5. Sponsorzy lub administratorzy mogą anulować subskrypcję w dowolnym momencie

### Dyskryminowane reakcje Unii

Typy `SponsorAdResponse` i `SponsorAdListResponse` wykorzystują związki dyskryminowane oparte na polu `success`. Umożliwia to bezpieczną obsługę błędów w TypeScript:

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

## Powiązane typy

- [`ItemData`](./item-types.md) – Element sponsorowany (do którego odwołuje się `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Typ schematu bazy danych z `lib/db/schema`
