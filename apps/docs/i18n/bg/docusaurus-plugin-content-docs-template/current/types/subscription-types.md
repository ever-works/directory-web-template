---
id: subscription-types
title: Дефиниции на типа абонамент
sidebar_label: Видове абонаменти
sidebar_position: 12
---

# Дефиниции на типа абонамент

**Източник:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Типовете абонаменти моделират пълния жизнен цикъл на периодичното таксуване – от създаването на пробен период през анулирането и подновяването.

## Енуми

### `SubscriptionStatus` (ниво на доставчик)

Стойности на състоянието, върнати от SDK на доставчика на плащания.

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

|Стойност|Описание|
|-------|-------------|
|`incomplete`|Първоначалното плащане все още предстои|
|`trialing`|Клиентът е в своя пробен период|
|`active`|Абонаментът е активен и платен|
|`past_due`|Плащането е неуспешно, но абонаментът все още не е анулиран|
|`canceled`|Абонаментът е анулиран|
|`unpaid`|Множество неуспешни плащания; абонаментът е спрян|

### `SubscriptionStatus` (ниво база данни)

Стойности на състоянието, съхранени в таблицата `subscriptions`.

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

Разграничава начина, по който е стартиран абонаментът.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Интерфейси

### `SubscriptionInfo`

Нормализирани данни за абонамент, върнати от всеки доставчик.

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
|`id`|Идентификатор на абонамент на доставчик|
|`customerId`|Идентификатор на клиента на доставчика|
|`currentPeriodEnd`|Времево клеймо на Unix, когато текущият период на фактуриране завършва|
|`cancelAtPeriodEnd`|Ако `true`, абонаментът се анулира в края на периода, вместо веднага|
|`trialEnd`|Времево клеймо на Unix, когато пробният период изтича|

### `CreateSubscriptionParams`

Параметри за създаване на нов абонамент.

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

Параметри за промяна на съществуващ абонамент.

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

Форматирана ценова информация за показване.

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

Локализирани цени за конкретна държава.

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

## Схема на база данни

Таблицата `subscriptions` съхранява записа на абонамента:

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

## Пример за използване

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

## Свързани типове

- [Видове плащане](./payment-types.md) -- намерения за плащане, параметри за плащане
- [Типове удостоверяване](./auth-types.md) - типове потребители и сесии, свързани с абонаменти
