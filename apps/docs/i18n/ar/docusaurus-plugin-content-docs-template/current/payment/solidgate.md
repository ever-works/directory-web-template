---
id: solidgate
title: التكامل سوليدجيت
sidebar_label: سوليدجيت
sidebar_position: 5
---

# تكامل البوابة الصلبة

يعد Solidgate واحدًا من أربعة موفري خدمات دفع مدعومين في قالب Ever Works. فهو يوفر جلسات الدفع والتعامل مع خطاف الويب وإدارة الاشتراك ودعم العملات المتعددة من خلال واجهة موفر موحدة.

## مواقع المصدر

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## متغيرات البيئة

قم بتكوين Solidgate عن طريق تعيين متغيرات البيئة التالية:

```bash
# Required
SOLIDGATE_API_KEY=your_api_key
SOLIDGATE_SECRET_KEY=your_secret_key
SOLIDGATE_MERCHANT_ID=your_merchant_id
SOLIDGATE_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=your_publishable_key
SOLIDGATE_API_BASE_URL=https://api.solidgate.com/v1
```

يتحقق الرقم 0 في 1 من صحة هذه البيانات عند الوصول لأول مرة. إذا كان أي متغير مطلوب مفقودًا، فسيظهر خطأ برسالة وصفية:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## بنية الموفر

يقوم 0 بتنفيذ 1، مما يجعله قابلاً للتبديل مع Stripe وLemonSqueezy وPolar:

```ts
export class SolidgateProvider implements PaymentProviderInterface {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private publishableKey: string;
  private apiBaseUrl: string;
  private merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || '';
    this.publishableKey = config.options?.publishableKey || '';
    this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
    this.merchantId = config.options?.merchantId || '';
  }
  // ... interface methods
}
```

### التهيئة

قم بالوصول إلى موفر Solidgate من خلال مدير المفرد:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## تدفق الخروج

### 1. يقوم العميل بإنشاء الخروج

يبدأ العميل عملية الدفع عن طريق النشر إلى نقطة نهاية واجهة برمجة التطبيقات:

```ts
const response = await fetch('/api/solidgate/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    mode: 'one_time',          // or 'subscription'
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      planId: 'pro_plan',
      planName: 'Pro Plan',
    },
  }),
});
```

### 2. يقوم الخادم بالتحقق من صحة وإنشاء نية الدفع

يقوم مسار الخروج ( `app/api/solidgate/checkout/route.ts` ) بتنفيذ الخطوات التالية:

1. **تصادق** المستخدم عبر `auth()` (جلسة المصادقة التالية)
2. **التحقق من صحة** نص الطلب باستخدام Zod:
   ```ت.س
   مخطط السحب الثابت = z.object({
     المبلغ: z.number().positive(),
     العملة: z.string().default('USD')،
     الوضع: z.enum(['one_time', 'subscription']).default('one_time'),
     SuccessUrl: z.string().url(),
     CancelUrl: z.string().url(),
     البيانات الوصفية: z.record(z.string(), z.any()).اختياري(),
   });
   ```
3. **استرداد أو إنشاء** معرف عميل Solidgate
4. **إنشاء نية الدفع** عبر Solidgate API
5. **إرجاع** معرف الدفع وسر العميل لـ SDK

### 3. هيكل الاستجابة

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_generated-uuid_secret"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

### 4. يقدم العميل نموذج الدفع

استخدم معرف هدف الدفع الذي تم إرجاعه لتهيئة Solidgate React SDK.

## رد فعل التكامل SDK

يغلف القالب الرقم الرسمي `@solidgate/react-sdk` في مكون مخصص:

```tsx
// lib/payment/ui/solidgate/solidgate-elements.tsx
import Payment from '@solidgate/react-sdk';

export function SolidgatePaymentForm({
  onSuccess,
  onError,
  merchantId,
  paymentIntent,
  signature,
}: SolidgateElementsWrapperProps) {
  const merchantData = {
    merchant: merchantId,
    signature: signature,
    paymentIntent: paymentIntent,
  };

  return (
    <div className="solidgate-payment-form space-y-4">
      <Payment
        merchantData={merchantData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

تقوم الطريقة 0 تلقائيًا بإدخال معرف التاجر وهدف الدفع وتوقيع HMAC في الغلاف:

```ts
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(
      paymentIntent, merchantId
    );

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature,
    });
  };

  return {
    PaymentForm: SolidgatePaymentFormWithConfig,
    logo: '/assets/payment/solidgate/solidgate-logo.svg',
    cardBrands: solidgateCardBrands,
    supportedPaymentMethods: ['card'],
    translations: solidgateTranslations,
  };
}
```

## إنشاء التوقيع

يتطلب Solidgate توقيعات HMAC-SHA512 لمصادقة واجهة برمجة التطبيقات (API) والتحقق من خطاف الويب:

```ts
// Generic signature
private generateSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(data)
    .digest('hex');
}

// Payment intent signature for the React SDK
private generatePaymentIntentSignature(
  paymentIntent: string,
  merchantId: string
): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto
    .createHmac('sha512', this.secretKey)
    .update(data)
    .digest('hex');
}
```

## إدارة العملاء

يتبع الموفر إستراتيجية بحث ثلاثية المستويات لمعرفات العملاء:

1. **بيانات تعريف المستخدم** - حدد `user.user_metadata.solidgate_customer_id` 2. **قاعدة البيانات** - الاستعلام عن الجدول 1 عبر 2
3. **إنشاء جديد** - اتصل بـ Solidgate `/customers` API وقم بالمزامنة مرة أخرى مع قاعدة البيانات

```ts
async getCustomerId(user: User | null): Promise<string | null> {
  // 1. Check metadata
  const fromMetadata = this.extractCustomerIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;

  // 2. Check database
  const fromDatabase = await this.retrieveCustomerIdFromDatabase(user.id);
  if (fromDatabase) return fromDatabase;

  // 3. Create new customer
  const newCustomer = await this.createNewSolidgateCustomer(user);
  await this.synchronizePaymentAccount(user.id, newCustomer.id);
  return newCustomer.id;
}
```

## إدارة الاشتراكات

### إنشاء الاشتراك

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### إلغاء الاشتراك

يدعم المزود كلا من نهاية الفترة والإلغاء الفوري:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

تحدد طريقة الإلغاء نقطة نهاية واجهة برمجة التطبيقات (API) المناسبة بناءً على العلامة:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### تعيين الحالة

يتم تعيين حالات الاشتراك في Solidgate إلى تعداد القالب:

| حالة سوليدجيت | حالة القالب |
|------------------|-----------------|
| `active` | `ACTIVE` |
| 3/ 4 | 5 ــ |
| 6ـ | `PAST_DUE` |
| ٨ / ٩ | `TRIALING` |
| `unpaid` | ‹‹١٢› |
| 13 ــ | 14 ــ |
| `incomplete_expired` | 16 ــ |

## العلامات التجارية للبطاقات المدعومة

يعلن الموفر عن دعمه لـ Visa وMastercard وAmex وDiscover مع أيقونات ذات سمات فاتحة/داكنة:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## التوطين

يتضمن الموفر ترجمات مضمنة للغة الإنجليزية والفرنسية:

```ts
const solidgateTranslations = {
  en: {
    cardNumber: 'Card number',
    cardExpiry: 'Expiry date',
    cardCvc: 'CVV',
    submit: 'Pay securely',
    processingPayment: 'Processing your payment...',
    paymentSuccessful: 'Payment completed successfully',
    paymentFailed: 'Your payment could not be processed',
  },
  fr: {
    cardNumber: 'Numero de carte',
    cardExpiry: "Date d'expiration",
    // ...
  },
};
```

## المبالغ المستردة

إصدار استرداد كامل أو جزئي من خلال المزود:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

يتم تحويل المبالغ إلى سنتات قبل إرسالها إلى Solidgate API.

## معالجة الأخطاء

تستخدم جميع أساليب الموفر معالجة متسقة للأخطاء باستخدام مسجل منظم:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

تتضمن أخطاء واجهة برمجة التطبيقات رمز حالة HTTP ونص الاستجابة لتصحيح الأخطاء:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
