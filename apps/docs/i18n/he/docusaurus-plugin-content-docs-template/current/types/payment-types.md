---
id: payment-types
title: הגדרות סוג תשלום
sidebar_label: סוגי תשלום
sidebar_position: 11
---

# הגדרות סוג תשלום

**מקור:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

סוגי תשלום מחזקים את מערכת החיוב מרובת הספקים. הם מגדירים כיצד תשלומים נוצרים, מאומתים ומנוהלים על פני Stripe, LemonSqueezy, Polar ו-Solidgate.

## תקצירים

### `PaymentPlan`

שכבות מנוי זמינות.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

אפשרויות מחזור חיובים עבור חיובים חוזרים.

```typescript
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### `PaymentType`

מסווג תשלום כחד פעמי, חוזר או חינם.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

עוקב אחר מחזור החיים של ניסיון תשלום בודד.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

אמצעי תשלום נתמכים.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

מטבעות המתקבלים על ידי הפלטפורמה.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

סוג איחוד של כל מזהי ספקי התשלום.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## ממשקים

### `PaymentIntent`

מייצג תשלום בהמתנה או שהושלם.

```typescript
interface PaymentIntent {
  id: string;
  amount: number;         // Amount in smallest currency unit (cents)
  currency: string;
  status: string;
  clientSecret?: string;  // For client-side confirmation
  customerId?: string;
}
```

|שדה|תיאור|
|-------|-------------|
|`id`|מזהה תשלום שהוקצה לספק|
|`amount`|סכום בסנטים (לדוגמה, 1000 = $10.00)|
|`currency`|קוד מטבע ISO 4217|
|`clientSecret`|האסימון הועבר ל-SDK הקדמי לאישור|

### `CheckoutParams`

פרמטרים לתחילת הפעלת קופה.

```typescript
interface CheckoutParams {
  priceId?: string;
  variantId?: number;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
  dark?: boolean;
}
```

### `BillingDetails`

פרטי חיוב לקוח מצורפים לתשלום.

```typescript
interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
```

### `PaymentProviderConfig`

אישורים הדרושים לאתחול ספק.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

תצורה בטוחה בחזית הוחזרה על ידי `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## דוגמה לשימוש

```typescript
import { PaymentPlan, PaymentType } from '@/lib/constants/payment';
import type { CheckoutParams } from '@/lib/payment/types/payment-types';

const params: CheckoutParams = {
  priceId: 'price_abc123',
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  metadata: { plan: PaymentPlan.PREMIUM },
};
```

## סוגים קשורים

- [סוגי מנוי](./subscription-types.md) -- מחזור חיים וסטטוס של מנוי
- [תצורה / תשלום](../configuration/payment-config.md) -- הגדרות ספק ותמחור
- [Config Types](./config-types.md) -- `PaymentConfig` סכימה
