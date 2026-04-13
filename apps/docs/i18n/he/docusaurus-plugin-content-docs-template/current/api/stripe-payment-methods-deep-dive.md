---
id: stripe-payment-methods-deep-dive
title: שיטות תשלום Stripe Deep Dive
sidebar_label: שיטות תשלום Stripe
sidebar_position: 3
---

# שיטות תשלום Stripe Deep Dive

דף זה עוסק ברישום אמצעי תשלום, כוונות הגדרה לשמירת כרטיסים, ניהול שיטות ברירת מחדל ואימות כרטיסים.

## סקירה כללית

מערכת אמצעי התשלום מספקת שתי יכולות מרכזיות: פירוט אמצעי התשלום השמורים של משתמש עם סטטוס ברירת מחדל, ויצירת כוונות הגדרה המאפשרות למשתמשים לשמור אמצעי תשלום חדשים לשימוש עתידי ללא חיוב מיידי.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`GET`|`/api/stripe/payment-methods/list`|נדרשת הפעלה|רשום את כל אמצעי התשלום עבור המשתמש|
|`POST`|`/api/stripe/setup-intent`|נדרשת הפעלה|צור כוונת הגדרה לשמירת אמצעי תשלום חדש|

## רישום אמצעי תשלום (GET)

### איך זה עובד

נקודת הקצה של הרשימה מבצעת את השלבים הבאים:

1. מאמת את המשתמש באמצעות `auth()`
2. פותר את זיהוי הלקוח Stripe של המשתמש באמצעות `getUserStripeCustomerId()`
3. מאחזר את הלקוח כדי לקבוע את שיטת התשלום המוגדרת כברירת מחדל
4. מפרט את כל שיטות התשלום מסוג `card` (עד 100)
5. פורמט וממיין תוצאות (ברירת מחדל תחילה, ולאחר מכן לפי תאריך יצירה)

### יישום מפתח

```typescript
// Retrieve customer for default payment method detection
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// List all card-type payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Format with default status
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sort: default first, then by newest
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### תגובת הצלחה (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Present when no payment methods found
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix timestamp
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### דוגמה: משתמש עם אמצעי תשלום

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### דוגמה: אין אמצעי תשלום

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## יצירת כוונת הגדרה (POST)

כוונות ההגדרה מאפשרות למשתמשים לשמור אמצעי תשלום לשימוש עתידי מבלי לחייב אותם באופן מיידי. זה משמש כאשר משתמש רוצה להוסיף כרטיס לפני שהוא מנוי, או לנהל מספר אמצעי תשלום.

### איך זה עובד

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### תגובת הצלחה (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix timestamp
}
```

### שימוש בחזית

בצד הלקוח, `client_secret` משמש כדי לאשר את כוונת ההגדרה עם Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## ניהול אמצעי תשלום ברירת מחדל

שיטת התשלום המוגדרת כברירת מחדל נקבעת מ-`invoice_settings.default_payment_method` של לקוח Stripe. בעת יצירת מנוי, אמצעי התשלום מוגדר אוטומטית כברירת המחדל:

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

הדגל `is_default` בתגובת רשימת אמצעי התשלום מאפשר לחזית הקצה להציג את תג כרטיס ברירת המחדל.

## טיפול בשגיאות

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 404 |`Customer not found`|לקוח פס נמחק|
| 400 |שגיאת פס|בקשה לא חוקית ל-Stripe API|
| 500 |`Failed to list payment methods`|שגיאה פנימית|
| 500 |`Failed to create setup intent`|יצירת כוונות ההגדרה נכשלה|

שגיאות ספציפיות לפס מזוהות ומטופלות:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## שיקולי אבטחה

- כל נקודות הקצה דורשות הפעלות מאומתות
- נקודת הקצה של הרשימה מחזירה רק אמצעי תשלום השייכים ללקוח Stripe של המשתמש המאומת
- מספרי כרטיסים לעולם לא נשמרים או מוחזרים - רק 4 הספרות האחרונות והמותג נחשפים
- יש להעביר את `client_secret` מכוונות ההתקנה רק ל-SDK הקדמי של Stripe.js
- מזהי לקוח פתורים בצד השרת ולא ניתן לעקוף אותם על ידי בקשות לקוח

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|כן|מפתח API סודי של Stripe|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|כן|לאתחול חזית Stripe.js|

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
