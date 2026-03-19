---
id: sponsor-ad-types
title: Sponsor Ad Type Definitions
sidebar_label: Sponsor Ad Types
sidebar_position: 8
---

# Sponsor Ad Type Definitions

**Source:** `lib/types/sponsor-ad.ts`

The sponsor ad module defines types for the sponsorship and advertising system. Sponsors can promote items through weekly or monthly advertising slots with a full lifecycle from payment through approval, activation, and expiration.

## Type Aliases

### `SponsorAdStatus`

Lifecycle states for a sponsor advertisement:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

| Status | Description |
|--------|-------------|
| `pending_payment` | Ad created, awaiting payment completion |
| `pending` | Payment received, awaiting admin approval |
| `rejected` | Admin rejected the sponsorship request |
| `active` | Approved and currently displayed |
| `expired` | Active period has ended |
| `cancelled` | Cancelled by the sponsor or admin |

### `SponsorAdIntervalType`

Billing interval options:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## Display Types

### `SponsorWithItem`

A sponsor ad with its associated item data for UI display. The `item` field may be `null` if the linked item no longer exists.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## Request Types

### `CreateSponsorAdRequest`

Payload for creating a new sponsor ad.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

Payload for updating an existing sponsor ad. Used primarily by admin operations.

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

Payload for approving a pending sponsor ad.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

Payload for rejecting a sponsor ad with a reason.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

Payload for cancelling an active or pending sponsor ad.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## Response Types

### `SponsorAdResponse`

Discriminated union response for single sponsor ad operations:

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

Discriminated union response for paginated sponsor ad lists:

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

## Query Options

### `SponsorAdListOptions`

Query parameters for filtering and paginating sponsor ad lists.

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

## Stats Types

### `SponsorAdStats`

Aggregate statistics for the sponsor ad dashboard.

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

## Dashboard Types

### `SponsorAdDashboardResponse`

Combined response for the admin sponsor dashboard, including the list, pagination, and statistics.

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

## Extended Types

### `SponsorAdWithUser`

Sponsor ad enriched with user and reviewer data, used in admin detail views.

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

## Usage Examples

### Creating a sponsor ad

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### Filtering sponsor ads

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

### Handling discriminated union responses

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

### Displaying dashboard statistics

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

## Design Notes

### Sponsor Ad Lifecycle

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. Sponsor creates ad and initiates payment (`pending_payment`)
2. After payment completes, ad moves to `pending` for admin review
3. Admin approves (`active`) or rejects (`rejected`)
4. Active ads expire automatically when `endDate` passes
5. Sponsors or admins can cancel at any time

### Discriminated Union Responses

The `SponsorAdResponse` and `SponsorAdListResponse` types use discriminated unions based on the `success` field. This enables type-safe error handling in TypeScript:

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

## Related Types

- [`ItemData`](./item-types.md) - The item being sponsored (referenced by `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - Database schema type from `lib/db/schema`
