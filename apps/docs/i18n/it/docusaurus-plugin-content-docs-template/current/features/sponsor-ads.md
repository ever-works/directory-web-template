---
id: sponsor-ads
title: Sistema di annunci degli sponsor
sidebar_label: Annunci sponsor
sidebar_position: 10
---

# Sistema di annunci sponsor

Il sistema di annunci degli sponsor consente agli utenti della directory di promuovere i propri articoli tramite sponsorizzazioni a pagamento. Il sistema include un flusso di lavoro di invio, integrazione dei pagamenti, processo di approvazione dell'amministratore e visualizzazione pubblica degli annunci degli sponsor attivi.

## Posizioni delle fonti

```
hooks/use-user-sponsor-ads.ts        # User-facing CRUD + checkout
hooks/use-admin-sponsor-ads.ts       # Admin management (approve/reject/cancel)
hooks/use-active-sponsor-ads.ts      # Public display of active ads
hooks/use-sponsor-ad-detail.ts       # Single ad detail fetch
lib/types/sponsor-ad.ts              # Type definitions
app/api/sponsor-ads/                  # API routes
  route.ts                            #   GET active ads (public)
  checkout/route.ts                   #   POST create checkout
  user/route.ts                       #   GET/POST user's ads
  user/[id]/route.ts                  #   GET/PUT single ad
  user/[id]/cancel/route.ts           #   POST cancel ad
  user/[id]/renew/route.ts            #   POST renew ad
  user/stats/route.ts                 #   GET user stats
```

## Ciclo di vita dell'annuncio dello sponsor

```
User Submits --> pending_payment --> User Pays --> pending --> Admin Reviews
                                                    |
                                            +-------+-------+
                                            |               |
                                         approved        rejected
                                            |
                                          active --> expired
                                            |
                                        cancelled
```

### Valori di stato

| Stato | Descrizione |
|--------|-------------|
| `pending_payment` | Annuncio creato, in attesa di pagamento |
| `pending` | Pagamento ricevuto, in attesa di approvazione da parte dell'amministratore |
| `active` | Approvato e attualmente visualizzato |
| `rejected` | L'amministratore ha rifiutato l'invio |
| `expired` | Il periodo attivo è terminato |
| `cancelled` | Annullato dall'utente o dall'amministratore |

### Tipi di intervalli

| Intervallo | Durata |
|----------|----------|
| `weekly` | Sponsorizzazione di 7 giorni |
| `monthly` | Sponsorizzazione di 30 giorni |

## Definizioni di tipo

### Annuncio sponsor (schema del database)

Il tipo `SponsorAd` deriva dallo schema Drizzle ( `lib/db/schema` ). I campi chiave includono:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (uno dei valori di stato sopra)
- `interval` ( `weekly` o `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### SponsorConArticolo

Utilizzato per i componenti di visualizzazione: abbina un annuncio sponsor con i dati dell'elemento risolti:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

Statistiche aggregate restituite dall'endpoint stats:

```ts
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

---

## usaUserSponsorAds

L'aggancio principale per gli utenti che gestiscono l'invio degli annunci degli sponsor.

### Importa

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parametri

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Valore restituito

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats

  // Loading states
  isLoading,            // boolean - initial fetch
  isFetching,           // boolean - any fetch including background
  isStatsLoading,       // boolean - stats query loading
  isCreating,           // boolean - creation mutation in progress

  // Pagination
  currentPage,          // number
  totalPages,           // number
  totalItems,           // number

  // Filters
  statusFilter,         // SponsorAdStatus | undefined
  intervalFilter,       // 'weekly' | 'monthly' | undefined
  search,               // string
  isSearching,          // boolean - debounce in progress

  // Actions
  createSponsorAd,      // (input) => Promise<SponsorAd | null>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  payNow,               // (id) => Promise<{ checkoutUrl } | null>
  renewSponsorship,     // (id) => Promise<{ checkoutUrl } | null>

  // Submitting states
  isCancelling,         // boolean
  isPayingNow,          // boolean
  isRenewing,           // boolean

  // Filter setters
  setStatusFilter,      // (status) => void
  setIntervalFilter,    // (interval) => void
  setSearch,            // (search) => void
  setCurrentPage,       // (page) => void
  nextPage,             // () => void
  prevPage,             // () => void

  // Utility
  refreshData,          // () => void
} = useUserSponsorAds(options);
```

### Creazione di un annuncio sponsor

```tsx
const { createSponsorAd } = useUserSponsorAds();

async function handleSubmit(item) {
  const sponsorAd = await createSponsorAd({
    itemSlug: item.slug,
    itemName: item.name,
    itemIconUrl: item.icon,
    itemCategory: item.category,
    itemDescription: item.description,
    interval: 'monthly',
  });

  if (sponsorAd) {
    // Ad created in pending_payment status
    // Redirect user to payment
  }
}
```

### Flusso di pagamento

Dopo aver creato un annuncio sponsor, l'utente deve pagare. Il metodo `payNow` crea una sessione di pagamento e restituisce un URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

L'API di pagamento ( `/api/sponsor-ads/checkout` ) restituisce:

```ts
interface CheckoutResponse {
  success: boolean;
  data: {
    checkoutId: string;
    checkoutUrl: string | null;
    provider: string;
  };
}
```

### Rinnovo di una sponsorizzazione

Gli annunci scaduti o in scadenza possono essere rinnovati:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Ricerca con antirimbalzo

L'hook include il debouncing di ricerca integrato (ritardo di 300 ms):

```tsx
const { search, setSearch, isSearching, sponsorAds } = useUserSponsorAds();

return (
  <div>
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search your sponsor ads..."
    />
    {isSearching && <span>Searching...</span>}
    {sponsorAds.map(ad => /* render */)}
  </div>
);
```

---

## usaAdminSponsorAds

L'hook di amministrazione fornisce funzionalità di gestione: approva, rifiuta, annulla ed elimina gli annunci degli sponsor.

### Importa

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parametri

```ts
interface UseAdminSponsorAdsOptions {
  page?: number;
  limit?: number;
  status?: SponsorAdStatus;
  interval?: SponsorAdIntervalType;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'startDate' | 'endDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}
```

### Valore restituito

```ts
const {
  // Data
  sponsorAds,           // SponsorAd[]
  stats,                // SponsorAdStats | null

  // Loading
  isLoading,
  isSubmitting,         // any mutation in progress

  // Pagination
  currentPage,
  totalPages,
  totalItems,

  // Sorting
  sortBy,
  sortOrder,

  // Actions
  approveSponsorAd,     // (id, forceApprove?) => Promise<{ success, requiresForceApprove? }>
  rejectSponsorAd,      // (id, reason) => Promise<boolean>
  cancelSponsorAd,      // (id, reason?) => Promise<boolean>
  deleteSponsorAd,      // (id) => Promise<boolean>

  // Setters
  setSortBy,
  setSortOrder,
  setCurrentPage,

  // Utility
  refreshData,
} = useAdminSponsorAds(options);
```

### Flusso di lavoro di approvazione

L'azione di approvazione supporta un'opzione `forceApprove` per i casi in cui il pagamento non è stato ricevuto:

```tsx
const { approveSponsorAd } = useAdminSponsorAds();

async function handleApprove(id: string) {
  const result = await approveSponsorAd(id);

  if (result.requiresForceApprove) {
    // Show confirmation dialog
    const confirmed = await showDialog(
      'Payment not received. Approve anyway?'
    );
    if (confirmed) {
      await approveSponsorAd(id, true);
    }
  }
}
```

Quando l'API restituisce un errore `PAYMENT_NOT_RECEIVED` , l'hook lo rileva e restituisce `requiresForceApprove: true` invece di mostrare un errore di toast.

### Rifiuto con motivazione

I rifiuti richiedono una stringa del motivo che viene memorizzata nel record dell'annuncio dello sponsor:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Ordinamento con reimpostazione dell'impaginazione

La modifica del campo di ordinamento o dell'ordine ripristina automaticamente la pagina 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## usa ActiveSponsorAds

Un gancio leggero per recuperare annunci di sponsor attivi da visualizzare pubblicamente sui layout della home page e sulle barre laterali.

### Importa

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parametri

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Valore restituito

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Esempio di utilizzo

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';

function SponsorSidebar() {
  const { sponsors, isLoading } = useActiveSponsorAds({ limit: 3 });

  if (isLoading || sponsors.length === 0) return null;

  return (
    <aside className="sponsor-sidebar">
      <h3>Sponsored</h3>
      {sponsors.map(({ sponsor, item }) => (
        <a key={sponsor.id} href={`/items/${sponsor.itemSlug}`}>
          {item?.icon && <img src={item.icon} alt={sponsor.itemName} />}
          <span>{sponsor.itemName}</span>
        </a>
      ))}
    </aside>
  );
}
```

### Memorizzazione nella cache

L'hook utilizza un caching aggressivo poiché gli sponsor attivi non cambiano frequentemente:

| Impostazione | Valore |
|---------|-------|
| `staleTime` | 5 minuti |
| `gcTime` | 10 minuti |
| `refetchOnWindowFocus` | `false` |

---

## usaSponsorAdDetail

Recupera un singolo annuncio sponsor in base all'ID. Utilizzato per le pagine di dettaglio/modifica.

### Importa

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Utilizzo

```tsx
function SponsorAdDetailPage({ adId }: { adId: string }) {
  const { data: sponsorAd, isLoading, error } = useSponsorAdDetail(adId);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!sponsorAd) return <NotFound />;

  return (
    <div>
      <h1>{sponsorAd.itemName}</h1>
      <Badge>{sponsorAd.status}</Badge>
      <p>Interval: {sponsorAd.interval}</p>
    </div>
  );
}
```

L'hook accetta `null` come ID, nel qual caso la query è disabilitata. Questo è utile per il rendering condizionale:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## Endpoint API

### Endpoint pubblici

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| OTTIENI | `/api/sponsor-ads` | Recupera gli annunci degli sponsor attivi per la visualizzazione pubblica |

### Endpoint utente (autenticati)

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| OTTIENI | `/api/sponsor-ads/user` | Elenca gli annunci sponsor dell'utente con impaginazione |
| POST | `/api/sponsor-ads/user` | Crea un nuovo invio di annunci sponsor |
| OTTIENI | `/api/sponsor-ads/user/stats` | Recupera le statistiche degli annunci sponsor dell'utente |
| OTTIENI | `/api/sponsor-ads/user/{id}` | Ottieni un annuncio sponsor specifico |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Cancella un annuncio sponsor |
| POST | `/api/sponsor-ads/user/{id}/renew` | Rinnovare una sponsorizzazione scaduta |
| POST | `/api/sponsor-ads/checkout` | Creare una sessione di pagamento |

### Endpoint di amministrazione

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| OTTIENI | `/api/admin/sponsor-ads` | Elenca tutti gli annunci degli sponsor con i filtri |
| POST | `/api/admin/sponsor-ads/{id}/approve` | Approvare un annuncio sponsor |
| POST | `/api/admin/sponsor-ads/{id}/reject` | Rifiutare con motivazione |
| POST | `/api/admin/sponsor-ads/{id}/cancel` | Annullamento amministratore |
| ELIMINA | `/api/admin/sponsor-ads/{id}` | Elimina un annuncio sponsor |

## Completa il flusso di lavoro di invio

Ecco il flusso di lavoro completo dal punto di vista dell'utente:

### Passaggio 1: seleziona un articolo

L'utente sceglie quale articolo sponsorizzare dalla propria dashboard o dalla pagina dei dettagli dell'articolo.

### Passaggio 2: invia l'annuncio dello sponsor

```tsx
const ad = await createSponsorAd({
  itemSlug: 'my-awesome-tool',
  itemName: 'My Awesome Tool',
  itemIconUrl: '/icons/tool.png',
  itemCategory: 'Productivity',
  interval: 'monthly',
});
// Status: pending_payment
```

### Passaggio 3: completa il pagamento

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Passaggio 4: revisione da parte dell'amministratore

L'amministratore vede l'annuncio in sospeso nella propria dashboard e può approvare o rifiutare:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Passaggio 5: visualizzazione attiva

Gli annunci attivi vengono visualizzati nei componenti rivolti al pubblico fino a `useActiveSponsorAds` .

### Passaggio 6: scadenza e rinnovo

Al termine del periodo di sponsorizzazione, lo stato cambia in `expired` . L'utente può rinnovare:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Pannello delle statistiche

Sia gli hook utente che quelli amministratore espongono le statistiche per le visualizzazioni del dashboard:

```tsx
const { stats } = useUserSponsorAds();

// Display in dashboard
<div>
  <StatCard label="Active" value={stats.overview.active} />
  <StatCard label="Pending" value={stats.overview.pending} />
  <StatCard label="Total Revenue" value={`$${stats.revenue.totalRevenue}`} />
  <StatCard label="Weekly Ads" value={stats.byInterval.weekly} />
  <StatCard label="Monthly Ads" value={stats.byInterval.monthly} />
</div>
```
