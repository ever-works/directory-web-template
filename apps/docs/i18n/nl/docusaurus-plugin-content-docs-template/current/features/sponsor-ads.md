---
id: sponsor-ads
title: Sponsoradvertentiesysteem
sidebar_label: Sponsoradvertenties
sidebar_position: 10
---

# Sponsoradvertentiesysteem

Met het sponsoradvertentiesysteem kunnen directorygebruikers hun items promoten via betaalde sponsoring. Het systeem omvat een indieningsworkflow, betalingsintegratie, goedkeuringsproces door de beheerder en openbare weergave van actieve sponsoradvertenties.

## Bronlocaties

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

## Levenscyclus van sponsoradvertenties

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

### Statuswaarden

| Staat | Beschrijving |
|--------|-------------|
| `pending_payment` | Advertentie gemaakt, in afwachting van betaling |
| `pending` | Betaling ontvangen, in afwachting van goedkeuring door de beheerder |
| `active` | Goedgekeurd en momenteel weergegeven |
| `rejected` | Beheerder heeft de inzending afgewezen |
| `expired` | Actieve periode is afgelopen |
| `cancelled` | Geannuleerd door gebruiker of beheerder |

### Intervaltypen

| Interval | Duur |
|----------|----------|
| `weekly` | 7-daagse sponsoring |
| `monthly` | 30 dagen sponsoring |

## Typedefinities

### SponsorAd (databaseschema)

Het type `SponsorAd` komt uit het Drizzle-schema ( `lib/db/schema` ). Belangrijke velden zijn onder meer:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (een van de bovenstaande statuswaarden)
- `interval` ( `weekly` of `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### SponsorMetItem

Gebruikt voor weergavecomponenten: koppelt een sponsoradvertentie aan de opgeloste artikelgegevens:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

Geaggregeerde statistieken geretourneerd door het statistiekeneindpunt:

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

## gebruikGebruikerssponsoradvertenties

De primaire hook voor gebruikers die hun sponsoradvertentie-inzendingen beheren.

### Importeren

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parameters

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Retourwaarde

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

### Een sponsoradvertentie maken

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

### Betalingsstroom

Na het maken van een sponsoradvertentie moet de gebruiker betalen. De `payNow` -methode creëert een betaalsessie en retourneert een URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

De betaal-API ( `/api/sponsor-ads/checkout` ) retourneert:

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

### Een sponsorschap verlengen

Verlopen of bijna verlopen advertenties kunnen worden verlengd:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Zoeken met debouncen

De hook bevat ingebouwde zoekontkoppeling (vertraging van 300 ms):

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

## gebruikAdminSponsorAds

De admin hook biedt beheermogelijkheden: sponsoradvertenties goedkeuren, afwijzen, annuleren en verwijderen.

### Importeren

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parameters

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

### Retourwaarde

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

### Goedkeuringsworkflow

De goedkeuringsactie ondersteunt een `forceApprove` -optie voor gevallen waarin de betaling niet is ontvangen:

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

Wanneer de API een `PAYMENT_NOT_RECEIVED` -fout retourneert, vangt de hook deze op en retourneert `requiresForceApprove: true` in plaats van een toastfout weer te geven.

### Afwijzing met reden

Voor afwijzingen is een redenreeks vereist die wordt opgeslagen in de sponsoradvertentierecord:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Sorteren met paginering opnieuw instellen

Het wijzigen van het sorteerveld of de volgorde wordt automatisch teruggezet naar pagina 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## gebruikActieveSponsorAds

Een lichtgewicht hook voor het ophalen van actieve sponsoradvertenties voor openbare weergave op startpagina-indelingen en zijbalken.

### Importeren

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parameters

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Retourwaarde

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Gebruiksvoorbeeld

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

### Caching

De hook maakt gebruik van agressieve caching omdat actieve sponsors niet vaak veranderen:

| Instelling | Waarde |
|---------|-------|
| `staleTime` | 5 minuten |
| `gcTime` | 10 minuten |
| `refetchOnWindowFocus` | `false` |

---

## gebruikSponsorAdDetail

Haalt één sponsoradvertentie op op basis van ID. Wordt gebruikt voor detail-/bewerkpagina's.

### Importeren

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Gebruik

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

De hook accepteert `null` als ID, in welk geval de zoekopdracht wordt uitgeschakeld. Dit is handig voor voorwaardelijke weergave:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## API-eindpunten

### Openbare eindpunten

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| KRIJG | `/api/sponsor-ads` | Haal actieve sponsoradvertenties op voor openbare weergave |

### Gebruikerseindpunten (geverifieerd)

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| KRIJG | `/api/sponsor-ads/user` | Geef de sponsoradvertenties van de gebruiker weer met paginering |
| POST | `/api/sponsor-ads/user` | Een nieuwe sponsoradvertentie-inzending maken |
| KRIJG | `/api/sponsor-ads/user/stats` | Statistieken van sponsoradvertenties van gebruiker ophalen |
| KRIJG | `/api/sponsor-ads/user/{id}` | Ontvang een specifieke sponsoradvertentie |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Een sponsoradvertentie annuleren |
| POST | `/api/sponsor-ads/user/{id}/renew` | Verleng een verlopen sponsorschap |
| POST | `/api/sponsor-ads/checkout` | Maak een afrekensessie voor betalingen aan |

### Beheerdereindpunten

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| KRIJG | `/api/admin/sponsor-ads` | Toon alle sponsoradvertenties met filters |
| POST | `/api/admin/sponsor-ads/{id}/approve` | Een sponsoradvertentie goedkeuren |
| POST | `/api/admin/sponsor-ads/{id}/reject` | Met reden afwijzen |
| POST | `/api/admin/sponsor-ads/{id}/cancel` | Beheerder annuleren |
| VERWIJDEREN | `/api/admin/sponsor-ads/{id}` | Een sponsoradvertentie verwijderen |

## Voltooi de indieningsworkflow

Hier is de volledige workflow vanuit het perspectief van de gebruiker:

### Stap 1 -- Selecteer een item

De gebruiker kiest welk item hij wil sponsoren via zijn dashboard of de itemdetailpagina.

### Stap 2 -- Sponsoradvertentie indienen

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

### Stap 3 -- Voltooi de betaling

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Stap 4 -- Beheerdersbeoordeling

De beheerder ziet de advertentie die in behandeling is in zijn dashboard en kan het volgende goedkeuren of afwijzen:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Stap 5 -- Actieve weergave

Actieve advertenties verschijnen in de openbare componenten via `useActiveSponsorAds` .

### Stap 6 -- Vervaldatum en verlenging

Wanneer de sponsorperiode afloopt, verandert de status naar `expired` . De gebruiker kan verlengen:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Statistiekendashboard

Zowel gebruikers- als beheerdershooks geven statistieken weer voor dashboardweergaven:

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
