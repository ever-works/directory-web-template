---
id: payment-overview
title: Panoramica sull'integrazione dei pagamenti
sidebar_label: Guida all'integrazione
sidebar_position: 1.5
---

# Panoramica sull'integrazione dei pagamenti

Questa guida fornisce una panoramica pratica del sistema di pagamento Ever Works. Copre il livello di astrazione del provider, come configurare ciascun provider, il ciclo di vita del pagamento e dell'abbonamento, il gating delle funzionalità e la gestione del webhook.

## Architettura del provider in breve

Il sistema di pagamento è costruito su un'**astrazione indipendente dal fornitore**. Ogni fornitore di servizi di pagamento implementa lo stesso `PaymentProviderInterface` e un modello di fabbrica ti consente di cambiare fornitore senza modificare il codice dell'applicazione.

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

### Provider supportati

| Fornitore | Pagamenti una tantum | Abbonamenti | Prove | Webhook | Commerciante di record |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Striscia | Sì | Sì | Sì | Sì | No |
| LemonSqueezy | Sì | Sì | Sì | Sì | Sì |
| Polare | Sì | Sì | Sì | Sì | No |
| Solidgate | Sì | Sì | No | Sì | No |

## Interfacce principali

### Interfaccia del fornitore di pagamenti

Ogni fornitore implementa questa interfaccia, definita in `lib/payment/types/payment-types.ts` :

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

### Tipi di dati chiave

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

## Configurazione rapida

### Passaggio 1: imposta le variabili di ambiente

Ogni provider richiede chiavi API e segreti webhook. Aggiungili a `.env.local` :

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

### Passaggio 2: configura i piani tariffari

I piani tariffari sono definiti nel tuo `.content/config.yml` :

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

### Passaggio 3: configurazione dei webhook

Ogni provider ha un endpoint webhook dedicato:

| Fornitore | URL del webhook |
|-------------|-------------------------------|
| Striscia | `/api/stripe/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Polare | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Configura questi URL nella dashboard di ciascun provider, puntando al tuo dominio distribuito.

## La PaymentProviderFactory

La factory crea istanze del provider in base a una stringa di tipo:

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

## Servizio di pagamento e ServiceManager

### Servizio di pagamento

Il `PaymentService` avvolge l'istanza attiva del provider ed espone un'API uniforme:

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

### PaymentServiceManager (singolo)

Il gestore gestisce il cambio del provider in fase di runtime e mantiene la scelta dell'utente in `localStorage` :

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

## Integrazione di reazione

### Contesto del fornitore di pagamenti

Avvolgi la tua richiesta (o le pagine relative ai pagamenti) con `PaymentProvider` :

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

### usa il gancio di pagamento

I componenti accedono al servizio di pagamento tramite l'hook `usePayment` :

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

**Esempio di utilizzo:**

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

## Gating delle funzionalità

Il componente `FeatureGuard` limita gli elementi dell'interfaccia utente in base al piano di abbonamento dell'utente:

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

**Utilizzo:**

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

### Supporto per il periodo di grazia

I piani scaduti ricevono un periodo di grazia di 7 giorni con accesso ridotto:

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

## Tipi di eventi webhook

Tutti gli eventi webhook sono normalizzati in un'enumerazione comune:

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

## Flussi di pagamento

Il modello supporta due flussi di pagamento per l'invio di contenuti:

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

- **Paga all'inizio**: l'utente paga prima che l'invio venga esaminato.
- **Paga alla fine**: l'utente invia gratuitamente, paga solo dopo l'approvazione.

## Riferimento al percorso API

### Percorsi a strisce

| Itinerario | Metodo | Descrizione |
|-------|--------|-----|
| `/api/stripe/checkout` | POST | Crea una sessione di pagamento |
| `/api/stripe/subscription` | OTTIENI/POSTA | Gestisci abbonamenti |
| `/api/stripe/subscription/portal` | POST | Crea sessione del portale di fatturazione |
| `/api/stripe/subscription/[id]/cancel` | POST | Annulla un abbonamento |
| `/api/stripe/payment-intent` | POST | Crea un intento di pagamento |
| `/api/stripe/payment-methods/list` | OTTIENI | Elenco metodi di pagamento salvati |
| `/api/stripe/payment-methods/create` | POST | Aggiungi un metodo di pagamento |
| `/api/stripe/payment-methods/delete` | POST | Rimuovere un metodo di pagamento |
| `/api/stripe/setup-intent` | POST | Crea un intento di installazione |
| `/api/stripe/webhook` | POST | Maniglia webhook Stripe |

### Percorsi LemonSqueezy

| Itinerario | Metodo | Descrizione |
|-------|--------|-----|
| `/api/lemonsqueezy/checkout` | POST | Crea sessione di pagamento |
| `/api/lemonsqueezy/cancel` | POST | Annulla un abbonamento |
| `/api/lemonsqueezy/reactivate` | POST | Riattivare un abbonamento |
| `/api/lemonsqueezy/update-plan` | POST | Cambia piano di abbonamento |
| `/api/lemonsqueezy/list` | OTTIENI | Elenco abbonamenti utente |
| `/api/lemonsqueezy/webhook` | POST | Gestire i webhook |

### Rotte polari

| Itinerario | Metodo | Descrizione |
|-------|--------|-----|
| `/api/polar/checkout` | POST | Crea sessione di pagamento |
| `/api/polar/subscription/portal` | POST | Crea portale clienti |
| `/api/polar/subscription/[id]/cancel` | POST | Annulla un abbonamento |
| `/api/polar/subscription/[id]/reactivate` | POST | Riattiva |
| `/api/polar/webhook` | POST | Gestire i webhook |

## Funzioni di utilità

Il file `payment-types.ts` include utili aiutanti per la formattazione:

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

## Passaggi successivi

- [Configurazione Stripe](./stripe) - Completa la configurazione di Stripe
- [Configurazione LemonSqueezy](./lemonsqueezy) -- Configurazione LemonSqueezy
- [Configurazione polare](./polar) -- Configurazione polare
- [Integrazione multivaluta](./multi-currency) -- Supporto valuta
- [Architettura di pagamento](./payment-architecture) - Approfondimento sull'architettura
- [Webhooks](./webhooks): dettagli sulla gestione dei webhook
- [Guida alla configurazione](./configuration) -- Tutte le variabili e le opzioni di ambiente
