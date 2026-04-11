---
id: payment-overview
title: סקירה כללית של שילוב תשלומים
sidebar_label: מדריך אינטגרציה
sidebar_position: 1.5
---

# סקירה כללית של שילוב תשלומים

מדריך זה מספק הדרכה מעשית על מערכת התשלומים Ever Works. זה מכסה את שכבת ההפשטה של ​​הספק, כיצד להגדיר כל ספק, את מחזור החיים של התשלום וההרשמה, שער תכונות וטיפול ב-webhook.

## ארכיטקטורת ספק במבט חטוף

מערכת התשלומים בנויה על **הפשטה ספק-אגנוסטית**. כל ספק תשלומים מיישם את אותו `PaymentProviderInterface` , ודפוס מפעל מאפשר לך להחליף ספק מבלי לשנות את קוד האפליקציה.

```
lib/payment/
  index.ts                          # Public API exports
  config/
    provider-configs.ts             # Provider configuration factory
    payment-provider-manager.ts     # Singleton manager + ConfigManager
    validation.ts                   # Input validation utilities
  guards/
    feature.guard.tsx               # Plan-based feature gating
  hooks/
    use-payment.tsx                 # React context + usePayment hook
  lib/
    payment-provider-factory.ts     # Factory for creating providers
    payment-service.ts              # Service wrapping the active provider
    payment-service-manager.ts      # Singleton for service lifecycle
    providers/
      stripe-provider.ts
      lemonsqueezy-provider.ts
      polar-provider.ts
      solidgate-provider.ts
    client/
      payment-account-client.ts     # Client-side account API
    utils/
      prices.ts                     # Price formatting utilities
      polar-subscription-helpers.ts
  services/
    payment-email.service.ts        # Email notifications on payment events
  types/
    payment-types.ts                # Core type definitions
    payment.ts                      # Payment flow and submission types
  ui/
    stripe/stripe-elements.tsx
    lemonsqueezy/lemonsqueezy-elements.tsx
    polar/polar-elements.tsx
    solidgate/solidgate-elements.tsx
```

### ספקים נתמכים

| ספק | תשלומים חד פעמיים | מנויים | נסיונות | Webhooks | סוחר שיא |
|------------|:-:|:-:|:-:|:-:|:-:|
| פס | כן | כן | כן | כן | לא |
| LemonSqueezy | כן | כן | כן | כן | כן |
| פולאר | כן | כן | כן | כן | לא |
| Solidgate | כן | כן | לא | כן | לא |

## ממשקי ליבה

### ממשק PaymentProvider

כל ספק מיישם ממשק זה, המוגדר ב- `lib/payment/types/payment-types.ts` :

```typescript
// lib/payment/types/payment-types.ts
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

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
                timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### סוגי נתונים מרכזיים

```typescript
// Subscription statuses
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// Payment types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

// Supported providers
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## הגדרה מהירה

### שלב 1: הגדר משתני סביבה

כל ספק דורש מפתחות API וסודות webhook. הוסף אותם ל- `.env.local` :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...

# Polar
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_ORGANIZATION_ID=...

# Solidgate
SOLIDGATE_API_KEY=...
SOLIDGATE_SECRET_KEY=...
SOLIDGATE_WEBHOOK_SECRET=...
SOLIDGATE_MERCHANT_ID=...
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=...
```

### שלב 2: הגדר תוכניות תמחור

תוכניות התמחור מוגדרות ב- `.content/config.yml` שלך:

```yaml
pricing:
  provider: stripe          # Default provider
  currency: USD
  plans:
    FREE:
      id: free
      name: Free
      description: Basic access
      price: 0
      features:
        - "List your product"
        - "Basic analytics"
    STANDARD:
      id: standard
      name: Standard
      description: Enhanced features
      price: 9
      stripePriceId: price_xxx
      annualDiscount: 20
      features:
        - "Everything in Free"
        - "Priority listing"
        - "Advanced analytics"
    PREMIUM:
      id: premium
      name: Premium
      description: Full access
      price: 29
      stripePriceId: price_yyy
      annualDiscount: 25
      isPremium: true
      features:
        - "Everything in Standard"
        - "Featured placement"
        - "API access"
```

### שלב 3: הגדר Webhooks

לכל ספק יש נקודת קצה ייעודית ל-webhook:

| ספק | Webhook URL |
|------------|--------------------------------|
| פס | `/api/stripe/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| פולאר | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

הגדר את כתובות האתרים האלה במרכז המחוונים של כל ספק, והצביע על הדומיין שנפרס.

## The PaymentProviderFactory

המפעל יוצר מופעי ספק המבוססים על מחרוזת סוג:

```typescript
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

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

## שירות תשלומים ומנהל שירות

### שירות תשלום

ה- `PaymentService` עוטף את מופע הספק הפעיל וחושף API אחיד:

```typescript
// lib/payment/lib/payment-service.ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
}
```

### PaymentServiceManager (סינגלטון)

המנהל מטפל בהחלפת ספק בזמן ריצה וממשיך את בחירת המשתמש ב- `localStorage` :

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    this.setStoredProvider(newProvider);
    this.currentService = new PaymentService({
      provider: newProvider,
      config: this.providerConfigs[newProvider],
    });
  }

  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
}
```

## שילוב תגובה

### ההקשר של ספק התשלום

עטוף את הבקשה שלך (או דפים הקשורים לתשלום) עם ה- `PaymentProvider` :

```tsx
// Example: wrapping a layout
import { PaymentProvider } from '@/lib/payment';
import { createProviderConfigs } from '@/lib/payment/config/provider-configs';

const configs = createProviderConfigs(
  { apiKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, webhookSecret: '' },
  undefined,  // solidgate
  undefined,  // lemonsqueezy
  undefined   // polar
);

export default function PricingLayout({ children }) {
  return (
    <PaymentProvider providerConfigs={configs} defaultProvider="stripe">
      {children}
    </PaymentProvider>
  );
}
```

### השתמש ב-Payment Hook

רכיבים ניגשים לשירות התשלומים דרך הוו `usePayment` :

```typescript
// lib/payment/hooks/use-payment.tsx
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

// Returns:
// {
//   service: PaymentService | null;
//   switchProvider: (provider: SupportedProvider) => Promise<void>;
//   currentProvider: SupportedProvider;
//   availableProviders: SupportedProvider[];
// }
```

**דוגמה לשימוש:**

```tsx
function CheckoutButton({ priceId }: { priceId: string }) {
  const { service, currentProvider } = usePayment();

  const handleCheckout = async () => {
    const intent = await service?.createPaymentIntent({
      amount: 2900,
      currency: 'usd',
      metadata: { priceId },
    });
    // Redirect to checkout or show payment form
  };

  return <button onClick={handleCheckout}>Pay with {currentProvider}</button>;
}
```

## שער תכונה

הרכיב `FeatureGuard` מגביל רכיבי ממשק משתמש בהתבסס על תוכנית המנוי של המשתמש:

```tsx
// lib/payment/guards/feature.guard.tsx
export type PlanType = "TRIAL" | "FREE" | "STANDARD" | "PREMIUM" | "EXPIRED" | "CANCELLED";

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,
  EXPIRED: 1,
  TRIAL: 2,
  FREE: 3,
  STANDARD: 4,
  PREMIUM: 5,
};
```

**נוֹהָג:**

```tsx
import FeatureGuard from '@/lib/payment/guards/feature.guard';

<FeatureGuard
  user={currentUser}
  requiredPlan="STANDARD"
  fallback={<UpgradePrompt />}
  onAccessDenied={(userPlan, required, reason) => {
    console.log(`Access denied: ${reason}`);
  }}
>
  <PremiumFeature />
</FeatureGuard>
```

### תמיכה בתקופת חסד

תוכניות שפג תוקפן מקבלות תקופת חסד של 7 ימים עם גישה מוחלשת:

```typescript
export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7,
  TRIAL_DURATION_DAYS: 14,
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType,
};

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false;
  const graceEnd = new Date(user.planExpiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS);
  return new Date() <= graceEnd && user.plan === "EXPIRED";
};
```

## סוגי אירועי Webhook

כל אירועי ה-webhook מנורמלים למספר משותף:

```typescript
// lib/payment/types/payment-types.ts
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  REFUND_CREATED = 'refund_created',
  // ... and more
}
```

## זרימות תשלום

התבנית תומכת בשני תזרימי תשלום עבור הגשת תוכן:

```typescript
// lib/payment/types/payment.ts
export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

- **שלם בהתחלה**: המשתמש משלם לפני שההגשה נבדקת.
- **שלם בסוף**: המשתמש מגיש בחינם, משלם רק לאחר אישור.

## הפניה למסלול API

### מסלולי פסים

| מסלול | שיטה | תיאור |
|-------|--------|-------------|
| `/api/stripe/checkout` | פוסט | צור סשן קופה |
| `/api/stripe/subscription` | קבל/פוסט | ניהול מנויים |
| `/api/stripe/subscription/portal` | פוסט | צור הפעלה של פורטל חיוב |
| `/api/stripe/subscription/[id]/cancel` | פוסט | ביטול מנוי |
| `/api/stripe/payment-intent` | פוסט | צור כוונת תשלום |
| `/api/stripe/payment-methods/list` | קבל | רשימת אמצעי תשלום שמורים |
| `/api/stripe/payment-methods/create` | פוסט | הוסף אמצעי תשלום |
| `/api/stripe/payment-methods/delete` | פוסט | הסר אמצעי תשלום |
| `/api/stripe/setup-intent` | פוסט | צור כוונת הגדרה |
| `/api/stripe/webhook` | פוסט | Handle Stripe webhooks |

### LemonSqueezy Routes

| מסלול | שיטה | תיאור |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | פוסט | צור סשן קופה |
| `/api/lemonsqueezy/cancel` | פוסט | ביטול מנוי |
| `/api/lemonsqueezy/reactivate` | פוסט | הפעל מחדש מנוי |
| `/api/lemonsqueezy/update-plan` | פוסט | שנה תוכנית מנוי |
| `/api/lemonsqueezy/list` | קבל | רשימת מנויי משתמשים |
| `/api/lemonsqueezy/webhook` | פוסט | ידית webhooks |

### מסלולי קוטב

| מסלול | שיטה | תיאור |
|-------|--------|-------------|
| `/api/polar/checkout` | פוסט | צור סשן קופה |
| `/api/polar/subscription/portal` | פוסט | צור פורטל לקוחות |
| `/api/polar/subscription/[id]/cancel` | פוסט | ביטול מנוי |
| `/api/polar/subscription/[id]/reactivate` | פוסט | הפעל מחדש |
| `/api/polar/webhook` | פוסט | ידית webhooks |

## פונקציות שירות

הקובץ `payment-types.ts` כולל עוזרי עיצוב שימושיים:

```typescript
// Format cents to currency string
formatCentsToCurrency(2900, 'USD', 'en-US');
// => "$29.00"

// Convert cents to decimal
convertCentsToDecimal(2900);
// => 29.00

// Convert timestamp to Date
convertNumberToDate(1640995200);
// => Date: 2022-01-01T00:00:00.000Z
```

## השלבים הבאים

- [תצורת Stripe](./stripe) -- הגדרת Stripe השלם
- [תצורת LemonSqueezy](./lemonsqueezy) -- הגדרת LemonSqueezy
- [תצורת Polar](./polar) -- הגדרת Polar
- [שילוב ריבוי מטבעות](./מולטי-מטבעות) -- תמיכה במטבעות
- [Payment Architecture](./payment-architecture) -- צלילה עמוקה לתוך הארכיטקטורה
- [Webhooks](./webhooks) -- פרטי טיפול ב-Webhook
- [מדריך תצורה](./configuration) -- כל משתני הסביבה והאפשרויות
