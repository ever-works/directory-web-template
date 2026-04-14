---
id: sponsor-ad-types
title: تعريفات نوع الإعلان الراعي
sidebar_label: أنواع إعلانات الراعي
sidebar_position: 8
---

# تعريفات نوع الإعلان الراعي

**المصدر:** `lib/types/sponsor-ad.ts`

تحدد وحدة إعلانات الجهة الراعية أنواع نظام الرعاية والإعلان. يمكن للجهات الراعية الترويج للعناصر من خلال فتحات إعلانية أسبوعية أو شهرية مع دورة حياة كاملة بدءًا من الدفع وحتى الموافقة والتنشيط وانتهاء الصلاحية.

## اكتب الأسماء المستعارة

### `SponsorAdStatus`

تنص دورة الحياة لإعلان الراعي:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|الحالة|الوصف|
|--------|-------------|
|`pending_payment`|تم إنشاء الإعلان، في انتظار استكمال الدفع|
|`pending`|تم استلام المبلغ، في انتظار موافقة المشرف|
|`rejected`|رفض المشرف طلب الرعاية|
|`active`|تمت الموافقة عليه ويتم عرضه حاليًا|
|`expired`|انتهت الفترة النشطة|
|`cancelled`|تم الإلغاء من قبل الراعي أو المشرف|

### `SponsorAdIntervalType`

خيارات الفترات الزمنية للفوترة:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## أنواع العرض

### `SponsorWithItem`

إعلان راعي مع بيانات العنصر المرتبطة به لعرض واجهة المستخدم. قد يكون الحقل `item` هو `null` إذا لم يعد العنصر المرتبط موجودًا.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## أنواع الطلب

### `CreateSponsorAdRequest`

الحمولة لإنشاء إعلان راعي جديد.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

الحمولة لتحديث إعلان الراعي الحالي. تستخدم في المقام الأول من قبل عمليات الإدارة.

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

الحمولة للموافقة على إعلان الراعي المعلق.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

حمولة رفض إعلان الراعي مع سبب.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

الحمولة لإلغاء إعلان راعي نشط أو معلق.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## أنواع الاستجابة

### `SponsorAdResponse`

استجابة الاتحاد التمييزية للعمليات الإعلانية لراعي واحد:

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

استجابة الاتحاد التمييزية لقوائم إعلانات الجهات الراعية المقسمة إلى صفحات:

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

## خيارات الاستعلام

### `SponsorAdListOptions`

معلمات الاستعلام لتصفية قوائم الإعلانات الراعية وترقيم صفحاتها.

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

## أنواع الإحصائيات

### `SponsorAdStats`

إحصائيات مجمعة للوحة معلومات إعلان الراعي.

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

## أنواع لوحة القيادة

### `SponsorAdDashboardResponse`

الاستجابة المجمعة للوحة تحكم الراعي الإداري، بما في ذلك القائمة وترقيم الصفحات والإحصائيات.

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

## الأنواع الموسعة

### `SponsorAdWithUser`

إعلان راعي غني ببيانات المستخدم والمراجع، ويستخدم في طرق العرض التفصيلية للمسؤول.

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

## أمثلة الاستخدام

### إنشاء إعلان الراعي

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### تصفية إعلانات الراعي

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

### التعامل مع الاستجابات النقابية التمييزية

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

### عرض إحصائيات لوحة القيادة

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

## ملاحظات التصميم

### دورة حياة إعلان الراعي

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. يقوم الراعي بإنشاء إعلان ويبدأ الدفع (`pending_payment`)
2. بعد اكتمال الدفع، ينتقل الإعلان إلى `pending` لمراجعة المشرف
3. يوافق المشرف (`active`) أو يرفض (`rejected`)
4. تنتهي صلاحية الإعلانات النشطة تلقائيًا عند مرور `endDate`
5. يمكن للجهات الراعية أو المسؤولين الإلغاء في أي وقت

### ردود الاتحاد التمييزية

تستخدم الأنواع `SponsorAdResponse` و`SponsorAdListResponse` النقابات المميزة بناءً على الحقل `success`. يتيح ذلك معالجة الأخطاء بأمان في TypeScript:

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

## الأنواع ذات الصلة

- [`ItemData`](./item-types.md) - العنصر الذي تتم رعايته (المشار إليه بواسطة `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - نوع مخطط قاعدة البيانات من `lib/db/schema`
