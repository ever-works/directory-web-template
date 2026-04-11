---
id: payment-overview
title: Общ преглед на интегрирането на плащанията
sidebar_label: Ръководство за интегриране
sidebar_position: 1.5
---

# Преглед на интегрирането на плащанията

Това ръководство предоставя практическа информация за платежната система Ever Works. Той обхваща слоя за абстракция на доставчика, как да конфигурирате всеки доставчик, жизнения цикъл на плащането и абонамента, стробиране на функции и обработка на webhook.

## Архитектурата на доставчика с един поглед

Платежната система е изградена върху **абстракция, независима от доставчика**. Всеки доставчик на плащания прилага един и същ `PaymentProviderInterface` , а фабричен модел ви позволява да сменяте доставчика, без да променяте кода на приложението.

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

### Поддържани доставчици

| Доставчик | Еднократни плащания | Абонаменти | Изпитания | Уеб кукички | Рекорден търговец |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Ивица | Да | Да | Да | Да | Не |
| LemonSqueezy | Да | Да | Да | Да | Да |
| Полярен | Да | Да | Да | Да | Не |
| Solidgate | Да | Да | Не | Да | Не |

## Основни интерфейси

### PaymentProviderInterface

Всеки доставчик прилага този интерфейс, дефиниран в `lib/payment/types/payment-types.ts` :

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

### Ключови типове данни

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

## Бърза настройка

### Стъпка 1: Задаване на променливи на средата

Всеки доставчик изисква API ключове и тайни за уеб кукичка. Добавете ги към `.env.local` :

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

### Стъпка 2: Конфигурирайте ценови планове

Ценовите планове са определени във вашия `.content/config.yml` :

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

### Стъпка 3: Настройте уеб кукички

Всеки доставчик има специална крайна точка за уеб кукичка:

| Доставчик | URL адрес на уеб кукичка |
|-------------|------------------------------|
| Ивица | `/api/stripe/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Полярен | `/api/polar/webhook` |
| Solidgate | `/api/solidgate/webhook` |

Конфигурирайте тези URL адреси в таблото за управление на всеки доставчик, сочещи към вашия внедрен домейн.

## PaymentProviderFactory

Фабриката създава екземпляри на доставчик въз основа на низ тип:

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

## PaymentService и ServiceManager

### PaymentService `PaymentService` обвива екземпляра на активния доставчик и излага единен API:

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

Мениджърът управлява превключването на доставчик по време на изпълнение и запазва избора на потребителя в `localStorage` :

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

## Интегриране на React

### Контекст на PaymentProvider

Опаковайте вашето приложение (или страници, свързани с плащане) с `PaymentProvider` :

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

### usePayment Hook

Компонентите имат достъп до платежната услуга чрез куката `usePayment` :

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

**Пример за използване:**

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

## Функция Gating

Компонентът `FeatureGuard` ограничава UI елементи въз основа на абонаментния план на потребителя:

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

**Употреба:**

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

### Поддръжка за гратисен период

Изтеклите планове получават 7-дневен гратисен период с намален достъп:

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

## Типове събития на Webhook

Всички уеб кукички събития се нормализират в общ enum:

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

## Потоци на плащане

Шаблонът поддържа два потока на плащане за изпращане на съдържание:

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

- **Плащане в началото**: Потребителят плаща, преди изпращането да бъде прегледано.
- **Плащане в края**: Потребителят изпраща безплатно, плаща само след одобрение.

## Справка за API маршрут

### Stripe Routes

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/stripe/checkout` | ПУБЛИКАЦИЯ | Създайте сесия за плащане |
| `/api/stripe/subscription` | ВЗЕМЕТЕ/ПУБЛИКУВАЙТЕ | Управление на абонаменти |
| `/api/stripe/subscription/portal` | ПУБЛИКАЦИЯ | Създайте сесия на портала за таксуване |
| `/api/stripe/subscription/[id]/cancel` | ПУБЛИКАЦИЯ | Анулиране на абонамент |
| `/api/stripe/payment-intent` | ПУБЛИКАЦИЯ | Създайте намерение за плащане |
| `/api/stripe/payment-methods/list` | ВЗЕМЕТЕ | Избройте запазените методи на плащане |
| `/api/stripe/payment-methods/create` | ПУБЛИКАЦИЯ | Добавете метод на плащане |
| `/api/stripe/payment-methods/delete` | ПУБЛИКАЦИЯ | Премахване на метод на плащане |
| `/api/stripe/setup-intent` | ПУБЛИКАЦИЯ | Създайте намерение за настройка |
| `/api/stripe/webhook` | ПУБЛИКАЦИЯ | Обработване на уеб кукички Stripe |

### LemonSqueezy Routes

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | ПУБЛИКАЦИЯ | Създаване на сесия за плащане |
| `/api/lemonsqueezy/cancel` | ПУБЛИКАЦИЯ | Анулиране на абонамент |
| `/api/lemonsqueezy/reactivate` | ПУБЛИКАЦИЯ | Повторно активиране на абонамент |
| `/api/lemonsqueezy/update-plan` | ПУБЛИКАЦИЯ | Промяна на абонаментен план |
| `/api/lemonsqueezy/list` | ВЗЕМЕТЕ | Избройте потребителските абонаменти |
| `/api/lemonsqueezy/webhook` | ПУБЛИКАЦИЯ | Обработка на уеб кукички |

### Полярни маршрути

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/polar/checkout` | ПУБЛИКАЦИЯ | Създаване на сесия за плащане |
| `/api/polar/subscription/portal` | ПУБЛИКАЦИЯ | Създайте портал за клиенти |
| `/api/polar/subscription/[id]/cancel` | ПУБЛИКАЦИЯ | Анулиране на абонамент |
| `/api/polar/subscription/[id]/reactivate` | ПУБЛИКАЦИЯ | Реактивиране |
| `/api/polar/webhook` | ПУБЛИКАЦИЯ | Обработка на уеб кукички |

## Помощни функции

Файлът `payment-types.ts` включва полезни помощни средства за форматиране:

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

## Следващи стъпки

- [Конфигурация на лента](./лента) -- Пълна настройка на лента
- [Конфигурация на LemonSqueezy](./lemonsqueezy) -- Настройка на LemonSqueezy
- [Полярна конфигурация](./polar) -- Полярна настройка
- [Мултивалутна интеграция](./multi-currency) -- Поддръжка на валута
– [Архитектура на плащане](./payment-architecture) – Потопете се в дълбочина в архитектурата
- [Webhooks](./webhooks) -- Подробности за обработка на уеб кукички
- [Ръководство за конфигуриране](./configuration) -- Всички променливи и опции на средата
