---
id: webhook-processing
title: עיבוד Webhook
sidebar_label: Webhooks
sidebar_position: 67
---

# עיבוד Webhook

## סקירה כללית

תבנית Ever Works מעבדת webhooks נכנסות משלושה ספקי תשלום: **Stripe**, **Lemon Squeezy** ו-**Polar**. לכל ספק יש מסלול API ייעודי המאמת חתימות, מנרמל סוגי אירועים ל-enum משותף של `WebhookEventType`, ושולח למטפל פונקציות לניהול מנויים, מעקב תשלומים והודעות דוא"ל.

## אדריכלות

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

## קבצי מקור

|קובץ|מטרה|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|מטפל ב-Stripe webhook|
|`template/app/api/lemonsqueezy/webhook/route.ts`|מטפל ברשת LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|נקודת הכניסה של Polar webhook|
|`template/app/api/polar/webhook/router.ts`|ניתוב אירועים של Polar|
|`template/app/api/polar/webhook/handlers.ts`|מטפלי אירועים של Polar|
|`template/app/api/polar/webhook/types.ts`|הגדרות סוג Webhook של Polar|
|`template/app/api/polar/webhook/utils.ts`|פונקציות שירות קוטביות|

## סוגי אירועים נפוצים

כל הספקים מנרמלים את האירועים שלהם ל-`WebhookEventType` המשותף:

|WebhookEventType|פס|LemonSqueezy|פולאר|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Stripe Webhook Processing

### אימות חתימה

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

### דפוס מטפל (פס)

כל מטפל עוקב אחר דפוס עקבי:

1. בדוק אם זה מנוי למודעות חסות (טיפול מיוחד)
2. עדכן את רשומות המנוי באמצעות `WebhookSubscriptionService`
3. חלץ פרטי לקוח והכן נתוני דוא"ל
4. שלח אימייל התראה מתאים
5. יומן הצלחה או כישלון

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

## LemonSqueezy Webhook Processing

### מיפוי סוגי אירועים

LemonSqueezy משתמש בשמות אירועים שונים הממופים ל-enum המשותף:

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

### גישה לנתונים מותאמים אישית

LemonSqueezy משתמש ב-`custom_data` וב-`meta.custom_data` עבור מטא נתונים (במקום `metadata` של Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Polar Webhook Processing

Polar משתמש בארכיטקטורה מובנית יותר עם קבצים נפרדים לניתוב, טיפול וסוגים.

### תבנית נתב

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

הנתב מאמת סוגי אירועים מול רשימת היתרים לפני שיגור, ומונע קריאות שיטה דינמיות לא מאומתות.

### אימות חתימה (פולאר)

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

### טיפול עמיד בדואר אלקטרוני

מטפלי Polar עוטפים את פעולות הדוא"ל בחסימות ניסיון/תפוס מקוננים, כך שכשלים בדוא"ל לעולם לא יכשלו ב-webhook:

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

## טיפול במודעות חסות

כל שלושת הספקים מזהים מינויים למודעות חסות באמצעות מטא נתונים ומנתבים אותם למטפלים ייעודיים:

|פעולה|פונקציה|תיאור|
|--------|----------|-------------|
|התשלום אושר|`handleSponsorAdActivation()`|מגדיר את סטטוס המודעה להמתנה לבדיקה|
|המנוי בוטל|`handleSponsorAdCancellation()`|מבטל את מודעת החסות|
|התשלום חודש|`handleSponsorAdRenewal()`|מאריך את תאריך הסיום של המודעה|

## שיטות עבודה מומלצות

1. **אמת תמיד חתימות** -- לעולם אל תעבדו הווקס אינטרנט לא מאומתים
2. **השתמש בגוף גולמי לאימות חתימה** -- נתח JSON בנפרד לאחר האימות
3. **החזר 200 במהירות** -- ספקי תשלומים מנסים שוב בתגובות שאינן 2xx
4. **בודד כשלי דוא"ל** -- עטוף את שליחת הדוא"ל ב-Try/Catch מקונן
5. **אמת סוגי אירועים** - בדוק מול רשימת היתרים לפני שיגור
6. **יומן עם נתונים מובנים** -- כלול מזהי אירועים וסוגים בכל ערכי היומן
7. **השתמש בספקי יחיד** -- `getOrCreateStripeProvider()` מונע מופעים מרובים
