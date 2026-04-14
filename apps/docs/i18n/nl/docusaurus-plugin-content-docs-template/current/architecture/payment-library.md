---
id: payment-library
title: "Betalingsbibliotheek"
sidebar_label: "Betalingsbibliotheek"
sidebar_position: 17
---

# Betalingsbibliotheek

De sjabloon implementeert een betalingssysteem voor meerdere aanbieders met behulp van de fabrieks- en strategiepatronen. Het ondersteunt Stripe, LemonSqueezy, Solidgate en Polar als betalingsproviders, met een uniforme interface voor betalingen, abonnementen, webhooks en terugbetalingen.

## Architectuuroverzicht

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

## Bronbestanden

|Bestand|Doel|
|------|---------|
|`lib/payment/index.ts`|Openbare API-exports|
|`lib/payment/lib/payment-provider-factory.ts`|Fabriek voor het maken van providerinstanties|
|`lib/payment/lib/payment-service.ts`|Uniforme servicegevel|
|`lib/payment/lib/payment-service-manager.ts`|Singleton-manager voor de servicelevenscyclus|
|`lib/payment/types/payment-types.ts`|Kerninterfaces en opsommingen|
|`lib/payment/types/payment.ts`|Betalingsstroom en indieningstypen|
|`lib/payment/config/`|Configuratie en validatie van de provider|
|`lib/payment/lib/providers/`|Implementaties van individuele providers|
|`lib/payment/hooks/`|React hooks voor betalingsstromen aan de klantzijde|
|`lib/payment/ui/`|Onderdelen van het betalingsformulier|

## Kerninterfaces

### PaymentProviderInterface

Elke aanbieder implementeert deze uitgebreide interface:

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

Creëert providerinstanties op basis van configuratie:

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

## Betaalservice

De klasse `PaymentService` biedt een uniforme façade voor alle provideractiviteiten:

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

## Gegevenstypen

### Betalingsenums

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

### Webhook-evenementen

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

### Belangrijke gegevensstructuren

|Typ|Doel|
|------|---------|
|`PaymentIntent`|Betaalsessie met ID, bedrag, valuta, status, klantgeheim|
|`SubscriptionInfo`|Abonnementsgegevens met status, einde periode, proefinfo|
|`CustomerResult`|Klant aangemaakt met id, e-mailadres, naam|
|`WebhookResult`|Verwerkte webhook met type, id, gegevens|
|`ClientConfig`|Frontend-veilige configuratie met publicKey en gatewaytype|
|`UIComponents`|Reageercomponenten en visuele middelen voor de provider|

## Valutavoorzieningen

De bibliotheek bevat hulpfuncties voor het opmaken van valuta:

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

## Soorten betalingsstromen

Het systeem ondersteunt twee betalingsstromen voor indieningen:

|Stroom|Enum|Beschrijving|
|------|------|-------------|
|Betaal bij aanvang|`PAY_AT_START`|Betaling vereist vóór beoordeling van de indiening|
|Betaal aan het einde|`PAY_AT_END`|Betaling geïnd na goedkeuring door de beheerder|

### Levenscyclus van indieningsstatus

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

## Interface voor UI-componenten

Elke provider stelt UI-componenten beschikbaar voor frontend-integratie:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Integratie aan de klantzijde

De `usePayment` hook en `PaymentProvider` context bieden React-integratie:

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

## Providerconfiguratie

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

Elke provider heeft minimaal een `apiKey` nodig. Stripe en Solidgate gebruiken ook `webhookSecret` voor verificatie van webhookhandtekeningen.
