---
id: sponsor-ad-types
title: הגדרות סוג מודעות חסות
sidebar_label: סוגי מודעות חסות
sidebar_position: 8
---

# הגדרות סוג מודעות חסות

**מקור:** `lib/types/sponsor-ad.ts`

מודול מודעות החסות מגדיר סוגים עבור מערכת החסות והפרסום. נותני החסות יכולים לקדם פריטים באמצעות משבצות פרסום שבועיות או חודשיות עם מחזור חיים מלא מתשלום דרך אישור, הפעלה ותפוגה.

## הקלד כינויים

### `SponsorAdStatus`

מצבי מחזור חיים עבור פרסומת של נותן חסות:

```typescript
type SponsorAdStatus =
  | 'pending_payment'
  | 'pending'
  | 'rejected'
  | 'active'
  | 'expired'
  | 'cancelled';
```

|סטטוס|תיאור|
|--------|-------------|
|`pending_payment`|המודעה נוצרה, ממתינה להשלמת התשלום|
|`pending`|התשלום התקבל, ממתין לאישור מנהל המערכת|
|`rejected`|האדמין דחה את בקשת החסות|
|`active`|אושר ומוצג כעת|
|`expired`|התקופה הפעילה הסתיימה|
|`cancelled`|בוטל על ידי נותן החסות או המנהל|

### `SponsorAdIntervalType`

אפשרויות מרווחי חיוב:

```typescript
type SponsorAdIntervalType = 'weekly' | 'monthly';
```

## סוגי תצוגה

### `SponsorWithItem`

מודעת חסות עם נתוני הפריט המשויכים לה להצגת ממשק משתמש. השדה `item` עשוי להיות `null` אם הפריט המקושר אינו קיים עוד.

```typescript
import type { SponsorAd } from '@/lib/db/schema';
import type { ItemData } from '@/lib/content';

interface SponsorWithItem {
  sponsor: SponsorAd;
  item: ItemData | null;
}
```

## סוגי בקשות

### `CreateSponsorAdRequest`

מטען ליצירת מודעת חסות חדשה.

```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: SponsorAdIntervalType;
  paymentProvider: string;
}
```

### `UpdateSponsorAdRequest`

מטען לעדכון מודעת חסות קיימת. משמש בעיקר על ידי פעולות מנהל.

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

מטען לאישור מודעת חסות בהמתנה.

```typescript
interface ApproveSponsorAdRequest {
  id: string;
}
```

### `RejectSponsorAdRequest`

מטען על דחיית מודעת חסות עם סיבה.

```typescript
interface RejectSponsorAdRequest {
  id: string;
  rejectionReason: string;
}
```

### `CancelSponsorAdRequest`

מטען עבור ביטול מודעת חסות פעילה או ממתינה.

```typescript
interface CancelSponsorAdRequest {
  id: string;
  cancelReason?: string;
}
```

## סוגי תגובות

### `SponsorAdResponse`

תגובת איגוד מופלית עבור פעולות מודעות של נותנת חסות יחידה:

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

תגובת איגוד מופלית עבור רשימות מודעות חסות מעומדות:

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

## אפשרויות שאילתה

### `SponsorAdListOptions`

פרמטרי שאילתה לסינון ועימוף רשימות מודעות נותנות חסות.

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

## סוגי סטטיסטיקה

### `SponsorAdStats`

נתונים סטטיסטיים מצטברים עבור לוח המחוונים של מודעות החסות.

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

## סוגי לוח מחוונים

### `SponsorAdDashboardResponse`

תגובה משולבת ללוח המחוונים של נותני החסות של מנהל המערכת, כולל רשימה, עימוד וסטטיסטיקה.

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

## סוגים מורחבים

### `SponsorAdWithUser`

מודעת חסות מועשרת בנתוני משתמשים ובוקר, המשמשת בתצוגות פרטיות של מנהל מערכת.

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

## דוגמאות לשימוש

### יצירת מודעת חסות

```typescript
import type { CreateSponsorAdRequest } from '@/lib/types/sponsor-ad';

const request: CreateSponsorAdRequest = {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
};
```

### סינון מודעות חסות

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

### טיפול בתגובות איגודיות מופלות

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

### הצגת נתונים סטטיסטיים של לוח המחוונים

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

## הערות עיצוב

### מחזור חיים של מודעות חסות

```
pending_payment -> pending -> active -> expired
                         \-> rejected
                active -> cancelled
```

1. נותן החסות יוצר מודעה ויוזם תשלום (`pending_payment`)
2. לאחר השלמת התשלום, המודעה עוברת אל `pending` לבדיקת מנהל
3. מנהל המערכת מאשר (`active`) או דוחה (`rejected`)
4. מודעות פעילות יפוג אוטומטית כאשר `endDate` עובר
5. נותני חסות או מנהלים יכולים לבטל בכל עת

### תגובות האיגוד המופלות

הסוגים `SponsorAdResponse` ו-`SponsorAdListResponse` משתמשים באיגודים מופלים על סמך השדה `success`. זה מאפשר טיפול בשגיאות בטוח ב-TypeScript:

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

## סוגים קשורים

- [`ItemData`](./item-types.md) - הפריט הממומן (מוזכר על ידי `itemSlug`)
- [`SponsorAd`](./sponsor-ad-types.md) - סוג סכימת מסד נתונים מ-`lib/db/schema`
