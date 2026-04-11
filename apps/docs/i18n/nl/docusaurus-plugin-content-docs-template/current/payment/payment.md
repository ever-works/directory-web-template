---
id: payment-overview
title: Overzicht betalingsintegratie
sidebar_label: Integratie Gids
sidebar_position: 1.5
---

# Betalingsintegratieoverzicht

Deze gids biedt een praktische uitleg van het Ever Works-betalingssysteem. Het behandelt de abstractielaag van de provider, hoe elke provider moet worden geconfigureerd, de betaal- en abonnementslevenscyclus, feature-gating en webhook-afhandeling.

## Providerarchitectuur in één oogopslag

Het betalingssysteem is gebouwd op een **provider-onafhankelijke abstractie**. Elke betalingsprovider implementeert dezelfde `PaymentProviderInterface` , en dankzij een fabriekspatroon kunt u van provider wisselen zonder de applicatiecode te wijzigen.

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

### Ondersteunde providers

| Aanbieder | Eenmalige betalingen | Abonnementen | Proeven | Webhooks | Handelaar van record |
|------------|:-:|:-:|:-:|:-:|:-:|
| Streep | Ja | Ja | Ja | Ja | Nee |
| CitroenSqueezy | Ja | Ja | Ja | Ja | Ja |
| Polair | Ja | Ja | Ja | Ja | Nee |
| Solidgate | Ja | Ja | Nee | Ja | Nee |

## Kerninterfaces

### PaymentProviderInterface

Elke aanbieder implementeert deze interface, gedefinieerd in `lib/payment/types/payment-types.ts` :

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

### Belangrijke gegevenstypen

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

## Snelle installatie

### Stap 1: Stel omgevingsvariabelen in

Elke provider heeft API-sleutels en webhookgeheimen nodig. Voeg ze toe aan `.env.local` :

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

### Stap 2: Prijsplannen configureren

Prijsplannen worden gedefinieerd in uw `.content/config.yml` :

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

### Stap 3: Webhooks instellen

Elke provider heeft een speciaal webhookeindpunt:

| Aanbieder | Webhook-URL |
|------------|---------------------------|
| Streep | `/api/stripe/webhook` |
| CitroenSqueezy | `/api/lemonsqueezy/webhook` |
| Polair | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Configureer deze URL's in het dashboard van elke provider, verwijzend naar uw geïmplementeerde domein.

## De PaymentProviderFactory

De fabriek maakt providerinstanties op basis van een typetekenreeks:

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

## Betaalservice en ServiceManager

### Betaalservice

De `PaymentService` omvat de actieve providerinstantie en stelt een uniforme API beschikbaar:

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

De manager regelt het wisselen van provider tijdens runtime en houdt de keuze van de gebruiker vast in `localStorage` :

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

## Reageer-integratie

### Context van betalingsprovider

Verpak uw aanvraag (of betalingsgerelateerde pagina's) met de `PaymentProvider` :

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

### gebruik Betalingshaak

Componenten hebben toegang tot de betaaldienst via de `usePayment` -haak:

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

**Gebruiksvoorbeeld:**

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

## Functiepoort

De `FeatureGuard` -component beperkt UI-elementen op basis van het abonnement van de gebruiker:

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

**Gebruik:**

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

### Ondersteuning voor respijtperiode

Verlopen abonnementen krijgen een respijtperiode van zeven dagen met verminderde toegang:

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

## Webhook-gebeurtenistypen

Alle webhook-gebeurtenissen worden genormaliseerd in een gemeenschappelijke opsomming:

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

## Betalingsstromen

De sjabloon ondersteunt twee betalingsstromen voor inzendingen van inhoud:

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

- **Betalen bij start**: de gebruiker betaalt voordat de inzending wordt beoordeeld.
- **Betalen aan het einde**: Gebruiker dient gratis in, betaalt pas na goedkeuring.

## API-routereferentie

### Streeproutes

| Route | Werkwijze | Beschrijving |
|-------|--------|------------|
| `/api/stripe/checkout` | POST | Maak een afrekensessie aan |
| `/api/stripe/subscription` | KRIJGEN/POST | Abonnementen beheren |
| `/api/stripe/subscription/portal` | POST | Factureringsportaalsessie maken |
| `/api/stripe/subscription/[id]/cancel` | POST | Een abonnement opzeggen |
| `/api/stripe/payment-intent` | POST | Een betalingsintentie aanmaken |
| `/api/stripe/payment-methods/list` | KRIJG | Lijst van opgeslagen betaalmethoden |
| `/api/stripe/payment-methods/create` | POST | Voeg een betaalmethode toe |
| `/api/stripe/payment-methods/delete` | POST | Een betaalmethode verwijderen |
| `/api/stripe/setup-intent` | POST | Maak een installatie-intentie |
| `/api/stripe/webhook` | POST | Handvat Stripe webhaken |

### LemonSqueezy-routes

| Route | Werkwijze | Beschrijving |
|-------|--------|------------|
| `/api/lemonsqueezy/checkout` | POST | Afrekensessie aanmaken |
| `/api/lemonsqueezy/cancel` | POST | Een abonnement opzeggen |
| `/api/lemonsqueezy/reactivate` | POST | Een abonnement opnieuw activeren |
| `/api/lemonsqueezy/update-plan` | POST | Abonnement wijzigen |
| `/api/lemonsqueezy/list` | KRIJG | Lijst gebruikersabonnementen |
| `/api/lemonsqueezy/webhook` | POST | Behandel webhooks |

### Polaire routes

| Route | Werkwijze | Beschrijving |
|-------|--------|------------|
| `/api/polar/checkout` | POST | Afrekensessie aanmaken |
| `/api/polar/subscription/portal` | POST | Klantportaal maken |
| `/api/polar/subscription/[id]/cancel` | POST | Een abonnement opzeggen |
| `/api/polar/subscription/[id]/reactivate` | POST | Opnieuw activeren |
| `/api/polar/webhook` | POST | Behandel webhooks |

## Hulpprogramma's

Het `payment-types.ts` -bestand bevat handige opmaakhulpmiddelen:

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

## Volgende stappen

- [Stripe-configuratie] (./stripe) -- Volledige Stripe-installatie
- [LemonSqueezy-configuratie](./lemonsqueezy) -- LemonSqueezy-installatie
- [Polaire configuratie](./polar) -- Polaire instelling
- [Integratie van meerdere valuta](./multi-currency) -- Valuta-ondersteuning
- [Betaalarchitectuur](./betalingsarchitectuur) -- Duik diep in de architectuur
- [Webhooks](./webhooks) -- Details over de verwerking van webhooks
- [Configuratiehandleiding](./configuration) -- Alle omgevingsvariabelen en opties
