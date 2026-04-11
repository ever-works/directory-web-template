---
id: payment-overview
title: Übersicht über die Zahlungsintegration
sidebar_label: Integrationsleitfaden
sidebar_position: 1.5
---

# Übersicht über die Zahlungsintegration

Dieser Leitfaden bietet eine praktische Anleitung zum Ever Works-Zahlungssystem. Es behandelt die Anbieter-Abstraktionsschicht, die Konfiguration der einzelnen Anbieter, den Checkout- und Abonnement-Lebenszyklus, das Feature-Gating und die Webhook-Verarbeitung.

## Anbieterarchitektur auf einen Blick

Das Zahlungssystem basiert auf einer **anbieterunabhängigen Abstraktion**. Jeder Zahlungsanbieter implementiert das gleiche `PaymentProviderInterface` , und ein Factory-Muster ermöglicht es Ihnen, den Anbieter zu wechseln, ohne den Anwendungscode zu ändern.

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

### Unterstützte Anbieter

| Anbieter | Einmalige Zahlungen | Abonnements | Versuche | Webhooks | Vertragshändler |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Streifen | Ja | Ja | Ja | Ja | Nein |
| LemonSqueezy | Ja | Ja | Ja | Ja | Ja |
| Polar | Ja | Ja | Ja | Ja | Nein |
| Solidgate | Ja | Ja | Nein | Ja | Nein |

## Kernschnittstellen

### PaymentProviderInterface

Jeder Anbieter implementiert diese Schnittstelle, definiert in `lib/payment/types/payment-types.ts` :

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

### Schlüsseldatentypen

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

## Schnelle Einrichtung

### Schritt 1: Umgebungsvariablen festlegen

Jeder Anbieter benötigt API-Schlüssel und Webhook-Geheimnisse. Füge sie zu `.env.local` hinzu:

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

### Schritt 2: Preispläne konfigurieren

Preispläne sind in Ihrem `.content/config.yml` definiert:

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

### Schritt 3: Webhooks einrichten

Jeder Anbieter verfügt über einen dedizierten Webhook-Endpunkt:

| Anbieter | Webhook-URL |
|-------------|----------------|
| Streifen | `/api/stripe/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Polar | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Konfigurieren Sie diese URLs im Dashboard jedes Anbieters und verweisen Sie auf Ihre bereitgestellte Domäne.

## Die PaymentProviderFactory

Die Factory erstellt Anbieterinstanzen basierend auf einer Typzeichenfolge:

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

## PaymentService und ServiceManager

### Zahlungsservice

Das `PaymentService` umschließt die aktive Anbieterinstanz und stellt eine einheitliche API bereit:

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

### PaymentServiceManager (Singleton)

Der Manager übernimmt den Anbieterwechsel zur Laufzeit und behält die Auswahl des Benutzers in `localStorage` bei:

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

## Integration reagieren

### PaymentProvider-Kontext

Verpacken Sie Ihre Bewerbung (oder zahlungsbezogene Seiten) mit dem `PaymentProvider` :

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

### Bezahl-Hook verwenden

Komponenten greifen über den `usePayment` -Hook auf den Zahlungsdienst zu:

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

**Anwendungsbeispiel:**

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

## Feature-Gating

Die `FeatureGuard` -Komponente schränkt UI-Elemente basierend auf dem Abonnementplan des Benutzers ein:

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

**Verwendung:**

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

### Support für die Kulanzfrist

Abgelaufene Pläne erhalten eine 7-tägige Kulanzfrist mit eingeschränktem Zugriff:

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

## Webhook-Ereignistypen

Alle Webhook-Ereignisse werden in einer gemeinsamen Enumeration normalisiert:

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

## Zahlungsströme

Die Vorlage unterstützt zwei Zahlungsströme für die Einreichung von Inhalten:

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

- **Pay at Start**: Der Benutzer zahlt, bevor die Einreichung überprüft wird.
- **Pay at End**: Der Benutzer reicht kostenlos ein und zahlt erst nach Genehmigung.

## API-Routenreferenz

### Streifenrouten

| Route | Methode | Beschreibung |
|-------|--------|-------------|
| `/api/stripe/checkout` | POST | Erstellen Sie eine Checkout-Sitzung |
| `/api/stripe/subscription` | GET/POST | Abonnements verwalten |
| `/api/stripe/subscription/portal` | POST | Abrechnungsportalsitzung erstellen |
| `/api/stripe/subscription/[id]/cancel` | POST | Ein Abonnement kündigen |
| `/api/stripe/payment-intent` | POST | Erstellen Sie eine Zahlungsabsicht |
| `/api/stripe/payment-methods/list` | GET | Gespeicherte Zahlungsmethoden auflisten |
| `/api/stripe/payment-methods/create` | POST | Zahlungsmethode hinzufügen |
| `/api/stripe/payment-methods/delete` | POST | Eine Zahlungsmethode entfernen |
| `/api/stripe/setup-intent` | POST | Erstellen Sie eine Setup-Absicht |
| `/api/stripe/webhook` | POST | Behandeln Sie Stripe-Webhooks |

### LemonSqueezy-Routen

| Route | Methode | Beschreibung |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | POST | Checkout-Sitzung erstellen |
| `/api/lemonsqueezy/cancel` | POST | Ein Abonnement kündigen |
| `/api/lemonsqueezy/reactivate` | POST | Ein Abonnement reaktivieren |
| `/api/lemonsqueezy/update-plan` | POST | Abonnement ändern |
| `/api/lemonsqueezy/list` | GET | Benutzerabonnements auflisten |
| `/api/lemonsqueezy/webhook` | POST | Webhooks verarbeiten |

### Polarrouten

| Route | Methode | Beschreibung |
|-------|--------|-------------|
| `/api/polar/checkout` | POST | Checkout-Sitzung erstellen |
| `/api/polar/subscription/portal` | POST | Kundenportal erstellen |
| `/api/polar/subscription/[id]/cancel` | POST | Ein Abonnement kündigen |
| `/api/polar/subscription/[id]/reactivate` | POST | Reaktivieren |
| `/api/polar/webhook` | POST | Webhooks verarbeiten |

## Utility-Funktionen

Die Datei `payment-types.ts` enthält nützliche Formatierungshilfen:

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

## Nächste Schritte

- [Stripe-Konfiguration](./stripe) – Stripe-Einrichtung abschließen
- [LemonSqueezy-Konfiguration](./lemonsqueezy) – LemonSqueezy-Setup
- [Polarkonfiguration](./polar) – Polar-Setup
- [Multi-Currency-Integration](./multi-currency) – Währungsunterstützung
- [Zahlungsarchitektur](./zahlungsarchitektur) – Tauchen Sie tief in die Architektur ein
– [Webhooks](./webhooks) – Details zur Webhook-Verarbeitung
- [Konfigurationshandbuch](./configuration) – Alle Umgebungsvariablen und Optionen
