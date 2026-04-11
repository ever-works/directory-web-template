---
id: multi-currency
title: التكامل متعدد العملات
sidebar_label: متعدد العملات
sidebar_position: 5
---

# دليل التكامل متعدد العملات

يشرح هذا المستند كيفية دمج النظام متعدد العملات في التطبيق وكيفية عمله مع موفري خدمات الدفع (Stripe وLemonSqueezy وPolar).

##الهندسة المعمارية

يعمل النظام متعدد العملات على مستويات متعددة:

1. **التكوين الأساسي** ( `lib/types.ts` ): التكوين الافتراضي مع دعم متعدد العملات
2. **ConfigProvider** ( `app/[locale]/config.tsx` ): يثري التكوين بعملة المستخدم
3. **خطافات الدفع**: استخدم تكوينات متعددة العملات للحصول على معرفات الأسعار الصحيحة

## تدفق البيانات

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## الملفات المعدلة

### 1. 0
- يستخدم `useCurrencyContext()` للحصول على عملة المستخدم
- يقوم تلقائيًا بإنشاء تكوين تسعير بناءً على العملة إذا لم يتم توفير التكوين
- يستخدم `getDefaultPricingConfigWithCurrency()` لإنشاء تكوين متعدد العملات

### 2. 3
- يستخدم `useCurrencyContext()` للحصول على العملة
- المكالمات `getStripePriceConfig()` للحصول على معرف السعر الصحيح بناءً على العملة
- يعود إلى `plan.stripePriceId` إذا لم يكن التكوين متعدد العملات متاحًا

### 3. 7
- يستخدم `useCurrencyContext()` للحصول على العملة
- يدعو 9 إلى LemonSqueezy
- يستخدم معرفات الأسعار على أساس العملة في وقت الخروج

## الاستخدام

### للمطورين

النظام يعمل تلقائيا. ليست هناك حاجة لأي تعديلات في المكونات الموجودة.

**مثال الاستخدام في المكون:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### لخطافات الخروج

تستخدم خطافات الخروج تلقائيًا تكوينات متعددة العملات:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## تكوين متغيرات البيئة

لكي يعمل النظام، يجب عليك تكوين متغيرات البيئة لكل عملة في:

- 0: 1 المتغيرات
- 2: 3 المتغيرات

**مثال للشريط:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## العملات المدعومة

يتم تعريف العملات المدعومة في `lib/config/billing/types.ts` :

- الدولار الأمريكي، واليورو، والجنيه الاسترليني، والدولار الكندي (تم تكوينه في تكوينات الفوترة)
- عملات ISO 4217 الأخرى (الرجوع إلى الدولار الأمريكي)

##التراجع

إذا كانت العملة غير مدعومة أو إذا لم تكن التكوينات متعددة العملات متاحة:

1. يستخدم النظام `plan.stripePriceId` / `plan.lemonVariantId` (تكوين ثابت)
2. العملة الافتراضية هي الدولار الأمريكي
3. الرمز الافتراضي هو $

## الاختبار

لاختبار النظام متعدد العملات:

1. قم بتغيير عملة المستخدم عبر `/api/user/currency` 2. تأكد من أن معرفات الأسعار تتغير وفقًا للعملة
3. اختبار الخروج بعملات مختلفة

##ملاحظات هامة

- يتم حل معرفات الأسعار **في وقت الخروج**، وليس في وقت العرض
- تكوين التسعير في `content/config.yml` له الأولوية على التكوين الافتراضي
- يتم استخدام التكوينات متعددة العملات فقط في حالة تكوين متغيرات البيئة

## التكامل مع مقدمي خدمات الدفع

يعمل النظام متعدد العملات بسلاسة مع جميع مقدمي خدمات الدفع:

- **الشريط**: يستخدم `getStripePriceConfig()` للحصول على معرفات الأسعار الخاصة بالعملة
- **LemonSqueezy**: يستخدم 6 للحصول على معرفات متغيرة خاصة بالعملة
- **Polar**: يدعم العملات المتعددة من خلال تكوين المنتج

للحصول على التكوين التفصيلي الخاص بالموفر، راجع:
- [تكوين الشريط](./شريط)
- [تكوين LemonSqueezy](./lemonsqueezy)
- [التكوين القطبي](./polar)
