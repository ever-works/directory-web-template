---
id: solidgate-deep-dive
title: Solidgate Deep Dive
sidebar_label: סולידגייט
sidebar_position: 7
---

# Solidgate Deep Dive

דף זה מכסה את השילוב המלא של Solidgate, כולל יצירת קופה, עיבוד webhook, אימות תשלום וטופס התשלום המשובץ.

## סקירה כללית

Solidgate היא ספקית תשתית תשלום שתומכת הן בתזרימי תשלום מתארחים והן ב-React SDK הניתן להטמעה עבור טפסי תשלום מוטבעים. האינטגרציה יוצרת כוונות תשלום באמצעות ממשק ה-API של Solidgate ותומכת בעיבוד אירועים מונע על ידי webhook עם הגנת אי-דמוקרטיה. Solidgate משתמשת ב-HMAC-SHA512 לאימות חתימת ה-webhook.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/solidgate/checkout`|נדרשת הפעלה|צור סשן קופה / כוונת תשלום|
|`POST`|`/api/solidgate/webhook`|נדרשת חתימה|עיבוד אירועי webhook נכנסים|
|`GET`|`/api/solidgate/webhook`|אין|מחזיר תיעוד נקודת קצה|

## יצירת קופה (POST)

### גוף הבקשה

נקודת הקצה של התשלום משתמשת באימות Zod לבדיקת קלט קפדנית:

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

### בקשה לדוגמה

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

### איך זה עובד

1. מאמת את המשתמש באמצעות `auth()`
2. מאמת את גוף הבקשה עם סכימת Zod
3. פותר או יוצר לקוח של Solidgate
4. יוצר כוונת תשלום באמצעות ממשק ה-API של Solidgate
5. מחזירה את מזהה התשלום ואת סוד הלקוח עבור ה-SDK המוטבע

### יישום ספק

השיטה `createPaymentIntent` בונה את בקשת ה-API:

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

### תגובת הצלחה (200)

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

השדה `url` מכיל את מזהה כוונת התשלום המשמש לאתחול ה-SDK של Solidgate React.

## טופס תשלום משובץ

Solidgate מספקת SDK של React עבור טפסי תשלום מוטבעים. הספק יוצר חתימה לאתחול SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

שיטת `getUIComponents()` מחזירה מעטפת טופס תשלום מוגדרת:

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

## עיבוד Webhook

### אימות חתימה

Solidgate משתמש ב-HMAC-SHA512 עבור חתימות Webhook. כותרת החתימה יכולה להיות `x-signature` או `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

הספק מאמת את החתימה מול הגוף הגולמי:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### הגנה על אימפוטנציה

נקודת הסיום של webhook כוללת הגנה על אי-דמוקרטיה בזיכרון כדי למנוע עיבוד כפול:

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

:::הערה
בסביבה ללא שרת ייצור, יש להחליף את הסט בזיכרון ב-Redis או בטבלת מסד נתונים עבור אי-דמוקרטיה בין מופעים.
:::

### מיפוי אירועים

|אירוע Solidgate|סוג פנימי|
|----------------|---------------|
|`payment.succeeded` / `payment.completed`|`payment_succeeded`|
|`payment.failed` / `payment.declined`|`payment_failed`|
|`subscription.created`|`subscription_created`|
|`subscription.updated`|`subscription_updated`|
|`subscription.cancelled` / `subscription.canceled`|`subscription_cancelled`|
|`refund.processed` / `refund.completed`|`refund_succeeded`|

### מבנה המטפל

כל מטפל מחלק ל-`WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

ה-`WebhookSubscriptionService` מאותחל עם קבוע הספק `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## אימות תשלום

הספק תומך באימות תשלום באמצעות ממשק ה-API של Solidgate:

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

## ניהול מנויים

### יצירת מנויים

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

### ביטול מנויים

תומך בביטול מיידי ובתום תקופה כאחד:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### עדכון מנויים

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## תקשורת API

כל קריאות ה-API של Solidgate משתמשות בשיטה מרכזית `makeApiRequest`:

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

## טיפול בשגיאות

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| 400 |`Invalid request body`|אימות Zod נכשל|
| 400 |`Invalid JSON`|גוף הבקשה שגוי|
| 400 |`Failed to create customer`|פתרון הלקוח נכשל|
| 400 |`No signature provided`|Webhook חסרה חתימה|
| 400 |`Webhook not processed`|אימות החתימה נכשל|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 500 |`Failed to create checkout session`|שגיאת ממשק API של Solidgate|

שגיאות אימות Zod מחזירות הודעות מפורטות ברמת השדה:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`SOLIDGATE_API_KEY`|כן|מפתח ממשק API של Solidgate|
|`SOLIDGATE_SECRET_KEY`|כן|מפתח סודי ליצירת חתימות|
|`SOLIDGATE_WEBHOOK_SECRET`|כן|סוד חתימת Webhook|
|`SOLIDGATE_PUBLISHABLE_KEY`|כן|מפתח בר פרסום עבור React SDK|
|`SOLIDGATE_MERCHANT_ID`|כן|מזהה סוחר|
|`SOLIDGATE_API_BASE_URL`|לא|כתובת ה-API הבסיסית (ברירת מחדל: `https://api.solidgate.com/v1`)|

## שיקולי אבטחה

- HMAC-SHA512 משמש גם לאימות חתימה של חיבור אינטרנט וגם לאימות כוונת תשלום
- המפתח הסודי וסוד ה-webhook לעולם לא נחשפים ללקוח
- הגנת Idempotency מונעת עיבוד כפול של webhook
- אימות Zod מבטיח בדיקת קלט קפדנית בנקודת הקצה של התשלום
- עקבות מחסנית שגיאה נכללים רק במצב פיתוח
- השירות `safeErrorMessage` מחטא הודעות שגיאה לצורך ייצור

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
