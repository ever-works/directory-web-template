---
id: payment-provider-architecture
title: "Payment Provider Architecture"
sidebar_label: "Payment Provider Architecture"
---

# Architectuur van betalingsproviders

Deze pagina legt uit hoe de betalingsprovider-factory en servicelaag werken, hoe u van provider kunt wisselen en welke provider-onafhankelijke interfaces alle vier betalingsintegraties verenigen.

## Overzicht

De template implementeert een provider-onafhankelijke betalingsarchitectuur op basis van het Strategy-patroon. Een factory maakt provider-instanties aan, een servicelaag biedt een uniforme API en elke provider implementeert een gemeenschappelijke interface. Dit ontwerp stelt de applicatie in staat om Stripe, LemonSqueezy, Polar en Solidgate te ondersteunen via één set interfaces.

## Architectuurdiagram

```
Applicatiecode
      |
      v
PaymentService (uniforme API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## Ondersteunde providers

| Provider | Type ID | Functies |
|----------|---------|----------|
| Stripe | `stripe` | Volledige afrekening, abonnementen, betaalmethoden, setup intents, terugbetalingen |
| LemonSqueezy | `lemonsqueezy` | Gehoste afrekening, abonnementen, variant-gebaseerde prijsstelling |
| Polar | `polar` | Afrekening, abonnementen, organisatie-gebonden producten |
| Solidgate | `solidgate` | API-gebaseerde betalingen, ingebedde SDK, abonnementen, terugbetalingen |

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## De provider-interface

Alle providers implementeren `PaymentProviderInterface`:

```typescript
interface PaymentProviderInterface {
  // Klantbeheer
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Betaaloperaties
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Abonnementsbeheer
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Terugbetalingen
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Clientconfiguratie
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## De factory

`PaymentProviderFactory` maakt provider-instanties aan op basis van een string-identificator:

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

## De servicelaag

`PaymentService` omhult een provider-instantie en biedt de uniforme API:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delegeert alle aanroepen naar de onderliggende provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... alle andere methoden delegeren naar this.provider
}
```

### Gebruiksvoorbeeld

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

// Dezelfde API ongeacht de provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## Singleton providerbeheer

De template gebruikt singleton-patronen voor provider-instanties, beheerd via `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Deze functies zorgen ervoor dat er slechts één provider-instantie bestaat per runtime, waardoor onnodige herinitialisatie van API-clients wordt vermeden.

## Belangrijke type-definities

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

### PaymentIntent

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

### SubscriptionInfo

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

### SubscriptionStatus

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

## Hoe u van provider wisselt

### Stap 1: Omgevingsvariabelen instellen

Elke provider vereist zijn eigen set omgevingsvariabelen. Configureer alleen de variabelen voor uw gekozen provider.

### Stap 2: De provider-initialisatie bijwerken

Wijzig welke `getOrCreate*Provider`-functie wordt gebruikt in uw route-handlers, of configureer `PaymentService` met een andere provider-string:

```typescript
// Voor (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// Na (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### Stap 3: Webhook-eindpunten bijwerken

Elke provider heeft zijn eigen webhook-route (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook`, etc.). Zorg ervoor dat alleen de webhook van de actieve provider is geregistreerd.

### Stap 4: Provider-specifieke functies afhandelen

Sommige functies zijn provider-specifiek:
- **Setup intents**: Alleen Stripe en Solidgate (mock)
- **Ingebedde betaalformulieren**: Stripe en Solidgate via React SDK
- **Variant-gebaseerde prijsstelling**: Alleen LemonSqueezy
