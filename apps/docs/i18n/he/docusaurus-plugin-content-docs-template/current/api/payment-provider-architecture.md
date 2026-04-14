---
id: payment-provider-architecture
title: ארכיטקטורת ספק תשלומים
sidebar_label: ארכיטקטורת ספק
sidebar_position: 8
---

# ארכיטקטורת ספק תשלומים

דף זה מסביר כיצד פועלים המפעל ושכבת השירות של ספק התשלומים, כיצד מחליפים ספקים, והממשקים האגנוסטיים של ספקים המאחדים את כל ארבעת שילובי התשלומים.

## סקירה כללית

התבנית מיישמת ארכיטקטורת תשלום אגנוסטית לספק באמצעות דפוס האסטרטגיה. מפעל יוצר מופעי ספקים, שכבת שירות חושפת API מאוחד, וכל ספק מיישם ממשק משותף. עיצוב זה מאפשר לאפליקציה לתמוך ב-Stripe, LemonSqueezy, Polar ו-Solidgate באמצעות סט ממשקים אחד.

## תרשים אדריכלות

```
Application Code
      |
      v
PaymentService (unified API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## ספקים נתמכים

|ספק|הקלד מזהה|תכונות|
|----------|---------|----------|
|פס|`stripe`|תשלום מלא, מנויים, אמצעי תשלום, כוונות הגדרה, החזרים כספיים|
|LemonSqueezy|`lemonsqueezy`|תשלום מתארח, מנויים, תמחור מבוסס וריאנטים|
|פולאר|`polar`|קופה, מנויים, מוצרים בהיקף ארגוני|
|סולידגייט|`solidgate`|תשלומים מבוססי API, SDK משובץ, מנויים, החזרים כספיים|

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## ממשק הספק

כל הספקים מיישמים `PaymentProviderInterface`:

```typescript
interface PaymentProviderInterface {
  // Customer management
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## המפעל

`PaymentProviderFactory` יוצר מופעי ספק בהתבסס על מזהה מחרוזת:

```typescript
export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## שכבת השירות

`PaymentService` עוטף מופע של ספק וחושף את ה-API המאוחד:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delegates all calls to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other methods delegate to this.provider
}
```

### דוגמה לשימוש

```typescript
const paymentService = new PaymentService({
  provider: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    options: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    }
  }
});

// Same API regardless of provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## ניהול ספקי סינגלטון

התבנית משתמשת בדפוסי יחיד עבור מופעי ספק, המנוהלים באמצעות `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

פונקציות אלו מבטיחות שרק מופע ספק אחד קיים בכל זמן ריצה, תוך מניעת אתחול מחדש מיותר של לקוח API.

## הגדרות סוג מפתח

### PaymentProviderConfig

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  options?: {
    publishableKey?: string;
    storeId?: string;
    organizationId?: string;
    merchantId?: string;
    apiBaseUrl?: string;
    testMode?: boolean;
    appUrl?: string;
  };
}
```

### כוונת תשלום

```typescript
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

### מידע על מנוי

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: any;
}
```

### סטטוס מנוי

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}
```

### WebhookResult

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### WebhookEventType

```typescript
enum WebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  BILLING_PORTAL_SESSION_UPDATED = 'billing_portal_session_updated',
  REFUND_SUCCEEDED = 'refund_succeeded'
}
```

## כיצד להחליף ספקים

### שלב 1: הגדר משתני סביבה

כל ספק דורש קבוצה משלו של משתני סביבה. הגדר רק את המשתנים עבור הספק שבחרת.

### שלב 2: עדכן את אתחול הספק

שנה באיזו פונקציה `getOrCreate*Provider` נעשה שימוש במטפלי המסלולים שלך, או הגדר את `PaymentService` עם מחרוזת ספק אחרת:

```typescript
// Before (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// After (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### שלב 3: עדכן את Webhook Endpoints

לכל ספק יש מסלול ה-webhook שלו (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook` וכו'). ודא שרק ה-webhook של הספק הפעיל רשום.

### שלב 4: טפל בתכונות הספציפיות לספק

חלק מהתכונות הינן ספציפיות לספק:
- **כוונות ההתקנה**: רק Stripe ו-Solidgate (דמה)
- **טפסי תשלום משובצים**: Stripe ו-Solidgate דרך React SDK
- **תמחור מבוסס וריאנטים**: LemonSqueezy בלבד
- **מוצרים בהיקף ארגון**: Polar בלבד
- ** API להחזר ישיר**: Stripe ו-Solidgate בלבד

## דפוס רזולוציית לקוח

כל ארבעת הספקים עוקבים אחר אותו דפוס רזולוציית לקוח בשלושה שלבים:

```
1. Check user metadata (e.g., user.user_metadata.stripe_customer_id)
   |
   v (not found)
2. Query PaymentAccount database table
   |
   v (not found)
3. Create new customer via provider API
   -> Synchronize to PaymentAccount table
   -> Return new customer ID
```

דפוס זה מיושם באופן זהה בשיטת `getCustomerId()` של כל ספק, מה שמבטיח התנהגות עקבית ללא קשר לספק פעיל.

## נורמליזציה של אירועי Webhook

כל ספק ממפה את סוגי האירועים המקוריים שלו ל-`WebhookEventType` המשותף. זה מאפשר ל-`WebhookSubscriptionService` לטפל באירועים באופן כללי:

|פעולה|פס|LemonSqueezy|פולאר|סולידגייט|
|--------|--------|-------------|-------|-----------|
|נוצר משנה|`customer.subscription.created`|`subscription_created`|`subscription.created`|`subscription.created`|
|המשנה בוטלה|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|`subscription.cancelled`|
|הצלחה בתשלום|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|`payment.succeeded`|
|התשלום נכשל|`payment_intent.payment_failed`|לא|`checkout.failed`|`payment.failed`|

## רכיבי ממשק משתמש

כל ספק חושף רכיבי ממשק משתמש דרך `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

זה מאפשר ל-frontend להציג את טופס התשלום, הלוגואים ואייקוני מותג הכרטיסים הנכונים מבלי לדעת איזה ספק פעיל.

## מבנה הקובץ

```
lib/payment/
  lib/
    payment-service.ts            # PaymentService class
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Shared interfaces and enums
  ui/
    stripe/                       # Stripe Elements wrapper
    solidgate/                    # Solidgate Elements wrapper
```

## דפים קשורים

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
