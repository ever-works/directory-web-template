---
id: sponsor-ads
title: Система за спонсориране на реклами
sidebar_label: Спонсор реклами
sidebar_position: 10
---

# Система за реклами на спонсори

Системата за реклами на спонсори позволява на потребителите на директории да популяризират своите артикули чрез платени спонсорства. Системата включва работен процес за подаване, интегриране на плащане, процес на одобрение от администратор и публично показване на активни реклами на спонсори.

## Изходни местоположения

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

## Жизнен цикъл на рекламата на спонсора

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

### Стойности на състоянието

| Статус | Описание |
|--------|-------------|
| `pending_payment` | Обявата е създадена, очаква плащане |
| `pending` | Плащането е получено, очаква одобрение от администратор |
| `active` | Одобрено и показано в момента |
| `rejected` | Администраторът отхвърли подаването |
| `expired` | Активният период е приключил |
| `cancelled` | Анулирано от потребител или администратор |

### Типове интервали

| Интервал | Продължителност |
|----------|----------|
| `weekly` | 7-дневно спонсорство |
| `monthly` | 30-дневно спонсорство |

## Дефиниции на типове

### SponsorAd (схема на база данни)

Типът `SponsorAd` идва от схемата Drizzle ( `lib/db/schema` ). Ключовите полета включват:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (една от стойностите на състоянието по-горе)
- `interval` ( `weekly` или `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### SponsorWithItem

Използва се за компоненти на дисплея -- сдвоява реклама на спонсор с нейните разрешени данни за артикул:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### SponsorAdStats

Обобщена статистика, върната от крайната точка на статистиката:

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

Основната кука за потребители, управляващи подаването на своите спонсорски реклами.

### Импортиране

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Параметри

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Върната стойност

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

### Създаване на реклама на спонсор

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

### Поток на плащане

След създаване на спонсорска реклама потребителят трябва да плати. Методът `payNow` създава сесия за плащане и връща URL:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

API за плащане ( `/api/sponsor-ads/checkout` ) връща:

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

### Подновяване на спонсорство

Рекламите с изтекъл или скоро изтичащ срок могат да бъдат подновени:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Търсене с Debouncing

Куката включва вградено отстраняване на отскок при търсене (300ms забавяне):

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

Администраторската кука предоставя възможности за управление: одобряване, отхвърляне, анулиране и изтриване на реклами на спонсори.

### Импортиране

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Параметри

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

### Върната стойност

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

### Работен процес на одобрение

Действието за одобрение поддържа опция `forceApprove` за случаите, когато плащането не е получено:

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

Когато API върне грешка `PAYMENT_NOT_RECEIVED` , куката я хваща и връща `requiresForceApprove: true` вместо да показва тост грешка.

### Отхвърляне с причина

Отхвърлянията изискват низ за причина, който се съхранява в записа на рекламата на спонсора:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Сортиране с Нулиране на страниците

Промяната на полето за сортиране или реда автоматично се нулира на страница 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## useActiveSponsorAds

Лека кука за извличане на активни реклами от спонсори за публично показване на оформления на началната страница и странични ленти.

### Импортиране

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Параметри

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Върната стойност

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Пример за използване

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

### Кеширане

Куката използва агресивно кеширане, тъй като активните спонсори не се променят често:

| Настройка | Стойност |
|---------|-------|
| `staleTime` | 5 минути |
| `gcTime` | 10 минути |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Извлича реклама на един спонсор по ID. Използва се за страници с подробности/редактиране.

### Импортиране

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Използване

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

Куката приема `null` като ID, в който случай заявката е деактивирана. Това е полезно за условно изобразяване:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## API крайни точки

### Публични крайни точки

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ВЗЕМЕТЕ | `/api/sponsor-ads` | Извличане на активни спонсорски реклами за публично показване |

### Потребителски крайни точки (удостоверени)

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ВЗЕМЕТЕ | `/api/sponsor-ads/user` | Избройте спонсорските реклами на потребителя с пагинация |
| ПУБЛИКАЦИЯ | `/api/sponsor-ads/user` | Създайте ново изпращане на реклама за спонсор |
| ВЗЕМЕТЕ | `/api/sponsor-ads/user/stats` | Извличане на статистически данни за реклама на спонсор |
| ВЗЕМЕТЕ | `/api/sponsor-ads/user/{id}` | Вземете конкретна реклама на спонсор |
| ПУБЛИКАЦИЯ | `/api/sponsor-ads/user/{id}/cancel` | Отказ от реклама на спонсор |
| ПУБЛИКАЦИЯ | `/api/sponsor-ads/user/{id}/renew` | Подновете изтекло спонсорство |
| ПУБЛИКАЦИЯ | `/api/sponsor-ads/checkout` | Създайте сесия за плащане |

### Административни крайни точки

| Метод | Крайна точка | Описание |
|--------|----------|-------------|
| ВЗЕМЕТЕ | `/api/admin/sponsor-ads` | Избройте всички реклами на спонсори с филтри |
| ПУБЛИКАЦИЯ | `/api/admin/sponsor-ads/{id}/approve` | Одобряване на реклама на спонсор |
| ПУБЛИКАЦИЯ | `/api/admin/sponsor-ads/{id}/reject` | Отхвърляне с основание |
| ПУБЛИКАЦИЯ | `/api/admin/sponsor-ads/{id}/cancel` | Администратор отмени |
| ИЗТРИВАНЕ | `/api/admin/sponsor-ads/{id}` | Изтриване на реклама на спонсор |

## Пълен работен процес на подаване

Ето пълния работен процес от гледна точка на потребителя:

### Стъпка 1 -- Изберете елемент

Потребителят избира кой артикул да спонсорира от своето табло за управление или страницата с подробности за артикула.

### Стъпка 2 -- Изпратете реклама на спонсор

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

### Стъпка 3 -- Завършете плащането

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Стъпка 4 -- Административен преглед

Администраторът вижда чакащата реклама в своето табло за управление и може да одобри или отхвърли:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Стъпка 5 -- Активен дисплей

Активните реклами се появяват в публичните компоненти през `useActiveSponsorAds` .

### Стъпка 6 -- Изтичане и подновяване

Когато периодът на спонсорство приключи, статусът се променя на `expired` . Потребителят може да поднови:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Табло за управление на статистиката

Както потребителските, така и администраторските куки разкриват статистически данни за дисплеите на таблото за управление:

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
