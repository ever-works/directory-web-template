---
id: sponsor-ads
title: מערכת מודעות חסות
sidebar_label: מודעות חסות
sidebar_position: 10
---

# מערכת מודעות חסות

מערכת מודעות החסות מאפשרת למשתמשי ספריות לקדם את הפריטים שלהם באמצעות חסויות בתשלום. המערכת כוללת זרימת עבודה של הגשה, שילוב תשלום, תהליך אישור מנהל ותצוגה פומבית של מודעות נותנות חסות פעילות.

## מיקומי מקור

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

## מחזור חיים של מודעות חסות

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

### ערכי סטטוס

| סטטוס | תיאור |
|--------|----------------|
| `pending_payment` | מודעה נוצרה, ממתינה לתשלום |
| `pending` | תשלום התקבל, ממתין לאישור מנהל |
| `active` | אושר ומוצג כעת |
| `rejected` | מנהל המערכת דחה את ההגשה |
| `expired` | התקופה הפעילה הסתיימה |
| `cancelled` | בוטל על ידי משתמש או מנהל |

### סוגי מרווחים

| מרווח | משך |
|--------|--------|
| `weekly` | חסות ל-7 ימים |
| `monthly` | חסות ל-30 יום |

## הגדרות סוג

### מודעת חסות (סכימת מסד נתונים)

הסוג `SponsorAd` מגיע מסכימת הטפטוף ( `lib/db/schema` ). שדות מפתח כוללים:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (אחד מערכי הסטטוס שלמעלה)
- `interval` ( `weekly` או `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### SponsorWithItem

משמש עבור רכיבי תצוגה -- משלב מודעת חסות עם נתוני הפריטים שנפתרו:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

נתונים סטטיסטיים מצטברים שהוחזרו על ידי נקודת הסיום של הנתונים הסטטיסטיים:

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

התוכנה העיקרית למשתמשים המנהלים את ההגשות שלהם למודעות נותנות חסות.

### ייבוא

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### פרמטרים

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### ערך החזרה

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

### יצירת מודעת חסות

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

### זרימת תשלום

לאחר יצירת מודעת חסות, המשתמש צריך לשלם. שיטת `payNow` יוצרת הפעלת תשלום ומחזירה כתובת URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

ממשק ה-API של התשלום ( `/api/sponsor-ads/checkout` ) מחזיר:

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

### חידוש חסות

ניתן לחדש מודעות שפג תוקפן או שעומדות לפוג:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### חפש עם יציאה

הקרס כולל ניתוק חיפוש מובנה (השהייה של 300 אלפיות השנייה):

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

ה-Admin Hook מספק יכולות ניהול: אישור, דחייה, ביטול ומחיקה של מודעות נותנות חסות.

### ייבוא

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### פרמטרים

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

### ערך החזרה

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

### זרימת עבודה של אישור

פעולת האישור תומכת באפשרות `forceApprove` למקרים בהם לא התקבל תשלום:

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

כאשר ה-API מחזיר שגיאה `PAYMENT_NOT_RECEIVED` , הוו תופס אותה ומחזיר `requiresForceApprove: true` במקום להציג שגיאת טוסט.

### דחייה עם סיבה

דחיות דורשות מחרוזת סיבה שמאוחסנת ברשומת מודעת החסות:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### מיון עם איפוס עימוד

שינוי שדה המיון או הסדר מתאפס אוטומטית לעמוד 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## useActiveSponsorAds

וו קל משקל להבאת מודעות חסות פעילות לתצוגה ציבורית בפריסות עמוד הבית ובסרגלי הצד.

### ייבוא

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### פרמטרים

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### ערך החזרה

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### דוגמה לשימוש

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

### שמירה במטמון

הקרס משתמש במטמון אגרסיבי מכיוון שספונסרים פעילים אינם מתחלפים לעתים קרובות:

| הגדרה | ערך |
|--------|-------|
| `staleTime` | 5 דקות |
| `gcTime` | 10 דקות |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

מביא מודעת חסות בודדת לפי תעודת זהות. משמש לדפי פירוט/עריכה.

### ייבוא

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### שימוש

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

ה-hook מקבל את `null` כמזהה, ובמקרה זה השאילתה מושבתת. זה שימושי לעיבוד מותנה:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## נקודות קצה של ממשק API

### נקודות קצה ציבוריות

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| קבל | `/api/sponsor-ads` | אחזר מודעות חסות פעילות לתצוגה ציבורית |

### נקודות קצה של משתמש (מאומת)

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| קבל | `/api/sponsor-ads/user` | רשימת מודעות החסות של המשתמש עם עימוד |
| פוסט | `/api/sponsor-ads/user` | צור הגשת מודעת חסות חדשה |
| קבל | `/api/sponsor-ads/user/stats` | אחזר נתונים סטטיסטיים של מודעות חסות של המשתמש |
| קבל | `/api/sponsor-ads/user/{id}` | קבל מודעת חסות ספציפית |
| פוסט | `/api/sponsor-ads/user/{id}/cancel` | בטל מודעת חסות |
| פוסט | `/api/sponsor-ads/user/{id}/renew` | חידוש חסות שפג תוקפו |
| פוסט | `/api/sponsor-ads/checkout` | צור סשן ביצוע תשלום |

### נקודות קצה של מנהל מערכת

| שיטה | נקודת קצה | תיאור |
|--------|--------|----------------|
| קבל | `/api/admin/sponsor-ads` | רשימת כל מודעות החסות עם מסננים |
| פוסט | `/api/admin/sponsor-ads/{id}/approve` | אישור מודעת חסות |
| פוסט | `/api/admin/sponsor-ads/{id}/reject` | דחה עם סיבה |
| פוסט | `/api/admin/sponsor-ads/{id}/cancel` | מנהל המערכת בטל |
| מחק | `/api/admin/sponsor-ads/{id}` | מחק מודעת חסות |

## השלם את תהליך ההגשה

להלן זרימת העבודה המלאה מנקודת המבט של המשתמש:

### שלב 1 -- בחר פריט

המשתמש בוחר איזה פריט לתת חסות מלוח המחוונים שלו או מדף פרטי הפריט.

### שלב 2 -- שלח מודעת חסות

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

### שלב 3 -- השלם תשלום

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### שלב 4 -- סקירת מנהל

המנהל רואה את המודעה הממתינה במרכז השליטה שלו ויכול לאשר או לדחות:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### שלב 5 -- תצוגה פעילה

מודעות פעילות מופיעות ברכיבים הפונה לציבור דרך `useActiveSponsorAds` .

### שלב 6 -- תפוגה וחידוש

עם סיום תקופת החסות, הסטטוס משתנה ל- `expired` . המשתמש יכול לחדש:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## לוח המחוונים לסטטיסטיקה

גם משתמש וגם מנהל מערכת חושפים נתונים סטטיסטיים עבור תצוגות לוח המחוונים:

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
