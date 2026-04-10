---
id: configuration
title: Конфигурация на Плащания
sidebar_label: Ръководство за Конфигурация
sidebar_position: 6
description: Пълно ръководство за конфигуриране на доставчиците на плащания (Stripe, LemonSqueezy, Polar, Solidgate) с поддръжка на множество валути
keywords: [плащане, конфигурация, stripe, lemonsqueezy, polar, solidgate, множество валути]
---

# Конфигурация на Плащания

Това ръководство обяснява как да конфигурирате различните доставчици на плащания, поддържани от приложението.

## Съдържание

- [Преглед](#overview)
- [Поддържани доставчици](#supported-providers)
- [Обща конфигурация](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Множество валути](#multi-currency)
- [Пробни периоди и такси за настройка](#trials-and-setup-fees)
- [Избор на доставчик](#provider-selection)
- [Отстраняване на неизправности](#troubleshooting)

---

## Преглед

Приложението поддържа множество доставчици на плащания за абонаменти:

| Доставчик    | Тип           | Множество валути | Пробни периоди |
|--------------|---------------|------------------|----------------|
| Stripe       | Абонамент     | ✅ Да            | ✅ Да          |
| LemonSqueezy | Абонамент     | ✅ Да            | ✅ Да          |
| Polar        | Абонамент     | ❌ Не            | ❌ Не          |
| Solidgate    | Абонамент     | ⚠️ Частично     | ❌ Не          |

### Налични планове

- **Безплатен** - Без заплащане, основни функции
- **Стандартен** - Среден план с по-голяма видимост
- **Премиум** - Пълен план с всички функции

---

## Поддържани доставчици

### Архитектура

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Експорти
│       ├── types.ts              # Общи типове
│       ├── stripe.config.ts      # Мултивалутна конфигурация на Stripe
│       ├── lemonsqueezy.config.ts # Мултивалутна конфигурация на LemonSqueezy
│       └── solidgate.config.ts   # Конфигурация на Solidgate (в разработка)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (в разработка)
└── utils/
    └── payment-provider.ts       # Избор на доставчик
```

---

## Обща конфигурация

### Показани цени (за потребителския интерфейс)

Тези променливи определят цените, показани в потребителския интерфейс:

```bash
# Цени в долари (или основна валута) - само за показване
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Пробни периоди (trial)

```bash
# ИД на пробни суми (начални такси по време на пробния период)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Активиране/деактивиране на пробни периоди с оторизирана сума
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Предварителни изисквания

1. Създайте акаунт в [Stripe Dashboard](https://dashboard.stripe.com)
2. Вземете API ключовете (Настройки → API ключове)
3. Конфигурирайте webhook

### Основни променливи на средата

```bash
# ============================================
# STRIPE - Основна конфигурация
# ============================================

# API ключове (задължително)
STRIPE_SECRET_KEY=sk_live_xxx           # Таен ключ (сървър)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Публичен ключ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Публичен ключ (клиент)

# Webhook (задължително за события)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Конфигурация на продукта (Legacy - само USD)

```bash
# Прости цени (за обратна съвместимост, само USD)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Мултивалутна конфигурация (Препоръчана)

#### Стандартен план

```bash
# ============================================
# STRIPE СТАНДАРТЕН ПЛАН
# ============================================

# ИД на продукта
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Месечни цени по валута
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Годишни цени по валута
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Такси за настройка / пробни суми по валута
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Премиум план

```bash
# ============================================
# STRIPE ПРЕМИУМ ПЛАН
# ============================================

# ИД на продукта
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Месечни цени по валута
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Годишни цени по валута
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Такси за настройка / пробни суми по валута
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Създаване на цени в Stripe

1. Отидете на **Продукти** → Създайте продукт
2. Добавете цени за всяка валута:
   - Кликнете „Добавяне на друга цена"
   - Изберете валутата (EUR, GBP, CAD)
   - Задайте еквивалентната сума
3. Копирайте всеки `price_xxx` в съответните променливи

### Webhook на Stripe

Конфигурирайте webhook в Stripe Dashboard:

- **URL**: `https://вашия-домейн.com/api/stripe/webhook`
- **Събития за наблюдение**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Предварителни изисквания

1. Създайте акаунт в [LemonSqueezy](https://lemonsqueezy.com)
2. Създайте магазин
3. Създайте продукти и варианти

### Променливи на средата

```bash
# ============================================
# LEMONSQUEEZY - Основна конфигурация
# ============================================

# API (задължително)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://вашия-домейн.com/api/lemonsqueezy/webhook

# Тестов режим
LEMONSQUEEZY_TEST_MODE=false
```

### Конфигурация на варианти (Legacy)

```bash
# Прости варианти
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Варианти с такса за настройка (за пробни периоди)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Мултивалутна конфигурация

#### Стандартен план

```bash
# ============================================
# LEMONSQUEEZY СТАНДАРТЕН ПЛАН
# ============================================

NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Премиум план

```bash
# ============================================
# LEMONSQUEEZY ПРЕМИУМ ПЛАН
# ============================================

NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Предварителни изисквания

1. Създайте акаунт в [Polar](https://polar.sh)
2. Създайте организация
3. Създайте планове за абонамент

### Променливи на средата

```bash
# ============================================
# POLAR - Конфигурация
# ============================================

POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx
POLAR_WEBHOOK_SECRET=xxx
POLAR_SANDBOX=true
POLAR_API_URL=https://api.polar.sh
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning В разработка
Интеграцията на Solidgate е в процес на разработка. Някои функции може да не са напълно готови.
:::

### Променливи на средата

```bash
# ============================================
# SOLIDGATE - Конфигурация (в разработка)
# ============================================

SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx
SOLIDGATE_WEBHOOK_SECRET=xxx
SOLIDGATE_ENVIRONMENT=test

NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Текущи ограничения

| Функция              | Статус          | Бележки                            |
|----------------------|-----------------|-------------------------------------|
| Основни плащания     | ✅ Реализирано  | Еднократни и абонаментни плащания  |
| Множество валути     | ⚠️ Частично    | Само USD                           |
| Пробни периоди       | ❌ Все още не  | Планирано за бъдеща версия         |
| Webhooks             | ⚠️ Частично    | Само основни събития               |
| Възстановявания      | ❌ Все още не  | Планирано за бъдеща версия         |

---

## Множество валути

### Поддържани валути

| Код  | Валута           | Символ |
|------|------------------|--------|
| USD  | Щатски долар     | $      |
| EUR  | Евро             | €      |
| GBP  | Британски паунд  | £      |
| CAD  | Канадски долар   | CA$    |

### Как работи

1. Валутата на потребителя се определя автоматично (геолокация, предпочитания)
2. Системата избира `price_id`, съответстващ на валутата
3. Ако валутата не е конфигурирана, се използва USD

### Пример за използване

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Абонирайте се за {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Пробни периоди и такси за настройка

### Концепция

- **Пробен период**: Безплатен или намален тестов период
- **Такса за настройка**: Начални такси в началото на пробния период

### Конфигурация

```bash
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Важно: Съгласуваност на валутата

:::caution
Всички цени в сесията за плащане трябва да са в една и съща валута.
:::

```bash
# ❌ ГРЕШКА: Такса за настройка в USD + Основна цена в GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx

# ✅ ПРАВИЛНО: И двете в GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
```

---

## Избор на доставчик

### Приоритет

1. **Доставчик, избран от потребителя** (Настройки)
2. **Доставчик по подразбиране** (конфигурация)
3. **Резервен**: Stripe

### Конфигурация на доставчика по подразбиране

```typescript
pricing: {
  provider: PaymentProvider.STRIPE  // или LEMONSQUEEZY, POLAR
}
```

### Пример за използване

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
}
```

---

## Отстраняване на неизправности

### Грешка: Конфликт на валути

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Причина**: Основната цена и таксата за настройка са в различни валути.

**Решение**: Създайте такси за настройка за всяка поддържана валута.

### Грешка: Невалиден ИД на цена

```
Error: Invalid price ID
```

**Причина**: `price_id` не съществува или не е конфигуриран.

**Решение**: Проверете дали променливата на средата съдържа валиден ИД.

### Webhook не получава събития

1. Проверете URL на webhook в панела на доставчика
2. Потвърдете, че `WEBHOOK_SECRET` е правилен
3. Тествайте с инструментите за отстраняване на грешки на доставчика

### Цените не се показват правилно

1. Проверете `NEXT_PUBLIC_PRODUCT_PRICE_*` за показани стойности
2. Потвърдете, че стойностите `price_id` съответстват на правилните валути
3. Рестартирайте сървъра за разработка след промени в `.env` файловете
