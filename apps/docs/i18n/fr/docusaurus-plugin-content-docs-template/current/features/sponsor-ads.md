---
id: sponsor-ads
title: Système de publicités sponsors
sidebar_label: Publicités sponsors
sidebar_position: 10
---

# Système de publicités sponsors

The sponsor ads system allows directory users to promote their items through paid sponsorships. The system includes a submission workflow, payment integration, admin approval process, and public display of active sponsor ads.

## Source Locations

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

## Sponsor Ad Lifecycle

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

### Status Values

| Status | Description |
|--------|-------------|
| `pending_payment` | Ad created, awaiting payment |
| `pending` | Payment received, awaiting admin approval |
| `active` | Approved and currently displayed |
| `rejected` | Admin rejected the submission |
| `expired` | Active period has ended |
| `cancelled` | Cancelled by user or admin |

### Interval Types

| Interval | Duration |
|----------|----------|
| `weekly` | 7-day sponsorship |
| `monthly` | 30-day sponsorship |

## Type Definitions

### SponsorAd (Database Schema)

The `SponsorAd` type comes from the Drizzle schema (`lib/db/schema`). Key fields include:

- `id`, `userId`, `itemSlug`, `itemName`, `itemIconUrl`, `itemCategory`
- `status` (one of the status values above)
- `interval` (`weekly` or `monthly`)
- `startDate`, `endDate`
- `paymentProvider`, `paymentId`, `subscriptionId`, `customerId`
- `rejectionReason`, `cancelReason`
- `createdAt`, `updatedAt`

### SponsorWithItem

Used for display components -- pairs a sponsor ad with its resolved item data:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

Aggregate statistics returned by the stats endpoint:

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

The primary hook for users managing their sponsor ad submissions.

### Import

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

### Return Value

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

### Creating a Sponsor Ad

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

### Payment Flow

After creating a sponsor ad, the user needs to pay. The `payNow` method creates a checkout session and returns a URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

The checkout API (`/api/sponsor-ads/checkout`) returns:

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

### Renewing a Sponsorship

Expired or about-to-expire ads can be renewed:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Search with Debouncing

The hook includes built-in search debouncing (300ms delay):

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

The admin hook provides management capabilities: approve, reject, cancel, and delete sponsor ads.

### Import

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

### Return Value

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

### Approval Workflow

The approval action supports a `forceApprove` option for cases where payment has not been received:

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

When the API returns a `PAYMENT_NOT_RECEIVED` error, the hook catches it and returns `requiresForceApprove: true` instead of showing a toast error.

### Rejection with Reason

Rejections require a reason string that gets stored on the sponsor ad record:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Sorting with Pagination Reset

Changing the sort field or order automatically resets to page 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## useActiveSponsorAds

A lightweight hook for fetching active sponsor ads for public display on homepage layouts and sidebars.

### Import

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

### Return Value

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Usage Example

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

The hook uses aggressive caching since active sponsors do not change frequently:

| Setting | Value |
|---------|-------|
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Fetches a single sponsor ad by ID. Used for detail/edit pages.

### Import

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Usage

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

The hook accepts `null` as the ID, in which case the query is disabled. This is useful for conditional rendering:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sponsor-ads` | Fetch active sponsor ads for public display |

### User Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sponsor-ads/user` | List user's sponsor ads with pagination |
| POST | `/api/sponsor-ads/user` | Create a new sponsor ad submission |
| GET | `/api/sponsor-ads/user/stats` | Fetch user's sponsor ad statistics |
| GET | `/api/sponsor-ads/user/{id}` | Get a specific sponsor ad |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Cancel a sponsor ad |
| POST | `/api/sponsor-ads/user/{id}/renew` | Renew an expired sponsorship |
| POST | `/api/sponsor-ads/checkout` | Create a payment checkout session |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/sponsor-ads` | List all sponsor ads with filters |
| POST | `/api/admin/sponsor-ads/{id}/approve` | Approve a sponsor ad |
| POST | `/api/admin/sponsor-ads/{id}/reject` | Reject with reason |
| POST | `/api/admin/sponsor-ads/{id}/cancel` | Admin cancel |
| DELETE | `/api/admin/sponsor-ads/{id}` | Delete a sponsor ad |

## Complete Submission Workflow

Here is the full workflow from the user's perspective:

### Step 1 -- Select an Item

The user chooses which item to sponsor from their dashboard or the item detail page.

### Step 2 -- Submit Sponsor Ad

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

### Step 3 -- Complete Payment

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Step 4 -- Admin Review

The admin sees the pending ad in their dashboard and can approve or reject:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Step 5 -- Active Display

Active ads appear in the public-facing components through `useActiveSponsorAds`.

### Step 6 -- Expiration and Renewal

When the sponsorship period ends, the status changes to `expired`. The user can renew:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Stats Dashboard

Both user and admin hooks expose statistics for dashboard displays:

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