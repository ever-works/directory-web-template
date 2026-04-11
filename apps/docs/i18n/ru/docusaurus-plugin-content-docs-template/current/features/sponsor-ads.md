---
id: sponsor-ads
title: Система спонсорской рекламы
sidebar_label: Спонсорские объявления
sidebar_position: 10
---

# Система спонсорской рекламы

Система спонсорской рекламы позволяет пользователям каталога продвигать свои товары посредством платного спонсорства. Система включает в себя рабочий процесс подачи заявок, интеграцию платежей, процесс утверждения администратором и публичный показ активных рекламных объявлений спонсоров.

## Исходные локации

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

## Жизненный цикл спонсорского объявления

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

### Значения статуса

| Статус | Описание |
|--------|-------------|
| `pending_payment` | Объявление создано, ожидает оплаты |
| `pending` | Платеж получен, ожидает одобрения администратора |
| `active` | Утверждено и отображается в настоящее время |
| `rejected` | Администратор отклонил заявку |
| `expired` | Активный период закончился |
| `cancelled` | Отменено пользователем или администратором |

### Типы интервалов

| Интервал | Продолжительность |
|----------|----------|
| `weekly` | 7-дневное спонсорство |
| `monthly` | 30-дневное спонсорство |

## Определения типов

### SponsorAd (схема базы данных)

Тип `SponsorAd` происходит от схемы «Дождь» ( `lib/db/schema` ). Ключевые поля включают в себя:

- `id` , `userId` , `itemSlug` , `itemName` , `itemIconUrl` , `itemCategory` - `status` (одно из значений статуса выше)
- `interval` ( `weekly` или `monthly` )
- `startDate` , `endDate` - `paymentProvider` , `paymentId` , `subscriptionId` , `customerId` - `rejectionReason` , `cancelReason` - `createdAt` , `updatedAt` ### СпонсорСПредметом

Используется для компонентов отображения – объединяет рекламу спонсора с данными о решенном элементе:

```ts
interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

### Спонсорская статистика рекламы

Совокупная статистика, возвращаемая конечной точкой статистики:

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

Основной крючок для пользователей, управляющих подачей спонсорской рекламы.

### Импорт

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';
```

### Параметры

```ts
interface UseUserSponsorAdsOptions {
  page?: number;       // default: 1
  limit?: number;      // default: 10
  status?: SponsorAdStatus;
  interval?: 'weekly' | 'monthly';
  search?: string;
}
```

### Возвращаемое значение

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

### Создание спонсорского объявления

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

### Поток платежей

После создания спонсорской рекламы пользователю необходимо оплатить. Метод `payNow` создает сеанс оформления заказа и возвращает URL-адрес:

```tsx
const { payNow } = useUserSponsorAds();

async function handlePayment(sponsorAdId: string) {
  const result = await payNow(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

API оформления заказа ( `/api/sponsor-ads/checkout` ) возвращает:

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

### Продление спонсорства

Объявления с истекшим или истекающим сроком действия можно продлить:

```tsx
const { renewSponsorship } = useUserSponsorAds();

async function handleRenew(sponsorAdId: string) {
  const result = await renewSponsorship(sponsorAdId);
  if (result?.checkoutUrl) {
    window.location.href = result.checkoutUrl;
  }
}
```

### Поиск с устранением дребезга

Хук включает в себя встроенную функцию устранения дребезга при поиске (задержка 300 мс):

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

Хук администратора предоставляет возможности управления: утверждать, отклонять, отменять и удалять рекламные объявления спонсоров.

### Импорт

```tsx
import { useAdminSponsorAds } from '@/hooks/use-admin-sponsor-ads';
```

### Параметры

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

### Возвращаемое значение

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

### Рабочий процесс утверждения

Действие утверждения поддерживает опцию `forceApprove` для случаев, когда оплата не была получена:

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

Когда API возвращает ошибку `PAYMENT_NOT_RECEIVED` , перехватчик перехватывает ее и возвращает `requiresForceApprove: true` вместо отображения всплывающего сообщения об ошибке.

### Отказ по причине

Для отклонения требуется строка причины, которая сохраняется в записи рекламного объявления спонсора:

```tsx
const { rejectSponsorAd } = useAdminSponsorAds();

await rejectSponsorAd(id, 'Content does not meet quality guidelines');
```

### Сортировка со сбросом нумерации страниц

При изменении поля сортировки или порядка автоматически возвращается страница 1:

```tsx
const { setSortBy, setSortOrder, sponsorAds } = useAdminSponsorAds();

// This will reset currentPage to 1
setSortBy('startDate');
setSortOrder('desc');
```

---

## используйтеActiveSponsorAds

Легкий крючок для получения активной спонсорской рекламы для публичного показа на макетах главной страницы и боковых панелях.

### Импорт

```tsx
import { useActiveSponsorAds } from '@/hooks/use-active-sponsor-ads';
```

### Параметры

```ts
interface UseActiveSponsorAdsOptions {
  limit?: number;      // default: 10
  enabled?: boolean;   // default: true
}
```

### Возвращаемое значение

```ts
const {
  sponsors,     // SponsorWithItem[] - sponsor ad + resolved item data
  isLoading,
  isError,
  error,
  refetch,
} = useActiveSponsorAds({ limit: 5 });
```

### Пример использования

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

### Кэширование

Хук использует агрессивное кэширование, поскольку активные спонсоры меняются нечасто:

| Настройка | Значение |
|---------|-------|
| `staleTime` | 5 минут |
| `gcTime` | 10 минут |
| `refetchOnWindowFocus` | `false` |

---

## useSponsorAdDetail

Получает одно рекламное объявление спонсора по идентификатору. Используется для страниц детализации/редактирования.

### Импорт

```tsx
import { useSponsorAdDetail } from '@/hooks/use-sponsor-ad-detail';
```

### Использование

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

Перехватчик принимает `null` в качестве идентификатора, и в этом случае запрос отключается. Это полезно для условного рендеринга:

```tsx
const { data } = useSponsorAdDetail(selectedId || null);
```

---

## Конечные точки API

### Публичные конечные точки

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОЛУЧИТЬ | `/api/sponsor-ads` | Получение активных рекламных объявлений спонсоров для публичного показа |

### Конечные точки пользователей (прошедшие проверку подлинности)

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОЛУЧИТЬ | `/api/sponsor-ads/user` | Список спонсорских объявлений пользователя с нумерацией страниц |
| ПОСТ | `/api/sponsor-ads/user` | Создайте новое объявление спонсора |
| ПОЛУЧИТЬ | `/api/sponsor-ads/user/stats` | Получить статистику рекламы спонсоров пользователя |
| ПОЛУЧИТЬ | `/api/sponsor-ads/user/{id}` | Получите конкретное спонсорское объявление |
| ПОСТ | `/api/sponsor-ads/user/{id}/cancel` | Отменить рекламу спонсора |
| ПОСТ | `/api/sponsor-ads/user/{id}/renew` | Продлить истекшее спонсорство |
| ПОСТ | `/api/sponsor-ads/checkout` | Создать сеанс оплаты |

### Конечные точки администратора

| Метод | Конечная точка | Описание |
|--------|----------|-------------|
| ПОЛУЧИТЬ | `/api/admin/sponsor-ads` | Перечислите все рекламные объявления спонсоров с фильтрами |
| ПОСТ | `/api/admin/sponsor-ads/{id}/approve` | Одобрить рекламу спонсора |
| ПОСТ | `/api/admin/sponsor-ads/{id}/reject` | Отклонить по причине |
| ПОСТ | `/api/admin/sponsor-ads/{id}/cancel` | Админ отменить |
| УДАЛИТЬ | `/api/admin/sponsor-ads/{id}` | Удалить рекламу спонсора |

## Полный рабочий процесс отправки

Вот полный рабочий процесс с точки зрения пользователя:

### Шаг 1. Выберите элемент

Пользователь выбирает, какой элемент спонсировать, на своей панели управления или на странице сведений об элементе.

### Шаг 2 – Отправьте спонсорское объявление

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

### Шаг 3 – Завершите оплату

```tsx
const result = await payNow(ad.id);
window.location.href = result.checkoutUrl;
// After payment: Status changes to pending
```

### Шаг 4. Проверка администратором

Администратор видит ожидающее объявление на своей панели управления и может одобрить или отклонить:

```tsx
// Approve
await approveSponsorAd(ad.id);
// Status: active, startDate and endDate are set

// Or reject
await rejectSponsorAd(ad.id, 'Low quality image');
// Status: rejected
```

### Шаг 5. Активное отображение

Активные объявления появляются в общедоступных компонентах до `useActiveSponsorAds` .

### Шаг 6 – Срок действия и продление

Когда период спонсорства заканчивается, статус меняется на `expired` . Пользователь может продлить:

```tsx
const result = await renewSponsorship(ad.id);
window.location.href = result.checkoutUrl;
// After payment and approval: Status returns to active
```

## Панель статистики

Как пользовательские, так и административные перехватчики предоставляют статистику для дисплеев информационной панели:

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
