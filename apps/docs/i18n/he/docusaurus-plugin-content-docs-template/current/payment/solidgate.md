---
id: solidgate
title: שילוב Solidgate
sidebar_label: סולידגייט
sidebar_position: 5
---

# שילוב Solidgate

Solidgate הוא אחד מארבעת ספקי התשלומים הנתמכים בתבנית Ever Works. הוא מספק הפעלות קופה, טיפול ב-webhook, ניהול מנויים ותמיכה בריבוי מטבעות באמצעות ממשק ספק מאוחד.

## מיקומי מקור

```
lib/payment/lib/providers/solidgate-provider.ts    # Provider implementation
lib/payment/ui/solidgate/solidgate-elements.tsx     # React SDK component
lib/payment/config/payment-provider-manager.ts      # Config & initialization
app/api/solidgate/checkout/route.ts                 # Checkout API endpoint
app/api/solidgate/webhook/route.ts                  # Webhook handler
```

## משתני סביבה

הגדר את Solidgate על ידי הגדרת משתני הסביבה הבאים:

```bash
# Required
SOLIDGATE_API_KEY=your_api_key
SOLIDGATE_SECRET_KEY=your_secret_key
SOLIDGATE_MERCHANT_ID=your_merchant_id
SOLIDGATE_WEBHOOK_SECRET=your_webhook_secret

# Optional
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=your_publishable_key
SOLIDGATE_API_BASE_URL=https://api.solidgate.com/v1
```

ה- `ConfigManager` ב- `payment-provider-manager.ts` מאמת את אלה בגישה הראשונה. אם חסר משתנה נדרש כלשהו, ​​הוא זורק שגיאה עם הודעה תיאורית:

```
Solidgate configuration is incomplete.
Required: SOLIDGATE_API_KEY, SOLIDGATE_MERCHANT_ID,
SOLIDGATE_WEBHOOK_SECRET, SOLIDGATE_SECRET_KEY
```

## ארכיטקטורת ספק

ה- `SolidgateProvider` מיישם את `PaymentProviderInterface` , מה שהופך אותו לניתן להחלפה עם Stripe, LemonSqueezy ו-Polar:

```ts
export class SolidgateProvider implements PaymentProviderInterface {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private publishableKey: string;
  private apiBaseUrl: string;
  private merchantId: string;

  constructor(config: PaymentProviderConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey || '';
    this.webhookSecret = config.webhookSecret || '';
    this.publishableKey = config.options?.publishableKey || '';
    this.apiBaseUrl = config.options?.apiBaseUrl || SOLIDGATE_API_BASE_URL;
    this.merchantId = config.options?.merchantId || '';
  }
  // ... interface methods
}
```

### אתחול

גש לספק Solidgate דרך מנהל הסינגלטון:

```ts
import {
  getOrCreateSolidgateProvider,
  initializeSolidgateProvider,
} from '@/lib/payment/config/payment-provider-manager';

// Get or lazily create the singleton
const provider = getOrCreateSolidgateProvider();
```

## זרימת תשלום

### 1. הלקוח יוצר קופה

הלקוח יוזם קופה על ידי פרסום לנקודת הקצה של ה-API:

```ts
const response = await fetch('/api/solidgate/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 29.99,
    currency: 'USD',
    mode: 'one_time',          // or 'subscription'
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
    metadata: {
      planId: 'pro_plan',
      planName: 'Pro Plan',
    },
  }),
});
```

### 2. שרת מאמת ויוצר כוונת תשלום

מסלול התשלום ( `app/api/solidgate/checkout/route.ts` ) מבצע את השלבים הבאים:

1. **מאמת** את המשתמש באמצעות `auth()` (Session NextAuth)
2. **מאמת** את גוף הבקשה באמצעות Zod:
   ``` לא
   const checkoutSchema = z.object({
     סכום: z.number().positive(),
     מטבע: z.string().default('USD'),
     mode: z.enum(['one_time', 'subscription']).default('one_time'),
     successUrl: z.string().url(),
     cancelUrl: z.string().url(),
     מטא נתונים: z.record(z.string(), z.any()).optional(),
   });
   ```
3. **מאחזר או יוצר** מזהה לקוח של Solidgate
4. **יוצר כוונת תשלום** באמצעות ממשק ה-API של Solidgate
5. **מחזיר** את מזהה התשלום ואת סוד הלקוח עבור ה-SDK

### 3. מבנה תגובה

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_generated-uuid_secret"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

### 4. הלקוח מציג את טופס התשלום

השתמש במזהה כוונת התשלום שהוחזר כדי לאתחל את ה-SDK של Solidgate React.

## שילוב SDK של React

התבנית עוטפת את `@solidgate/react-sdk` הרשמי ברכיב מותאם אישית:

```tsx
// lib/payment/ui/solidgate/solidgate-elements.tsx
import Payment from '@solidgate/react-sdk';

export function SolidgatePaymentForm({
  onSuccess,
  onError,
  merchantId,
  paymentIntent,
  signature,
}: SolidgateElementsWrapperProps) {
  const merchantData = {
    merchant: merchantId,
    signature: signature,
    paymentIntent: paymentIntent,
  };

  return (
    <div className="solidgate-payment-form space-y-4">
      <Payment
        merchantData={merchantData}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
```

שיטת `SolidgateProvider.getUIComponents()` מזריקה אוטומטית את מזהה הסוחר, כוונת התשלום וחתימת ה-HMAC לתוך העטיפה:

```ts
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(
      paymentIntent, merchantId
    );

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature,
    });
  };

  return {
    PaymentForm: SolidgatePaymentFormWithConfig,
    logo: '/assets/payment/solidgate/solidgate-logo.svg',
    cardBrands: solidgateCardBrands,
    supportedPaymentMethods: ['card'],
    translations: solidgateTranslations,
  };
}
```

## יצירת חתימות

Solidgate דורש חתימות HMAC-SHA512 עבור אימות API ואימות webhook:

```ts
// Generic signature
private generateSignature(data: string, secret: string): string {
  return crypto
    .createHmac('sha512', secret)
    .update(data)
    .digest('hex');
}

// Payment intent signature for the React SDK
private generatePaymentIntentSignature(
  paymentIntent: string,
  merchantId: string
): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto
    .createHmac('sha512', this.secretKey)
    .update(data)
    .digest('hex');
}
```

## ניהול לקוחות

הספק עוקב אחר אסטרטגיית חיפוש תלת-שכבתית עבור מזהי לקוחות:

1. **מטא נתונים של משתמש** -- סמן `user.user_metadata.solidgate_customer_id` 2. **מסד נתונים** - שאילתה בטבלה `PaymentAccount` באמצעות `paymentAccountClient` 3. **צור חדש** -- קרא ל-Solidgate `/customers` API וסנכרן בחזרה למסד הנתונים

```ts
async getCustomerId(user: User | null): Promise<string | null> {
  // 1. Check metadata
  const fromMetadata = this.extractCustomerIdFromMetadata(user);
  if (fromMetadata) return fromMetadata;

  // 2. Check database
  const fromDatabase = await this.retrieveCustomerIdFromDatabase(user.id);
  if (fromDatabase) return fromDatabase;

  // 3. Create new customer
  const newCustomer = await this.createNewSolidgateCustomer(user);
  await this.synchronizePaymentAccount(user.id, newCustomer.id);
  return newCustomer.id;
}
```

## ניהול מנויים

### צור מנוי

```ts
const subscription = await provider.createSubscription({
  customerId: 'cust_abc123',
  priceId: 'plan_monthly',
  metadata: { userId: 'user-id' },
});
```

### בטל מנוי

הספק תומך הן בביטול התקופה והן בביטול מיידי:

```ts
// Cancel at period end (default)
await provider.cancelSubscription(subscriptionId);

// Cancel immediately
await provider.cancelSubscription(subscriptionId, false);
```

שיטת הביטול בוחרת את נקודת הקצה המתאימה של ה-API על סמך הדגל:

```ts
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### מיפוי סטטוס

סטטוסי המנוי של Solidgate ממופים לתפריט `SubscriptionStatus` של התבנית:

| סטטוס Solidgate | סטטוס תבנית |
|----------------|----------------|
| `active` | `ACTIVE` |
| `cancelled` / `canceled` | `CANCELED` |
| `past_due` | `PAST_DUE` |
| `trialing` / `trial` | `TRIALING` |
| `unpaid` | `UNPAID` |
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |

## מותגי כרטיסים נתמכים

הספק מצהיר על תמיכה ב-Visa, Mastercard, Amex ו-Discover עם סמלי נושא בהיר/כהה:

```ts
const solidgateCardBrands: CardBrandIcon[] = [
  { name: 'visa',       lightIcon: '/assets/payment/solidgate/visa-light.svg', ... },
  { name: 'mastercard', lightIcon: '/assets/payment/solidgate/mastercard-light.svg', ... },
  { name: 'amex',       lightIcon: '/assets/payment/solidgate/amex-light.svg', ... },
  { name: 'discover',   lightIcon: '/assets/payment/solidgate/discover-light.svg', ... },
];
```

## לוקליזציה

הספק כולל תרגומים מובנים לאנגלית וצרפתית:

```ts
const solidgateTranslations = {
  en: {
    cardNumber: 'Card number',
    cardExpiry: 'Expiry date',
    cardCvc: 'CVV',
    submit: 'Pay securely',
    processingPayment: 'Processing your payment...',
    paymentSuccessful: 'Payment completed successfully',
    paymentFailed: 'Your payment could not be processed',
  },
  fr: {
    cardNumber: 'Numero de carte',
    cardExpiry: "Date d'expiration",
    // ...
  },
};
```

## החזרים

הנפק החזר מלא או חלקי דרך הספק:

```ts
// Full refund
const refund = await provider.refundPayment(paymentId);

// Partial refund (in decimal, e.g., $10.00)
const partialRefund = await provider.refundPayment(paymentId, 10.00);
```

הסכומים מומרים לסנטים לפני השליחה ל-Solidgate API.

## טיפול בשגיאות

כל שיטות הספק משתמשות בטיפול עקבי בשגיאות עם לוגר מובנה:

```ts
private get logger() {
  return {
    info: (msg, ctx?) => console.log(`[SolidgateProvider] ${msg}`, ctx),
    warn: (msg, ctx?) => console.warn(`[SolidgateProvider] ${msg}`, ctx),
    error: (msg, ctx?) => console.error(`[SolidgateProvider] ${msg}`, ctx),
  };
}
```

שגיאות API כוללות את קוד מצב ה-HTTP וגוף התגובה עבור ניפוי באגים:

```
Solidgate API error: 422 Unprocessable Entity - {"error":"Invalid amount"}
```
