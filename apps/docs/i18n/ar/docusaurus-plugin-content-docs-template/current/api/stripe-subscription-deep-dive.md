---
id: stripe-subscription-deep-dive
title: اشتراك الشريط الغوص العميق
sidebar_label: اشتراكات الشريط
sidebar_position: 2
---

# اشتراك الشريط الغوص العميق

تغطي هذه الصفحة جميع مسارات إدارة الاشتراك: الإنشاء والتحديث والإلغاء وطرق الموفر الأساسية مع أمثلة الطلب/الاستجابة.

## نظرة عامة

توفر واجهة برمجة تطبيقات الاشتراك إدارة دورة حياة كاملة لاشتراكات Stripe. وهو يدعم إنشاء الاشتراكات بطرق الدفع والفترات التجريبية، وتحديث الخطط أو إعدادات الإلغاء، وإلغاء الاشتراكات إما على الفور أو في نهاية فترة الفاتورة.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/stripe/subscription`|الجلسة مطلوبة|إنشاء اشتراك جديد|
|`PUT`|`/api/stripe/subscription`|الجلسة مطلوبة|تحديث اشتراك موجود|
|`DELETE`|`/api/stripe/subscription`|الجلسة مطلوبة|إلغاء الاشتراك|

## إنشاء اشتراك (POST)

### هيئة الطلب

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### طلب مثال

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### كيف يعمل

يقوم معالج المسار بتنفيذ الخطوات التالية:

1. يصادق المستخدم عبر `auth()`
2. حل أو إنشاء عميل Stripe عبر `stripeProvider.getCustomerId()`
3. المكالمات `stripeProvider.createSubscription()` مع معرف العميل والسعر وطريقة الدفع والأيام التجريبية والبيانات الوصفية

### تنفيذ المزود

داخل `StripeProvider.createSubscription()`:

```typescript
// Attach payment method to customer
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Set as default payment method
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Create the subscription
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Without trial: charge immediately
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### استجابة النجاح (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix timestamp
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix timestamp or null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." if available
}
```

## تحديث الاشتراك (PUT)

### هيئة الطلب

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### طلب مثال

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### تنفيذ المزود

يعالج الأسلوب `updateSubscription` تغييرات الخطة عن طريق استبدال عنصر الاشتراك:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

كما أنه يدعم إعداد `cancel_at_period_end` و`cancel_at` وتحديث البيانات التعريفية.

### استجابة النجاح (200)

يُرجع نفس الشكل `SubscriptionInfo` بالقيم المحدثة.

## إلغاء الاشتراك (حذف)

### هيئة الطلب

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### طلب مثال

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### تنفيذ المزود

يدعم منطق الإلغاء استراتيجيتين:

```typescript
if (cancelAtPeriodEnd) {
  // Soft cancel: subscription remains active until period ends
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Hard cancel: subscription ends immediately
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### استجابة النجاح (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## تعيين حالة الاشتراك

يقوم الموفر بتعيين حالات الشريط إلى التعداد الداخلي `SubscriptionStatus`:

|حالة الشريط|الحالة الداخلية|
|---------------|-----------------|
|`incomplete`|`INCOMPLETE`|
|`incomplete_expired`|`INCOMPLETE_EXPIRED`|
|`trialing`|`TRIALING`|
|`active`|`ACTIVE`|
|`past_due`|`PAST_DUE`|
|`canceled`|`CANCELED`|
|`unpaid`|`UNPAID`|

## تتبع البيانات الوصفية

يتم إرفاق كافة عمليات الاشتراك `userId` من الجلسة إلى البيانات التعريفية للاشتراك:

```typescript
metadata: {
  userId: session.user.id
}
```

يتيح ذلك لمعالجات خطاف الويب التوفيق بين الاشتراكات وسجلات المستخدم الداخلية.

## معالجة الأخطاء

|الحالة|خطأ|السبب|
|--------|-------|-------|
| 400 |`Failed to create customer`|فشل حل العميل|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 500 |`Failed to create subscription`|خطأ في Stripe API أثناء الإنشاء|
| 500 |`Failed to update subscription`|خطأ في واجهة API الشريطية أثناء التحديث|
| 500 |`Failed to cancel subscription`|خطأ في Stripe API أثناء الإلغاء|

## الاعتبارات الأمنية

- تتطلب كافة نقاط نهاية الاشتراك المصادقة
- يتم تنفيذ مرفق طريقة الدفع والإعداد الافتراضي من جانب الخادم
- تم تعيين العلامة `off_session` فقط للاشتراكات غير التجريبية لتمكين الرسوم التلقائية
- تتضمن بيانات تعريف الاشتراك دائمًا معرف المستخدم المصادق عليه للتدقيق
- في وضع التطوير، يتم تسجيل تحديثات الاشتراك باستخدام الحقول غير الحساسة فقط

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [الغوص العميق في شريط Webhook](./stripe-webhook-deep-dive.md)
- [التعمق في طرق الدفع الشريطية](./stripe- Payment-methods-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
