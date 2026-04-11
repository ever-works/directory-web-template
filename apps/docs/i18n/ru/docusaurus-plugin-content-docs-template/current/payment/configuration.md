---
id: configuration
title: Конфигурация Платежей
sidebar_label: Руководство по Конфигурации
sidebar_position: 6
description: Полное руководство по настройке платёжных провайдеров (Stripe, LemonSqueezy, Polar, Solidgate) с поддержкой нескольких валют
keywords: [платёж, конфигурация, stripe, lemonsqueezy, polar, solidgate, мультивалюта]
---

# Конфигурация Платежей

Это руководство объясняет, как настраивать различных платёжных провайдеров, поддерживаемых приложением.

## Содержание

- [Обзор](#overview)
- [Поддерживаемые провайдеры](#supported-providers)
- [Общая конфигурация](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Мультивалюта](#multi-currency)
- [Пробные периоды и сборы за настройку](#trials-and-setup-fees)
- [Выбор провайдера](#provider-selection)
- [Устранение неполадок](#troubleshooting)

---

## Обзор

Приложение поддерживает несколько платёжных провайдеров для подписок:

| Провайдер    | Тип           | Мультивалюта   | Пробные периоды |
|--------------|---------------|----------------|-----------------|
| Stripe       | Подписка      | ✅ Да          | ✅ Да           |
| LemonSqueezy | Подписка      | ✅ Да          | ✅ Да           |
| Polar        | Подписка      | ❌ Нет         | ❌ Нет          |
| Solidgate    | Подписка      | ⚠️ Частично   | ❌ Нет          |

### Доступные тарифы

- **Бесплатный** - Без оплаты, базовые функции
- **Стандартный** - Промежуточный тариф с большей видимостью
- **Премиум** - Полный тариф со всеми функциями

---

## Поддерживаемые провайдеры

### Архитектура

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Экспорты
│       ├── types.ts              # Общие типы
│       ├── stripe.config.ts      # Мультивалютная конфигурация Stripe
│       ├── lemonsqueezy.config.ts # Мультивалютная конфигурация LemonSqueezy
│       └── solidgate.config.ts   # Конфигурация Solidgate (в разработке)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (в разработке)
└── utils/
    └── payment-provider.ts       # Выбор провайдера
```

---

## Общая конфигурация

### Отображаемые цены (для интерфейса пользователя)

Эти переменные определяют цены, отображаемые в интерфейсе пользователя:

```bash
# Цены в долларах (или основной валюте) - только для отображения
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Пробные периоды (trial)

```bash
# Идентификаторы пробных сумм (начальные сборы в период пробного использования)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Включить/выключить пробные периоды с авторизованной суммой
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Предварительные требования

1. Создать аккаунт на [Stripe Dashboard](https://dashboard.stripe.com)
2. Получить ключи API (Настройки → Ключи API)
3. Настроить webhook

### Базовые переменные окружения

```bash
# ============================================
# STRIPE - Базовая конфигурация
# ============================================

# Ключи API (обязательно)
STRIPE_SECRET_KEY=sk_live_xxx           # Секретный ключ (сервер)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Публичный ключ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Публичный ключ (клиент)

# Webhook (обязательно для событий)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Конфигурация продукта (Legacy - только USD)

```bash
# Простые цены (для обратной совместимости, только USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Мультивалютная конфигурация (Рекомендуется)

#### Стандартный тариф

```bash
# ============================================
# STRIPE СТАНДАРТНЫЙ ТАРИФ
# ============================================

# Идентификатор продукта
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Ежемесячные цены по валютам
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Годовые цены по валютам
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Сборы за настройку / пробные суммы по валютам
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Тариф Премиум

```bash
# ============================================
# STRIPE ТАРИФ ПРЕМИУМ
# ============================================

# Идентификатор продукта
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Ежемесячные цены по валютам
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Годовые цены по валютам
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Сборы за настройку / пробные суммы по валютам
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Создание цен в Stripe

1. Перейдите в **Продукты** → Создайте продукт
2. Добавьте цены для каждой валюты:
   - Нажмите «Добавить ещё одну цену»
   - Выберите валюту (EUR, GBP, CAD)
   - Установите эквивалентную сумму
3. Скопируйте каждый `price_xxx` в соответствующие переменные

### Webhook Stripe

Настройте webhook в Stripe Dashboard:

- **URL**: `https://ваш-домен.com/api/stripe/webhook`
- **События для прослушивания**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Предварительные требования

1. Создать аккаунт на [LemonSqueezy](https://lemonsqueezy.com)
2. Создать магазин
3. Создать продукты и варианты

### Переменные окружения

```bash
# ============================================
# LEMONSQUEEZY - Базовая конфигурация
# ============================================

# API (обязательно)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://ваш-домен.com/api/lemonsqueezy/webhook

# Тестовый режим
LEMONSQUEEZY_TEST_MODE=false
```

### Конфигурация вариантов (Legacy)

```bash
# Простые варианты
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Варианты со сбором за настройку (для пробных периодов)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Мультивалютная конфигурация

#### Стандартный тариф

```bash
# ============================================
# LEMONSQUEEZY СТАНДАРТНЫЙ ТАРИФ
# ============================================

# Идентификатор продукта
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Ежемесячные цены по валютам
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Годовые цены по валютам
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Сборы за настройку по валютам
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Тариф Премиум

```bash
# ============================================
# LEMONSQUEEZY ТАРИФ ПРЕМИУМ
# ============================================

# Идентификатор продукта
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Ежемесячные цены по валютам
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Годовые цены по валютам
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Сборы за настройку по валютам
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Предварительные требования

1. Создать аккаунт на [Polar](https://polar.sh)
2. Создать организацию
3. Создать планы подписки

### Переменные окружения

```bash
# ============================================
# POLAR - Конфигурация
# ============================================

# API (обязательно)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Режим sandbox (true для тестирования, false для продакшена)
POLAR_SANDBOX=true

# URL API (необязательно, по умолчанию: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# Идентификаторы планов
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Пробные суммы (необязательно)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning В разработке
Интеграция Solidgate в настоящее время находится в разработке. Некоторые функции могут быть ещё не полностью реализованы.
:::

### Предварительные требования

1. Создать аккаунт на [Solidgate](https://solidgate.com)
2. Получить учётные данные API на портале продавца
3. Настроить конечную точку webhook

### Переменные окружения

```bash
# ============================================
# SOLIDGATE - Конфигурация (в разработке)
# ============================================

# Учётные данные API (обязательно)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Окружение (test или live)
SOLIDGATE_ENVIRONMENT=test
```

### Конфигурация продукта

```bash
# ============================================
# ТАРИФЫ SOLIDGATE (в разработке)
# ============================================

# Идентификаторы продуктов
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# Идентификаторы цен (только USD)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Текущие ограничения

| Функция              | Статус          | Примечания                          |
|----------------------|-----------------|-------------------------------------|
| Базовые платежи      | ✅ Реализовано  | Разовые и подписочные платежи      |
| Мультивалюта         | ⚠️ Частично    | Только USD                         |
| Пробные периоды      | ❌ Ещё нет     | Запланировано в будущей версии     |
| Webhooks             | ⚠️ Частично    | Только базовые события             |
| Возвраты             | ❌ Ещё нет     | Запланировано в будущей версии     |

---

## Мультивалюта

### Поддерживаемые валюты

| Код  | Валюта                 | Символ |
|------|------------------------|--------|
| USD  | Доллар США             | $      |
| EUR  | Евро                   | €      |
| GBP  | Фунт стерлингов        | £      |
| CAD  | Канадский доллар       | CA$    |

### Как это работает

1. Валюта пользователя определяется автоматически (геолокация, предпочтения)
2. Система выбирает `price_id`, соответствующий валюте
3. Если валюта не настроена, используется USD

### Пример использования

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Автоматически получает правильный идентификатор цены для валюты
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Подписаться за {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Пробные периоды и сборы за настройку

### Концепция

- **Пробный период**: Бесплатный или льготный тестовый период
- **Сбор за настройку**: Начальные сборы в начале пробного периода

### Конфигурация

```bash
# Включить пробные периоды с авторизованной суммой
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Важно: Согласованность валюты

:::caution
Все цены в сеансе оформления заказа должны быть в одной валюте.
:::

Если вы используете пробные периоды со сборами за настройку, необходимо создать сбор за настройку для каждой валюты:

```bash
# ❌ ОШИБКА: Сбор за настройку в USD + Основная цена в GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ ПРАВИЛЬНО: Оба в GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Выбор провайдера

### Приоритет

1. **Провайдер, выбранный пользователем** (Настройки)
2. **Провайдер по умолчанию** (конфигурация)
3. **Резервный**: Stripe

### Конфигурация провайдера по умолчанию

В файле конфигурации сайта:

```typescript
// В конфигурации сайта
pricing: {
  provider: PaymentProvider.STRIPE  // или LEMONSQUEEZY, POLAR
}
```

### Пример использования

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Устранение неполадок

### Ошибка: Конфликт валют

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Причина**: Основная цена и сбор за настройку указаны в разных валютах.

**Решение**: Создайте сборы за настройку для каждой поддерживаемой валюты.

### Ошибка: Неверный идентификатор цены

```
Error: Invalid price ID
```

**Причина**: `price_id` не существует или не настроен.

**Решение**: Убедитесь, что переменная окружения содержит действительный идентификатор.

### Webhook не получает события

1. Проверьте URL webhook в панели провайдера
2. Убедитесь, что `WEBHOOK_SECRET` верный
3. Используйте инструменты отладки провайдера

### Цены отображаются некорректно

1. Проверьте `NEXT_PUBLIC_PRODUCT_PRICE_*` для отображаемых значений
2. Убедитесь, что значения `price_id` соответствуют правильным валютам
3. Перезапустите сервер разработки после изменения файлов `.env`
