---
id: configuration
title: تكوين الدفع
sidebar_label: دليل التكوين
sidebar_position: 6
description: دليل شامل لتكوين موفري الدفع (Stripe وLemonSqueezy وPolar وSolidgate) مع دعم متعدد العملات
keywords: [دفع, تكوين, stripe, lemonsqueezy, polar, solidgate, متعدد العملات]
---

# تكوين الدفع

يشرح هذا الدليل كيفية تكوين موفري الدفع المختلفين المدعومين من التطبيق.

## جدول المحتويات

- [نظرة عامة](#overview)
- [الموفرون المدعومون](#supported-providers)
- [التكوين المشترك](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [متعدد العملات](#multi-currency)
- [فترات التجربة ورسوم الإعداد](#trials-and-setup-fees)
- [اختيار الموفر](#provider-selection)
- [استكشاف الأخطاء وإصلاحها](#troubleshooting)

---

## نظرة عامة

يدعم التطبيق موفري دفع متعددين للاشتراكات:

| الموفر       | النوع   | متعدد العملات | فترات التجربة |
|-------------|---------|---------------|---------------|
| Stripe      | اشتراك  | ✅ نعم        | ✅ نعم        |
| LemonSqueezy | اشتراك | ✅ نعم        | ✅ نعم        |
| Polar       | اشتراك  | ❌ لا         | ❌ لا         |
| Solidgate   | اشتراك  | ⚠️ جزئي      | ❌ لا         |

### الخطط المتاحة

- **مجاني** - مجاني، ميزات أساسية
- **قياسي** - خطة متوسطة بمزيد من الظهور
- **مميز** - خطة كاملة بجميع الميزات

---

## الموفرون المدعومون

### البنية

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # الصادرات
│       ├── types.ts              # الأنواع المشتركة
│       ├── stripe.config.ts      # تكوين Stripe متعدد العملات
│       ├── lemonsqueezy.config.ts # تكوين LemonSqueezy متعدد العملات
│       └── solidgate.config.ts   # تكوين Solidgate (قيد التطوير)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (قيد التطوير)
└── utils/
    └── payment-provider.ts       # اختيار الموفر
```

---

## التكوين المشترك

### الأسعار المعروضة (لواجهة المستخدم)

تحدد هذه المتغيرات الأسعار المعروضة في واجهة المستخدم:

```bash
# الأسعار بالدولار (أو العملة الرئيسية) - للعرض فقط
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### فترات التجربة (trial)

```bash
# معرفات مبالغ التجربة (الرسوم الأولية خلال فترة التجربة)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# تمكين/تعطيل فترات التجربة بالمبلغ المصرح به
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### المتطلبات الأساسية

1. إنشاء حساب في [Stripe Dashboard](https://dashboard.stripe.com)
2. استرداد مفاتيح API (الإعدادات → مفاتيح API)
3. تكوين webhook

### متغيرات البيئة الأساسية

```bash
# ============================================
# STRIPE - التكوين الأساسي
# ============================================

# مفاتيح API (مطلوب)
STRIPE_SECRET_KEY=sk_live_xxx           # المفتاح السري (الخادم)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # المفتاح القابل للنشر
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # المفتاح القابل للنشر (العميل)

# Webhook (مطلوب للأحداث)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### تكوين المنتج (القديم - USD فقط)

```bash
# أسعار بسيطة (للتوافق مع الإصدارات السابقة، USD فقط)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### التكوين متعدد العملات (موصى به)

#### الخطة القياسية

```bash
# ============================================
# STRIPE الخطة القياسية
# ============================================

NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# الأسعار الشهرية حسب العملة
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# الأسعار السنوية حسب العملة
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# رسوم الإعداد / مبالغ التجربة حسب العملة
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### الخطة المميزة

```bash
# ============================================
# STRIPE الخطة المميزة
# ============================================

NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### إنشاء الأسعار في Stripe

1. انتقل إلى **المنتجات** → أنشئ منتجًا
2. أضف أسعارًا لكل عملة:
   - انقر على "إضافة سعر آخر"
   - اختر العملة (EUR وGBP وCAD)
   - اضبط المبلغ المكافئ
3. انسخ كل `price_xxx` إلى المتغيرات المقابلة

### Stripe Webhook

قم بتكوين webhook في Stripe Dashboard:

- **الرابط**: `https://نطاقك.com/api/stripe/webhook`
- **الأحداث للاستماع**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### المتطلبات الأساسية

1. إنشاء حساب في [LemonSqueezy](https://lemonsqueezy.com)
2. إنشاء متجر
3. إنشاء منتجات ومتغيرات

### متغيرات البيئة

```bash
# ============================================
# LEMONSQUEEZY - التكوين الأساسي
# ============================================

LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://نطاقك.com/api/lemonsqueezy/webhook
LEMONSQUEEZY_TEST_MODE=false
```

### تكوين المتغيرات (القديم)

```bash
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### التكوين متعدد العملات

```bash
# الخطة القياسية
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx

# الخطة المميزة
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### المتطلبات الأساسية

1. إنشاء حساب في [Polar](https://polar.sh)
2. إنشاء منظمة
3. إنشاء خطط اشتراك

### متغيرات البيئة

```bash
# ============================================
# POLAR - التكوين
# ============================================

POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx
POLAR_WEBHOOK_SECRET=xxx
POLAR_SANDBOX=true
POLAR_API_URL=https://api.polar.sh
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning قيد التطوير
تكامل Solidgate قيد التطوير حاليًا. قد لا تكون بعض الميزات تعمل بالكامل بعد.
:::

### متغيرات البيئة

```bash
# ============================================
# SOLIDGATE - التكوين (قيد التطوير)
# ============================================

SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx
SOLIDGATE_WEBHOOK_SECRET=xxx
SOLIDGATE_ENVIRONMENT=test

NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### القيود الحالية

| الميزة          | الحالة        | الملاحظات                    |
|-----------------|---------------|------------------------------|
| المدفوعات الأساسية | ✅ مطبق     | مدفوعات لمرة واحدة واشتراك  |
| متعدد العملات   | ⚠️ جزئي      | USD فقط حاليًا              |
| فترات التجربة   | ❌ لم يتم بعد | مخطط في إصدار مستقبلي       |
| Webhooks        | ⚠️ جزئي      | الأحداث الأساسية فقط        |
| المستردات        | ❌ لم يتم بعد | مخطط في إصدار مستقبلي       |

---

## متعدد العملات

### العملات المدعومة

| الرمز | العملة          | الرمز |
|------|-----------------|-------|
| USD  | الدولار الأمريكي | $    |
| EUR  | اليورو          | €     |
| GBP  | الجنيه الإسترليني | £   |
| CAD  | الدولار الكندي  | CA$   |

### كيف يعمل

1. يتم اكتشاف عملة المستخدم تلقائيًا (الموقع الجغرافي والتفضيلات)
2. يختار النظام `price_id` المقابل للعملة
3. إذا لم تكن العملة مكوّنة، يتم الرجوع إلى USD

### مثال على الاستخدام

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      اشترك مقابل {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## فترات التجربة ورسوم الإعداد

### المفهوم

- **فترة التجربة**: فترة اختبار مجانية أو مخفضة
- **رسوم الإعداد**: رسوم أولية تُفرض في بداية فترة التجربة

### التكوين

```bash
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### مهم: اتساق العملة

:::caution
يجب أن تكون جميع الأسعار في جلسة الدفع بنفس العملة.
:::

```bash
# ❌ خطأ: رسوم الإعداد بالدولار الأمريكي + السعر الرئيسي بالجنيه الإسترليني
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx

# ✅ صحيح: كلاهما بالجنيه الإسترليني
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
```

---

## اختيار الموفر

### الأولوية

1. **الموفر المختار من قبل المستخدم** (الإعدادات)
2. **الموفر الافتراضي** (التكوين)
3. **الاحتياطي**: Stripe

### تكوين الموفر الافتراضي

```typescript
pricing: {
  provider: PaymentProvider.STRIPE  // أو LEMONSQUEEZY أو POLAR
}
```

### مثال على الاستخدام

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## استكشاف الأخطاء وإصلاحها

### خطأ: تعارض العملات

```
Error: This price has currency=gbp, but other items use currency=usd
```

**السبب**: السعر الرئيسي ورسوم الإعداد بعملات مختلفة.

**الحل**: أنشئ رسوم إعداد لكل عملة مدعومة.

### خطأ: معرف السعر غير صالح

```
Error: Invalid price ID
```

**السبب**: `price_id` غير موجود أو غير مكوّن.

**الحل**: تحقق من أن متغير البيئة يحتوي على معرّف صالح.

### Webhook لا يتلقى الأحداث

1. تحقق من رابط webhook في لوحة تحكم الموفر
2. تأكد من صحة `WEBHOOK_SECRET`
3. اختبر باستخدام أدوات التصحيح الخاصة بالموفر

### الأسعار لا تُعرض بشكل صحيح

1. تحقق من `NEXT_PUBLIC_PRODUCT_PRICE_*` للقيم المعروضة
2. تأكد من أن قيم `price_id` تقابل العملات الصحيحة
3. أعد تشغيل خادم التطوير بعد تعديل ملفات `.env`
