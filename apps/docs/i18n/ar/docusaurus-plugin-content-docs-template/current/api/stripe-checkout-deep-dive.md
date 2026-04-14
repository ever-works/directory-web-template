---
id: stripe-checkout-deep-dive
title: شريط الخروج العميق الغوص
sidebar_label: الخروج الشريط
sidebar_position: 1
---

# شريط الخروج العميق الغوص

تغطي هذه الصفحة تدفق الخروج الكامل من Stripe، بما في ذلك إنشاء الجلسة، وحل معرف السعر، ومعالجة العملة، وعناوين URL لإعادة التوجيه، وتدفقات النجاح/الإلغاء، ونشر البيانات التعريفية.

## نظرة عامة

يوفر تكامل Stripe Checkout واجهة برمجة التطبيقات (API) من جانب الخادم التي تنشئ جلسات Stripe Checkout لكل من الدفعات والاشتراكات لمرة واحدة. يقوم التدفق بمصادقة المستخدم، وحل عميل Stripe أو إنشائه، وإنشاء عناصر سطرية مع دعم تجريبي اختياري، وإرجاع عنوان URL للدفع مستضاف.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/stripe/checkout`|الجلسة مطلوبة|إنشاء جلسة الخروج الجديدة|
|`GET`|`/api/stripe/checkout`|الجلسة مطلوبة|استرداد جلسة الخروج الموجودة|

## إنشاء جلسة الخروج (POST)

### هيئة الطلب

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### طلب مثال

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### استجابة النجاح (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## تعيين الوضع

تقوم واجهة برمجة التطبيقات بتعيين الأوضاع الواردة لنوع Stripe المتوقع `Mode`:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` يعين وضع Stripe `payment`
- `subscription` يعين وضع Stripe `subscription`
- يتم تعيين أي قيمة أخرى إلى الوضع `setup`

## قرار العملاء

قبل إنشاء جلسة الدفع، تقوم واجهة برمجة التطبيقات (API) بحل أو إنشاء عميل Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

تتبع الطريقة `getCustomerId` حلاً من ثلاث خطوات:

1. **التحقق من البيانات الوصفية** - يبحث عن `stripe_customer_id` في البيانات التعريفية للمستخدم
2. ** البحث في قاعدة البيانات ** - الاستعلام عن جدول `PaymentAccount` لسجل موجود
3. **إنشاء جديد** - إنشاء عميل Stripe جديد والمزامنة مع قاعدة البيانات

إذا فشل إنشاء العميل، فسترجع نقطة النهاية خطأ `400`.

## التكوين التجريبي

ويشترط في المحاكمة توافر شرطين:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

عند تمكين النسخة التجريبية، يكون `trialAmountId` مطلوبًا. وهذا يسمح بفرض رسوم الإعداد خلال الفترة التجريبية. يقوم المساعد `buildCheckoutLineItems` بإنشاء عناصر تتضمن سعر الاشتراك ومبلغ النسخة التجريبية الاختيارية.

إذا كان `hasTrial` صحيحًا ولكن `trialAmountId` مفقود، فسترجع نقطة النهاية:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## التكوين الخاص بالاشتراك

عندما يكون الوضع هو `subscription`، يتم تطبيق تكوين إضافي عبر `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

يؤدي هذا إلى إرفاق بيانات تعريف الاشتراك بما في ذلك `userId`، و`planId`، و`planName`، والفاصل الزمني للفوترة بجلسة الدفع `subscription_data`.

## نشر البيانات الوصفية

يتم دمج البيانات التعريفية من الطلب مع بيانات مستخدم الجلسة:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

وهذا يضمن أن معلومات هوية المستخدم (المعرف، البريد الإلكتروني، الاسم) يتم إرفاقها دائمًا بجلسة الدفع للتسوية في معالجات خطاف الويب.

## استرداد جلسة الدفع (GET)

### معلمات الاستعلام

|المعلمة|مطلوب|الوصف|
|-----------|----------|-------------|
|`session_id`|نعم|معرف جلسة الخروج الشريطية|

### طلب مثال

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### استجابة النجاح (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

يتم استرداد الجلسة ببيانات `line_items` و`subscription` الموسعة:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## دعم متعدد العملات

يتم تكوين معالجة العملة من خلال `stripe.config.ts`. يقوم الكائن `STRIPE_CONFIG` بتعيين الخطط لمعرفات الأسعار الخاصة بالعملة:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

استخدم `getStripePriceConfig(plan, currency, interval)` لحل معرف السعر الصحيح لخطة معينة وعملة وفاصل زمني للفوترة.

## التسعير الديناميكي

عندما `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`، تقوم نقطة النهاية `/api/stripe/products` بجلب المنتجات والأسعار مباشرة من Stripe API مع ذاكرة تخزين مؤقت TTL مدتها 5 دقائق. يجب أن تحتوي المنتجات على مفاتيح البيانات التعريفية التالية المعينة في لوحة معلومات Stripe:

- `plan` - نوع الخطة (`free`، `standard`، `premium`)
- `type` - نوع المنتج (`subscription`، `sponsor_ad`)
- `features` - مجموعة JSON من سلاسل الميزات
- `annualDiscount`--نسبة الخصم السنوية

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|نعم|شريط مفتاح API السري|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|نعم|شريط مفتاح قابل للنشر|
|`STRIPE_WEBHOOK_SECRET`|نعم|سر توقيع Webhook|
|`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`|لا|تمكين التسعير الديناميكي|
|`NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD`|مشروط|معرفات الأسعار لكل خطة/عملة|

## معالجة الأخطاء

|الحالة|خطأ|السبب|
|--------|-------|-------|
| 400 |`Failed to create customer`|فشل حل/إنشاء العميل|
| 400 |`Invalid trial configuration`|تم تمكين النسخة التجريبية بدون `trialAmountId`|
| 400 |`Session ID is required`|طلب GET مفقود `session_id` المعلمة|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 500 |`Failed to create checkout session`|خطأ في واجهة API الشريطية أو خطأ داخلي|

في وضع التطوير، تتضمن استجابات الأخطاء حقل `details` مع تتبع المكدس.

## الاعتبارات الأمنية

- تتطلب جميع نقاط نهاية الخروج جلسة مصادق عليها عبر `auth()`
- لا يتم كشف مفتاح Stripe السري للعميل مطلقًا
- يتم دمج البيانات التعريفية من جانب الخادم؛ لا يمكن للعملاء انتحال هوية المستخدم
- يتم تحديد نطاق جلسات الدفع لعميل Stripe الخاص بالمستخدم الذي تمت مصادقته
- تتم معالجة رسائل الخطأ عبر `safeErrorMessage` لمنع تسرب المعلومات في الإنتاج

## الصفحات ذات الصلة

- [الغوص العميق لاشتراك Stripe](./stripe-subscription-deep-dive.md)
- [الغوص العميق في شريط Webhook](./stripe-webhook-deep-dive.md)
- [التعمق في طرق الدفع الشريطية](./stripe- Payment-methods-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
