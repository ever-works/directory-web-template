---
id: sponsor-ads
title: Sponsor-Anzeigensystem
sidebar_label: Sponsor-Anzeigen
sidebar_position: 10
---

# Sponsor-Anzeigensystem

Das Sponsor-Ads-System ermöglicht es Verzeichnisbenutzern, ihre Artikel durch bezahlte Sponsorings zu bewerben. Das System umfasst einen Einreichungsworkflow, eine Zahlungsintegration, einen Administratorgenehmigungsprozess und die öffentliche Anzeige aktiver Sponsoranzeigen.

## Quellorte

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

## Lebenszyklus der Sponsor-Anzeige

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

### Statuswerte

| Status | Beschreibung |
|--------|-------------|
| `pending_payment` | Anzeige erstellt, wartet auf Zahlung |
| `pending` | Zahlung erhalten, wartet auf Genehmigung durch den Administrator |
| `active` | Genehmigt und derzeit angezeigt |
| `rejected` | Der Administrator hat die Einreichung abgelehnt |
| `expired` | Aktiver Zeitraum ist beendet |
| `cancelled` | Vom Benutzer oder Administrator abgebrochen |

### Intervalltypen

| Intervall | Dauer |
|----------|----------|
| `weekly` | 7-Tages-Sponsoring |
| `monthly` | 30-tägiges Sponsoring |

## Typdefinitionen

### SponsorAd (Datenbankschema)

Der Typ `SponsorAd` stammt aus dem Drizzle-Schema ( `lib/db/schema` ). Zu den Schlüsselfeldern gehören:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (einer der oben genannten Statuswerte)
- `interval` ( `weekly` oder `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### SponsorWithItem

Wird für Anzeigekomponenten verwendet – verbindet eine Sponsor-Anzeige mit den aufgelösten Artikeldaten:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

Vom Statistikendpunkt zurückgegebene aggregierte Statistiken:

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

## useUserSponsorAds

Der primäre Anlaufpunkt für Benutzer, die ihre Sponsor-Anzeigeneinsendungen verwalten.

### Importieren

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Parameter

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Rückgabewert

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

### Erstellen einer Sponsor-Anzeige

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

### Zahlungsfluss

Nach dem Erstellen einer Sponsor-Anzeige muss der Benutzer bezahlen. Die `payNow` -Methode erstellt eine Checkout-Sitzung und gibt eine URL zurück:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

Die Checkout-API ( `/api/sponsor-ads/checkout` ) gibt Folgendes zurück:

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

### Eine Patenschaft verlängern

Abgelaufene oder bald ablaufende Anzeigen können erneuert werden:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Suche mit Entprellen

Der Hook verfügt über eine integrierte Suchentprellung (300 ms Verzögerung):

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

## useAdminSponsorAds

Der Admin-Hook bietet Verwaltungsfunktionen: Sponsoranzeigen genehmigen, ablehnen, stornieren und löschen.

### Importieren

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Parameter

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

### Rückgabewert

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

### Genehmigungsworkflow

Die Genehmigungsaktion unterstützt eine `forceApprove` -Option für Fälle, in denen die Zahlung nicht eingegangen ist:

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

Wenn die API einen `PAYMENT_NOT_RECEIVED` -Fehler zurückgibt, fängt der Hook ihn ab und gibt `requiresForceApprove: true` zurück, anstatt einen Toast-Fehler anzuzeigen.

### Ablehnung mit Begründung

Für Ablehnungen ist eine Begründungszeichenfolge erforderlich, die im Datensatz der Sponsoranzeige gespeichert wird:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Sortieren mit Zurücksetzen der Paginierung

Wenn Sie das Sortierfeld oder die Reihenfolge ändern, wird automatisch auf Seite 1 zurückgesetzt:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## ActiveSponsorAds verwenden

Ein leichter Hook zum Abrufen aktiver Sponsorenanzeigen zur öffentlichen Anzeige in Homepage-Layouts und Seitenleisten.

### Importieren

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Parameter

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Rückgabewert

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Anwendungsbeispiel

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

Der Hook verwendet aggressives Caching, da aktive Sponsoren nicht häufig wechseln:

| Einstellung | Wert |
|---------|-------|
| `staleTime` | 5 Minuten |
| `gcTime` | 10 Minuten |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Ruft eine einzelne Sponsoranzeige nach ID ab. Wird für Detail-/Bearbeitungsseiten verwendet.

### Importieren

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Nutzung

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

Der Hook akzeptiert `null` als ID, in diesem Fall ist die Abfrage deaktiviert. Dies ist nützlich für bedingtes Rendern:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## API-Endpunkte

### Öffentliche Endpunkte

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| GET | `/api/sponsor-ads` | Aktive Sponsoranzeigen zur öffentlichen Anzeige abrufen |

### Benutzerendpunkte (authentifiziert)

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| GET | `/api/sponsor-ads/user` | Sponsoranzeigen des Benutzers mit Paginierung auflisten |
| POST | `/api/sponsor-ads/user` | Erstellen Sie eine neue Sponsor-Anzeigenübermittlung |
| GET | `/api/sponsor-ads/user/stats` | Statistiken zur Sponsoranzeige des Benutzers abrufen |
| GET | `/api/sponsor-ads/user/{id}` | Erhalten Sie eine bestimmte Sponsorenanzeige |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Eine Sponsoranzeige kündigen |
| POST | `/api/sponsor-ads/user/{id}/renew` | Eine abgelaufene Patenschaft verlängern |
| POST | `/api/sponsor-ads/checkout` | Erstellen Sie eine Zahlungs-Checkout-Sitzung |

### Admin-Endpunkte

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| GET | `/api/admin/sponsor-ads` | Alle Sponsoranzeigen mit Filtern auflisten |
| POST | `/api/admin/sponsor-ads/{id}/approve` | Eine Sponsoranzeige genehmigen |
| POST | `/api/admin/sponsor-ads/{id}/reject` | Mit Begründung ablehnen |
| POST | `/api/admin/sponsor-ads/{id}/cancel` | Administrator abbrechen |
| LÖSCHEN | `/api/admin/sponsor-ads/{id}` | Eine Sponsoranzeige löschen |

## Vollständiger Einreichungsworkflow

Hier ist der vollständige Workflow aus Benutzersicht:

### Schritt 1 – Wählen Sie ein Element aus

Der Benutzer wählt in seinem Dashboard oder auf der Artikeldetailseite aus, welchen Artikel er sponsern möchte.

### Schritt 2 – Sponsoranzeige einreichen

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

### Schritt 3 – Zahlung abschließen

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Schritt 4 – Überprüfung durch den Administrator

Der Administrator sieht die ausstehende Anzeige in seinem Dashboard und kann Folgendes genehmigen oder ablehnen:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Schritt 5 – Aktive Anzeige

Aktive Anzeigen erscheinen bis `useActiveSponsorAds` in den öffentlich zugänglichen Komponenten.

### Schritt 6 – Ablauf und Erneuerung

Wenn der Förderzeitraum endet, ändert sich der Status auf `expired` . Der Benutzer kann Folgendes erneuern:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Statistik-Dashboard

Sowohl Benutzer- als auch Administrator-Hooks stellen Statistiken für Dashboard-Anzeigen bereit:

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
