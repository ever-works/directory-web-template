---
id: payment-config
title: "تكوين المدفوعات"
sidebar_label: "المدفوعات"
sidebar_position: 12
---

# تكوين المدفوعات

يدعم القالب مزودي دفع متعددين وسير عمل فوترة مرنة. يغطي هذا المرجع كل ثابت وتعداد وخيار تكوين متعلق بالمدفوعات.

## ثوابت المدفوعات

جميع تعدادات المدفوعات والأنواع الأساسية معرفة في `lib/constants/payment.ts`. يتم الاحتفاظ بهذا الملف منفصلاً عن وحدة التكوين الرئيسية عمداً حتى يمكن استيراده في النصوص البرمجية التي تعمل خارج بيئة تشغيل Next.js (عمليات الترحيل، والبيانات الأولية، وأدوات CLI).

### PaymentFlow

يحدد متى يتم تحصيل الدفع بالنسبة لعملية الإرسال.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| القيمة | الوصف |
|--------|-------|
| `pay_at_start` | يدفع المستخدم قبل الإرسال؛ يتم نشر العنصر فوراً |
| `pay_at_end` | يرسل المستخدم أولاً؛ يتم تحصيل الدفع بعد موافقة المشرف |

### PaymentStatus

يتتبع حالة محاولة الدفع.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

خيارات تكرار الفوترة.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

مستويات الاشتراك المتاحة.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

بوابات الدفع المدعومة.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## مخطط تكوين المدفوعات

معرف في `lib/config/schemas/payment.schema.ts` ويتم التحقق منه عند بدء التشغيل باستخدام Zod.

### أسعار المنتجات (قيم العرض)

```typescript
pricing: {
  free: number;       // الافتراضي: 0
  standard: number;   // الافتراضي: 10
  premium: number;    // الافتراضي: 20
}
```

| متغير البيئة | الحقل | الافتراضي |
|-------------|-------|-----------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### تكوين التجربة

| متغير البيئة | الحقل | الوصف |
|-------------|-------|-------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | معرف السعر للتجربة القياسية |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | معرف السعر للتجربة المميزة |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | تمكين مبالغ التجربة (`true`/`false`) |

## إعداد مزود الخدمة

### Stripe

يتم تمكينه تلقائياً عند وجود كل من `secretKey` و`publishableKey`.

| متغير البيئة | مطلوب | الوصف |
|-------------|-------|-------|
| `STRIPE_SECRET_KEY` | نعم | مفتاح API من جانب الخادم |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | نعم | المفتاح القابل للنشر من جانب العميل |
| `STRIPE_WEBHOOK_SECRET` | موصى به | التحقق من توقيع Webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | لا | معرف السعر للخطة المجانية |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | لا | معرف السعر للخطة القياسية |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | لا | معرف السعر للخطة المميزة |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | لا | اضبط `true` لجلب الأسعار من Stripe API |

### LemonSqueezy

يتم تمكينه تلقائياً عند وجود كل من `apiKey` و`storeId`.

| متغير البيئة | مطلوب | الوصف |
|-------------|-------|-------|
| `LEMONSQUEEZY_API_KEY` | نعم | مفتاح API من لوحة تحكم LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | نعم | معرف متجرك |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | موصى به | التحقق من توقيع Webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | لا | تجاوز عنوان URL لنقطة نهاية Webhook |
| `LEMONSQUEEZY_TEST_MODE` | لا | اضبط `true` لوضع الاختبار |
| `LEMONSQUEEZY_VARIANT_ID` | لا | معرف المتغير الافتراضي |

### Polar

يتم تمكينه تلقائياً عند وجود كل من `accessToken` و`organizationId`.

| متغير البيئة | مطلوب | الوصف |
|-------------|-------|-------|
| `POLAR_ACCESS_TOKEN` | نعم | رمز الوصول إلى API |
| `POLAR_ORGANIZATION_ID` | نعم | معرف المؤسسة |
| `POLAR_WEBHOOK_SECRET` | موصى به | التحقق من توقيع Webhook |
| `POLAR_SANDBOX` | لا | اضبط `false` للإنتاج (الافتراضي: `true`) |
| `POLAR_API_URL` | لا | تجاوز عنوان URL الأساسي لـ API |

### Solidgate

يتطلب تكويناً يدوياً لمتغيرات البيئة.

| متغير البيئة | مطلوب | الوصف |
|-------------|-------|-------|
| `SOLIDGATE_API_KEY` | نعم | مفتاح API |
| `SOLIDGATE_SECRET_KEY` | نعم | المفتاح السري للتوقيع |
| `SOLIDGATE_WEBHOOK_SECRET` | نعم | التحقق من Webhook |
| `SOLIDGATE_MERCHANT_ID` | نعم | معرف التاجر |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | لا | المفتاح من جانب العميل |

## الفوترة متعددة العملات

يدعم كل مزود خدمة التسعير لكل عملة عبر وحدات تكوين الفوترة في `lib/config/billing/`.

### أنواع تكوين الفوترة

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // معرف السعر/المتغير للفوترة الشهرية
  yearly?: string;    // معرف السعر/المتغير للفوترة السنوية
  setupFee?: string;  // معرف سعر رسوم الإعداد الاختياري
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // رمز ISO 4217 (مثل 'USD')
  symbol?: string;    // رمز العرض (مثل '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### العملات المدعومة

تسرد مصفوفة `SUPPORTED_CURRENCIES` في `lib/config/billing/types.ts` جميع رموز ISO 4217 الـ 32 المقبولة من قبل النظام (USD، EUR، GBP، JPY، CNY، CAD، AUD، CHF والمزيد).

### وظائف حل الأسعار

يصدر كل مزود خدمة وظيفة تكوين الأسعار:

| مزود الخدمة | الوظيفة | المصدر |
|------------|---------|--------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

تعود جميع الوظائف إلى USD إذا لم تكن العملة المطلوبة مُكوَّنة.

## تكوين تدفق الدفع

معرف في `lib/config/payment-flows.ts`، تُكوِّن مصفوفة `PAYMENT_FLOWS` خيارَي تدفق الدفع مع خصائص واجهة المستخدم الخاصة بهما:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // اسم أيقونة Lucide
  color: string;           // فئات تدرج Tailwind
  features: string[];      // نقاط ميزات
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // تسمية شارة اختيارية
  isDefault?: boolean;     // هل هذا التدفق الافتراضي
}
```

الوظائف المساعدة:
- `getDefaultPaymentFlow()` -- تُرجع قيمة `PaymentFlow` الافتراضية
- `getPaymentFlowConfig(flowId)` -- تُرجع `PaymentFlowConfig` لتدفق معين

## مدير مزودي الدفع

توفر فئة `PaymentProviderManager` في `lib/payment/config/payment-provider-manager.ts` وصولاً فردياً إلى نسخ مزودي الخدمة:

```typescript
// الحصول على مزود خدمة محدد
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// أو استخدام الوظيفة العامة
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## الصفحات ذات الصلة

- [أنواع المدفوعات](../types/payment-types.md) -- تعريفات الأنواع لعمليات الدفع
- [أنواع الاشتراكات](../types/subscription-types.md) -- أنواع دورة حياة الاشتراك
- [مرجع البيئة](./environment-reference.md) -- قائمة كاملة بمتغيرات البيئة
