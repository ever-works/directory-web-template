---
id: subscription-types
title: تعريفات نوع الاشتراك
sidebar_label: أنواع الاشتراك
sidebar_position: 12
---

# تعريفات نوع الاشتراك

**المصدر:** `lib/payment/types/payment-types.ts`، `lib/db/schema.ts`

تمثل أنواع الاشتراك نموذجًا لدورة الحياة الكاملة للفواتير المتكررة - بدءًا من إنشاء النسخة التجريبية وحتى الإلغاء والتجديد.

## التعدادات

### `SubscriptionStatus` (على مستوى الموفر)

قيم الحالة التي يتم إرجاعها بواسطة SDK لموفر الدفع.

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

|القيمة|الوصف|
|-------|-------------|
|`incomplete`|الدفعة الأولية لا تزال معلقة|
|`trialing`|العميل ضمن الفترة التجريبية|
|`active`|الاشتراك نشط ومدفوع|
|`past_due`|فشل الدفع ولكن لم يتم إلغاء الاشتراك بعد|
|`canceled`|تم إلغاء الاشتراك|
|`unpaid`|حالات فشل الدفع المتعددة؛ تم تعليق الاشتراك|

### `SubscriptionStatus` (على مستوى قاعدة البيانات)

قيم الحالة المخزنة في الجدول `subscriptions`.

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

يميز كيفية بدء الاشتراك.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## واجهات

### `SubscriptionInfo`

تم إرجاع بيانات الاشتراك الطبيعية من أي مزود.

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

|الميدان|الوصف|
|-------|-------------|
|`id`|معرف اشتراك المزود|
|`customerId`|معرف عميل المزود|
|`currentPeriodEnd`|الطابع الزمني لنظام Unix عند انتهاء فترة الفاتورة الحالية|
|`cancelAtPeriodEnd`|إذا `true`، فسيتم إلغاء الاشتراك في نهاية الفترة بدلاً من إلغاءه فورًا|
|`trialEnd`|الطابع الزمني لنظام Unix عند انتهاء الفترة التجريبية|

### `CreateSubscriptionParams`

معلمات إنشاء اشتراك جديد.

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

معلمات تعديل الاشتراك الحالي.

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

معلومات التسعير المنسقة للعرض.

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

التسعير المحلي لبلد معين.

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

## مخطط قاعدة البيانات

يقوم الجدول `subscriptions` بتخزين سجل الاشتراك:

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

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الدفع](./Payment-types.md) - أهداف الدفع، معلمات الدفع
- [أنواع المصادقة](./auth-types.md) - أنواع المستخدمين والجلسات المرتبطة بالاشتراكات
