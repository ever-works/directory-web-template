---
id: payment-library
title: "ספריית תשלום"
sidebar_label: "ספריית תשלום"
sidebar_position: 17
---

# ספריית תשלום

התבנית מיישמת מערכת תשלום מרובת ספקים תוך שימוש בדפוסי המפעל והאסטרטגיה. הוא תומך ב-Stripe, LemonSqueezy, Solidgate ו-Polar כספקי תשלומים, עם ממשק אחיד לתשלומים, מנויים, webhooks והחזרים.

## סקירה כללית של אדריכלות

```mermaid
graph TD
    A[Application Code] --> B[PaymentService]
    B --> C[PaymentProviderFactory]
    C --> D{Provider Type}
    D -->|stripe| E[StripeProvider]
    D -->|lemonsqueezy| F[LemonSqueezyProvider]
    D -->|solidgate| G[SolidgateProvider]
    D -->|polar| H[PolarProvider]
    B --> I[PaymentServiceManager]
    I --> B
    E --> J[PaymentProviderInterface]
    F --> J
    G --> J
    H --> J
```

## קבצי מקור

|קובץ|מטרה|
|------|---------|
|`lib/payment/index.ts`|ייצוא API ציבורי|
|`lib/payment/lib/payment-provider-factory.ts`|מפעל ליצירת מופעי ספק|
|`lib/payment/lib/payment-service.ts`|חזית שירות אחידה|
|`lib/payment/lib/payment-service-manager.ts`|מנהל סינגלטון למחזור חיי שירות|
|`lib/payment/types/payment-types.ts`|ממשקי ליבה ומונים|
|`lib/payment/types/payment.ts`|זרימת תשלומים וסוגי הגשה|
|`lib/payment/config/`|תצורת ספק ואימות|
|`lib/payment/lib/providers/`|הטמעת ספקים בודדים|
|`lib/payment/hooks/`|React Hooks עבור זרימות תשלום בצד הלקוח|
|`lib/payment/ui/`|רכיבי טופס תשלום|

## ממשקי ליבה

### ממשק PaymentProvider

כל ספק מיישם את הממשק המקיף הזה:

```typescript
export interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Webhooks and refunds
  handleWebhook(payload: any, signature: string, ...args: any[]): Promise<WebhookResult>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration and UI
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### PaymentProviderFactory

יוצר מופעי ספק בהתבסס על תצורה:

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':       return new StripeProvider(config);
      case 'solidgate':    return new SolidgateProvider(config);
      case 'lemonsqueezy': return new LemonSqueezyProvider(config);
      case 'polar':        return new PolarProvider(config);
      default:             throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## שירות תשלום

הכיתה `PaymentService` מספקת חזית אחידה על כל פעולות הספק:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(config.provider, config.config);
  }

  // All methods delegate to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  // ... additional delegated methods
}
```

## סוגי נתונים

### ספורי תשלום

```typescript
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}
```

### אירועי Webhook

```typescript
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  INVOICE_PAID = 'invoice_paid',
  REFUND_CREATED = 'refund_created',
  // ... additional event types
}
```

### מבני נתונים מרכזיים

|הקלד|מטרה|
|------|---------|
|`PaymentIntent`|הפעלת תשלום עם מזהה, סכום, מטבע, סטטוס, סוד לקוח|
|`SubscriptionInfo`|פרטי מנוי עם סטטוס, סוף תקופה, פרטי ניסיון|
|`CustomerResult`|נוצר לקוח עם מזהה, אימייל, שם|
|`WebhookResult`|webhook מעובד עם סוג, מזהה, נתונים|
|`ClientConfig`|תצורה בטוחה בחזית עם publicKey וסוג שער|
|`UIComponents`|רכיבי תגובה ונכסים חזותיים עבור הספק|

## כלי עזר למטבעות

הספרייה כוללת פונקציות מסייעות לעיצוב מטבעות:

```typescript
// Format cents to display currency
export function formatCentsToCurrency(
  cents: number, currency: string = 'USD', locale: string = 'en-US'
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

// Convert between cents and decimal
export function convertCentsToDecimal(cents: number): number;
export function convertDecimalToCents(decimal: number): number;

// Convert timestamps to Date objects
export function convertNumberToDate(timestamp?: number): Date | null;
export function safeTimestampToDate(timestamp: number | null | undefined): Date | undefined;
```

## סוגי זרימת תשלום

המערכת תומכת בשני תזרימי תשלום של הגשה:

|זרימה|Enum|תיאור|
|------|------|-------------|
|שלם בהתחלה|`PAY_AT_START`|נדרש תשלום לפני בדיקת הגשה|
|שלם בסוף|`PAY_AT_END`|תשלום שנגבה לאחר אישור מנהל|

### מחזור החיים של סטטוס הגשה

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT: Submit (pay at start)
    DRAFT --> PUBLISHED: Submit (free)
    PENDING_PAYMENT --> PAID: Payment confirmed
    PAID --> PUBLISHED: Admin approves
    PAID --> REJECTED: Admin rejects
    DRAFT --> PUBLISHED: Admin approves (pay at end)
    DRAFT --> REJECTED: Admin rejects (pay at end)
```

## ממשק רכיבי UI

כל ספק חושף רכיבי ממשק משתמש לשילוב חזיתי:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## שילוב צד לקוח

ההקשר `usePayment` וההקשר `PaymentProvider` מספקים אינטגרציה של React:

```typescript
import { usePayment, PaymentProvider } from '@/lib/payment';

// Wrap your app with the payment provider
<PaymentProvider>
  <PaymentForm
    amount={2999}
    currency="usd"
    isSubscription={false}
    onSuccess={(paymentId) => console.log('Paid:', paymentId)}
    onError={(error) => console.error('Failed:', error)}
  />
</PaymentProvider>
```

## תצורת ספק

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

כל ספק דורש לפחות `apiKey`. Stripe ו-Solidgate משתמשים גם ב-`webhookSecret` לאימות חתימת ה-webhook.
