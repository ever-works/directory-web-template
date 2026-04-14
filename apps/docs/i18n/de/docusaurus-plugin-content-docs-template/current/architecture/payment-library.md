---
id: payment-library
title: "Zahlungsbibliothek"
sidebar_label: "Zahlungsbibliothek"
sidebar_position: 17
---

# Zahlungsbibliothek

Die Vorlage implementiert ein Multi-Provider-Zahlungssystem unter Verwendung der Factory- und Strategy-Muster. Es unterstützt Stripe, LemonSqueezy, Solidgate und Polar als Zahlungsanbieter mit einer einheitlichen Schnittstelle für Zahlungen, Abonnements, Webhooks und Rückerstattungen.

## Architekturübersicht

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

## Quelldateien

|Datei|Zweck|
|------|---------|
|`lib/payment/index.ts`|Öffentliche API-Exporte|
|`lib/payment/lib/payment-provider-factory.ts`|Factory zum Erstellen von Anbieterinstanzen|
|`lib/payment/lib/payment-service.ts`|Einheitliche Servicefassade|
|`lib/payment/lib/payment-service-manager.ts`|Singleton-Manager für den Service-Lebenszyklus|
|`lib/payment/types/payment-types.ts`|Kernschnittstellen und Aufzählungen|
|`lib/payment/types/payment.ts`|Zahlungsfluss und Einreichungsarten|
|`lib/payment/config/`|Anbieterkonfiguration und -validierung|
|`lib/payment/lib/providers/`|Individuelle Provider-Implementierungen|
|`lib/payment/hooks/`|Reagieren Sie auf Hooks für kundenseitige Zahlungsströme|
|`lib/payment/ui/`|Komponenten des Zahlungsformulars|

## Kernschnittstellen

### PaymentProviderInterface

Jeder Anbieter implementiert diese umfassende Schnittstelle:

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

Erstellt Anbieterinstanzen basierend auf der Konfiguration:

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

## Zahlungsservice

Die Klasse `PaymentService` bietet eine einheitliche Fassade für alle Anbieteroperationen:

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

## Datentypen

### Zahlungsaufzählungen

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

### Webhook-Ereignisse

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

### Wichtige Datenstrukturen

|Typ|Zweck|
|------|---------|
|`PaymentIntent`|Zahlungssitzung mit ID, Betrag, Währung, Status, Kundengeheimnis|
|`SubscriptionInfo`|Abonnementdetails mit Status, Laufzeitende, Testinformationen|
|`CustomerResult`|Kunde mit ID, E-Mail und Name erstellt|
|`WebhookResult`|Verarbeiteter Webhook mit Typ, ID und Daten|
|`ClientConfig`|Frontend-sichere Konfiguration mit öffentlichem Schlüssel und Gateway-Typ|
|`UIComponents`|React-Komponenten und visuelle Assets für den Anbieter|

## Währungsdienstprogramme

Die Bibliothek enthält Hilfsfunktionen für die Währungsformatierung:

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

## Zahlungsflussarten

Das System unterstützt zwei Einreichungszahlungsflüsse:

|Fließen|Aufzählung|Beschreibung|
|------|------|-------------|
|Bezahlen Sie beim Start|`PAY_AT_START`|Die Zahlung ist vor der Einreichungsprüfung erforderlich|
|Bezahlen am Ende|`PAY_AT_END`|Die Zahlung wird nach Genehmigung durch den Administrator eingezogen|

### Lebenszyklus des Einreichungsstatus

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

## UI-Komponentenschnittstelle

Jeder Anbieter stellt UI-Komponenten für die Frontend-Integration bereit:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Clientseitige Integration

Der `usePayment`-Hook und der `PaymentProvider`-Kontext sorgen für die React-Integration:

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

## Anbieterkonfiguration

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

Jeder Anbieter benötigt mindestens `apiKey`. Stripe und Solidgate verwenden auch `webhookSecret` für die Überprüfung der Webhook-Signatur.
