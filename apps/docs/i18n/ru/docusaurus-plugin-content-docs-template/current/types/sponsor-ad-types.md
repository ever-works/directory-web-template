---
id: sponsor-ad-types
title: Определения типов спонсорских объявлений
sidebar_label: Типы спонсорских объявлений
sidebar_position: 8
---

# Определения типов спонсорских объявлений

**Источник:** `lib/types/sponsor-ad.ts`

Модуль спонсорской рекламы определяет типы спонсорской и рекламной системы. Спонсоры могут продвигать товары через еженедельные или ежемесячные рекламные места с полным жизненным циклом от оплаты до утверждения, активации и истечения срока действия.

## Введите псевдонимы

### `SponsorAdStatus`

Состояния жизненного цикла спонсорской рекламы:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|Статус|Описание|
|--------|-------------|
|`pending_payment`|Объявление создано, ожидает завершения оплаты.|
|`pending`|Платеж получен, ожидает одобрения администратора|
|`rejected`|Администратор отклонил запрос на спонсорство|
|`active`|Утверждено и отображается в настоящее время|
|`expired`|Активный период закончился|
|`cancelled`|Отменено спонсором или администратором|

### `SponsorAdIntervalType`

Варианты интервала выставления счетов:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Типы отображения

### `SponsorWithItem`

Спонсорское объявление со связанными с ним данными элемента для отображения в пользовательском интерфейсе. Поле `item` может быть `null`, если связанный элемент больше не существует.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Типы запросов

### `CreateSponsorAdRequest`

Полезная нагрузка для создания нового спонсорского объявления.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Полезная нагрузка для обновления существующего спонсорского объявления. Используется в основном операциями администратора.

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

Полезная нагрузка для утверждения ожидающего объявления спонсора.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Полезная нагрузка для отклонения спонсорской рекламы с указанием причины.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Полезная нагрузка для отмены активной или ожидающей спонсорской рекламы.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Типы ответов

### `SponsorAdResponse`

Дискриминированный ответ профсоюза на рекламные операции с одним спонсором:

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

Ответ профсоюза с дискриминацией для списков объявлений спонсоров с разбивкой по страницам:

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

## Параметры запроса

### `SponsorAdListOptions`

Параметры запроса для фильтрации и разбиения на страницы списков объявлений спонсоров.

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

## Типы статистики

### `SponsorAdStats`

Совокупная статистика для панели объявлений спонсоров.

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

## Типы информационных панелей

### `SponsorAdDashboardResponse`

Комбинированный ответ для панели администратора-спонсора, включая список, нумерацию страниц и статистику.

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

## Расширенные типы

### `SponsorAdWithUser`

Спонсорское объявление, дополненное данными пользователей и рецензентов, которые используются в подробных представлениях администратора.

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

## Примеры использования

### Создание спонсорской рекламы

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Фильтрация спонсорской рекламы

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

### Обработка дискриминационной реакции профсоюзов

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

### Отображение статистики приборной панели

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

## Примечания к проектированию

### Жизненный цикл спонсорской рекламы

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Спонсор создает объявление и инициирует оплату (`pending_payment`)
2. После завершения оплаты объявление перемещается в `pending` на рассмотрение администратора.
3. Администратор одобряет (`active`) или отклоняет (`rejected`)
4. Срок действия активных объявлений истекает автоматически после прохождения `endDate`.
5. Спонсоры или администраторы могут отменить подписку в любое время.

### Дискриминированные ответы профсоюзов

Типы `SponsorAdResponse` и `SponsorAdListResponse` используют различаемые объединения на основе поля `success`. Это обеспечивает типобезопасную обработку ошибок в TypeScript:

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

## Связанные типы

- [`ItemData`](./item-types.md) — спонсируемый элемент (на который ссылается `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) — тип схемы базы данных из `lib/db/schema`
