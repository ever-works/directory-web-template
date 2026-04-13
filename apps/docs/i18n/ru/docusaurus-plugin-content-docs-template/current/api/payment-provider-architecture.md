---
id: payment-provider-architecture
title: Архитектура платежного провайдера
sidebar_label: Архитектура поставщика
sidebar_position: 8
---

# Архитектура платежного провайдера

На этой странице объясняется, как работают фабрика поставщиков платежей и уровень обслуживания, как менять поставщиков, а также независимые от поставщика интерфейсы, которые объединяют все четыре платежные интеграции.

## Обзор

Шаблон реализует независимую от поставщика платежную архитектуру с использованием шаблона Strategy. Фабрика создает экземпляры поставщика, уровень обслуживания предоставляет унифицированный API, а каждый поставщик реализует общий интерфейс. Такая конструкция позволяет приложению поддерживать Stripe, LemonSqueezy, Polar и Solidgate через единый набор интерфейсов.

## Схема архитектуры

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

## Поддерживаемые провайдеры

|Поставщик|Идентификатор типа|Особенности|
|----------|---------|----------|
|Полоса|`stripe`|Полная проверка, подписки, способы оплаты, намерения установки, возврат средств|
|ЛимонСжатый|`lemonsqueezy`|Хостинг-оформление заказа, подписки, ценообразование на основе вариантов|
|Полярный|`polar`|Оформление заказа, подписки, продукты на уровне организации|
|Солидгейт|`solidgate`|Платежи на основе API, встроенный SDK, подписки, возврат средств|

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Интерфейс провайдера

Все провайдеры реализуют `PaymentProviderInterface`:

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

## Фабрика

`PaymentProviderFactory` создает экземпляры поставщика на основе строкового идентификатора:

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

## Сервисный уровень

`PaymentService` оборачивает экземпляр поставщика и предоставляет унифицированный API:

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

### Пример использования

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

## Управление поставщиками Singleton

В шаблоне используются одноэлементные шаблоны для экземпляров поставщика, управляемые через `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

Эти функции гарантируют, что во время выполнения существует только один экземпляр поставщика, что позволяет избежать ненужной повторной инициализации клиента API.

## Определения ключевых типов

### Конфигурация платежного поставщика

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

### Платежное намерение

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

### Информация о подписке

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

### Статус подписки

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

### ВебхукРезультат

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### ВебхукEventType

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

## Как поменять провайдера

### Шаг 1. Установите переменные среды

Каждому поставщику требуется свой собственный набор переменных среды. Настройте только переменные для выбранного вами провайдера.

### Шаг 2. Обновите инициализацию поставщика

Измените функцию `getOrCreate*Provider`, используемую в ваших обработчиках маршрутов, или настройте `PaymentService` с другой строкой провайдера:

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

### Шаг 3. Обновите конечные точки вебхука

У каждого провайдера есть собственный маршрут вебхука (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook` и т. д.). Убедитесь, что зарегистрирован только веб-перехватчик активного поставщика.

### Шаг 4. Обработка функций, специфичных для поставщика

Некоторые функции зависят от поставщика:
- **Цели установки**: только Stripe и Solidgate (макет)
- **Встроенные формы оплаты**: Stripe и Solidgate через React SDK
- **Цены на основе вариантов**: только LemonSqueezy
- **Продукты для организаций**: только Polar.
- **API прямого возврата**: только Stripe и Solidgate.

## Шаблон разрешения проблем с клиентами

Все четыре поставщика следуют одной и той же трехэтапной схеме решения проблем с клиентами:

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

Этот шаблон реализуется одинаково в методе `getCustomerId()` каждого поставщика, обеспечивая единообразное поведение независимо от того, какой поставщик активен.

## Нормализация событий вебхука

Каждый поставщик сопоставляет свои собственные типы событий с общим перечислением `WebhookEventType`. Это позволяет `WebhookSubscriptionService` обрабатывать события в общем виде:

|Действие|Полоса|ЛимонСжатый|Полярный|Солидгейт|
|--------|--------|-------------|-------|-----------|
|Подписка создана|`customer.subscription.created`|`subscription_created`|`subscription.created`|`subscription.created`|
|Подписка отменена|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|`subscription.cancelled`|
|Успешный платеж|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|`payment.succeeded`|
|Платеж не выполнен|`payment_intent.payment_failed`|Н/Д|`checkout.failed`|`payment.failed`|

## Компоненты пользовательского интерфейса

Каждый поставщик предоставляет компоненты пользовательского интерфейса через `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

Это позволяет интерфейсу отображать правильную форму оплаты, логотипы и значки брендов карт, не зная, какой поставщик активен.

## Структура файла

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

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Подробный обзор подписки Stripe](./stripe-subscription-deep-dive.md)
- [Подробное описание способов оплаты Stripe](./stripe-pay-methods-deep-dive.md)
- [Подробное описание Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Глубокий обзор LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Полярное глубокое погружение](./polar-deep-dive.md)
- [Подробное описание Solidgate](./solidgate-deep-dive.md)
