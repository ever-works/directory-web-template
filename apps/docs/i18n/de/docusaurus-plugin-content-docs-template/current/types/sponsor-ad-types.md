---
id: sponsor-ad-types
title: Definitionen der Sponsor-Anzeigentypen
sidebar_label: Sponsor-Anzeigentypen
sidebar_position: 8
---

# Definitionen der Sponsor-Anzeigentypen

**Quelle:** `lib/types/sponsor-ad.ts`

Das Sponsor-Anzeigenmodul definiert Typen für das Sponsoring- und Werbesystem. Sponsoren können Artikel über wöchentliche oder monatliche Werbeslots mit einem vollständigen Lebenszyklus von der Zahlung über die Genehmigung, Aktivierung bis hin zum Ablauf bewerben.

## Geben Sie Aliase ein

### `SponsorAdStatus`

Lebenszykluszustände für eine Sponsor-Werbung:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Status|Beschreibung|
|--------|-------------|
|`pending_payment`|Die Anzeige wurde erstellt und wartet auf den Abschluss der Zahlung|
|`pending`|Zahlung erhalten, wartet auf Genehmigung durch den Administrator|
|`rejected`|Der Administrator hat die Sponsoring-Anfrage abgelehnt|
|`active`|Genehmigt und derzeit angezeigt|
|`expired`|Der aktive Zeitraum ist beendet|
|`cancelled`|Vom Sponsor oder Administrator abgesagt|

### `SponsorAdIntervalType`

Optionen für Abrechnungsintervalle:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Anzeigetypen

### `SponsorWithItem`

Eine Sponsor-Anzeige mit den zugehörigen Artikeldaten für die UI-Anzeige. Das Feld `item` kann `null` sein, wenn das verknüpfte Element nicht mehr vorhanden ist.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Anfragetypen

### `CreateSponsorAdRequest`

Payload zum Erstellen einer neuen Sponsor-Anzeige.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Payload zum Aktualisieren einer vorhandenen Sponsor-Anzeige. Wird hauptsächlich von Administratoren verwendet.

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

Nutzlast für die Genehmigung einer ausstehenden Sponsoranzeige.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Nutzlast für die Ablehnung einer Sponsoranzeige mit einem Grund.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Nutzlast zum Stornieren einer aktiven oder ausstehenden Sponsoranzeige.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Antworttypen

### `SponsorAdResponse`

Diskriminierte gewerkschaftliche Reaktion auf Anzeigenoperationen einzelner Sponsoren:

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

Diskriminierte Gewerkschaftsreaktion auf paginierte Sponsorenanzeigenlisten:

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

## Abfrageoptionen

### `SponsorAdListOptions`

Abfrageparameter zum Filtern und Paginieren von Sponsor-Anzeigenlisten.

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

## Statistiktypen

### `SponsorAdStats`

Aggregierte Statistiken für das Sponsor-Anzeigen-Dashboard.

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

## Dashboard-Typen

### `SponsorAdDashboardResponse`

Kombinierte Antwort für das Admin-Sponsor-Dashboard, einschließlich Liste, Paginierung und Statistiken.

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

## Erweiterte Typen

### `SponsorAdWithUser`

Mit Benutzer- und Prüferdaten angereicherte Sponsorenanzeige, die in Administrator-Detailansichten verwendet wird.

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

## Anwendungsbeispiele

### Erstellen einer Sponsorenanzeige

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Sponsorenanzeigen filtern

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

### Umgang mit diskriminierten Gewerkschaftsreaktionen

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

### Anzeigen von Dashboard-Statistiken

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

## Designhinweise

### Lebenszyklus der Sponsor-Anzeige

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Der Sponsor erstellt eine Anzeige und leitet die Zahlung ein (`pending_payment`)
2. Nach Abschluss der Zahlung wird die Anzeige zur Überprüfung durch den Administrator an `pending` verschoben
3. Der Administrator genehmigt (`active`) oder lehnt ab (`rejected`)
4. Aktive Anzeigen verfallen automatisch, wenn `endDate` verstrichen ist
5. Sponsoren oder Administratoren können jederzeit kündigen

### Diskriminierte Gewerkschaftsreaktionen

Die Typen `SponsorAdResponse` und `SponsorAdListResponse` verwenden diskriminierte Gewerkschaften basierend auf dem Feld `success`. Dies ermöglicht eine typsichere Fehlerbehandlung in TypeScript:

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

## Verwandte Typen

- [`ItemData`](./item-types.md) – Der gesponserte Artikel (referenziert durch `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) – Datenbankschematyp von `lib/db/schema`
