---
id: polar-deep-dive
title: Polar Deep Dive
sidebar_label: פולאר
sidebar_position: 6
---

# Polar Deep Dive

דף זה מכסה את השילוב המלא של Polar, כולל יצירת קופה, ניהול מנויים, פורטל לקוחות ועיבוד webhook.

## סקירה כללית

Polar היא פלטפורמת תשלום מודרנית המיועדת לתוכנה ולמוצרים דיגיטליים. האינטגרציה תומכת הן בתשלומים חד פעמיים והן במינויים דרך מערכת התשלום של Polar, עם ניהול מחזור חיים מונחה דרך האינטרנט. Polar משתמש במוצרים בהיקף ארגוני וב-`@polar-sh/sdk` לאינטראקציות עם API.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/polar/checkout`|נדרשת הפעלה|צור סשן קופה (מינוי או חד פעמי)|
|`GET`|`/api/polar/checkout`|נדרשת הפעלה|אחזר את סטטוס הפעלת התשלום|
|`POST`|`/api/polar/webhook`|נדרשת חתימה|עיבוד אירועי webhook נכנסים|

## יצירת קופה (POST)

### גוף הבקשה

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### בקשה לדוגמה

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### איך זה עובד

מסלול התשלום מטפל בשני זרמים:

**מצב מנוי:**
1. מאמת את המשתמש ופותר את הלקוח של Polar
2. מחטא מטא נתונים (מסיר ערכי `undefined` -- Polar דוחה אותם)
3. מתקשר `polarProvider.createSubscription()` מה שיוצר סשן קופה
4. מחזירה את כתובת האתר לקופה מתוצאת המנוי

**מצב תשלום חד פעמי:**
1. מאמת את המשתמש ופותר את הלקוח של Polar
2. משתמש ישירות ב-Polar SDK כדי ליצור קופה
3. מחזירה את כתובת האתר של התשלום

### חיטוי מטא נתונים

Polar דורש שכל ערכי המטא נתונים אינם אפסיים ואינם מוגדרים:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### תגובת הצלחה (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## אחזור הפעלת קופה (GET)

### פרמטרי שאילתה

|פרמטר|חובה|תיאור|
|-----------|----------|-------------|
|`checkout_id`|כן|מזהה הפגישה של Polar Checkout|

### תגובת הצלחה (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## ניהול מנויים

### יצירת מנויים

שיטת `PolarProvider.createSubscription()` יוצרת קופה עבור המנוי:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### ביטול מנויים

Polar תומך בשתי אסטרטגיות ביטול:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

הספק מאמת את מצב המנוי לפני הביטול:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### הפעלה מחדש של מנויים

ניתן להפעיל מחדש מנויים שתוכננו לביטול:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### עדכון מנויים

שינויים בתוכנית מטופלים דרך `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## עיבוד Webhook

### אימות חתימה

Polar משתמש בפונקציה `@polar-sh/sdk/webhooks` `validateEvent` לצורך אימות. ה-webhook דורש שלוש כותרות:

|כותרת|תיאור|
|--------|-------------|
|`webhook-signature`|חתימת HMAC SHA256 (פורמט: `v1,<hex_signature>`)|
|`webhook-timestamp`|חותמת זמן יוניקס של האירוע|
|`webhook-id`|מזהה משלוח webhook ייחודי|

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### סוגי אירועים

|אירוע קוטב|מיפוי פנימי|
|-------------|-----------------|
|`checkout.succeeded`|התשלום הצליח|
|`checkout.failed`|התשלום נכשל|
|`subscription.created`|נוצר מנוי|
|`subscription.updated`|המנוי עודכן|
|`subscription.canceled`|המנוי בוטל|
|`invoice.paid`|תשלום המנוי הצליח|
|`invoice.payment_failed`|תשלום המנוי נכשל|

### נתב Webhook

אירועים נשלחים באמצעות מודול נתב ייעודי:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

הנתב ממפה סוגי אירועים לפונקציות מטפל שמעדכנות את מסד הנתונים באמצעות `WebhookSubscriptionService` ושולחות הודעות דוא"ל.

### אימות מטען

נקודת הקצה webhook מאמתת את מבנה המטען לפני העיבוד:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## ניהול לקוחות

הספק עוקב אחר דפוס הרזולוציה הסטנדרטי בן שלושת השלבים:

1. בדוק את מטא נתונים של המשתמש עבור מזהה הלקוח של Polar
2. שאל את טבלת מסד הנתונים `PaymentAccount`
3. צור לקוח חדש דרך Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## טיפול בשגיאות

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| 400 |`Product ID is required`|חסר `productId` בבקשה|
| 400 |`Checkout ID is required`|קבל בקשה חסרה `checkout_id`|
| 400 |`No signature provided`|Webhook חסרה כותרת חתימה|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 500 |`Failed to create checkout`|כתובת האתר לקופה לא זמינה|
| 500 |`Configuration error`|ספק Polar לא מוגדר|
| 503 |הגדרת התשלום לא הושלמה|הארגון לא השלים את הגדרת התשלום ב-Polar|

נקודת הקצה של התשלום כוללת זיהוי מיוחד עבור שגיאות בהגדרת תשלום:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`POLAR_ACCESS_TOKEN`|כן|אסימון גישה של Polar API|
|`POLAR_WEBHOOK_SECRET`|כן|סוד חתימת Webhook|
|`POLAR_ORGANIZATION_ID`|כן|מזהה ארגון Polar|

## שיקולי אבטחה

- חתימות Webhook מאומתות באמצעות הפונקציה `validateEvent` מה-SDK הרשמי
- טקסט גוף גולמי נשמר לצורך אימות חתימה (סידור מחדש של JSON עלול לשנות את הגוף)
- שלוש כותרות נפרדות מסומנות: חתימה, חותמת זמן ומזהה webhook
- מטא נתונים מחוטאים בצד השרת כדי למנוע הזרקת ערכים לא מוגדרים
- תגובות שגיאה משתמשות ב-`safeErrorResponse` כדי למנוע דליפת מידע

## דפים קשורים

- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
