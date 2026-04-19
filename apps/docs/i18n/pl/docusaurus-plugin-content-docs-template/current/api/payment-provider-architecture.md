---
id: payment-provider-architecture
title: "Architektura dostawcy płatności"
sidebar_label: "Architektura dostawcy"
---

# Architektura dostawcy płatności

Ta strona wyjaśnia, jak działa fabryka dostawców płatności i warstwa serwisowa, jak zmieniać dostawców oraz jakie interfejsy niezależne od dostawcy unifikują wszystkie cztery integracje płatności.

## Przegląd

Szablon implementuje architekturę płatności niezależną od dostawcy, korzystając ze wzorca strategii. Fabryka tworzy instancje dostawców, warstwa serwisowa udostępnia ujednolicone API, a każdy dostawca implementuje wspólny interfejs. Ten projekt pozwala aplikacji obsługiwać Stripe, LemonSqueezy, Polar i Solidgate za pomocą jednego zestawu interfejsów.

## Diagram architektury

```
Application Code
      |
      v
PaymentService (unified API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## Obsługiwani dostawcy

| Dostawca | ID typu | Funkcje |
|----------|---------|---------|
| Stripe | `stripe` | Pełna kasa, subskrypcje, metody płatności, intencje konfiguracji, zwroty |
| LemonSqueezy | `lemonsqueezy` | Hostowana kasa, subskrypcje, cennik oparty na wariantach |
| Polar | `polar` | Kasa, subskrypcje, produkty przypisane do organizacji |
| Solidgate | `solidgate` | Płatności API, osadzony SDK, subskrypcje, zwroty |

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfejs dostawcy

Wszyscy dostawcy implementują `PaymentProviderInterface`:

```typescript
interface PaymentProviderInterface {
  // Customer management
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## Fabryka

`PaymentProviderFactory` tworzy instancje dostawców na podstawie identyfikatora w postaci ciągu znaków:

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

## Warstwa serwisowa

`PaymentService` opakowuje instancję dostawcy i udostępnia ujednolicone API:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delegates all calls to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other methods delegate to this.provider
}
```

### Przykład użycia

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

// Same API regardless of provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## Zarządzanie instancjami jako singleton

Szablon używa wzorców singleton do zarządzania instancjami dostawców poprzez `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Funkcje te zapewniają, że istnieje tylko jedna instancja dostawcy na czas wykonania, unikając niepotrzebnej reinicjalizacji klienta API.

## Kluczowe definicje typów

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

## Jak zmienić dostawcę

### Krok 1: Ustaw zmienne środowiskowe

Każdy dostawca wymaga własnego zestawu zmiennych środowiskowych. Skonfiguruj tylko zmienne dla wybranego dostawcy.

### Krok 2: Zaktualizuj inicjalizację dostawcy

Zmień, która funkcja `getOrCreate*Provider` jest używana w obsługach tras (route handlers), lub skonfiguruj `PaymentService` z innym ciągiem dostawcy:

```typescript
// Before (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// After (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### Krok 3: Zaktualizuj punkty końcowe webhooka

Każdy dostawca ma własną trasę webhooka (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook` itd.). Upewnij się, że zarejestrowany jest tylko webhook aktywnego dostawcy.

### Krok 4: Obsługuj funkcje specyficzne dla dostawcy

Niektóre funkcje są specyficzne dla dostawcy:
- **Intencje konfiguracji (setup intents)**: tylko Stripe i Solidgate (mock)
- **Osadzone formularze płatności**: Stripe i Solidgate przez React SDK
- **Cennik oparty na wariantach**: tylko LemonSqueezy
- **Produkty przypisane do organizacji**: tylko Polar
- **Bezpośrednie API zwrotów**: Stripe i Solidgate

## Wzorzec rozwiązywania klienta

Wszyscy czterej dostawcy stosują ten sam trójkrokowy wzorzec rozwiązywania klienta:

```
1. Sprawdź metadane użytkownika (np. user.user_metadata.stripe_customer_id)
   |
   v (nie znaleziono)
2. Zapytaj tabelę bazy danych PaymentAccount
   |
   v (nie znaleziono)
3. Utwórz nowego klienta przez API dostawcy
   -> Synchronizuj z tabelą PaymentAccount
   -> Zwróć nowe ID klienta
```

Ten wzorzec jest implementowany identycznie w metodzie `getCustomerId()` każdego dostawcy, zapewniając spójne zachowanie niezależnie od aktywnego dostawcy.
