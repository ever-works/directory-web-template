---
id: webhook-architecture
title: هندسة الويب هوك
sidebar_label: خطافات الويب
sidebar_position: 3
---

# هندسة الويب هوك

يغطي هذا الدليل نظام التعامل مع خطاف الويب المستخدم لمعالجة الأحداث من الخدمات الخارجية مثل Stripe وLemonSqueezy وموفري الدفع الآخرين، بما في ذلك التحقق من التوقيع وتوجيه الأحداث والعجز وإعادة محاولة المعالجة.

## نظرة عامة على الهندسة المعمارية

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## الخطافات الإلكترونية لموفر الدفع

يستخدم القالب النمط `PaymentServiceManager` لدعم موفري الدفع المتعددين:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### نمط معالج مسار Webhook

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## التحقق من التوقيع

### خطافات الويب الشريطية

يستخدم Stripe توقيعات HMAC-SHA256 مع طابع زمني لمنع هجمات إعادة التشغيل:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### خطافات الويب ليمون سكويزي

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## توجيه الأحداث

### نوع الحدث لتعيين المعالج

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## العجز

### منع المعالجة المكررة

قد يقوم موفرو Webhook بإعادة إرسال الأحداث. استخدم معرف الحدث لمنع المعالجة المكررة:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## إعادة محاولة المعالجة

### سلوك إعادة محاولة الموفر

| مقدم | إعادة محاولة الجدولة | ماكس إعادة المحاولة | المهلة |
|----------|---------------------|--------|-------|
| شريط | التراجع الأسي على مدى 3 أيام | ~16 محاولة | 20 ثانية |
| ليمونسكويزي | التراجع الأسي | 5 محاولات | 15 ثانية |

### أفضل الممارسات للمعالجات الآمنة لإعادة المحاولة

1. **إرجاع 200 بسرعة**: قم بالإقرار بالاستلام خلال 5 ثوانٍ. تفريغ المعالجة الثقيلة.
2. **المعالجات غير الفعالة**: تأكد من أن إعادة معالجة نفس الحدث تؤدي إلى نفس النتيجة.
3. **إرجاع 4xx للفشل الدائم**: إرجاع 400 للتوقيعات غير الصالحة. لن يقوم الموفر بإعادة المحاولة.
4. **إرجاع 5xx للفشل العابر**: إرجاع 500 إذا كانت قاعدة البيانات الخاصة بك غير متاحة مؤقتًا. سيقوم الموفر بإعادة المحاولة.

## نمط قائمة انتظار الرسائل الميتة

بالنسبة للأحداث التي تفشل معالجتها بشكل متكرر، قم بتنفيذ نمط الحروف الميتة:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## الاعتبارات الأمنية

1. **تحقق دائمًا من التوقيعات** قبل معالجة أي حمولة خطاف على الويب.
2. **استخدم مقارنة التوقيت الآمن** ( `crypto.timingSafeEqual` ) لمنع هجمات التوقيت.
3. **اقرأ النص الخام** قبل تحليل JSON - يتطلب التحقق من التوقيع وحدات البايت المستلمة بالضبط.
4. **قصر نقاط نهاية خطاف الويب** على POST فقط.
5. **لا تكشف أسرار خطاف الويب** في التعليمات البرمجية أو السجلات من جانب العميل.
6. **التحقق من صحة بيانات الحدث** قبل التصرف بناءً عليها - لا تثق بحمولات webhook بشكل أعمى.

## اعتبارات الأداء

1. **الإقرار السريع**: قم بإرجاع 200 خلال نافذة المهلة الخاصة بالموفر. تفريغ العمل الثقيل إلى وظائف الخلفية.
2. ** عمليات الكتابة في قاعدة البيانات **: قلل من عمليات قاعدة البيانات في معالج webhook. التحديثات دفعة حيثما كان ذلك ممكنا.
3. **التسجيل**: قم بتسجيل معرفات الأحداث وأنواعها لتصحيح الأخطاء، ولكن تجنب تسجيل الحمولات الكاملة (قد تحتوي على معلومات تحديد الهوية الشخصية).

## استكشاف الأخطاء وإصلاحها

### فشل التحقق من التوقيع

1. تأكد من أنك تقرأ **نص الطلب الأولي** (وليس JSON الذي تم تحليله).
2. تأكد من أن سر webhook يطابق السر الموجود في لوحة تحكم المزود الخاص بك.
3. تحقق من عدم وجود برامج وسيطة لتعديل نص الطلب قبل وصوله إلى المعالج.

### تمت معالجة الأحداث المكررة

1. قم بتنفيذ العجز باستخدام معرف الحدث كما هو موضح أعلاه.
2. تحقق من الجدول 1 للإدخالات المكررة.
3. استخدم القيود الفريدة على مستوى قاعدة البيانات في عمود معرف الحدث.

### انتهت مهلة الأحداث

1. انقل المعالجة الثقيلة إلى المهام الخلفية باستخدام الزر 2.
2. قم بالتعرف على خطاف الويب على الفور وقم بالمعالجة بشكل غير متزامن.
3. قم بزيادة المهلة الزمنية لاستدعاءات واجهة برمجة التطبيقات الخارجية إذا لزم الأمر.

## الوثائق ذات الصلة

- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
- [بنية تحديد المعدل](./rate-limiting-architecture.md)
- [بنية عميل API](./api-client-architecture.md)
