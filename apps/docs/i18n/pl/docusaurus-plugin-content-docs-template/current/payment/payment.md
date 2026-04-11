---
id: payment-overview
title: Omówienie integracji płatności
sidebar_label: Przewodnik po integracji
sidebar_position: 1.5
---

# Przegląd integracji płatności

Ten przewodnik zawiera praktyczny opis systemu płatności Ever Works. Omówiono warstwę abstrakcji dostawcy, sposób konfiguracji każdego dostawcy, cykl życia realizacji transakcji i subskrypcji, bramkowanie funkcji i obsługę elementu webhook.

## Architektura dostawcy w skrócie

System płatności opiera się na **abstrakcji niezależnej od dostawcy**. Każdy dostawca płatności wdraża to samo, a wzorzec fabryczny pozwala na zmianę dostawcy bez zmiany kodu aplikacji.

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

### Obsługiwani dostawcy

| Dostawca | Płatności jednorazowe | Subskrypcje | Próby | Haki internetowe | Rekordowy kupiec |
|------------|:-:|:-:|:-:|:-:|:-:|
| Pasek | Tak | Tak | Tak | Tak | Nie |
| Wyciskacz cytrynowy | Tak | Tak | Tak | Tak | Tak |
| Polarny | Tak | Tak | Tak | Tak | Nie |
| Solidgate | Tak | Tak | Nie | Tak | Nie |

## Podstawowe interfejsy

### Interfejs dostawcy płatności

Każdy dostawca wdraża ten interfejs, zdefiniowany w `lib/payment/types/payment-types.ts` :

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

### Kluczowe typy danych

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

## Szybka konfiguracja

### Krok 1: Ustaw zmienne środowiskowe

Każdy dostawca wymaga kluczy API i tajnych elementów webhook. Dodaj je do `.env.local` :

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

### Krok 2: Skonfiguruj plany cenowe

Plany cenowe są zdefiniowane w Twoim `.content/config.yml` :

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

### Krok 3: skonfiguruj webhooki

Każdy dostawca ma dedykowany punkt końcowy webhooka:

| Dostawca | Adres URL webhooka |
|------------|--------------------------------------------|
| Pasek | `/api/stripe/webhook` |
| Wyciskacz cytrynowy | `/api/lemonsqueezy/webhook` |
| Polarny | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Skonfiguruj te adresy URL na pulpicie nawigacyjnym każdego dostawcy, wskazując wdrożoną domenę.

## Fabryka dostawców płatności

Fabryka tworzy instancje dostawcy w oparciu o ciąg znaków:

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

## PaymentService i ServiceManager

### Usługa płatności `PaymentService` otacza instancję aktywnego dostawcy i udostępnia jednolite API:

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

### PaymentServiceManager (pojedynczy)

Menedżer obsługuje zmianę dostawcy w czasie wykonywania i utrwala wybór użytkownika w `localStorage` :

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

## Integracja Reaguj

### Kontekst dostawcy płatności

Owiń swoją aplikację (lub strony związane z płatnościami) znakiem `PaymentProvider` :

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

### użyj haka płatniczego

Komponenty uzyskują dostęp do usługi płatniczej poprzez hak `usePayment` :

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

**Przykład użycia:**

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

## Bramkowanie funkcji

Komponent `FeatureGuard` ogranicza elementy interfejsu użytkownika w zależności od planu subskrypcji użytkownika:

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

**Stosowanie:**

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

### Wsparcie w okresie karencji

Wygasłe plany otrzymują 7-dniowy okres karencji w przypadku obniżonego dostępu:

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

## Typy zdarzeń webhooka

Wszystkie zdarzenia webhooka są normalizowane we wspólnym wyliczeniu:

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

## Przepływy płatności

Szablon obsługuje dwa przepływy płatności za przesłane treści:

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

- **Zapłać na początku**: Użytkownik płaci przed sprawdzeniem zgłoszenia.
- **Zapłać na koniec**: Użytkownik przesyła dane za darmo, płaci dopiero po zatwierdzeniu.

## Odniesienie do trasy API

### Trasy pasków

| Trasa | Metoda | Opis |
|-------|--------|------------|
| `/api/stripe/checkout` | POST | Utwórz sesję realizacji transakcji |
| `/api/stripe/subscription` | POBIERZ/WYŚLIJ | Zarządzaj subskrypcjami |
| `/api/stripe/subscription/portal` | POST | Utwórz sesję portalu rozliczeniowego |
| `/api/stripe/subscription/[id]/cancel` | POST | Anuluj subskrypcję |
| `/api/stripe/payment-intent` | POST | Utwórz intencję płatniczą |
| `/api/stripe/payment-methods/list` | OTRZYMAJ | Lista zapisanych metod płatności |
| `/api/stripe/payment-methods/create` | POST | Dodaj metodę płatności |
| `/api/stripe/payment-methods/delete` | POST | Usuń metodę płatności |
| `/api/stripe/setup-intent` | POST | Utwórz zamiar konfiguracji |
| `/api/stripe/webhook` | POST | Obsługa webhooków Stripe |

### Trasy LemonSqueezy

| Trasa | Metoda | Opis |
|-------|--------|------------|
| `/api/lemonsqueezy/checkout` | POST | Utwórz sesję realizacji transakcji |
| `/api/lemonsqueezy/cancel` | POST | Anuluj subskrypcję |
| `/api/lemonsqueezy/reactivate` | POST | Aktywuj ponownie subskrypcję |
| `/api/lemonsqueezy/update-plan` | POST | Zmień plan subskrypcji |
| `/api/lemonsqueezy/list` | OTRZYMAJ | Lista subskrypcji użytkowników |
| `/api/lemonsqueezy/webhook` | POST | Obsługa webhooków |

### Trasy polarne

| Trasa | Metoda | Opis |
|-------|--------|------------|
| `/api/polar/checkout` | POST | Utwórz sesję realizacji transakcji |
| `/api/polar/subscription/portal` | POST | Utwórz portal klienta |
| `/api/polar/subscription/[id]/cancel` | POST | Anuluj subskrypcję |
| `/api/polar/subscription/[id]/reactivate` | POST | Aktywuj ponownie |
| `/api/polar/webhook` | POST | Obsługa webhooków |

## Funkcje użytkowe

Plik `payment-types.ts` zawiera przydatne pomoce formatowania:

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

## Następne kroki

- [Konfiguracja pasków](./stripe) -- Zakończ konfigurację pasków
- [Konfiguracja LemonSqueezy](./lemonsqueezy) -- Konfiguracja LemonSqueezy
- [Konfiguracja polarna](./polar) -- Konfiguracja polarna
- [Integracja wielu walut](./multi-currency) -- Obsługa walut
- [Architektura płatności](./payment-architecture) -- Zagłęb się w architekturę
- [Webhooks](./webhooks) -- Szczegóły obsługi webhooka
- [Przewodnik po konfiguracji](./configuration) -- Wszystkie zmienne środowiskowe i opcje
