---
id: payment-types
title: Определения типов платежей
sidebar_label: Виды оплаты
sidebar_position: 11
---

# Определения типов платежей

**Источник:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Типы платежей лежат в основе биллинговой системы с несколькими поставщиками. Они определяют, как платежи создаются, проверяются и управляются в Stripe, LemonSqueezy, Polar и Solidgate.

## Перечисления

### `PaymentPlan`

Доступные уровни подписки.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Варианты цикла выставления счетов для периодических платежей.

```typescript
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### `PaymentType`

Классифицирует платеж как разовый, регулярный или бесплатный.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Отслеживает жизненный цикл одной попытки платежа.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Поддерживаемые платежные инструменты.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Валюты, принимаемые платформой.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Тип объединения всех идентификаторов платежных систем.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Интерфейсы

### `PaymentIntent`

Представляет ожидающий или завершенный платеж.

```typescript
interface PaymentIntent {
  id: string;
  amount: number;         // Amount in smallest currency unit (cents)
  currency: string;
  status: string;
  clientSecret?: string;  // For client-side confirmation
  customerId?: string;
}
```

|Поле|Описание|
|-------|-------------|
|`id`|Идентификатор платежа, присвоенный поставщиком услуг|
|`amount`|Сумма в центах (например, 1000 = 10,00 долларов США).|
|`currency`|Код валюты ISO 4217|
|`clientSecret`|Токен передается во внешний SDK для подтверждения.|

### `CheckoutParams`

Параметры для запуска сеанса оформления заказа.

```typescript
interface CheckoutParams {
  priceId?: string;
  variantId?: number;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
  dark?: boolean;
}
```

### `BillingDetails`

Платежная информация клиента, прикрепленная к платежу.

```typescript
interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
```

### `PaymentProviderConfig`

Учетные данные, необходимые для инициализации поставщика.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Конфигурация, безопасная для внешнего интерфейса, возвращена `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Пример использования

```typescript
import { PaymentPlan, PaymentType } from '@/lib/constants/payment';
import type { CheckoutParams } from '@/lib/payment/types/payment-types';

const params: CheckoutParams = {
  priceId: 'price_abc123',
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  metadata: { plan: PaymentPlan.PREMIUM },
};
```

## Связанные типы

- [Типы подписки](./subscription-types.md) – жизненный цикл и статус подписки.
- [Конфигурация/Оплата](../configuration/Payment-config.md) — настройка провайдера и ценовые уровни
- [Типы конфигураций](./config-types.md) -- схема `PaymentConfig`
