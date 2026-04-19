---
id: sponsor-ad-types
title: 赞助商广告类型定义
sidebar_label: 赞助商广告类型
sidebar_position: 8
---

# 赞助商广告类型定义

**来源：** `lib/types/sponsor-ad.ts`

赞助商广告模块定义赞助和广告系统的类型。赞助商可以通过每周或每月的广告时段来促销商品，其整个生命周期包括从付款到批准、激活和到期。

## 类型别名

### `SponsorAdStatus`

赞助商广告的生命周期状态：

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|状态|描述|
|--------|-------------|
|`pending_payment`|广告已创建，等待付款完成|
|`pending`|已收到付款，等待管理员批准|
|`rejected`|管理员拒绝了赞助请求|
|`active`|已批准并当前显示|
|`expired`|活跃期已结束|
|`cancelled`|被主办方或管理员取消|

### `SponsorAdIntervalType`

计费间隔选项：

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## 显示类型

### `SponsorWithItem`

赞助商广告及其用于 UI 显示的关联项目数据。如果链接项不再存在，`item` 字段可能是`null`。

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## 请求类型

### `CreateSponsorAdRequest`

用于创建新赞助商广告的有效负载。

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

用于更新现有赞助商广告的有效负载。主要由管理操作使用。

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

用于批准待处理的赞助商广告的有效负载。

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

用于有理由拒绝赞助商广告的负载。

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

用于取消有效或待处理的赞助商广告的有效负载。

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## 响应类型

### `SponsorAdResponse`

工会对单一赞助商广告运营的歧视反应：

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

歧视工会对分页赞助商广告列表的回应：

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

## 查询选项

### `SponsorAdListOptions`

用于过滤和分页赞助商广告列表的查询参数。

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

## 统计类型

### `SponsorAdStats`

赞助商广告仪表板的汇总统计数据。

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

## 仪表板类型

### `SponsorAdDashboardResponse`

管理员发起人仪表板的综合响应，包括列表、分页和统计信息。

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

## 扩展类型

### `SponsorAdWithUser`

赞助商广告富含用户和评论者数据，在管理详细信息视图中使用。

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

## 使用示例

### 创建赞助商广告

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### 过滤赞助商广告

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

### 处理受歧视的工会回应

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

### 显示仪表板统计信息

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

## 设计笔记

### 赞助商广告生命周期

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. 赞助商创建广告并发起付款 (`pending_payment`)
2. 付款完成后，广告将移至`pending`以供管理员审核
3. 管理员批准 (`active`) 或拒绝 (`rejected`)
4. `endDate` 通过后，有效广告将自动过期
5. 赞助商或管理员可以随时取消

### 受歧视工会的回应

`SponsorAdResponse` 和`SponsorAdListResponse` 类型使用基于`success` 字段的可区分联合。这使得 TypeScript 能够进行类型安全的错误处理：

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

## 相关类型

- [`ItemData`](./item-types.md) - 赞助的项目（由 `itemSlug` 引用）
- [`SponsorAd`](./sponsor-ad-types.md) - 来自 `lib/db/schema` 的数据库架构类型
