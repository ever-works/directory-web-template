---
id: subscription-types
title: הגדרות סוג מנוי
sidebar_label: סוגי מנויים
sidebar_position: 12
---

# הגדרות סוג מנוי

**מקור:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

סוגי המנויים מדגמים את מחזור החיים המלא של חיוב חוזר - מיצירת ניסיון ועד לביטול וחידוש.

## תקצירים

### `SubscriptionStatus` (רמת הספק)

ערכי סטטוס שהוחזרו על ידי ה-SDK של ספק התשלומים.

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}
```

|ערך|תיאור|
|-------|-------------|
|`incomplete`|התשלום הראשוני עדיין בהמתנה|
|`trialing`|הלקוח נמצא בתקופת הניסיון שלו|
|`active`|המנוי פעיל ובתשלום|
|`past_due`|התשלום נכשל אך המנוי עדיין לא בוטל|
|`canceled`|המנוי בוטל|
|`unpaid`|כשלים בתשלום מרובים; המנוי מושעה|

### `SubscriptionStatus` (רמת מסד נתונים)

ערכי סטטוס המאוחסנים בטבלה `subscriptions`.

```typescript
const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  PAUSED: 'paused',
} as const;

type SubscriptionStatusValues =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
```

### `SubscriptionPlanType`

מבדיל איך התחיל מנוי.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## ממשקים

### `SubscriptionInfo`

נתוני מנוי מנורמלים שהוחזרו מכל ספק.

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;  // Unix timestamp
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: Record<string, any>;
}
```

|שדה|תיאור|
|-------|-------------|
|`id`|מזהה מנוי ספק|
|`customerId`|מזהה לקוח של ספק|
|`currentPeriodEnd`|חותמת זמן של Unix כאשר תקופת החיוב הנוכחית מסתיימת|
|`cancelAtPeriodEnd`|אם `true`, המנוי מתבטל בתום התקופה במקום באופן מיידי|
|`trialEnd`|חותמת זמן של יוניקס כאשר תום תקופת הניסיון|

### `CreateSubscriptionParams`

פרמטרים ליצירת מנוי חדש.

```typescript
interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

### `UpdateSubscriptionParams`

פרמטרים לשינוי מנוי קיים.

```typescript
interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  metadata?: Record<string, any>;
}
```

### `PriceDetails`

מידע תמחור מעוצב לתצוגה.

```typescript
interface PriceDetails {
  amount: number;      // Amount in cents
  formatted: string;   // e.g., "$9.99/mo"
}

interface SubscriptionDetails extends OneTimeDetails {
  weekly?: PriceDetails;
}

interface OneTimeDetails extends PriceDetails {
  collect_tax: boolean;
}
```

### `CountryPricing`

תמחור מקומי עבור מדינה ספציפית.

```typescript
interface CountryPricing {
  country: string;
  currency: string;
  symbol: string;
  subscription: SubscriptionDetails;
  oneTime: OneTimeDetails;
  free: OneTimeDetails;
}
```

## סכמת מסד נתונים

הטבלה `subscriptions` מאחסנת את רשומת המנוי:

```typescript
// Key columns from lib/db/schema.ts
{
  id: text,
  userId: text,                // FK -> users.id
  planId: text,                // 'free' | 'standard' | 'premium'
  status: text,                // 'active' | 'cancelled' | 'expired' | 'pending' | 'paused'
  startDate: timestamp,
  endDate: timestamp,
  paymentProvider: text,       // 'stripe' | 'lemonsqueezy' | 'polar'
  subscriptionId: text,        // Provider subscription ID
  customerId: text,            // Provider customer ID
  autoRenewal: boolean,
  cancelAtPeriodEnd: boolean,
  trialStart: timestamp,
  trialEnd: timestamp,
}
```

## דוגמה לשימוש

```typescript
import type {
  CreateSubscriptionParams,
  SubscriptionInfo,
} from '@/lib/payment/types/payment-types';

const params: CreateSubscriptionParams = {
  customerId: 'cus_abc123',
  priceId: 'price_monthly_premium',
  trialPeriodDays: 7,
};

// After creation
const sub: SubscriptionInfo = await provider.createSubscription(params);
console.log(sub.status); // 'trialing'
```

## סוגים קשורים

- [סוגי תשלום](./payment-types.md) -- כוונות תשלום, פרמטרים לתשלום
- [Auth Types](./auth-types.md) -- סוגי משתמשים והפעלה מקושרים למנויים
