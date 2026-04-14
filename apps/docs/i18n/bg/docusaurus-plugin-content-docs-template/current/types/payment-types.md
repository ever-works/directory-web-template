---
id: payment-types
title: Дефиниции на типа плащане
sidebar_label: Видове плащане
sidebar_position: 11
---

# Дефиниции на типа плащане

**Източник:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Видовете плащане захранват системата за таксуване с множество доставчици. Те определят как се създават, проверяват и управляват плащанията в Stripe, LemonSqueezy, Polar и Solidgate.

## Енуми

### `PaymentPlan`

Налични нива на абонамент.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Опции за цикъл на фактуриране за повтарящи се такси.

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

Класифицира плащане като еднократно, повтарящо се или безплатно.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Проследява жизнения цикъл на един опит за плащане.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Поддържани платежни инструменти.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Валути, приемани от платформата.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Тип съюз на всички идентификатори на доставчик на плащания.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Интерфейси

### `PaymentIntent`

Представлява предстоящо или завършено плащане.

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
|`id`|Присвоен от доставчика идентификатор на плащане|
|`amount`|Сума в центове (напр. 1000 = 10,00 $)|
|`currency`|Код на валутата ISO 4217|
|`clientSecret`|Токенът е предаден на интерфейсния SDK за потвърждение|

### `CheckoutParams`

Параметри за започване на сесия за плащане.

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

Информация за фактуриране на клиента, приложена към плащане.

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

Идентификационни данни, необходими за инициализиране на доставчик.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Безопасна за предния край конфигурация, върната от `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Пример за използване

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

## Свързани типове

- [Типове абонаменти](./subscription-types.md) -- жизнен цикъл и състояние на абонамента
- [Конфигурация / Плащане](../configuration/payment-config.md) - настройка на доставчика и нива на ценообразуване
- [Типове конфигурации](./config-types.md) -- `PaymentConfig` схема
