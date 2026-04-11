---
id: payment-config
title: "Конфигурация Платежей"
sidebar_label: "Платежи"
sidebar_position: 12
---

# Конфигурация Платежей

Шаблон поддерживает несколько платёжных провайдеров и гибкие рабочие процессы выставления счётов. Это справочное руководство охватывает все константы, перечисления и параметры конфигурации, связанные с платежами.

## Константы Платежей

Все основные перечисления и типы платежей определены в `lib/constants/payment.ts`. Этот файл намеренно отделён от основного модуля конфигурации, чтобы его можно было импортировать в скрипты, работающие за пределами среды выполнения Next.js (миграции, seeds, инструменты CLI).

### PaymentFlow

Определяет, когда платёж собирается относительно процесса отправки.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Значение | Описание |
|----------|----------|
| `pay_at_start` | Пользователь платит перед отправкой; элемент публикуется немедленно |
| `pay_at_end` | Пользователь сначала отправляет; платёж собирается после одобрения администратором |

### PaymentStatus

Отслеживает состояние попытки платежа.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Варианты частоты выставления счётов.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Доступные уровни подписки.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Поддерживаемые платёжные шлюзы.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Схема Конфигурации Платежей

Определена в `lib/config/schemas/payment.schema.ts` и валидируется при запуске с помощью Zod.

### Цены Продуктов (Отображаемые Значения)

```typescript
pricing: {
  free: number;       // По умолчанию: 0
  standard: number;   // По умолчанию: 10
  premium: number;    // По умолчанию: 20
}
```

| Переменная среды | Поле | По умолчанию |
|-----------------|------|--------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Конфигурация Пробного Периода

| Переменная среды | Поле | Описание |
|-----------------|------|----------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID цены для стандартного пробного периода |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID цены для премиум пробного периода |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Включить пробные суммы (`true`/`false`) |

## Настройка Провайдера

### Stripe

Автоматически включается при наличии как `secretKey`, так и `publishableKey`.

| Переменная среды | Обязательно | Описание |
|-----------------|-------------|----------|
| `STRIPE_SECRET_KEY` | Да | Серверный ключ API |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Да | Публичный ключ на стороне клиента |
| `STRIPE_WEBHOOK_SECRET` | Рекомендуется | Проверка подписи вебхука |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Нет | ID цены для бесплатного плана |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Нет | ID цены для стандартного плана |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Нет | ID цены для премиум плана |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Нет | Установите `true` для получения цен из API Stripe |

### LemonSqueezy

Автоматически включается при наличии как `apiKey`, так и `storeId`.

| Переменная среды | Обязательно | Описание |
|-----------------|-------------|----------|
| `LEMONSQUEEZY_API_KEY` | Да | Ключ API из панели LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Да | Идентификатор вашего магазина |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Рекомендуется | Проверка подписи вебхука |
| `LEMONSQUEEZY_WEBHOOK_URL` | Нет | Переопределить URL конечной точки вебхука |
| `LEMONSQUEEZY_TEST_MODE` | Нет | Установите `true` для тестового режима |
| `LEMONSQUEEZY_VARIANT_ID` | Нет | ID варианта по умолчанию |

### Polar

Автоматически включается при наличии как `accessToken`, так и `organizationId`.

| Переменная среды | Обязательно | Описание |
|-----------------|-------------|----------|
| `POLAR_ACCESS_TOKEN` | Да | Токен доступа к API |
| `POLAR_ORGANIZATION_ID` | Да | Идентификатор организации |
| `POLAR_WEBHOOK_SECRET` | Рекомендуется | Проверка подписи вебхука |
| `POLAR_SANDBOX` | Нет | Установите `false` для продакшена (по умолчанию: `true`) |
| `POLAR_API_URL` | Нет | Переопределить базовый URL API |

### Solidgate

Требует ручной настройки переменных среды.

| Переменная среды | Обязательно | Описание |
|-----------------|-------------|----------|
| `SOLIDGATE_API_KEY` | Да | Ключ API |
| `SOLIDGATE_SECRET_KEY` | Да | Секретный ключ для подписи |
| `SOLIDGATE_WEBHOOK_SECRET` | Да | Проверка вебхука |
| `SOLIDGATE_MERCHANT_ID` | Да | Идентификатор продавца |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Нет | Ключ на стороне клиента |

## Многовалютное Выставление Счётов

Каждый провайдер поддерживает цены в разных валютах через модули конфигурации выставления счётов в `lib/config/billing/`.

### Типы Конфигурации Выставления Счётов

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID цены/варианта для ежемесячного выставления счётов
  yearly?: string;    // ID цены/варианта для ежегодного выставления счётов
  setupFee?: string;  // Необязательный ID цены единовременной платы за настройку
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Код ISO 4217 (например, 'USD')
  symbol?: string;    // Символ отображения (например, '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Поддерживаемые Валюты

Массив `SUPPORTED_CURRENCIES` в `lib/config/billing/types.ts` перечисляет все 32 кода ISO 4217, принимаемых системой (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF и другие).

### Функции Разрешения Цен

Каждый провайдер экспортирует функцию конфигурации цен:

| Провайдер | Функция | Источник |
|-----------|---------|---------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Все функции возвращают к USD, если запрошенная валюта не настроена.

## Конфигурация Потока Платежей

Определена в `lib/config/payment-flows.ts`, массив `PAYMENT_FLOWS` настраивает два варианта потока платежей с их свойствами UI:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Название иконки Lucide
  color: string;           // Классы градиента Tailwind
  features: string[];      // Пункты функций
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Необязательная метка значка
  isDefault?: boolean;     // Является ли это потоком по умолчанию
}
```

Вспомогательные функции:
- `getDefaultPaymentFlow()` -- возвращает значение `PaymentFlow` по умолчанию
- `getPaymentFlowConfig(flowId)` -- возвращает `PaymentFlowConfig` для указанного потока

## Менеджер Платёжных Провайдеров

Класс `PaymentProviderManager` в `lib/payment/config/payment-provider-manager.ts` предоставляет одиночный доступ к экземплярам провайдеров:

```typescript
// Получить конкретного провайдера
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Или использовать обобщённую функцию
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Связанные Страницы

- [Типы Платежей](../types/payment-types.md) -- определения типов для операций с платежами
- [Типы Подписок](../types/subscription-types.md) -- типы жизненного цикла подписки
- [Справочник по Среде](./environment-reference.md) -- полный список переменных среды
