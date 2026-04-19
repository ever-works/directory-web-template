---
id: lemonsqueezy-deep-dive
title: צלילה עמוקה של LemonSqueezy
sidebar_label: LemonSqueezy
sidebar_position: 5
---

# צלילה עמוקה של LemonSqueezy

דף זה מכסה את השילוב המלא של LemonSqueezy, כולל יצירת קופה, ניהול מנויים, עיבוד webhook וסנכרון מוצרים.

## סקירה כללית

LemonSqueezy הוא ספק תשלומים של סוחר שמטפל בגביית מס, ציות ועיבוד תשלומים. האינטגרציה משתמשת בזרימת התשלום המתארחת של LemonSqueezy, במודל מוצר מבוסס וריאנטים ובמערכת webhook. בניגוד ל-Stripe, LemonSqueezy אינו תומך בכוונות הגדרה או בניהול אמצעי תשלום ישיר - כל טיפול בתשלום מתרחש דרך ממשק המשתמש המתארח שלהם.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|נדרשת הפעלה|צור סשן קופה מגוף JSON|
|`GET`|`/api/lemonsqueezy/checkout`|אין|צור סשן קופה מפרמטרי שאילתה|
|`POST`|`/api/lemonsqueezy/webhook`|נדרשת חתימה|עיבוד אירועי webhook נכנסים|

## יצירת קופה (POST)

### גוף הבקשה

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### בקשה לדוגמה

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### איך זה עובד

1. מאמת את המשתמש באמצעות `auth()`
2. מאמת את גוף הבקשה באמצעות `validateCheckoutRequestBody()`
3. שיחות `lemonsqueezyProvider.createCustomCheckout()` עם מטא נתונים של המשתמש
4. מחזירה את כתובת האתר של התשלום

### יישום ספק

שיטת `createCustomCheckout` יוצרת קופה של LemonSqueezy עם תצורה מקיפה:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### תגובת הצלחה (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## תשלום באמצעות פרמטרי שאילתה (GET)

נקודת הקצה של GET תומכת ביצירת קופה באמצעות פרמטרי שאילתה עבור תרחישי קישור ישיר:

|פרמטר|חובה|תיאור|
|-----------|----------|-------------|
|`variantId`|כן|מזהה גרסה של LemonSqueezy|
|`email`|כן|מייל לקוח|
|`customPrice`|לא|מחיר מותאם אישית בסנטים|
|`metadata`|לא|מחרוזת JSON של מטא נתונים|

## ניהול מנויים

### יצירת מנויים

מנויים נוצרים דרך זרימת התשלום. שיטת `createSubscription` עוטפת את ממשק ה-API של LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### ביטול מנויים

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### עדכון מנויים

שיטת העדכון תומכת בשינויי תוכנית, השהייה, חידוש והפעלה מחדש:

```typescript
// Plan change via variant ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pause subscription
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Resume subscription
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## עיבוד Webhook

### אימות חתימה

LemonSqueezy משתמש ב-HMAC SHA-256 לאימות חתימת ה-webhook. הספק מאמת חתימות באמצעות ה-Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### מיפוי אירועים

|אירוע LemonSqueezy|סוג פנימי|
|-------------------|---------------|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

### מבנה Webhook Handler

כל מטפל עוקב אחר דפוס עקבי:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### זיהוי מודעות חסות

LemonSqueezy משתמש ב-`custom_data` במקום ב-`metadata` של Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## ניהול לקוחות

הספק עוקב אחר אותו דפוס רזולוציית לקוח בשלושה שלבים כמו ספקים אחרים:

1. בדוק מטא נתונים של משתמש עבור `lemonsqueezy_customer_id`
2. שאל את טבלת מסד הנתונים `PaymentAccount`
3. צור לקוח חדש באמצעות ה-API של LemonSqueezy

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## טיפול בשגיאות

|סטטוס|קוד שגיאה|סיבה|
|--------|-----------|-------|
| 400 |`VALIDATION_ERROR`|גוף הבקשה או הפרמטרים לא חוקיים|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 500 |`CONFIGURATION_ERROR`|חסרים משתני סביבה|
| 500 |`INTERNAL_ERROR`|שגיאה לא מטופלת|
| 503 |`PAYMENT_SERVICE_ERROR`|ממשק API של LemonSqueezy אינו זמין|

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|כן|מפתח API של LemonSqueezy|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|כן|סוד חתימת Webhook|
|`LEMONSQUEEZY_STORE_ID`|כן|מזהה חנות מספרי|

## מגבלות

- **ללא כוונות הגדרה**: LemonSqueezy אינו תומך בשמירה בכרטיסים ללא רכישה. השיטה `createSetupIntent` זורקת שגיאה.
- **אין החזר ישיר API**: יש לעבד החזרים דרך לוח המחוונים של LemonSqueezy.
- **תמחור מבוסס וריאנטים**: מוצרים משתמשים במזהי וריאציה במקום מזהי מחיר. שינויים בתוכנית השתמשו ב-`variantId`.

## שיקולי אבטחה

- חתימות Webhook מאומתות באמצעות HMAC SHA-256
- טקסט הגוף הגולמי משמש לאימות חתימה כדי למנוע בעיות בהמשכה מחדש של JSON
- מפתחות API לעולם אינם חשופים ללקוח
- רישום ביומן במצב פיתוח מחטא PII (כתובות דוא"ל מודפסות חלקית)

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
