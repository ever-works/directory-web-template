---
id: payment-config
title: "Конфигурация на Плащания"
sidebar_label: "Плащания"
sidebar_position: 12
---

# Конфигурация на Плащания

Шаблонът поддържа множество доставчици на плащания и гъвкави работни потоци за таксуване. Тази справка обхваща всички константи, изброявания и опции за конфигурация, свързани с плащанията.

## Константи на Плащанията

Всички основни изброявания и типове плащания са дефинирани в `lib/constants/payment.ts`. Този файл е умишлено отделен от основния модул за конфигурация, за да може да бъде импортиран в скриптове, работещи извън средата за изпълнение на Next.js (миграции, seeds, CLI инструменти).

### PaymentFlow

Определя кога плащането се събира спрямо процеса на подаване.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Стойност | Описание |
|----------|----------|
| `pay_at_start` | Потребителят плаща преди подаването; елементът се публикува незабавно |
| `pay_at_end` | Потребителят първо подава; плащането се събира след одобрение от администратора |

### PaymentStatus

Проследява състоянието на опит за плащане.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Опции за честота на таксуване.

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

Налични нива на абонамент.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Поддържани платежни шлюзове.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Схема за Конфигурация на Плащанията

Дефинирана в `lib/config/schemas/payment.schema.ts` и валидирана при стартиране с Zod.

### Цени на Продукти (Показвани Стойности)

```typescript
pricing: {
  free: number;       // По подразбиране: 0
  standard: number;   // По подразбиране: 10
  premium: number;    // По подразбиране: 20
}
```

| Променлива на средата | Поле | По подразбиране |
|-----------------------|------|-----------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Конфигурация на Пробния Период

| Променлива на средата | Поле | Описание |
|-----------------------|------|----------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID на цена за стандартен пробен период |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID на цена за премиум пробен период |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Активиране на пробни суми (`true`/`false`) |

## Настройка на Доставчика

### Stripe

Автоматично се активира когато са налице и `secretKey`, и `publishableKey`.

| Променлива на средата | Задължително | Описание |
|-----------------------|-------------|----------|
| `STRIPE_SECRET_KEY` | Да | API ключ от страна на сървъра |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Да | Публичен ключ от страна на клиента |
| `STRIPE_WEBHOOK_SECRET` | Препоръчително | Проверка на подписа на уебхука |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | Не | ID на цена за безплатен план |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | Не | ID на цена за стандартен план |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | Не | ID на цена за премиум план |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Не | Задайте `true` за извличане на цени от API на Stripe |

### LemonSqueezy

Автоматично се активира когато са налице и `apiKey`, и `storeId`.

| Променлива на средата | Задължително | Описание |
|-----------------------|-------------|----------|
| `LEMONSQUEEZY_API_KEY` | Да | API ключ от таблото на LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Да | Вашият идентификатор на магазин |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Препоръчително | Проверка на подписа на уебхука |
| `LEMONSQUEEZY_WEBHOOK_URL` | Не | Замяна на URL на крайната точка на уебхука |
| `LEMONSQUEEZY_TEST_MODE` | Не | Задайте `true` за тестов режим |
| `LEMONSQUEEZY_VARIANT_ID` | Не | ID на вариант по подразбиране |

### Polar

Автоматично се активира когато са налице и `accessToken`, и `organizationId`.

| Променлива на средата | Задължително | Описание |
|-----------------------|-------------|----------|
| `POLAR_ACCESS_TOKEN` | Да | Токен за достъп до API |
| `POLAR_ORGANIZATION_ID` | Да | Идентификатор на организацията |
| `POLAR_WEBHOOK_SECRET` | Препоръчително | Проверка на подписа на уебхука |
| `POLAR_SANDBOX` | Не | Задайте `false` за продукция (по подразбиране: `true`) |
| `POLAR_API_URL` | Не | Замяна на базовия URL на API |

### Solidgate

Изисква ръчна конфигурация на променливите на средата.

| Променлива на средата | Задължително | Описание |
|-----------------------|-------------|----------|
| `SOLIDGATE_API_KEY` | Да | API ключ |
| `SOLIDGATE_SECRET_KEY` | Да | Таен ключ за подписване |
| `SOLIDGATE_WEBHOOK_SECRET` | Да | Проверка на уебхука |
| `SOLIDGATE_MERCHANT_ID` | Да | Идентификатор на търговеца |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | Не | Ключ от страна на клиента |

## Многовалутно Таксуване

Всеки доставчик поддържа ценообразуване по валута чрез модулите за конфигурация на таксуването в `lib/config/billing/`.

### Типове Конфигурация на Таксуването

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID на цена/вариант за месечно таксуване
  yearly?: string;    // ID на цена/вариант за годишно таксуване
  setupFee?: string;  // Незадължителен ID на цена за такса за настройка
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Код ISO 4217 (напр. 'USD')
  symbol?: string;    // Символ за показване (напр. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Поддържани Валути

Масивът `SUPPORTED_CURRENCIES` в `lib/config/billing/types.ts` изброява всички 32 кода ISO 4217, приемани от системата (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF и повече).

### Функции за Разрешаване на Цени

Всеки доставчик експортира функция за конфигурация на цените:

| Доставчик | Функция | Източник |
|-----------|---------|----------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Всички функции се връщат към USD, ако исканата валута не е конфигурирана.

## Конфигурация на Потока на Плащане

Дефинирана в `lib/config/payment-flows.ts`, масивът `PAYMENT_FLOWS` конфигурира двете опции за поток на плащане с техните UI свойства:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Ime на иконата Lucide
  color: string;           // Класове на градиент Tailwind
  features: string[];      // Точки с функции
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Незадължителен етикет на значка
  isDefault?: boolean;     // Дали това е потокът по подразбиране
}
```

Помощни функции:
- `getDefaultPaymentFlow()` -- връща стойността `PaymentFlow` по подразбиране
- `getPaymentFlowConfig(flowId)` -- връща `PaymentFlowConfig` за даден поток

## Мениджър на Доставчици на Плащания

Класът `PaymentProviderManager` в `lib/payment/config/payment-provider-manager.ts` осигурява единичен достъп до инстанциите на доставчиците:

```typescript
// Вземете конкретен доставчик
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// Или използвайте общата функция
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Свързани Страници

- [Типове Плащания](../types/payment-types.md) -- дефиниции на типове за операции с плащания
- [Типове Абонаменти](../types/subscription-types.md) -- типове на жизнения цикъл на абонамента
- [Справка за Средата](./environment-reference.md) -- пълен списък на променливите на средата
