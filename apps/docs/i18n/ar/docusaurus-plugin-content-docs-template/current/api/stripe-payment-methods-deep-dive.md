---
id: stripe-payment-methods-deep-dive
title: طرق الدفع الشريطية الغوص العميق
sidebar_label: طرق الدفع الشريطية
sidebar_position: 3
---

# طرق الدفع الشريطية الغوص العميق

تغطي هذه الصفحة قائمة طرق الدفع، وأغراض الإعداد لحفظ البطاقات، وإدارة الطريقة الافتراضية، والتحقق من صحة البطاقة.

## نظرة عامة

يوفر نظام طرق الدفع إمكانيتين رئيسيتين: سرد طرق الدفع المحفوظة للمستخدم بالحالة الافتراضية، وإنشاء أهداف الإعداد التي تسمح للمستخدمين بحفظ طرق دفع جديدة للاستخدام المستقبلي دون رسوم فورية.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|الجلسة مطلوبة|سرد جميع طرق الدفع للمستخدم|
|`POST`|`/api/stripe/setup-intent`|الجلسة مطلوبة|أنشئ هدف إعداد لحفظ طريقة دفع جديدة|

## طرق دفع الإدراج (GET)

### كيف يعمل

تقوم نقطة نهاية القائمة بتنفيذ الخطوات التالية:

1. يصادق المستخدم عبر `auth()`
2. يحل معرف عميل Stripe الخاص بالمستخدم عبر `getUserStripeCustomerId()`
3. يسترجع العميل لتحديد طريقة الدفع الافتراضية
4. يسرد جميع طرق الدفع من نوع `card` (حتى 100)
5. تنسيق النتائج وفرزها (الافتراضي أولاً، ثم حسب تاريخ الإنشاء)

### تنفيذ المفتاح

```typescript
// Retrieve customer for default payment method detection
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// List all card-type payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Format with default status
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sort: default first, then by newest
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### استجابة النجاح (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Present when no payment methods found
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix timestamp
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### مثال: مستخدم لديه طرق الدفع

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### مثال: لا توجد طرق دفع

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## إنشاء نية الإعداد (POST)

تتيح أهداف الإعداد للمستخدمين حفظ طريقة الدفع لاستخدامها في المستقبل دون تحصيل رسوم على الفور. يُستخدم هذا عندما يريد المستخدم إضافة بطاقة قبل الاشتراك، أو إدارة طرق دفع متعددة.

### كيف يعمل

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### استجابة النجاح (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix timestamp
}
```

### استخدام الواجهة الأمامية

من جانب العميل، يتم استخدام `client_secret` لتأكيد هدف الإعداد باستخدام Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## إدارة طريقة الدفع الافتراضية

يتم تحديد طريقة الدفع الافتراضية من `invoice_settings.default_payment_method` الخاص بعميل Stripe. عند إنشاء اشتراك، يتم تعيين طريقة الدفع تلقائيًا كطريقة افتراضية:

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

تسمح العلامة `is_default` في استجابة قائمة طرق الدفع للواجهة الأمامية بعرض شارة البطاقة الافتراضية.

## معالجة الأخطاء

|الحالة|خطأ|السبب|
|--------|-------|-------|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 404 |`Customer not found`|تم حذف عميل الشريط|
| 400 |خطأ شريطي|طلب غير صالح إلى Stripe API|
| 500 |`Failed to list payment methods`|خطأ داخلي|
| 500 |`Failed to create setup intent`|فشل إنشاء هدف الإعداد|

تم اكتشاف الأخطاء الخاصة بالشريط ومعالجتها:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## الاعتبارات الأمنية

- تتطلب كافة نقاط النهاية جلسات مصادق عليها
- تقوم نقطة نهاية القائمة بإرجاع طرق الدفع التابعة لعميل Stripe الخاص بالمستخدم المصادق عليه فقط
- لا يتم تخزين أرقام البطاقات أو إرجاعها أبدًا - يتم عرض آخر 4 أرقام والعلامة التجارية فقط
- يجب تمرير `client_secret` من أهداف الإعداد فقط إلى SDK للواجهة الأمامية لـ Stripe.js
- يتم حل معرفات العملاء من جانب الخادم ولا يمكن تجاوزها بواسطة طلبات العميل

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|نعم|شريط مفتاح API السري|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|نعم|لتهيئة Stripe.js للواجهة الأمامية|

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [الغوص العميق لاشتراك Stripe](./stripe-subscription-deep-dive.md)
- [الغوص العميق في شريط Webhook](./stripe-webhook-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
