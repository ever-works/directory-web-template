---
id: sponsor-ads
title: System reklam sponsorskich
sidebar_label: Reklamy sponsorskie
sidebar_position: 10
---

# System reklam sponsorskich

System reklam sponsorów umożliwia użytkownikom katalogów promowanie swoich produktów poprzez płatne sponsorowanie. System obejmuje przepływ zgłoszeń, integrację płatności, proces zatwierdzania przez administratora i publiczne wyświetlanie aktywnych reklam sponsorów.

## Lokalizacje źródłowe

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

## Cykl życia reklamy sponsora

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

### Wartości stanu

| Stan | Opis |
|------------|------------|
| `pending_payment` | Ogłoszenie utworzone, oczekujące na płatność |
| `pending` | Płatność otrzymana, oczekuje na zatwierdzenie przez administratora |
| `active` | Zatwierdzone i aktualnie wyświetlane |
| `rejected` | Administrator odrzucił zgłoszenie |
| `expired` | Aktywny okres dobiegł końca |
| `cancelled` | Anulowane przez użytkownika lub administratora |

### Typy interwałów

| Interwał | Czas trwania |
|---------|----------|
| `weekly` | 7-dniowy sponsoring |
| `monthly` | 30-dniowy sponsoring |

## Definicje typów

### Reklama sponsorska (schemat bazy danych)

Typ `SponsorAd` pochodzi ze schematu Drizzle ( `lib/db/schema` ). Kluczowe pola obejmują:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (jedna z wartości statusu powyżej)
- `interval` ( `weekly` lub `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### Sponsoruj z elementem

Używany w komponentach wyświetlania — łączy reklamę sponsora z ustalonymi danymi przedmiotu:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

###Statystyki reklam sponsorskich

Zagregowane statystyki zwrócone przez punkt końcowy statystyk:

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

## użyj reklam sponsorowanych przez użytkownika

Główny hak dla użytkowników zarządzających zgłoszeniami reklam sponsorów.

### Importuj

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parametry

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Wartość zwracana

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

### Tworzenie reklamy sponsora

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

### Przepływ płatności

Po utworzeniu reklamy sponsora użytkownik musi zapłacić. Metoda `payNow` tworzy sesję realizacji transakcji i zwraca adres URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

Interfejs API realizacji transakcji ( `/api/sponsor-ads/checkout` ) zwraca:

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

### Odnawianie sponsoringu

Ogłoszenia, które wygasły lub wkrótce wygasną, można odnowić:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Szukaj z odrzucaniem

Hak zawiera wbudowane odrzucanie wyszukiwania (opóźnienie 300 ms):

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

## użyjAdminSponsorAds

Hak administracyjny zapewnia możliwości zarządzania: zatwierdzanie, odrzucanie, anulowanie i usuwanie reklam sponsorów.

### Importuj

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parametry

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

### Wartość zwracana

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

### Proces zatwierdzania

Akcja zatwierdzająca obsługuje opcję `forceApprove` w przypadkach, gdy płatność nie została otrzymana:

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

Kiedy API zwróci błąd `PAYMENT_NOT_RECEIVED` , hak przechwytuje go i zwraca `requiresForceApprove: true` zamiast pokazywać błąd toastowy.

### Odrzucenie uzasadnione

Odrzucenie wymaga ciągu znaków przyczyny, który jest przechowywany w rekordzie reklamy sponsora:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Sortowanie z resetowaniem paginacji

Zmiana pola sortowania lub kolejności automatycznie resetuje się do strony 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## użyj ActiveSponsorAds

Lekki hak do pobierania aktywnych reklam sponsorów do publicznego wyświetlania w układach strony głównej i na paskach bocznych.

### Importuj

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parametry

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Wartość zwracana

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Przykład użycia

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

### Buforowanie

Hak wykorzystuje agresywne buforowanie, ponieważ aktywni sponsorzy nie zmieniają się często:

| Ustawienie | Wartość |
|--------|-------|
| `staleTime` | 5 minut |
| `gcTime` | 10 minut |
| `refetchOnWindowFocus` | `false` |

---

## użyjSponsorAdDetail

Pobiera pojedynczą reklamę sponsora według identyfikatora. Używany do stron szczegółów/edycji.

### Importuj

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Użycie

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

Hook akceptuje `null` jako identyfikator, w którym to przypadku zapytanie jest wyłączone. Jest to przydatne do renderowania warunkowego:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## Punkty końcowe interfejsu API

### Publiczne punkty końcowe

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| OTRZYMAJ | `/api/sponsor-ads` | Pobierz aktywne reklamy sponsorów do publicznego wyświetlania |

### Punkty końcowe użytkownika (uwierzytelnione)

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| OTRZYMAJ | `/api/sponsor-ads/user` | Wyświetl reklamy sponsorów użytkownika z paginacją |
| POST | `/api/sponsor-ads/user` | Utwórz nowe zgłoszenie sponsora |
| OTRZYMAJ | `/api/sponsor-ads/user/stats` | Pobierz statystyki reklam sponsora użytkownika |
| OTRZYMAJ | `/api/sponsor-ads/user/{id}` | Uzyskaj konkretną reklamę sponsora |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Anuluj ogłoszenie sponsora |
| POST | `/api/sponsor-ads/user/{id}/renew` | Odnów wygasłe sponsorowanie |
| POST | `/api/sponsor-ads/checkout` | Utwórz sesję realizacji płatności |

### Administracyjne punkty końcowe

| Metoda | Punkt końcowy | Opis |
|--------|----------|------------|
| OTRZYMAJ | `/api/admin/sponsor-ads` | Lista wszystkich reklam sponsorów z filtrami |
| POST | `/api/admin/sponsor-ads/{id}/approve` | Zatwierdź ogłoszenie sponsora |
| POST | `/api/admin/sponsor-ads/{id}/reject` | Odrzuć z uzasadnieniem |
| POST | `/api/admin/sponsor-ads/{id}/cancel` | Administrator anuluj |
| USUŃ | `/api/admin/sponsor-ads/{id}` | Usuń ogłoszenie sponsora |

## Zakończ proces przesyłania

Oto pełny przepływ pracy z perspektywy użytkownika:

### Krok 1 — wybierz element

Użytkownik wybiera przedmiot, który chce sponsorować, ze swojego pulpitu nawigacyjnego lub strony szczegółów przedmiotu.

### Krok 2 — Prześlij ogłoszenie sponsora

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

### Krok 3 — Dokonaj płatności

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Krok 4 — sprawdzenie przez administratora

Administrator widzi oczekującą reklamę w swoim panelu i może zatwierdzić lub odrzucić:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Krok 5 — Aktywny wyświetlacz

Aktywne reklamy pojawiają się w elementach dostępnych publicznie do `useActiveSponsorAds` .

### Krok 6 — wygaśnięcie i odnowienie

Po zakończeniu okresu sponsorowania status zmienia się na `expired` . Użytkownik może odnowić:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Panel statystyk

Zarówno haki użytkownika, jak i administratora udostępniają statystyki dla wyświetlaczy pulpitu nawigacyjnego:

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
