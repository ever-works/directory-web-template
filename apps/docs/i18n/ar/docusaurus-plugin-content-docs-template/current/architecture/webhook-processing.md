---
id: webhook-processing
title: معالجة الويب هوك
sidebar_label: خطافات الويب
sidebar_position: 67
---

# معالجة الويب هوك

## نظرة عامة

يقوم قالب Ever Works بمعالجة خطافات الويب الواردة من ثلاثة موفري خدمات دفع: **Stripe** و**Lemon Squeezy** و**Polar**. لدى كل مزود مسار API مخصص للتحقق من التوقيعات، وتطبيع أنواع الأحداث إلى تعداد `WebhookEventType` مشترك، وإرسال وظائف المعالج لإدارة الاشتراك وتتبع الدفع وإشعارات البريد الإلكتروني.

## الهندسة المعمارية

```mermaid
flowchart TD
    A[Payment Provider] -->|POST| B{Which Provider?}

    B -->|stripe-signature header| C[/api/stripe/webhook]
    B -->|x-signature header| D[/api/lemonsqueezy/webhook]
    B -->|webhook-signature header| E[/api/polar/webhook]

    C --> F[Stripe Provider]
    D --> G[LemonSqueezy Provider]
    E --> H[Polar Provider]

    F --> I[Verify Signature]
    G --> I
    H --> I

    I -->|Valid| J[Normalize to WebhookEventType]
    I -->|Invalid| K[400 Bad Request]

    J --> L{Event Type Router}

    L -->|SUBSCRIPTION_CREATED| M[handleSubscriptionCreated]
    L -->|SUBSCRIPTION_UPDATED| N[handleSubscriptionUpdated]
    L -->|SUBSCRIPTION_CANCELLED| O[handleSubscriptionCancelled]
    L -->|PAYMENT_SUCCEEDED| P[handlePaymentSucceeded]
    L -->|PAYMENT_FAILED| Q[handlePaymentFailed]
    L -->|TRIAL_ENDING| R[handleTrialEnding]

    M --> S{Is Sponsor Ad?}
    S -->|Yes| T[Sponsor Ad Handlers]
    S -->|No| U[WebhookSubscriptionService]
    U --> V[Database Update]
    U --> W[Email Notification]
```

## ملفات المصدر

|ملف|الغرض|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|معالج webhook الشريطي|
|`template/app/api/lemonsqueezy/webhook/route.ts`|معالج خطاف الويب LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|نقطة دخول خطاف الويب القطبي|
|`template/app/api/polar/webhook/router.ts`|توجيه الأحداث القطبية|
|`template/app/api/polar/webhook/handlers.ts`|معالجات الأحداث القطبية|
|`template/app/api/polar/webhook/types.ts`|تعريفات نوع خطاف الويب القطبي|
|`template/app/api/polar/webhook/utils.ts`|وظائف المنفعة القطبية|

## أنواع الأحداث الشائعة

يقوم جميع الموفرين بتطبيع أحداثهم إلى التعداد `WebhookEventType` المشترك:

|WebhookEventType|شريط|ليمونسكويزي|القطبية|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## معالجة شريط Webhook

### التحقق من التوقيع

```typescript
export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    const stripeProvider = getOrCreateStripeProvider();
    const webhookResult = await stripeProvider.handleWebhook(body, signature);

    if (!webhookResult.received) {
        return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
    }

    // Route to handler based on event type
    switch (webhookResult.type) {
        case WebhookEventType.SUBSCRIPTION_CREATED:
            await handleSubscriptionCreated(webhookResult.data);
            break;
        // ... other cases
    }

    return NextResponse.json({ received: true });
}
```

### نمط المعالج (شريط)

يتبع كل معالج نمطًا ثابتًا:

1. تحقق مما إذا كان اشتراكًا في إعلان الراعي (معاملة خاصة)
2. تحديث سجلات الاشتراك عبر `WebhookSubscriptionService`
3. استخراج معلومات العميل وإعداد بيانات البريد الإلكتروني
4. أرسل إشعارًا بالبريد الإلكتروني المناسب
5. سجل النجاح أو الفشل

```typescript
async function handleSubscriptionCreated(data: any) {
    // Check for sponsor ad
    if (isSponsorAdSubscription(data)) {
        await handleSponsorAdActivation(data);
        return;
    }

    // Update database
    await webhookSubscriptionService.handleSubscriptionCreated(data);

    // Send email notification
    const customerInfo = extractCustomerInfo(data);
    const emailData = {
        customerName: customerInfo.customerName,
        planName: getPlanName(priceId),
        amount: formatAmount(unitAmount, currency),
        // ...
    };
    await paymentEmailService.sendNewSubscriptionEmail(emailData);
}
```

## معالجة Webhook من LemonSqueezy

### تعيين نوع الحدث

يستخدم LemonSqueezy أسماء أحداث مختلفة تم تعيينها للتعداد المشترك:

```typescript
function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
    const eventMapping: Record<string, string> = {
        'subscription_created': WebhookEventType.SUBSCRIPTION_CREATED,
        'subscription_updated': WebhookEventType.SUBSCRIPTION_UPDATED,
        'subscription_cancelled': WebhookEventType.SUBSCRIPTION_CANCELLED,
        'subscription_payment_success': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
        'subscription_payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
        'order_created': WebhookEventType.PAYMENT_SUCCEEDED,
        'order_refunded': WebhookEventType.REFUND_SUCCEEDED,
    };
    return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}
```

### الوصول إلى البيانات المخصصة

يستخدم LemonSqueezy `custom_data` و`meta.custom_data` للبيانات التعريفية (بدلاً من `metadata` من Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## معالجة القطبية Webhook

يستخدم Polar بنية أكثر تنظيماً مع ملفات منفصلة للتوجيه والمعالجة والأنواع.

### نمط جهاز التوجيه

```typescript
// router.ts
function isValidWebhookEventType(eventType: string): eventType is WebhookEventType {
    const allowedEventTypes: Set<WebhookEventType> = new Set([
        WebhookEventType.SUBSCRIPTION_CREATED,
        WebhookEventType.SUBSCRIPTION_UPDATED,
        // ... all handled types
    ]);
    return allowedEventTypes.has(eventType as WebhookEventType);
}

export async function routeWebhookEvent(
    eventType: string,
    data: PolarWebhookData
): Promise<void> {
    if (!isValidWebhookEventType(eventType)) {
        logger.warn('Invalid or unhandled webhook event type', { eventType });
        return;
    }

    const eventHandlers: Partial<Record<WebhookEventType, Handler>> = {
        [WebhookEventType.SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
        [WebhookEventType.SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
        // ... handler map
    };

    const handler = eventHandlers[eventType];
    if (handler) await handler(data);
}
```

يتحقق جهاز التوجيه من صحة أنواع الأحداث مقابل القائمة المسموح بها قبل الإرسال، مما يمنع استدعاءات الأساليب الديناميكية التي لم يتم التحقق من صحتها.

### التحقق من التوقيع (القطبي)

```typescript
const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
const WEBHOOK_ID_HEADER = 'webhook-id';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Validate payload structure
    if (!validateWebhookPayload(body)) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Verify signature with all three headers
    const polarProvider = getOrCreatePolarProvider();
    const webhookResult = await polarProvider.handleWebhook(
        body,
        signatureHeader,
        bodyText,           // Raw body for signature verification
        timestampHeader,
        webhookIdHeader
    );

    await routeWebhookEvent(webhookResult.type, webhookResult.data);
    return NextResponse.json({ received: true });
}
```

### مرونة التعامل مع البريد الإلكتروني

تقوم المعالجات القطبية بتغليف عمليات البريد الإلكتروني في كتل محاولة/التقاط متداخلة بحيث لا تفشل عمليات فشل البريد الإلكتروني مطلقًا في خطاف الويب:

```typescript
export async function handleSubscriptionCreated(data: PolarWebhookData): Promise<void> {
    try {
        await webhookSubscriptionService.handleSubscriptionCreated(data);

        try {
            // Email sending - isolated failure domain
            const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);
        } catch (emailError) {
            // Log but don't fail the webhook
            logger.warn('Skipping email notification due to configuration error');
        }
    } catch (error) {
        logger.error('Error handling subscription created');
        throw error;  // Re-throw: database failures should fail the webhook
    }
}
```

## التعامل مع إعلانات الراعي

يكتشف مقدمو الخدمة الثلاثة اشتراكات إعلانات الجهات الراعية عبر البيانات الوصفية ويوجهونها إلى معالجات مخصصة:

|العمل|وظيفة|الوصف|
|--------|----------|-------------|
|تم تأكيد الدفع|`handleSponsorAdActivation()`|يضبط حالة الإعلان على في انتظار المراجعة|
|تم إلغاء الاشتراك|`handleSponsorAdCancellation()`|يلغي إعلان الراعي|
|تم تجديد الدفع|`handleSponsorAdRenewal()`|يمتد تاريخ انتهاء الإعلان|

## أفضل الممارسات

1. **التحقق دائمًا من التوقيعات** -- لا تعالج أبدًا خطافات الويب التي لم يتم التحقق منها
2. **استخدم النص الأولي للتحقق من التوقيع** - قم بتحليل JSON بشكل منفصل بعد التحقق
3. **إرجاع 200 سريعًا** - يقوم مقدمو خدمات الدفع بإعادة المحاولة من خلال استجابات غير 2xx
4. ** عزل حالات فشل البريد الإلكتروني ** - التفاف إرسال البريد الإلكتروني في محاولة/التقاط متداخلة
5. **التحقق من صحة أنواع الأحداث** -- تحقق من القائمة المسموح بها قبل الإرسال
6. **السجل باستخدام البيانات المنظمة** - تضمين معرفات الأحداث وأنواعها في جميع إدخالات السجل
7. **استخدام موفري الخدمة الفردية** - `getOrCreateStripeProvider()` يمنع مثيلات متعددة
