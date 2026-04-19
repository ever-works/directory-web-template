---
id: lemonsqueezy-deep-dive
title: LemonSqueezy الغوص العميق
sidebar_label: ليمونسكويزي
sidebar_position: 5
---

# LemonSqueezy الغوص العميق

تغطي هذه الصفحة التكامل الكامل مع LemonSqueezy، بما في ذلك إنشاء الخروج وإدارة الاشتراكات ومعالجة خطاف الويب ومزامنة المنتج.

## نظرة عامة

LemonSqueezy هو مزود دفع تجاري يتولى تحصيل الضرائب والامتثال ومعالجة الدفع. يستخدم التكامل تدفق الخروج المستضاف الخاص بـ LemonSqueezy ونموذج المنتج القائم على المتغير ونظام الخطاف عبر الويب. على عكس Stripe، لا يدعم LemonSqueezy أهداف الإعداد أو إدارة طريقة الدفع المباشرة - تتم جميع عمليات معالجة الدفع من خلال واجهة المستخدم المستضافة.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|الجلسة مطلوبة|إنشاء جلسة الخروج من نص JSON|
|`GET`|`/api/lemonsqueezy/checkout`|لا شيء|إنشاء جلسة الخروج من معلمات الاستعلام|
|`POST`|`/api/lemonsqueezy/webhook`|التوقيع مطلوب|معالجة أحداث webhook الواردة|

## إنشاء الخروج (POST)

### هيئة الطلب

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### طلب مثال

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### كيف يعمل

1. يصادق المستخدم عبر `auth()`
2. التحقق من صحة نص الطلب باستخدام `validateCheckoutRequestBody()`
3. يستدعي `lemonsqueezyProvider.createCustomCheckout()` مع بيانات تعريف المستخدم
4. إرجاع عنوان URL الخاص بالخروج

### تنفيذ المزود

تقوم الطريقة `createCustomCheckout` بإنشاء عملية دفع LemonSqueezy بتكوين شامل:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### استجابة النجاح (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## الخروج عبر معلمات الاستعلام (GET)

تدعم نقطة نهاية GET إنشاء عمليات سحب عبر معلمات الاستعلام لسيناريوهات الارتباط المباشر:

|المعلمة|مطلوب|الوصف|
|-----------|----------|-------------|
|`variantId`|نعم|معرف متغير LemonSqueezy|
|`email`|نعم|البريد الإلكتروني للعميل|
|`customPrice`|لا|السعر المخصص بالسنتات|
|`metadata`|لا|سلسلة JSON من البيانات الوصفية|

## إدارة الاشتراكات

### إنشاء الاشتراكات

يتم إنشاء الاشتراكات من خلال تدفق الخروج. تتضمن الطريقة `createSubscription` واجهة برمجة تطبيقات الخروج الخاصة بـ LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### إلغاء الاشتراكات

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### تحديث الاشتراكات

تدعم طريقة التحديث تغييرات الخطة والإيقاف المؤقت والاستئناف وإعادة التنشيط:

```typescript
// Plan change via variant ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pause subscription
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Resume subscription
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## معالجة الويب هوك

### التحقق من التوقيع

يستخدم LemonSqueezy HMAC SHA-256 للتحقق من توقيع webhook. يتحقق الموفر من التوقيعات باستخدام Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### رسم خرائط الأحداث

|حدث ليمونسكويزي|النوع الداخلي|
|-------------------|---------------|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

### هيكل معالج Webhook

يتبع كل معالج نمطًا ثابتًا:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### كشف إعلانات الراعي

يستخدم LemonSqueezy `custom_data` بدلاً من Stripe's `metadata`:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## إدارة العملاء

يتبع المزود نفس نمط حل العملاء المكون من ثلاث خطوات مثل المزودين الآخرين:

1. تحقق من بيانات تعريف المستخدم لـ `lemonsqueezy_customer_id`
2. الاستعلام عن جدول قاعدة البيانات `PaymentAccount`
3. قم بإنشاء عميل جديد عبر LemonSqueezy API

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## معالجة الأخطاء

|الحالة|رمز الخطأ|السبب|
|--------|-----------|-------|
| 400 |`VALIDATION_ERROR`|نص الطلب أو المعلمات غير صالحة|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 500 |`CONFIGURATION_ERROR`|متغيرات البيئة مفقودة|
| 500 |`INTERNAL_ERROR`|خطأ لم تتم معالجته|
| 503 |`PAYMENT_SERVICE_ERROR`|واجهة برمجة تطبيقات LemonSqueezy غير متاحة|

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|نعم|مفتاح LemonSqueezy API|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|نعم|سر توقيع Webhook|
|`LEMONSQUEEZY_STORE_ID`|نعم|معرف المتجر الرقمي|

## القيود

- **لا توجد أهداف للإعداد**: لا يدعم LemonSqueezy حفظ البطاقات بدون عملية شراء. الأسلوب `createSetupIntent` يلقي خطأ.
- **لا توجد واجهة برمجة تطبيقات لاسترداد الأموال مباشرة**: يجب معالجة المبالغ المستردة من خلال لوحة تحكم LemonSqueezy.
- **التسعير المستند إلى المتغير**: تستخدم المنتجات معرفات متغيرة بدلاً من معرفات الأسعار. تستخدم تغييرات الخطة `variantId`.

## الاعتبارات الأمنية

- يتم التحقق من توقيعات Webhook باستخدام HMAC SHA-256
- يتم استخدام النص الأساسي للتحقق من التوقيع لمنع مشكلات إعادة تسلسل JSON
- لا يتم عرض مفاتيح واجهة برمجة التطبيقات (API) للعميل أبدًا
- يقوم تسجيل وضع التطوير بتطهير معلومات تحديد الهوية الشخصية (يتم تنقيح عناوين البريد الإلكتروني جزئيًا)

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [الغوص العميق القطبي](./polar-deep-dive.md)
- [الغوص العميق في Solidgate](./solidgate-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
