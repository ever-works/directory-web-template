---
id: payment-provider-architecture
title: "Architettura del Provider di Pagamento"
sidebar_label: "Architettura Provider"
---

# Architettura del Provider di Pagamento

Questa pagina spiega come funzionano la factory del provider di pagamento e il livello di servizio, come sostituire i provider, e le interfacce provider-agnostiche che unificano le quattro integrazioni di pagamento.

## Panoramica

Il template implementa un'architettura di pagamento provider-agnostica usando il pattern Strategy. Una factory crea le istanze dei provider, un livello di servizio espone un'API unificata, e ogni provider implementa un'interfaccia comune. Questo design consente all'applicazione di supportare Stripe, LemonSqueezy, Polar e Solidgate attraverso un unico insieme di interfacce.

## Diagramma dell'Architettura

```
Codice Applicativo
      |
      v
PaymentService (API unificata)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## Provider Supportati

| Provider | ID Tipo | Funzionalità |
|----------|---------|----------|
| Stripe | `stripe` | Checkout completo, abbonamenti, metodi di pagamento, setup intent, rimborsi |
| LemonSqueezy | `lemonsqueezy` | Checkout ospitato, abbonamenti, prezzi basati su varianti |
| Polar | `polar` | Checkout, abbonamenti, prodotti con scope organizzazione |
| Solidgate | `solidgate` | Pagamenti basati su API, SDK integrato, abbonamenti, rimborsi |

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## L'Interfaccia del Provider

Tutti i provider implementano `PaymentProviderInterface`:

```typescript
interface PaymentProviderInterface {
  // Gestione clienti
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Operazioni di pagamento
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Gestione abbonamenti
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhook
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Rimborsi
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Configurazione client
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## La Factory

`PaymentProviderFactory` crea istanze del provider in base a un identificatore stringa:

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

## Il Livello di Servizio

`PaymentService` avvolge un'istanza del provider ed espone l'API unificata:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delega tutte le chiamate al provider sottostante
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... tutti gli altri metodi delegano a this.provider
}
```

### Esempio di Utilizzo

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

// Stessa API indipendentemente dal provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## Gestione Singleton del Provider

Il template utilizza pattern singleton per le istanze del provider, gestite tramite `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Queste funzioni assicurano che esista una sola istanza del provider per runtime, evitando la re-inizializzazione inutile del client API.

## Definizioni dei Tipi Principali

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

## Come Sostituire i Provider

### Passo 1: Imposta le Variabili d'Ambiente

Ogni provider richiede il proprio set di variabili d'ambiente. Configura solo le variabili per il provider scelto.

### Passo 2: Aggiorna l'Inizializzazione del Provider

Cambia quale funzione `getOrCreate*Provider` viene usata nei gestori di route, oppure configura `PaymentService` con una stringa di provider diversa:

```typescript
// Prima (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// Dopo (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### Passo 3: Aggiorna gli Endpoint Webhook

Ogni provider ha il suo route webhook (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook`, ecc.). Assicurati che solo il webhook del provider attivo sia registrato.

### Passo 4: Gestisci le Funzionalità Specifiche del Provider

Alcune funzionalità sono specifiche del provider:
- **Setup intent**: Solo Stripe e Solidgate (mock)
- **Form di pagamento integrati**: Stripe e Solidgate tramite React SDK
- **Prezzi basati su varianti**: Solo LemonSqueezy
- **Prodotti con scope organizzazione**: Solo Polar
- **API di rimborso diretta**: Solo Stripe e Solidgate

## Pattern di Risoluzione Cliente

Tutti e quattro i provider seguono lo stesso pattern di risoluzione cliente in tre passaggi:

```
1. Controlla i metadati utente (es. user.user_metadata.stripe_customer_id)
   |
   v (non trovato)
2. Query sulla tabella di database PaymentAccount
   |
   v (non trovato)
3. Crea un nuovo cliente tramite l'API del provider
   -> Sincronizza sulla tabella PaymentAccount
   -> Restituisce il nuovo ID cliente
```

Questo pattern è implementato in modo identico nel metodo `getCustomerId()` di ogni provider, garantendo un comportamento coerente indipendentemente dal provider attivo.

## Normalizzazione degli Eventi Webhook

Ogni provider mappa i propri tipi di evento nativi all'enum comune `WebhookEventType`. Ciò consente a `WebhookSubscriptionService` di gestire gli eventi in modo generico:

| Azione | Stripe | LemonSqueezy | Polar | Solidgate |
|--------|--------|-------------|-------|----------|
| Sub creato | `customer.subscription.created` | `subscription_created` | `subscription.created` | `subscription.created` |
| Sub annullato | `customer.subscription.deleted` | `subscription_cancelled` | `subscription.canceled` | `subscription.cancelled` |
| Pagamento riuscito | `payment_intent.succeeded` | `order_created` | `checkout.succeeded` | `payment.succeeded` |
| Pagamento fallito | `payment_intent.payment_failed` | N/A | `checkout.failed` | `payment.failed` |

## Componenti UI

Ogni provider espone componenti UI tramite `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

Ciò consente al frontend di renderizzare il form di pagamento corretto, i loghi e le icone dei brand di carte senza conoscere quale provider è attivo.

## Struttura dei File

```
lib/payment/
  lib/
    payment-service.ts            # Classe PaymentService
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Interfacce ed enum condivisi
  ui/
    stripe/                       # Wrapper Stripe Elements
    solidgate/                    # Wrapper Solidgate Elements
```

## Pagine Correlate

- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Approfondimento Abbonamenti Stripe](./stripe-subscription-deep-dive.md)
- [Approfondimento Metodi di Pagamento Stripe](./stripe-payment-methods-deep-dive.md)
- [Approfondimento Webhook Stripe](./stripe-webhook-deep-dive.md)
- [Approfondimento LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Approfondimento Polar](./polar-deep-dive.md)
- [Approfondimento Solidgate](./solidgate-deep-dive.md)
