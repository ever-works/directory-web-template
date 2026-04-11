---
id: webhooks
title: Webhooks של תשלום
sidebar_label: Webhooks
sidebar_position: 7
---

# תשלומים Webhooks

התבנית Ever Works מעבדת תשלומים באינטרנט מכל ארבעת הספקים הנתמכים באמצעות מסלולי API ייעודיים. כל נקודת קצה של webhook מטפלת באימות חתימה, ניתוב אירועים, ניהול מחזור חיים של מנוי והודעות דוא"ל.

## מיקומי מקור

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## ארכיטקטורת Webhook

כל מסלולי ה-webhook של ספק פועלים לפי אותו דפוס:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

כל מסלול מאציל היגיון עסקי ל- `WebhookSubscriptionService` המשותף, אשר מנרמל נתונים ספציפיים לספק לפורמט נפוץ לפני עדכון מסד הנתונים.

## סוגי אירועי Webhook

התבנית מגדירה קבוצה מקיפה של סוגי אירועים שכל הספקים ממפים לתוכם:

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

## Solidgate Webhook Handler

### נקודת קצה

```
POST /api/solidgate/webhook
```

### אימות חתימה

המסלול של Solidgate webhook קורא את החתימה מהכותרת `x-signature` או `solidgate-signature` :

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

הספק מאמת את החתימה באמצעות HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### אידמונטיות

המטפל מיישם בדיקת אימפוטנציה בזיכרון כדי למנוע עיבוד אירוע כפול:

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

:::הערה
בסביבה נטולת שרת ייצור, החלף את הזיכרון `Set` ב-Redis או בטבלת מסד נתונים עבור אי-כוחניות אמינה בין מופעים.
:::

### ניתוב אירועים

לאחר האימות, אירועים מנותבים למטפלים ספציפיים:

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

### מיפוי אירועי Solidgate

הספק ממפה שמות אירועים ספציפיים ל-Solidgate לסוגים הגנריים של התבנית:

| אירוע סולידגייט | אירוע תבנית |
|----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookSubscriptionService

כל המטפלים ב-webhook מאצילים ל- `WebhookSubscriptionService` המשותף. שירות זה מופעל לפי ספק:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### נורמליזציה של נתונים

השירות מנרמל את עומסי ה-webhook לפורמט `WebhookSubscriptionData` נפוץ:

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

### שיטות מטפל

השירות מספק מטפלים עבור כל סוג אירוע webhook:

| שיטה | אירוע | תיאור |
|--------|-------|-------------|
| `handlePaymentSucceeded` | התשלום הושלם | מעדכן את רשומת התשלום, מפעיל דוא"ל אישור |
| `handlePaymentFailed` | התשלום נכשל | כשל ביומנים, עלול להודיע ​​למשתמש |
| `handleSubscriptionCreated` | מנוי חדש | יוצר רשומת מנוי במסד הנתונים |
| `handleSubscriptionUpdated` | שינוי תוכנית | מעדכן את פרטי המנוי |
| `handleSubscriptionCancelled` | ביטול | מעדכן סטטוס, קובע תאריך ביטול |
| `handleSubscriptionPaymentSucceeded` | תשלום חוזר | מאריך את תקופת המנוי |
| `handleSubscriptionPaymentFailed` | כישלון חוזר | מסמן כתשלום, מודיע למשתמש |
| `handleSubscriptionTrialEnding` | ניסיון מסתיים | שולח הודעה על סיום ניסיון |

## פורמט תגובה של Webhook

כל נקודות הקצה של webhook מחזירות פורמט עקבי:

**הצלחה (200):**
```json
{ "received": true }
```

**שגיאת לקוח (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

החזרת סטטוס 200 היא קריטית כדי לאשר קבלה. אם 400 או 500 מוחזרים, ספקי תשלום בדרך כלל ינסו שוב את מסירת ה-webhook.

## קבל נקודת קצה

כל מסלול webhook מטפל גם בבקשות GET למטרות אבחון:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## הגדרת Webhooks במרכזי מחוונים של ספקים

### Solidgate

1. נווט אל לוח המחוונים של Solidgate
2. עבור אל **הגדרות** ואז **Webhooks**
3. הוסף את כתובת האתר שלך ל-webhook: `https://yourdomain.com/api/solidgate/webhook` 4. בחר אירועים להירשם אליהם: תשלומים, מנויים, החזרים כספיים
5. העתק את סוד ה-webhook למשתנה הסביבה `SOLIDGATE_WEBHOOK_SECRET` שלך

### דפוס כתובת URL של Webhook

לכל ספק יש נקודת קצה ייעודית משלו:

| ספק | Webhook URL |
|--------|----------------|
| פס | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| פולאר | `/api/polar/webhook` |

## בדיקת Webhooks באופן מקומי

### שימוש ב-ngrok או מנהרה דומה

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

לאחר מכן הגדר את כתובת האתר של ngrok כנקודת הקצה של ה-webhook שלך בלוח המחוונים של הספק (לדוגמה, `https://abc123.ngrok.io/api/solidgate/webhook` ).

### בדיקה ידנית עם תלתל

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

## טיפול בשגיאות

כל פונקציית מטפל עטופה ב-try/catch כדי למנוע מכשל מטפל יחיד לגרום לתגובה של 400/500:

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

זה מבטיח שה-webhook תמיד מקבל אישור עם 200 תגובה, גם אם העיבוד הפנימי נכשל. שגיאות עיבוד נרשמות לחקירה מבלי לגרום ללולאות ניסיון חוזר של הספק.

## שיקולי אבטחה

- **אמת תמיד חתימות** -- לעולם אל תעבדו עומסי חיבור לאינטרנט ללא אימות חתימה
- **השתמש בגוף גולמי** -- נתח את טקסט הבקשה הגולמי לאימות חתימה, לא את הגוף המנתח ב-JSON
- **אידפוטנציה** - יישם מניעת כפילויות כדי לטפל בניסיונות חוזרים של ספקים בחן
- **רישום** - רישום מזהי webhook וסוגי אירועים עבור שבילי ביקורת
- **HTTPS בלבד** -- נקודות קצה webhook חייבות להיות מוצגות באמצעות HTTPS בייצור
