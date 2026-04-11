---
id: webhook-architecture
title: Webhook Architecture
sidebar_label: Webhooks
sidebar_position: 3
---

# ארכיטקטורת Webhook

מדריך זה מכסה את מערכת הטיפול ב-webhook המשמשת לעיבוד אירועים משירותים חיצוניים כמו Stripe, LemonSqueezy וספקי תשלומים אחרים, כולל אימות חתימה, ניתוב אירועים, אי-כוח וטיפול חוזר.

## סקירה כללית של אדריכלות

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

## ספק תשלומים Webhooks

התבנית משתמשת בדפוס `PaymentServiceManager` כדי לתמוך במספר ספקי תשלומים:

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

### דפוס Webhook Route Handler

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

## אימות חתימה

### Stripe Webhooks

Stripe משתמש בחתימות HMAC-SHA256 עם חותמת זמן כדי למנוע התקפות שידור חוזר:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy Webhooks

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

## ניתוב אירועים

### סוג האירוע למיפוי המטפל

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

## אדמומיות

### מניעת עיבוד כפול

ספקי Webhook עשויים לשלוח שוב אירועים. השתמש במזהה האירוע כדי למנוע עיבוד כפול:

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

## נסה לטפל שוב

### ספק נסה שוב התנהגות

| ספק | נסה שוב לוח זמנים | מקסימום מנסה שוב | פסק זמן |
|--------|---------------|--------|--------------|
| פס | גיבוי אקספוננציאלי במשך 3 ימים | ~16 ניסיונות | 20 שניות |
| LemonSqueezy | גיבוי אקספוננציאלי | 5 ניסיונות | 15 שניות |

### שיטות עבודה מומלצות למטפלים בטוחים לנסות שוב

1. **החזר 200 במהירות**: אשר קבלה תוך 5 שניות. הורדת עיבוד כבד.
2. **מטפלי אימפוטנטים**: ודא שעיבוד חוזר של אותו אירוע מייצר את אותה תוצאה.
3. **החזר 4xx עבור כשלים קבועים**: החזר 400 עבור חתימות לא חוקיות. הספק לא ינסה שוב.
4. **החזר 5xx עבור כשלים חולפים**: החזר 500 אם מסד הנתונים שלך אינו זמין באופן זמני. הספק ינסה שוב.

## דפוס תור של אותיות מתות

עבור אירועים שנכשלים בעיבוד שוב ושוב, יישם דפוס של אותיות מתות:

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

## שיקולי אבטחה

1. **אמת תמיד חתימות** לפני עיבוד מטען אינטרנט כלשהו.
2. **השתמש בהשוואה בטוחה בתזמון** ( `crypto.timingSafeEqual` ) כדי למנוע התקפות תזמון.
3. **קרא גוף גולמי** לפני ניתוח JSON -- אימות חתימה דורש את הבייטים המדויקים שהתקבלו.
4. **הגבלת נקודות קצה של webhook** ל-POST בלבד.
5. **אל תחשוף סודות webhook** בקוד או ביומנים בצד הלקוח.
6. **אמת את נתוני האירועים** לפני שתפעל על פיהם -- אל תבטח בעיוורון במטעני webhook.

## שיקולי ביצועים

1. **אישור מהיר**: החזר 200 בחלון הזמן הקצוב של הספק. הורידו עבודה כבדה לעבודות רקע.
2. **כותב מסד נתונים**: צמצם למינימום פעולות DB במטפל ה-webhook. עדכוני אצווה במידת האפשר.
3. **רישום**: רישום מזהי אירועים וסוגים עבור ניפוי באגים, אך הימנע רישום מטענים מלאים (עשוי להכיל PII).

## פתרון בעיות

### אימות החתימה נכשל

1. ודא שאתה קורא את **גוף הבקשה הגולמית** (לא מנותח JSON).
2. בדוק שסוד ה-webhook תואם לזה שבלוח המחוונים של הספק שלך.
3. ודא שאין תוכנת ביניים שמשנה את גוף הבקשה לפני שהיא מגיעה למטפל.

### אירועים כפולים עובדו

1. יישם אימפוטנציה באמצעות מזהה האירוע כמתואר לעיל.
2. בדוק את הטבלה `webhookEvents` עבור ערכים כפולים.
3. השתמש באילוצים ייחודיים ברמת מסד הנתונים בעמודת מזהה האירוע.

### הזמן הקצוב לאירועים

1. העבר עיבוד כבד לעבודות רקע באמצעות `BackgroundJobManager` .
2. אשר את ה-webhook מיד ועבד באופן אסינכרוני.
3. הגדל את הזמן הקצוב עבור קריאות API חיצוניות במידת הצורך.

## תיעוד קשור

- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
- [API Client Architecture](./api-client-architecture.md)
