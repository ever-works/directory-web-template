---
id: subscription-types
title: Определения типов подписки
sidebar_label: Типы подписки
sidebar_position: 12
---

# Определения типов подписки

**Источник:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Типы подписки моделируют полный жизненный цикл регулярного выставления счетов — от создания пробной версии до отмены и продления.

## Перечисления

### `SubscriptionStatus` (уровень поставщика)

Значения статуса, возвращаемые SDK поставщика платежей.

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}
```

|Значение|Описание|
|-------|-------------|
|`incomplete`|Первоначальный платеж все еще ожидает рассмотрения|
|`trialing`|У клиента истекает пробный период|
|`active`|Подписка активна и оплачена|
|`past_due`|Платеж не прошел, но подписка еще не отменена|
|`canceled`|Подписка отменена|
|`unpaid`|Многократные сбои в оплате; подписка приостановлена|

### `SubscriptionStatus` (уровень базы данных)

Значения состояния хранятся в таблице `subscriptions`.

```typescript
const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  PAUSED: 'paused',
} as const;

type SubscriptionStatusValues =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
```

### `SubscriptionPlanType`

Определяет способ запуска подписки.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Интерфейсы

### `SubscriptionInfo`

Нормализованные данные о подписке, возвращаемые от любого провайдера.

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;  // Unix timestamp
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: Record<string, any>;
}
```

|Поле|Описание|
|-------|-------------|
|`id`|Идентификатор подписки провайдера|
|`customerId`|Идентификатор клиента поставщика|
|`currentPeriodEnd`|Временная метка Unix окончания текущего расчетного периода|
|`cancelAtPeriodEnd`|Если `true`, подписка отменяется в конце периода, а не сразу.|
|`trialEnd`|Временная метка Unix, когда истекает пробная версия|

### `CreateSubscriptionParams`

Параметры для создания новой подписки.

```typescript
interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

### `UpdateSubscriptionParams`

Параметры для изменения существующей подписки.

```typescript
interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  metadata?: Record<string, any>;
}
```

### `PriceDetails`

Отформатированная информация о ценах для отображения.

```typescript
interface PriceDetails {
  amount: number;      // Amount in cents
  formatted: string;   // e.g., "$9.99/mo"
}

interface SubscriptionDetails extends OneTimeDetails {
  weekly?: PriceDetails;
}

interface OneTimeDetails extends PriceDetails {
  collect_tax: boolean;
}
```

### `CountryPricing`

Локализованные цены для конкретной страны.

```typescript
interface CountryPricing {
  country: string;
  currency: string;
  symbol: string;
  subscription: SubscriptionDetails;
  oneTime: OneTimeDetails;
  free: OneTimeDetails;
}
```

## Схема базы данных

В таблице `subscriptions` хранится запись о подписке:

```typescript
// Key columns from lib/db/schema.ts
{
  id: text,
  userId: text,                // FK -> users.id
  planId: text,                // 'free' | 'standard' | 'premium'
  status: text,                // 'active' | 'cancelled' | 'expired' | 'pending' | 'paused'
  startDate: timestamp,
  endDate: timestamp,
  paymentProvider: text,       // 'stripe' | 'lemonsqueezy' | 'polar'
  subscriptionId: text,        // Provider subscription ID
  customerId: text,            // Provider customer ID
  autoRenewal: boolean,
  cancelAtPeriodEnd: boolean,
  trialStart: timestamp,
  trialEnd: timestamp,
}
```

## Пример использования

```typescript
import type {
  CreateSubscriptionParams,
  SubscriptionInfo,
} from '@/lib/payment/types/payment-types';

const params: CreateSubscriptionParams = {
  customerId: 'cus_abc123',
  priceId: 'price_monthly_premium',
  trialPeriodDays: 7,
};

// After creation
const sub: SubscriptionInfo = await provider.createSubscription(params);
console.log(sub.status); // 'trialing'
```

## Связанные типы

- [Типы платежей](./pay-types.md) – способы оплаты, параметры оформления заказа.
- [Типы аутентификации](./auth-types.md) — типы пользователей и сеансов, связанные с подписками.
