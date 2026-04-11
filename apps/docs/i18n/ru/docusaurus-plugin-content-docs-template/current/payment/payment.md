---
id: payment-overview
title: Обзор интеграции платежей
sidebar_label: Руководство по интеграции
sidebar_position: 1.5
---

# Обзор интеграции платежей

В этом руководстве представлено практическое описание платежной системы Ever Works. В нем рассматривается уровень абстракции поставщика, настройка каждого поставщика, жизненный цикл оформления заказа и подписки, управление функциями и обработка веб-перехватчиков.

## Краткий обзор архитектуры поставщика

Платежная система построена на **независимой от провайдера абстракции**. Каждый поставщик платежей реализует один и тот же `PaymentProviderInterface` , а заводской шаблон позволяет переключаться между поставщиками без изменения кода приложения.

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

### Поддерживаемые поставщики

| Провайдер | Единовременные платежи | Подписки | Испытания | Вебхуки | Рекордный торговец |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Полоса | Да | Да | Да | Да | Нет |
| ЛимонныйСкуизи | Да | Да | Да | Да | Да |
| Полярный | Да | Да | Да | Да | Нет |
| Солидгейт | Да | Да | Нет | Да | Нет |

## Основные интерфейсы

###Интерфейс платежного провайдера

Каждый провайдер реализует этот интерфейс, определенный в `lib/payment/types/payment-types.ts` :

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

### Ключевые типы данных

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

## Быстрая настройка

### Шаг 1. Установите переменные среды

Каждому провайдеру требуются ключи API и секреты веб-перехватчика. Добавьте их в `.env.local` :

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

### Шаг 2. Настройте тарифные планы

Тарифные планы определены в вашем `.content/config.yml` :

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

### Шаг 3. Настройка вебхуков

У каждого провайдера есть выделенная конечная точка веб-перехватчика:

| Провайдер | URL вебхука |
|-------------|-------------------------------|
| Полоса | `/api/stripe/webhook` |
| ЛимонныйСкуизи | `/api/lemonsqueezy/webhook` |
| Полярный | `/api/polar/webhook` |
| Солидгейт | `/api/solidgate/webhook` |

Настройте эти URL-адреса на панели управления каждого провайдера, указывая на развернутый вами домен.

## Фабрика PaymentProviderFactory

Фабрика создает экземпляры поставщика на основе строки типа:

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

### Платежный сервис `PaymentService` оборачивает активный экземпляр поставщика и предоставляет единый API:

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

### PaymentServiceManager (Синглтон)

Менеджер обрабатывает переключение провайдера во время выполнения и сохраняет выбор пользователя в `localStorage` :

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

## Реагировать на интеграцию

### Контекст поставщика платежей

Оберните свое приложение (или страницы, связанные с платежами) с помощью `PaymentProvider` :

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

Компоненты получают доступ к платежному сервису через крючок `usePayment` :

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

**Пример использования:**

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

## Функция стробирования

Компонент `FeatureGuard` ограничивает элементы пользовательского интерфейса в зависимости от плана подписки пользователя:

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

**Использование:**

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

### Поддержка льготного периода

Планы с истекшим сроком действия получают 7-дневный льготный период с ухудшенным доступом:

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

## Типы событий вебхука

Все события вебхука нормализуются в общее перечисление:

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

## Платежные потоки

Шаблон поддерживает два потока оплаты за отправку контента:

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

- **Оплата при запуске**: пользователь платит до рассмотрения заявки.
- **Оплата в конце**: пользователь отправляет бесплатно, платит только после одобрения.

## Справочник маршрутов API

### Полосатые маршруты

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/stripe/checkout` | ПОСТ | Создать сеанс оформления заказа |
| `/api/stripe/subscription` | ПОЛУЧИТЬ/ОТПРАВИТЬ | Управление подписками |
| `/api/stripe/subscription/portal` | ПОСТ | Создать сеанс биллингового портала |
| `/api/stripe/subscription/[id]/cancel` | ПОСТ | Отменить подписку |
| `/api/stripe/payment-intent` | ПОСТ | Создайте намерение платежа |
| `/api/stripe/payment-methods/list` | ПОЛУЧИТЬ | Список сохраненных способов оплаты |
| `/api/stripe/payment-methods/create` | ПОСТ | Добавить способ оплаты |
| `/api/stripe/payment-methods/delete` | ПОСТ | Удалить способ оплаты |
| `/api/stripe/setup-intent` | ПОСТ | Создать намерение установки |
| `/api/stripe/webhook` | ПОСТ | Обрабатывать веб-хуки Stripe |

### Маршруты LemonSqueezy

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | ПОСТ | Создать сеанс оформления заказа |
| `/api/lemonsqueezy/cancel` | ПОСТ | Отменить подписку |
| `/api/lemonsqueezy/reactivate` | ПОСТ | Повторно активировать подписку |
| `/api/lemonsqueezy/update-plan` | ПОСТ | Изменить план подписки |
| `/api/lemonsqueezy/list` | ПОЛУЧИТЬ | Список подписок пользователей |
| `/api/lemonsqueezy/webhook` | ПОСТ | Обработка веб-перехватчиков |

### Полярные маршруты

| Маршрут | Метод | Описание |
|-------|--------|-------------|
| `/api/polar/checkout` | ПОСТ | Создать сеанс оформления заказа |
| `/api/polar/subscription/portal` | ПОСТ | Создать портал для клиентов |
| `/api/polar/subscription/[id]/cancel` | ПОСТ | Отменить подписку |
| `/api/polar/subscription/[id]/reactivate` | ПОСТ | Повторно активировать |
| `/api/polar/webhook` | ПОСТ | Обработка веб-перехватчиков |

## Служебные функции

Файл `payment-types.ts` содержит полезные помощники по форматированию:

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

## Следующие шаги

— [Конфигурация полосы](./stripe) — полная настройка полосы.
- [Конфигурация LemonSqueezy](./lemonsqueezy) -- Настройка LemonSqueezy
- [Полярная конфигурация](./polar) -- Полярная настройка
- [Мультивалютная интеграция](./multi-currency) -- Поддержка валют
- [Архитектура платежей](./pay-architecture) – глубокое погружение в архитектуру.
- [Webhooks](./webhooks) — сведения об обработке вебхуков.
— [Руководство по настройке](./configuration) — все переменные и параметры среды.
