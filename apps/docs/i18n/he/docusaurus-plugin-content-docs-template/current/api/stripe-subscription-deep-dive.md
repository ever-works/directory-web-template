---
id: stripe-subscription-deep-dive
title: מנוי פסים Deep Dive
sidebar_label: מנויי פסים
sidebar_position: 2
---

# מנוי פסים Deep Dive

דף זה מכסה את כל מסלולי ניהול המנויים: יצירה, עדכון, ביטול ושיטות הספק הבסיסיות עם דוגמאות לבקשות/תגובה.

## סקירה כללית

ה-API של המנויים מספק ניהול מחזור חיים מלא עבור מנויי Stripe. הוא תומך ביצירת מנויים עם אמצעי תשלום ותקופות ניסיון, עדכון תוכניות או הגדרות ביטול, וביטול מנויים באופן מיידי או בתום תקופת החיוב.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/stripe/subscription`|נדרשת הפעלה|צור מנוי חדש|
|`PUT`|`/api/stripe/subscription`|נדרשת הפעלה|עדכן מנוי קיים|
|`DELETE`|`/api/stripe/subscription`|נדרשת הפעלה|בטל מנוי|

## יצירת מנוי (POST)

### גוף הבקשה

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### בקשה לדוגמה

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### איך זה עובד

מטפל המסלול מבצע את השלבים הבאים:

1. מאמת את המשתמש באמצעות `auth()`
2. פותר או יוצר לקוח Stripe באמצעות `stripeProvider.getCustomerId()`
3. מתקשר `stripeProvider.createSubscription()` עם זיהוי הלקוח, המחיר, אמצעי התשלום, ימי ניסיון ומטא נתונים

### יישום ספק

בתוך `StripeProvider.createSubscription()`:

```typescript
// Attach payment method to customer
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Set as default payment method
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Create the subscription
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Without trial: charge immediately
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### תגובת הצלחה (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix timestamp
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix timestamp or null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." if available
}
```

## עדכון מנוי (PUT)

### גוף הבקשה

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### בקשה לדוגמה

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### יישום ספק

השיטה `updateSubscription` מטפלת בשינויי תוכנית על ידי החלפת פריט המנוי:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

זה גם תומך בהגדרה `cancel_at_period_end`, `cancel_at`, ועדכון מטא נתונים.

### תגובת הצלחה (200)

מחזירה את אותה צורה `SubscriptionInfo` עם הערכים המעודכנים.

## ביטול מנוי (מחק)

### גוף הבקשה

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### בקשה לדוגמה

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### יישום ספק

היגיון הביטול תומך בשתי אסטרטגיות:

```typescript
if (cancelAtPeriodEnd) {
  // Soft cancel: subscription remains active until period ends
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Hard cancel: subscription ends immediately
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### תגובת הצלחה (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## מיפוי סטטוס מנוי

הספק ממפה סטטוסים של Stripe ל-`SubscriptionStatus` הפנימי:

|סטטוס פס|מצב פנימי|
|---------------|-----------------|
|`incomplete`|`INCOMPLETE`|
|`incomplete_expired`|`INCOMPLETE_EXPIRED`|
|`trialing`|`TRIALING`|
|`active`|`ACTIVE`|
|`past_due`|`PAST_DUE`|
|`canceled`|`CANCELED`|
|`unpaid`|`UNPAID`|

## מעקב אחר מטא נתונים

כל פעולות המנוי מצרף את `userId` מההפעלה למטא נתונים של המנוי:

```typescript
metadata: {
  userId: session.user.id
}
```

זה מאפשר למטפלי webhook ליישב מינויים עם רשומות משתמש פנימיות.

## טיפול בשגיאות

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| 400 |`Failed to create customer`|פתרון הלקוח נכשל|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 500 |`Failed to create subscription`|שגיאת Stripe API במהלך היצירה|
| 500 |`Failed to update subscription`|שגיאת Stripe API במהלך עדכון|
| 500 |`Failed to cancel subscription`|שגיאת Stripe API במהלך ביטול|

## שיקולי אבטחה

- כל נקודות הקצה של המנוי דורשות אימות
- צירוף אמצעי תשלום והגדרות ברירת המחדל מתבצעות בצד השרת
- הדגל `off_session` מוגדר רק עבור מנויים ללא ניסיון כדי לאפשר חיובים אוטומטיים
- מטא נתונים של מנוי כוללים תמיד את מזהה המשתמש המאומת לביקורת
- במצב פיתוח, עדכוני מנוי מתועדים עם שדות לא רגישים בלבד

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
