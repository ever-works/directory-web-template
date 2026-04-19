---
id: polar-deep-dive
title: الغوص العميق القطبي
sidebar_label: القطبية
sidebar_position: 6
---

# الغوص العميق القطبي

تغطي هذه الصفحة التكامل القطبي الكامل، بما في ذلك إنشاء الخروج وإدارة الاشتراكات وبوابة العملاء ومعالجة خطاف الويب.

## نظرة عامة

Polar هي عبارة عن منصة دفع حديثة مصممة للبرامج والمنتجات الرقمية. يدعم التكامل كلاً من الدفعات والاشتراكات لمرة واحدة من خلال نظام الدفع الخاص بـ Polar، مع إدارة دورة الحياة المستندة إلى الويب. يستخدم Polar منتجات على مستوى المؤسسة و`@polar-sh/sdk` لتفاعلات واجهة برمجة التطبيقات (API).

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/polar/checkout`|الجلسة مطلوبة|إنشاء جلسة الخروج (الاشتراك أو لمرة واحدة)|
|`GET`|`/api/polar/checkout`|الجلسة مطلوبة|استرداد حالة جلسة الخروج|
|`POST`|`/api/polar/webhook`|التوقيع مطلوب|معالجة أحداث webhook الواردة|

## إنشاء الخروج (POST)

### هيئة الطلب

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### طلب مثال

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### كيف يعمل

يتعامل مسار الخروج مع تدفقين:

**وضع الاشتراك:**
1. يصادق المستخدم ويحل مشكلة العميل القطبي
2. يعقم البيانات الوصفية (يزيل قيم `undefined` - يرفضها Polar)
3. يستدعي `polarProvider.createSubscription()` مما يؤدي إلى إنشاء جلسة الخروج
4. إرجاع عنوان URL الخاص بالخروج من نتيجة الاشتراك

**طريقة الدفع لمرة واحدة:**
1. يصادق المستخدم ويحل مشكلة العميل القطبي
2. يستخدم Polar SDK مباشرةً لإنشاء عملية الدفع
3. إرجاع عنوان URL الخاص بالخروج

### تطهير البيانات الوصفية

يتطلب Polar أن تكون جميع قيم البيانات التعريفية غير فارغة وغير محددة:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### استجابة النجاح (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## استرداد جلسة الدفع (GET)

### معلمات الاستعلام

|المعلمة|مطلوب|الوصف|
|-----------|----------|-------------|
|`checkout_id`|نعم|معرف جلسة الخروج القطبية|

### استجابة النجاح (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## إدارة الاشتراكات

### إنشاء الاشتراكات

تقوم الطريقة `PolarProvider.createSubscription()` بإنشاء عملية دفع للاشتراك:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### إلغاء الاشتراكات

يدعم Polar استراتيجيتين للإلغاء:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

يتحقق المزود من صحة حالة الاشتراك قبل الإلغاء:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### إعادة تفعيل الاشتراكات

يمكن إعادة تنشيط الاشتراكات المقرر إلغاؤها:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### تحديث الاشتراكات

تتم معالجة تغييرات الخطة من خلال `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## معالجة الويب هوك

### التحقق من التوقيع

يستخدم Polar وظيفة `@polar-sh/sdk/webhooks` `validateEvent` للتحقق. يتطلب خطاف الويب ثلاثة رؤوس:

|رأس|الوصف|
|--------|-------------|
|`webhook-signature`|توقيع HMAC SHA256 (التنسيق: `v1,<hex_signature>`)|
|`webhook-timestamp`|الطابع الزمني لنظام Unix للحدث|
|`webhook-id`|معرف تسليم webhook الفريد|

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### أنواع الأحداث

|الحدث القطبي|رسم الخرائط الداخلية|
|-------------|-----------------|
|`checkout.succeeded`|نجح الدفع|
|`checkout.failed`|فشل الدفع|
|`subscription.created`|تم إنشاء الاشتراك|
|`subscription.updated`|تم تحديث الاشتراك|
|`subscription.canceled`|تم إلغاء الاشتراك|
|`invoice.paid`|نجح دفع الاشتراك|
|`invoice.payment_failed`|فشل دفع الاشتراك|

### جهاز توجيه ويب هوك

يتم إرسال الأحداث من خلال وحدة توجيه مخصصة:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

يقوم جهاز التوجيه بتعيين أنواع الأحداث لوظائف المعالج التي تقوم بتحديث قاعدة البيانات عبر `WebhookSubscriptionService` وإرسال إشعارات البريد الإلكتروني.

### التحقق من الحمولة

تتحقق نقطة نهاية خطاف الويب من صحة بنية الحمولة قبل المعالجة:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## إدارة العملاء

يتبع الموفر نمط الحل القياسي المكون من ثلاث خطوات:

1. تحقق من البيانات التعريفية للمستخدم لمعرفة معرف العميل القطبي
2. الاستعلام عن جدول قاعدة البيانات `PaymentAccount`
3. قم بإنشاء عميل جديد عبر Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## معالجة الأخطاء

|الحالة|خطأ|السبب|
|--------|-------|-------|
| 400 |`Product ID is required`|مفقود `productId` في الطلب|
| 400 |`Checkout ID is required`|الحصول على طلب مفقود `checkout_id`|
| 400 |`No signature provided`|Webhook يفتقد رأس التوقيع|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 500 |`Failed to create checkout`|عنوان URL الخاص بالخروج غير متاح|
| 500 |`Configuration error`|لم يتم تكوين الموفر القطبي|
| 503 |إعداد الدفع غير مكتمل|لم تكمل المؤسسة إعداد الدفع في Polar|

تتضمن نقطة نهاية الخروج اكتشافًا خاصًا لأخطاء إعداد الدفع:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`POLAR_ACCESS_TOKEN`|نعم|رمز وصول Polar API|
|`POLAR_WEBHOOK_SECRET`|نعم|سر توقيع Webhook|
|`POLAR_ORGANIZATION_ID`|نعم|معرف المنظمة القطبية|

## الاعتبارات الأمنية

- يتم التحقق من توقيعات Webhook باستخدام وظيفة `validateEvent` من SDK الرسمية
- يتم الاحتفاظ بالنص الأساسي الأولي للتحقق من التوقيع (قد تؤدي إعادة تسلسل JSON إلى تغيير النص)
- يتم التحقق من ثلاثة رؤوس منفصلة: التوقيع، والطابع الزمني، ومعرف خطاف الويب
- يتم تطهير البيانات التعريفية من جانب الخادم لمنع حقن قيم غير محددة
- تستخدم استجابات الأخطاء `safeErrorResponse` لمنع تسرب المعلومات

## الصفحات ذات الصلة

- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [الغوص العميق في Solidgate](./solidgate-deep-dive.md)
- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
