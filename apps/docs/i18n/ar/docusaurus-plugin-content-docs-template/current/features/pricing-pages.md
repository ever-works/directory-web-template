---
id: pricing-pages
title: صفحات التسعير والخروج
sidebar_label: صفحات التسعير
sidebar_position: 19
---

# صفحات التسعير والخروج

يتضمن قالب Ever Works نظام صفحات تسعير كامل الميزات مع دعم الخروج من موفرين متعددين (Stripe، LemonSqueezy، Polar)، وتبديل الفاصل الزمني للفوترة، والتسعير الديناميكي من منتجات Stripe، وتنسيق العملة، وبطاقات مقارنة الخطط، وأقسام إعلانات الجهة الراعية، وتدفقات الدفع المضمنة أو القائمة على إعادة التوجيه.

## نظرة عامة على الهندسة المعمارية

| مكون | المسار | الغرض |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | تكوينات الخطة وقوائم الميزات ورسائل نص الإجراء |
| `usePricingSection` | `hooks/use-pricing-section.ts` | ينسق جميع حالات التسعير والخروج ومنطق الدفع |
| 4ـ | 5 ــ | واجهة مستخدم كاملة لصفحة التسعير مع بطاقات الخطة وتدفق الخروج |
| 6ـ | `components/pricing/plan-card.tsx` | بطاقة عرض الخطة الفردية |
| 8ـ | `components/payment/stripe-payment-modal.tsx` | نموذج الدفع المضمن مشروط |
| `PaymentFlowSelectorModal` | `components/payment/` | طريقة اختيار التدفق (الدفع الآن مقابل الدفع في النهاية) |

## تكوين الخطة

يدعم النظام ثلاثة مستويات للخطة تم تكوينها من خلال 12:

| خطة | نص الإجراء (تسجيل الدخول) | نص الإجراء (لم يتم تسجيل الدخول) |
|---|---|---|
| 13 ــ | "ابدأ مجانًا" | "أرسل مجانا" |
| 14 ــ | "الترقية إلى المعيار" | "اشترك الآن" |
| `premium` | "انتقل إلى الإصدار المميز" | "اشترك الآن" |

### واجهة تكوين الخطة

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### قوائم الميزات

تحتوي كل خطة على قائمة ميزات مكتوبة:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| خطة | عدد الميزات | الادراج البارزة |
|---|---|---|
| مجاني | 9 مميزات | إرسال المنتج، الوصف الأساسي، صورة واحدة، رابط الموقع |
| قياسي | 9 مميزات | جميع الميزات المجانية، شارة تم التحقق منها، مراجعة الأولوية، الإحصائيات الشهرية |
| بريميوم | 11 ميزة | جميع الميزات القياسية، والموقع المدعوم، والصفحة الرئيسية المميزة، ومعرض غير محدود |

## الخطاف

يقوم هذا الخطاف الشامل بتنسيق منطق صفحة التسعير بالكامل:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### الدولة

| عقار | اكتب | الوصف |
|---|---|---|
| `showSelector` | `boolean` | ما إذا كان محدد تدفق الدفع مرئيًا أم لا |
| `billingInterval` | `PaymentInterval` | الفاصل الزمني الحالي للفوترة (شهري / سنوي) |
| 4ـ | 5 ــ | معرف الخطة قيد المعالجة حاليًا |
| 6ـ | `PaymentPlan \| null` | الخطة المحددة حاليا |
| 8ـ | `PaymentFlow` | نوع تدفق الدفع (الدفع الآن مقابل الدفع في النهاية) |
| `isButton` | `boolean` | ما إذا كان التدفق المحدد يستخدم وضع الزر |

### الإجراءات

| الطريقة | الوصف |
|---|---|
| ‹‹١٢› | التبديل بين الفواتير الشهرية والسنوية |
| 13 ــ | حدد خطة وأخطر الوالدين عبر رد الاتصال |
| 14 ــ | بدء الخروج لتكوين خطة معينة |
| `calculatePrice(plan)` | حساب السعر على أساس الفاصل الزمني للفوترة والخصم السنوي |
| 16 ــ | احصل على نص التوفير السنوي (على سبيل المثال، "وفر 24 دولارًا سنويًا") |
| `cancelCurrentProcess()` | إلغاء عملية الدفع الجارية وإعادة تعيين الحالة |
| 18 ــ | تنسيق المبلغ برمز العملة |

### حساب السعر

يحسب الخطاف الأسعار بناءً على الفاصل الزمني للفوترة:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## مقدمي الدفع

يدعم النظام ثلاثة موفري دفع، يتم تحديدهم حسب التكوين أو التفضيل لكل مستخدم:

| مقدم | هوك الخروج | الدعم المضمن |
|---|---|---|
| شريط | `useCreateCheckoutSession` | نعم (SetupIntent) |
| ليمونسكويزي | `useCheckoutButton` | نعم (تراكب) |
| القطبية | `usePolarCheckout` | نعم (عنوان URL مضمن) |

### اختيار المزود

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### تدفق الخروج

عندما ينقر المستخدم على زر الإجراء الخاص بالخطة:

1. تحقق من تسجيل دخول المستخدم (افتح نموذج تسجيل الدخول إذا لم يكن كذلك)
2. قم بإلغاء أي عملية دفع موجودة
3. تحديد مزود الدفع
4. احصل على معرف السعر المدرك للعملة أو معرف المتغير
5. افتح نموذج الدفع المضمن أو قم بإعادة التوجيه إلى الخروج من المزود

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## التسعير الديناميكي (الشريط)

عندما يكون Stripe هو المزود النشط ويتم تمكين التسعير الديناميكي، يقوم الخطاف بجلب بيانات المنتج المباشرة:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## دعم العملة

يدعم نظام التسعير عرض العملات المتعددة:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

يتم حل معرفات المتغيرات المدركة للعملة من خلال وظائف التكوين الخاصة بالموفر:

| مقدم | وظيفة التكوين |
|---|---|
| ليمونسكويزي | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| القطبية | `getPolarPriceConfig(planName, currency, interval)` |

## نموذج الدفع النموذجي

يدعم نموذج الدفع المضمن جميع مقدمي الخدمة الثلاثة:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## مكون قسم التسعير

يعرض المكون `PricingSection` صفحة التسعير الكاملة:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### الميزات المرئية

| ميزة | الوصف |
|---|---|
| تبديل الفاصل الزمني للفوترة | شريط تمرير متحرك بين شهري وسنوي |
| شبكة بطاقات الخطة | تخطيط سريع الاستجابة من عمود واحد (الجوال) إلى 3 أعمدة (سطح المكتب) |
| شارة شعبية | تم وضع علامة "شائعة" على الخطة القياسية مع تأثيرات التوهج |
| شارات التوفير | الحبوب الخضراء تظهر التوفير السنوي عند الاقتضاء |
| مؤشرات الثقة | أيقونات "لا توجد رسوم مخفية"، "التفعيل الفوري"، "الدعم المميز" |
| قسم إعلانات الرعاة | دوائر رادارية متحركة مع تسعير التنسيب المدعوم |
| متابعة القسم | تظهر بعد اختيار الخطة مع عبارة تحث المستخدم على اتخاذ إجراء |

### العرض الشرطي

يعرض المكون بشكل مشروط الخطط المدفوعة بناءً على توفر الدفع:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## التدويل

تستخدم جميع السلاسل التي تواجه المستخدم `next-intl` مع مجالي أسماء ترجمة:

| مساحة الاسم | الاستخدام |
|---|---|
| `pricing` | أسماء الخطة، مميزاتها، محتوى الصفحة، قسم الراعي |
| `billing` | التسميات الشهرية/السنوية وحالات المعالجة ورسائل الخطأ |

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| ميزات التسعير هوك | `hooks/use-pricing-features.ts` |
| ربط قسم التسعير | 4ـ |
| مكون قسم التسعير | 5 ــ |
| مكون بطاقة الخطة | 6ـ |
| نموذج الدفع مشروط | `components/payment/stripe-payment-modal.tsx` |
| ثوابت الدفع | 8ـ |
| نوع تكوين التسعير | `lib/content.ts` |
