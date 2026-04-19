---
id: sponsor-ad-types
title: Дефиниции на типа реклама на спонсор
sidebar_label: Видове реклами на спонсори
sidebar_position: 8
---

# Дефиниции на типа реклама на спонсор

**Източник:** `lib/types/sponsor-ad.ts`

Модулът за реклама на спонсори дефинира типове за системата за спонсорство и реклама. Спонсорите могат да рекламират артикули чрез седмични или месечни рекламни слотове с пълен жизнен цикъл от плащане през одобрение, активиране и изтичане.

## Тип псевдоними

### `SponsorAdStatus`

Състояния на жизнения цикъл за реклама на спонсор:

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
|`pending_payment`|Обявата е създадена, очаква завършване на плащането|
|`pending`|Плащането е получено, очаква одобрение от администратор|
|`rejected`|Администраторът отхвърли искането за спонсорство|
|`active`|Одобрено и показвано в момента|
|`expired`|Активният период приключи|
|`cancelled`|Отменено от спонсора или администратора|

### `SponsorAdIntervalType`

Опции за интервал на таксуване:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Видове дисплеи

### `SponsorWithItem`

Реклама на спонсор със свързаните с нея данни за артикул за показване на потребителския интерфейс. Полето `item` може да бъде `null`, ако свързаният елемент вече не съществува.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Видове заявки

### `CreateSponsorAdRequest`

Полезен товар за създаване на нова реклама на спонсор.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Полезен товар за актуализиране на съществуваща реклама на спонсор. Използва се предимно от администраторски операции.

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

Полезен товар за одобрение на чакаща реклама на спонсор.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Полезен товар за отхвърляне на реклама на спонсор с причина.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Полезен товар за анулиране на активна или чакаща реклама на спонсор.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Типове отговори

### `SponsorAdResponse`

Дискриминиран отговор на синдикатите за рекламни операции с един спонсор:

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

Дискриминиран отговор на профсъюза за рекламни списъци със спонсори с страници:

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

## Опции на заявката

### `SponsorAdListOptions`

Параметри на заявката за филтриране и пагиниране на рекламни списъци със спонсори.

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

## Типове статистики

### `SponsorAdStats`

Обобщена статистика за таблото за реклами на спонсори.

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

## Видове табла

### `SponsorAdDashboardResponse`

Комбиниран отговор за таблото за управление на спонсора на администратора, включително списък, пагинация и статистика.

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

## Разширени типове

### `SponsorAdWithUser`

Спонсорирана реклама, обогатена с данни за потребители и рецензенти, използвани в изгледите на подробности на администратора.

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

## Примери за използване

### Създаване на реклама на спонсор

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Филтриране на спонсорски реклами

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

### Справяне с дискриминирани синдикални отговори

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

### Показване на статистика на таблото за управление

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

## Бележки по дизайна

### Спонсорирайте рекламния жизнен цикъл

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Спонсорът създава реклама и инициира плащане (`pending_payment`)
2. След приключване на плащането рекламата се премества на `pending` за преглед от администратор
3. Администраторът одобрява (`active`) или отхвърля (`rejected`)
4. Активните реклами изтичат автоматично, когато `endDate` премине
5. Спонсорите или администраторите могат да анулират по всяко време

### Дискриминирани синдикални реакции

Типовете `SponsorAdResponse` и `SponsorAdListResponse` използват дискриминирани съюзи въз основа на полето `success`. Това позволява безопасна обработка на грешки в TypeScript:

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

## Свързани типове

- [`ItemData`](./item-types.md) - Артикулът, който се спонсорира (посочен от `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Тип на схемата на базата данни от `lib/db/schema`
