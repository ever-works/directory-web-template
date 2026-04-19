---
id: stripe-checkout-deep-dive
title: Stripe Checkout Deep Dive
sidebar_label: Stripe Checkout
sidebar_position: 1
---

# Stripe Checkout Deep Dive

דף זה מכסה את זרימת התשלום המלאה ב-Stripe, כולל יצירת הפעלה, רזולוציית מזהה מחיר, טיפול במטבעות, כתובות אתרים להפניה מחדש, זרימות הצלחה/ביטול והפצת מטא נתונים.

## סקירה כללית

האינטגרציה של Stripe Checkout מספקת ממשק API בצד השרת שיוצר Stripe Checkout Sessions עבור תשלומים חד-פעמיים וגם עבור מנויים. הזרימה מאמתת את המשתמש, פותרת או יוצרת לקוח Stripe, בונה פריטי שורה עם תמיכת ניסיון אופציונלית, ומחזירה כתובת URL לקופה מתארחת.

## טבלת מסלולים

|שיטה|נתיב|Auth|תיאור|
|--------|------|------|-------------|
|`POST`|`/api/stripe/checkout`|נדרשת הפעלה|צור סשן קופה חדש|
|`GET`|`/api/stripe/checkout`|נדרשת הפעלה|אחזר סשן קופה קיים|

## יצירת סשן קופה (POST)

### גוף הבקשה

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### בקשה לדוגמה

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### תגובת הצלחה (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## מיפוי מצבים

ה-API ממפה מצבים נכנסים לסוג `Mode` הצפוי של Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` ממפה למצב Stripe `payment`
- `subscription` ממפה למצב Stripe `subscription`
- כל ערך אחר ממפה למצב `setup`

## רזולוציית לקוח

לפני יצירת סשן קופה, ה-API פותר או יוצר לקוח Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

שיטת `getCustomerId` עוקבת אחר רזולוציה בת שלושה שלבים:

1. **בדיקת מטא נתונים** -- מחפש `stripe_customer_id` במטא נתונים של המשתמש
2. **חיפוש מסד נתונים** -- שאילתה בטבלה `PaymentAccount` עבור רשומה קיימת
3. **צור חדש** -- יוצר לקוח Stripe חדש ומסתנכרן עם מסד הנתונים

אם יצירת הלקוח נכשלת, נקודת הקצה מחזירה שגיאה `400`.

## תצורת ניסיון

ניסויים דורשים שני תנאים להתקיים:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

כאשר גרסת ניסיון מופעלת, נדרש `trialAmountId`. זה מאפשר לגבות עמלת התקנה במהלך תקופת הניסיון. המסייע `buildCheckoutLineItems` בונה פריטי שורה הכוללים גם את מחיר המנוי וגם את סכום הניסיון האופציונלי.

אם `hasTrial` נכון אבל `trialAmountId` חסר, נקודת הקצה מחזירה:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## תצורה ספציפית למנוי

כאשר המצב הוא `subscription`, תצורה נוספת מוחלת באמצעות `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

זה מצרף מטא-נתונים של מנוי לרבות `userId`, `planId`, `planName`, ומרווח חיוב ל-`subscription_data` בהפעלת התשלום.

## הפצת מטא נתונים

מטא נתונים מהבקשה מוזגים עם נתוני משתמש הפעלה:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

זה מבטיח שפרטי זהות המשתמש (מזהה, דוא"ל, שם) תמיד מצורף לסשן התשלום לצורך התאמה במטפלי webhook.

## אחזור הפעלת קופה (GET)

### פרמטרי שאילתה

|פרמטר|חובה|תיאור|
|-----------|----------|-------------|
|`session_id`|כן|מזהה הפעלה של Stripe Checkout|

### בקשה לדוגמה

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### תגובת הצלחה (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

ההפעלה מאוחזרת עם נתוני `line_items` ו-`subscription` מורחבים:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## תמיכה בריבוי מטבעות

הטיפול במטבע מוגדר דרך `stripe.config.ts`. האובייקט `STRIPE_CONFIG` ממפה תוכניות למזהי מחירים ספציפיים למטבע:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

השתמש ב-`getStripePriceConfig(plan, currency, interval)` כדי לקבוע את מזהה המחיר הנכון עבור תוכנית, מטבע ומרווח חיוב נתון.

## תמחור דינמי

כאשר `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, נקודת הקצה `/api/stripe/products` מביאה מוצרים ומחירים ישירות מ-Stripe API עם TTL של 5 דקות מטמון. למוצרים יש להגדיר את מפתחות המטא נתונים הבאים בלוח המחוונים של Stripe:

- `plan` -- סוג תוכנית (`free`, `standard`, `premium`)
- `type` -- סוג מוצר (`subscription`, `sponsor_ad`)
- `features` -- מערך JSON של מחרוזות תכונות
- `annualDiscount` -- אחוז הנחה שנתי

## דרישות תצורה

|משתנה|חובה|תיאור|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|כן|מפתח API סודי של Stripe|
|`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`|כן|מפתח לפרסום פס|
|`STRIPE_WEBHOOK_SECRET`|כן|סוד חתימת Webhook|
|`NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING`|לא|אפשר תמחור דינמי|
|`NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD`|מותנה|מזהי מחיר לכל תוכנית/מטבע|

## טיפול בשגיאות

|סטטוס|שגיאה|סיבה|
|--------|-------|-------|
| 400 |`Failed to create customer`|פתרון/יצירת הלקוח נכשלו|
| 400 |`Invalid trial configuration`|תקופת הניסיון מופעלת ללא `trialAmountId`|
| 400 |`Session ID is required`|קבל בקשה חסרה `session_id` param|
| 401 |`Unauthorized`|אין הפעלה מאומתת|
| 500 |`Failed to create checkout session`|שגיאה של Stripe API או שגיאה פנימית|

במצב פיתוח, תגובות שגיאה כוללות שדה `details` עם מעקב המחסנית.

## שיקולי אבטחה

- כל נקודות הקצה לקופה דורשות הפעלה מאומתת באמצעות `auth()`
- המפתח הסודי של Stripe לעולם אינו חשוף ללקוח
- מטא נתונים ממוזגים בצד השרת; לקוחות אינם יכולים לזייף את זהות המשתמש
- ביקורי התשלום מיועדים ללקוח ה-Stripe של המשתמש המאומת
- הודעות שגיאה עוברות חיטוי באמצעות `safeErrorMessage` כדי למנוע דליפת מידע בייצור

## דפים קשורים

- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [ארכיטקטורת ספק תשלומים](./payment-provider-architecture.md)
