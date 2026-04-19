---
id: sponsor-ad-types
title: Definizioni del tipo di annuncio sponsor
sidebar_label: Tipi di annunci sponsor
sidebar_position: 8
---

# Definizioni del tipo di annuncio sponsor

**Fonte:** `lib/types/sponsor-ad.ts`

Il modulo dell'annuncio dello sponsor definisce i tipi per il sistema di sponsorizzazione e pubblicità. Gli sponsor possono promuovere gli articoli tramite spazi pubblicitari settimanali o mensili con un ciclo di vita completo dal pagamento fino all'approvazione, all'attivazione e alla scadenza.

## Digitare Alias

### `SponsorAdStatus`

Stati del ciclo di vita per un annuncio pubblicitario dello sponsor:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Stato|Descrizione|
|--------|-------------|
|`pending_payment`|Annuncio creato, in attesa di completamento del pagamento|
|`pending`|Pagamento ricevuto, in attesa di approvazione da parte dell'amministratore|
|`rejected`|L'amministratore ha rifiutato la richiesta di sponsorizzazione|
|`active`|Approvato e attualmente visualizzato|
|`expired`|Il periodo attivo è terminato|
|`cancelled`|Annullato dallo sponsor o dall'amministratore|

### `SponsorAdIntervalType`

Opzioni dell'intervallo di fatturazione:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Tipi di visualizzazione

### `SponsorWithItem`

Un annuncio sponsor con i dati dell'articolo associati per la visualizzazione nell'interfaccia utente. Il campo `item` può essere `null` se l'elemento collegato non esiste più.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Tipi di richiesta

### `CreateSponsorAdRequest`

Payload per la creazione di un nuovo annuncio sponsor.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Payload per l'aggiornamento di un annuncio sponsor esistente. Utilizzato principalmente dalle operazioni di amministrazione.

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

Payload per l'approvazione di un annuncio sponsor in sospeso.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Payload per rifiutare un annuncio sponsor con un motivo.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Payload per l'annullamento di un annuncio sponsor attivo o in attesa.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Tipi di risposta

### `SponsorAdResponse`

Risposta sindacale discriminata per le operazioni pubblicitarie con sponsor singolo:

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

Risposta sindacale discriminata per elenchi di annunci sponsor impaginati:

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

## Opzioni di interrogazione

### `SponsorAdListOptions`

Parametri di query per filtrare e impaginare gli elenchi di annunci sponsor.

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

## Tipi di statistiche

### `SponsorAdStats`

Statistiche aggregate per la dashboard degli annunci dello sponsor.

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

## Tipi di dashboard

### `SponsorAdDashboardResponse`

Risposta combinata per il dashboard dello sponsor amministratore, inclusi elenco, impaginazione e statistiche.

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

## Tipi estesi

### `SponsorAdWithUser`

Annuncio dello sponsor arricchito con dati di utenti e revisori, utilizzati nelle visualizzazioni dei dettagli dell'amministratore.

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

## Esempi di utilizzo

### Creazione di un annuncio sponsor

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtraggio degli annunci degli sponsor

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

### Gestire le risposte sindacali discriminate

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

### Visualizzazione delle statistiche del dashboard

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

## Note di progettazione

### Ciclo di vita dell'annuncio dello sponsor

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Lo sponsor crea l'annuncio e avvia il pagamento (`pending_payment`)
2. Una volta completato il pagamento, l'annuncio verrà spostato su `pending` per la revisione da parte dell'amministratore
3. L'amministratore approva (`active`) o rifiuta (`rejected`)
4. Gli annunci attivi scadono automaticamente al superamento di `endDate`
5. Gli sponsor o gli amministratori possono annullare in qualsiasi momento

### Risposte sindacali discriminate

I tipi `SponsorAdResponse` e `SponsorAdListResponse` utilizzano unioni discriminate basate sul campo `success`. Ciò consente la gestione degli errori indipendente dai tipi in TypeScript:

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

## Tipi correlati

- [`ItemData`](./item-types.md) - L'elemento sponsorizzato (fa riferimento a `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Tipo di schema del database da `lib/db/schema`
