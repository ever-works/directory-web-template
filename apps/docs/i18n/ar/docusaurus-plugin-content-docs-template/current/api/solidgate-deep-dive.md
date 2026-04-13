---
id: solidgate-deep-dive
title: سوليدجيت الغوص العميق
sidebar_label: سوليدجيت
sidebar_position: 7
---

# سوليدجيت الغوص العميق

تغطي هذه الصفحة التكامل الكامل لـ Solidgate، بما في ذلك إنشاء الخروج ومعالجة خطاف الويب والتحقق من الدفع ونموذج الدفع المضمن.

## نظرة عامة

Solidgate هو موفر البنية التحتية للدفع الذي يدعم كلاً من تدفقات الدفع المستضافة وReact SDK القابلة للتضمين لنماذج الدفع المضمنة. ينشئ التكامل نوايا الدفع عبر Solidgate API ويدعم معالجة الأحداث المستندة إلى webhook مع الحماية من العجز. يستخدم Solidgate HMAC-SHA512 للتحقق من توقيع webhook.

## جدول الطريق

|الطريقة|المسار|مصادقة|الوصف|
|--------|------|------|-------------|
|`POST`|`/api/solidgate/checkout`|الجلسة مطلوبة|إنشاء جلسة الخروج / نية الدفع|
|`POST`|`/api/solidgate/webhook`|التوقيع مطلوب|معالجة أحداث webhook الواردة|
|`GET`|`/api/solidgate/webhook`|لا شيء|إرجاع وثائق نقطة النهاية|

## إنشاء الخروج (POST)

### هيئة الطلب

تستخدم نقطة نهاية الخروج التحقق من Zod للتحقق الصارم من الإدخال:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Payment amount
  currency: z.string().default('USD'),         // Currency code
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // Redirect URL
  cancelUrl: z.string().url(),                 // Cancel URL
  metadata: z.record(z.string(), z.any()).optional()
});
```

### طلب مثال

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### كيف يعمل

1. يصادق المستخدم عبر `auth()`
2. التحقق من صحة نص الطلب باستخدام مخطط Zod
3. حل أو إنشاء عميل Solidgate
4. إنشاء نية الدفع عبر Solidgate API
5. إرجاع معرف الدفع وسر العميل لمجموعة SDK المضمنة

### تنفيذ المزود

تقوم الطريقة `createPaymentIntent` بإنشاء طلب واجهة برمجة التطبيقات:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Amount in cents
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### استجابة النجاح (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

يحتوي الحقل `url` على معرف هدف الدفع المستخدم لتهيئة Solidgate React SDK.

## نموذج الدفع المضمن

توفر Solidgate React SDK لنماذج الدفع المضمنة. يقوم الموفر بإنشاء توقيع لتهيئة SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

تقوم الطريقة `getUIComponents()` بإرجاع غلاف نموذج الدفع الذي تم تكوينه:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## معالجة الويب هوك

### التحقق من التوقيع

يستخدم Solidgate HMAC-SHA512 لتوقيعات webhook. يمكن أن يكون رأس التوقيع `x-signature` أو `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

يتحقق المزود من التوقيع مقابل الجسم الخام:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### الحماية من العجز

تتضمن نقطة نهاية خطاف الويب حماية من العجز في الذاكرة لمنع المعالجة المكررة:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acknowledge without processing
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::ملاحظة
في بيئة إنتاج بدون خادم، يجب استبدال مجموعة الذاكرة الداخلية بـ Redis أو جدول قاعدة بيانات لعجز المثيلات المشتركة.
:::

### رسم خرائط الأحداث

|حدث سوليدجيت|النوع الداخلي|
|----------------|---------------|
|`payment.succeeded` / `payment.completed`|`payment_succeeded`|
|`payment.failed` / `payment.declined`|`payment_failed`|
|`subscription.created`|`subscription_created`|
|`subscription.updated`|`subscription_updated`|
|`subscription.cancelled` / `subscription.canceled`|`subscription_cancelled`|
|`refund.processed` / `refund.completed`|`refund_succeeded`|

### هيكل المعالج

يقوم كل معالج بتفويض `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

تتم تهيئة `WebhookSubscriptionService` باستخدام ثابت الموفر `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## التحقق من الدفع

يدعم المزود التحقق من الدفع عبر Solidgate API:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## إدارة الاشتراكات

### إنشاء الاشتراكات

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Returns SubscriptionInfo with mapped status
}
```

### إلغاء الاشتراكات

يدعم الإلغاء الفوري وإلغاء نهاية الفترة:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### تحديث الاشتراكات

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## اتصالات واجهة برمجة التطبيقات

تستخدم جميع استدعاءات Solidgate API طريقة `makeApiRequest` مركزية:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Error handling and JSON parsing
}
```

## معالجة الأخطاء

|الحالة|خطأ|السبب|
|--------|-------|-------|
| 400 |`Invalid request body`|فشل التحقق من صحة Zod|
| 400 |`Invalid JSON`|نص الطلب غير صحيح|
| 400 |`Failed to create customer`|فشل حل العميل|
| 400 |`No signature provided`|Webhook مفقود التوقيع|
| 400 |`Webhook not processed`|فشل التحقق من التوقيع|
| 401 |`Unauthorized`|لا توجد جلسة مصادق عليها|
| 500 |`Failed to create checkout session`|خطأ في Solidgate API|

تُرجع أخطاء التحقق من صحة Zod رسائل مفصلة على مستوى الحقل:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## متطلبات التكوين

|متغير|مطلوب|الوصف|
|----------|----------|-------------|
|`SOLIDGATE_API_KEY`|نعم|مفتاح Solidgate API|
|`SOLIDGATE_SECRET_KEY`|نعم|المفتاح السري لتوليد التوقيع|
|`SOLIDGATE_WEBHOOK_SECRET`|نعم|سر توقيع Webhook|
|`SOLIDGATE_PUBLISHABLE_KEY`|نعم|مفتاح قابل للنشر لـ React SDK|
|`SOLIDGATE_MERCHANT_ID`|نعم|معرف التاجر|
|`SOLIDGATE_API_BASE_URL`|لا|عنوان URL الأساسي لواجهة برمجة التطبيقات (الافتراضي: `https://api.solidgate.com/v1`)|

## الاعتبارات الأمنية

- يتم استخدام HMAC-SHA512 لكل من خطاف الويب والتحقق من توقيع نية الدفع
- لا يتم كشف المفتاح السري وسر خطاف الويب للعميل أبدًا
- تعمل الحماية من العجز على منع معالجة webhook المكررة
- يضمن التحقق من صحة Zod فحصًا صارمًا للمدخلات في نقطة نهاية الخروج
- يتم تضمين تتبعات مكدس الأخطاء فقط في وضع التطوير
- تقوم الأداة المساعدة `safeErrorMessage` بتطهير رسائل الخطأ الخاصة بالإنتاج

## الصفحات ذات الصلة

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [الغوص العميق القطبي](./polar-deep-dive.md)
- [بنية موفر الدفع](./Payment-provider-architecture.md)
