---
id: sponsor-ads
title: نظام إعلانات الراعي
sidebar_label: إعلانات الراعي
sidebar_position: 10
---

# نظام الإعلانات الراعيه

يتيح نظام إعلانات الجهات الراعية لمستخدمي الدليل الترويج لعناصرهم من خلال الرعاية المدفوعة. يتضمن النظام سير عمل التقديم، وتكامل الدفع، وعملية موافقة المسؤول، والعرض العام لإعلانات الراعي النشطة.

## مواقع المصدر

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

## دورة حياة الإعلان الراعي

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

### قيم الحالة

| الحالة | الوصف |
|--------|------------|
| `pending_payment` | تم إنشاء الإعلان، في انتظار الدفع |
| `pending` | تم استلام المبلغ، في انتظار موافقة المشرف |
| `active` | تمت الموافقة عليها وعرضها حاليًا |
| `rejected` | رفض المشرف التقديم |
| 4ـ | انتهت الفترة النشطة |
| 5 ــ | تم الإلغاء من قبل المستخدم أو المشرف |

### أنواع الفترات

| الفاصل | المدة |
|----------|---------|
| 6ـ | رعاية لمدة 7 أيام |
| `monthly` | رعاية لمدة 30 يومًا |

## تعريفات النوع

### إعلان الراعي (مخطط قاعدة البيانات)

يأتي النوع 8 من مخطط Drizzle (9). تشمل المجالات الرئيسية ما يلي:

- 10، 11، 12، 13، 14، 15.
- `status` (أحد قيم الحالة أعلاه)
- 17 ( 18 أو 19 )
- 20، 21
- 22، 23، 24، 25
- 26، 27
- 28، 29

### الراعي مع العنصر

يُستخدم لعرض المكونات - لإقران إعلان الجهة الراعية ببيانات العنصر التي تم حلها:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### إحصائيات إعلان الراعي

الإحصائيات المجمعة التي يتم إرجاعها بواسطة نقطة نهاية الإحصائيات:

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

## استخدامUserSponsorAds

الخطاف الأساسي للمستخدمين الذين يديرون عمليات إرسال إعلانات الراعي الخاصة بهم.

### يستورد

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### حدود

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### قيمة الإرجاع

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

### إنشاء إعلان راعي

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

### تدفق الدفع

بعد إنشاء إعلان راعي، يحتاج المستخدم إلى الدفع. تقوم الطريقة `payNow` بإنشاء جلسة دفع وإرجاع عنوان URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

تُرجع واجهة برمجة تطبيقات الخروج ( `/api/sponsor-ads/checkout` ):

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

### تجديد الكفالة

يمكن تجديد الإعلانات منتهية الصلاحية أو على وشك الانتهاء:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### البحث باستخدام الارتداد

يشتمل الخطاف على ارتداد بحث مدمج (تأخير 300 مللي ثانية):

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

## استخدامAdminSponsorAds

يوفر رابط المسؤول إمكانيات الإدارة: الموافقة على الإعلانات الراعية ورفضها وإلغاءها وحذفها.

### يستورد

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### حدود

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

### قيمة الإرجاع

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

### سير عمل الموافقة

يدعم إجراء الموافقة خيار 0 للحالات التي لم يتم فيها استلام الدفعة:

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

عندما تقوم واجهة برمجة التطبيقات بإرجاع خطأ `PAYMENT_NOT_RECEIVED` ، يلتقطه الخطاف ويعيد `requiresForceApprove: true` بدلاً من إظهار خطأ نخب.

### الرفض مع السبب

تتطلب حالات الرفض سلسلة سبب يتم تخزينها في سجل الإعلان الراعي:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### الفرز مع إعادة ضبط الصفحات

يؤدي تغيير حقل الفرز أو الترتيب إلى إعادة التعيين تلقائيًا إلى الصفحة 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## استخدامActiveSponsorAds

خطاف خفيف الوزن لجلب إعلانات الجهات الراعية النشطة للعرض العام على تخطيطات الصفحة الرئيسية والأشرطة الجانبية.

### يستورد

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### حدود

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### قيمة الإرجاع

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### مثال الاستخدام

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

### التخزين المؤقت

يستخدم الخطاف تخزينًا مؤقتًا قويًا نظرًا لأن الجهات الراعية النشطة لا تتغير بشكل متكرر:

| الإعداد | القيمة |
|---------|------|
| `staleTime` | 5 دقائق |
| `gcTime` | 10 دقائق |
| `refetchOnWindowFocus` | `false` |

---

## استخدمSponsorAdDetail

جلب إعلان راعي واحد عن طريق المعرف. تستخدم لصفحات التفاصيل/التحرير.

### يستورد

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### الاستخدام

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

يقبل الخطاف `null` كمعرف، وفي هذه الحالة يتم تعطيل الاستعلام. وهذا مفيد للعرض الشرطي:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## نقاط نهاية واجهة برمجة التطبيقات

### نقاط النهاية العامة

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| احصل على | `/api/sponsor-ads` | جلب إعلانات الراعي النشطة للعرض العام |

### نقاط نهاية المستخدم (مصادق عليها)

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| احصل على | `/api/sponsor-ads/user` | قائمة الإعلانات الراعيه للمستخدم مع ترقيم الصفحات |
| مشاركة | `/api/sponsor-ads/user` | إنشاء تقديم إعلان راعي جديد |
| احصل على | `/api/sponsor-ads/user/stats` | جلب إحصائيات إعلانات الراعي للمستخدم |
| احصل على | 4ـ | احصل على إعلان راعي محدد |
| مشاركة | 5 ــ | إلغاء إعلان الراعي |
| مشاركة | 6ـ | تجديد كفالة منتهية الصلاحية |
| مشاركة | `/api/sponsor-ads/checkout` | إنشاء جلسة دفع الدفع |

### نقاط النهاية الإدارية

| الطريقة | نقطة النهاية | الوصف |
|--------|----------|-------------|
| احصل على | 8ـ | قائمة بجميع إعلانات الراعي مع الفلاتر |
| مشاركة | `/api/admin/sponsor-ads/{id}/approve` | الموافقة على إعلان ممول |
| مشاركة | `/api/admin/sponsor-ads/{id}/reject` | رفض مع السبب |
| مشاركة | `/api/admin/sponsor-ads/{id}/cancel` | إلغاء المشرف |
| حذف | ‹‹١٢› | حذف اعلان ممول |

## إكمال سير عمل التقديم

فيما يلي سير العمل الكامل من وجهة نظر المستخدم:

### الخطوة 1 - حدد عنصرًا

يختار المستخدم العنصر الذي يريد رعايته من لوحة التحكم الخاصة به أو من صفحة تفاصيل العنصر.

### الخطوة الثانية - إرسال إعلان الراعي

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

### الخطوة 3 - إتمام عملية الدفع

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### الخطوة 4 - مراجعة المشرف

يرى المسؤول الإعلان المعلق في لوحة التحكم الخاصة به ويمكنه الموافقة أو الرفض:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### الخطوة 5 - العرض النشط

تظهر الإعلانات النشطة في المكونات العامة من خلال `useActiveSponsorAds` .

### الخطوة 6 - انتهاء الصلاحية والتجديد

عند انتهاء فترة الرعاية، تتغير الحالة إلى `expired` . يمكن للمستخدم التجديد:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## لوحة الإحصائيات

تعرض كل من ربطات المستخدم والمسؤول إحصائيات شاشات لوحة المعلومات:

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
