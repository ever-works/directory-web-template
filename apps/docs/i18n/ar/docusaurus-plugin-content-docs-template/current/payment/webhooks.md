---
id: webhooks
title: خطافات الدفع عبر الويب
sidebar_label: خطافات الويب
sidebar_position: 7
---

# خطاف الدفع الإلكتروني

يقوم قالب Ever Works بمعالجة خطافات الدفع عبر الويب من جميع مقدمي الخدمة الأربعة المدعومين من خلال مسارات واجهة برمجة التطبيقات المخصصة. تتعامل كل نقطة نهاية لخطاف الويب مع التحقق من التوقيع وتوجيه الأحداث وإدارة دورة حياة الاشتراك وإشعارات البريد الإلكتروني.

## مواقع المصدر

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## هندسة الويب هوك

تتبع جميع مسارات webhook للموفر نفس النمط:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

يقوم كل مسار بتفويض منطق الأعمال إلى 0 المشترك، الذي يعمل على تسوية البيانات الخاصة بالموفر في تنسيق مشترك قبل تحديث قاعدة البيانات.

## أنواع أحداث Webhook

يحدد القالب مجموعة شاملة من أنواع الأحداث التي يعينها جميع مقدمي الخدمة:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## معالج Solidgate Webhook

### نقطة النهاية

```
POST /api/solidgate/webhook
```

### التحقق من التوقيع

يقرأ مسار Solidgate webhook التوقيع من الرأس `x-signature` أو 1:

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

يتحقق الموفر من التوقيع باستخدام HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### العجز

يقوم المعالج بتنفيذ التحقق من العجز في الذاكرة لمنع معالجة الأحداث المكررة:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::ملاحظة
في بيئة إنتاج بدون خادم، استبدل الذاكرة `Set` بـ Redis أو جدول قاعدة البيانات للحصول على عجز موثوق به عبر المثيلات.
:::

### توجيه الأحداث

بعد التحقق، يتم توجيه الأحداث إلى معالجات محددة:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### رسم خرائط حدث Solidgate

يقوم الموفر بتعيين أسماء الأحداث الخاصة بـ Solidgate للأنواع العامة للقالب:

| حدث سوليدجيت | حدث القالب |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| 3/ 4 | 5 ــ |
| 6ـ | `subscription_created` |
| 8ـ | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | ‹‹١٢› |
| 13 / 14 | `refund_succeeded` |

## خدمة الاشتراك في الويب

يتم تفويض جميع معالجات خطاف الويب إلى 16 مشترك. يتم إنشاء هذه الخدمة لكل مزود:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### تطبيع البيانات

تقوم الخدمة بتطبيع حمولات خطاف الويب إلى تنسيق مشترك `WebhookSubscriptionData` :

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### طرق المعالج

توفر الخدمة معالجات لكل نوع حدث webhook:

| الطريقة | الحدث | الوصف |
|--------|-------|-------------|
| `handlePaymentSucceeded` | اكتمل الدفع | يقوم بتحديث سجل الدفع، ويطلق رسالة تأكيد إلكترونية |
| `handlePaymentFailed` | فشل الدفع | فشل السجلات، قد يخطر المستخدم |
| `handleSubscriptionCreated` | اشتراك جديد | ينشئ سجل الاشتراك في قاعدة البيانات |
| `handleSubscriptionUpdated` | تغيير الخطة | تحديثات تفاصيل الاشتراك |
| 4ـ | الإلغاء | تحديثات الحالة، تحديد تاريخ الإلغاء |
| 5 ــ | الدفع المتكرر | يمتد فترة الاشتراك |
| 6ـ | الفشل المتكرر | وضع علامة على أنها تجاوزت تاريخ الاستحقاق، وإعلام المستخدم |
| `handleSubscriptionTrialEnding` | نهاية المحاكمة | يرسل إشعارًا بانتهاء النسخة التجريبية |

## تنسيق استجابة Webhook

تُرجع جميع نقاط نهاية خطاف الويب تنسيقًا ثابتًا:

**النجاح (200):**
```json
{ "received": true }
```

**خطأ العميل (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

يعد إرجاع الحالة 200 أمرًا بالغ الأهمية للإقرار بالاستلام. إذا تم إرجاع 400 أو 500، فسيقوم موفرو الدفع عادةً بإعادة محاولة التسليم عبر الويب.

## الحصول على نقطة النهاية

يعالج كل مسار خطاف ويب أيضًا طلبات GET لأغراض التشخيص:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## تكوين خطافات الويب في لوحات معلومات الموفر

### سوليدجيت

1. انتقل إلى لوحة معلومات Solidgate الخاصة بك
2. انتقل إلى **الإعدادات** ثم **الخطافات عبر الويب**
3. أضف عنوان URL لخطاف الويب الخاص بك: 0
4. حدد الأحداث للاشتراك فيها: المدفوعات والاشتراكات والمبالغ المستردة
5. انسخ سر خطاف الويب إلى متغير البيئة 1

### نمط عنوان URL للويب هوك

كل مزود لديه نقطة النهاية المخصصة له:

| مقدم | عنوان URL للويب هوك |
|----------|------------|
| شريط | `/api/stripe/webhook` |
| سوليدجيت | `/api/solidgate/webhook` |
| ليمونسكويزي | 4ـ |
| القطبية | 5 ــ |

## اختبار خطافات الويب محليًا

### استخدام نغروك أو نفق مشابه

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

ثم قم بتكوين عنوان URL الخاص بـ ngrok كنقطة نهاية خطاف الويب الخاص بك في لوحة معلومات الموفر (على سبيل المثال، `https://abc123.ngrok.io/api/solidgate/webhook` ).

### اختبار يدوي باستخدام الضفيرة

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## معالجة الأخطاء

يتم تضمين كل وظيفة معالج في محاولة/التقاط لمنع فشل معالج واحد من التسبب في استجابة 400/500:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

ويضمن ذلك الإقرار دائمًا بخطاف الويب من خلال استجابة 200، حتى في حالة فشل المعالجة الداخلية. يتم تسجيل أخطاء المعالجة للتحقيق فيها دون التسبب في حلقات إعادة محاولة الموفر.

## الاعتبارات الأمنية

- **التحقق دائمًا من التوقيعات** -- لا تقم مطلقًا بمعالجة حمولات webhook دون التحقق من صحة التوقيع
- **استخدام النص الخام** - تحليل نص الطلب الأولي للتحقق من التوقيع، وليس النص الذي تم تحليله بواسطة JSON
- **العجز** -- قم بتنفيذ إلغاء البيانات المكررة للتعامل مع إعادة محاولة الموفر بأمان
- **التسجيل** - سجل معرفات خطاف الويب وأنواع الأحداث لمسارات التدقيق
- **HTTPS فقط** - يجب تقديم نقاط نهاية خطاف الويب عبر HTTPS في الإنتاج
