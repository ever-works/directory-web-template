---
id: payment-provider-architecture
title: Архитектура на доставчика на плащания
sidebar_label: Архитектура на доставчика
sidebar_position: 8
---

# Архитектура на доставчика на плащания

Тази страница обяснява как работят фабриката за доставчик на плащания и нивото на услугата, как да се разменят доставчици и интерфейсите, независими от доставчика, които обединяват и четирите интеграции на плащанията.

## Преглед

Шаблонът прилага архитектура за плащане, независима от доставчика, използвайки модела на стратегията. Фабрика създава екземпляри на доставчик, ниво на услугата излага унифициран API и всеки доставчик прилага общ интерфейс. Този дизайн позволява на приложението да поддържа Stripe, LemonSqueezy, Polar и Solidgate чрез един набор от интерфейси.

## Диаграма на архитектурата

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

## Поддържани доставчици

|Доставчик|Тип ID|Характеристики|
|----------|---------|----------|
|Ивица|`stripe`|Пълно плащане, абонаменти, методи на плащане, намерения за настройка, възстановяване на средства|
|LemonSqueezy|`lemonsqueezy`|Хоствано плащане, абонаменти, ценообразуване въз основа на варианти|
|Полярен|`polar`|Плащане, абонаменти, продукти с обхват на организацията|
|Solidgate|`solidgate`|API-базирани плащания, вграден SDK, абонаменти, възстановяване на средства|

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Интерфейсът на доставчика

Всички доставчици прилагат `PaymentProviderInterface`:

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

## Фабриката

`PaymentProviderFactory` създава екземпляри на доставчик въз основа на идентификатор на низ:

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

## Сервизният слой

`PaymentService` обвива екземпляр на доставчик и излага унифицирания API:

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

### Пример за използване

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

## Управление на сингълтън доставчик

Шаблонът използва единични модели за екземпляри на доставчик, управлявани чрез `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Тези функции гарантират, че съществува само един екземпляр на доставчик за време на изпълнение, като се избягва ненужната повторна инициализация на клиента на API.

## Дефиниции на ключови типове

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

### Информация за абонамент

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

### Състояние на абонамента

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

## Как да разменяте доставчици

### Стъпка 1: Задайте променливи на средата

Всеки доставчик изисква свой собствен набор от променливи на средата. Конфигурирайте само променливите за избрания от вас доставчик.

### Стъпка 2: Актуализирайте инициализацията на доставчика

Променете коя `getOrCreate*Provider` функция се използва във вашите манипулатори на маршрути или конфигурирайте `PaymentService` с различен низ на доставчик:

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

### Стъпка 3: Актуализирайте крайните точки на Webhook

Всеки доставчик има свой собствен маршрут за уеб кукичка (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook` и т.н.). Уверете се, че е регистриран само уебкукичката на активния доставчик.

### Стъпка 4: Боравете със специфични за доставчика функции

Някои функции са специфични за доставчика:
- **Намерения за настройка**: Само Stripe и Solidgate (макет)
- **Вградени форми за плащане**: Stripe и Solidgate чрез React SDK
- **Ценообразуване въз основа на варианти**: само LemonSqueezy
- **Продукти с обхват на организацията**: само Polar
- **API за директно възстановяване**: само Stripe и Solidgate

## Модел на решение на клиента

И четирите доставчика следват един и същ модел за разрешаване на проблеми с клиенти в три стъпки:

```
1. Check user metadata (e.g., user.user_metadata.stripe_customer_id)
   |
   v (not found)
2. Query PaymentAccount database table
   |
   v (not found)
3. Create new customer via provider API
   -> Synchronize to PaymentAccount table
   -> Return new customer ID
```

Този модел се прилага идентично в метода `getCustomerId()` на всеки доставчик, като се гарантира последователно поведение, независимо кой доставчик е активен.

## Нормализиране на събития в Webhook

Всеки доставчик картографира собствените си типове събития към общия `WebhookEventType` enum. Това позволява на `WebhookSubscriptionService` да обработва събития общо:

|Действие|Ивица|LemonSqueezy|Полярен|Solidgate|
|--------|--------|-------------|-------|-----------|
|Под създаден|`customer.subscription.created`|`subscription_created`|`subscription.created`|`subscription.created`|
|Sub анулиран|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|`subscription.cancelled`|
|Успешно плащане|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|`payment.succeeded`|
|Неуспешно плащане|`payment_intent.payment_failed`|N/A|`checkout.failed`|`payment.failed`|

## Компоненти на потребителския интерфейс

Всеки доставчик излага компоненти на потребителския интерфейс чрез `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

Това позволява на интерфейса да рендира правилния формуляр за плащане, лога и икони на марка на карта, без да знае кой доставчик е активен.

## Файлова структура

```
lib/payment/
  lib/
    payment-service.ts            # PaymentService class
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Shared interfaces and enums
  ui/
    stripe/                       # Stripe Elements wrapper
    solidgate/                    # Solidgate Elements wrapper
```

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Задълбочено гмуркане на абонамента на Stripe](./stripe-subscription-deep-dive.md)
- [Задълбочено потапяне в методите на плащане на Stripe](./stripe-payment-methods-deep-dive.md)
- [Дълбоко гмуркане на Stripe Webhook](./stripe-webhook-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Полярно дълбоко гмуркане](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
