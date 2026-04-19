---
id: payment-types
title: تعريفات نوع الدفع
sidebar_label: أنواع الدفع
sidebar_position: 11
---

# تعريفات نوع الدفع

**المصدر:** `lib/payment/types/payment-types.ts`، `lib/constants/payment.ts`

تعمل أنواع الدفع على تشغيل نظام الفوترة متعدد الموفرين. وهي تحدد كيفية إنشاء المدفوعات والتحقق منها وإدارتها عبر Stripe وLemonSqueezy وPolar وSolidgate.

## التعدادات

### `PaymentPlan`

مستويات الاشتراك المتاحة.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

خيارات دورة الفوترة للرسوم المتكررة.

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

يصنف الدفع على أنه لمرة واحدة أو متكررة أو مجانية.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

يتتبع دورة حياة محاولة الدفع الواحدة.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

وسائل الدفع المدعومة.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

العملات التي تقبلها المنصة.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

نوع الاتحاد لجميع معرفات مزود الدفع.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## واجهات

### `PaymentIntent`

يمثل دفعة معلقة أو مكتملة.

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

|الميدان|الوصف|
|-------|-------------|
|`id`|معرف الدفع المعين من قبل الموفر|
|`amount`|المبلغ بالسنت (على سبيل المثال، 1000 = 10.00 دولارات)|
|`currency`|رمز العملة ISO 4217|
|`clientSecret`|تم تمرير الرمز المميز إلى SDK للواجهة الأمامية للتأكيد|

### `CheckoutParams`

معلمات لبدء جلسة الخروج.

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

معلومات فواتير العميل المرفقة بالدفع.

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

بيانات الاعتماد اللازمة لتهيئة الموفر.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

تم إرجاع التكوين الآمن للواجهة الأمامية بواسطة `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الاشتراكات](./subscription-types.md) - دورة حياة الاشتراك وحالته
- [التكوين / الدفع](../configuration/Payment-config.md) - إعداد الموفر ومستويات التسعير
- [أنواع التكوين](./config-types.md) - مخطط `PaymentConfig`
