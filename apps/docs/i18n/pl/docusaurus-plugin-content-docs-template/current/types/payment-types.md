---
id: payment-types
title: Definicje rodzajów płatności
sidebar_label: Rodzaje płatności
sidebar_position: 11
---

# Definicje rodzajów płatności

**Źródło:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Rodzaje płatności obsługują system rozliczeniowy wielu dostawców. Definiują sposób tworzenia, weryfikowania i zarządzania płatnościami w Stripe, LemonSqueezy, Polar i Solidgate.

## Wyliczenia

### `PaymentPlan`

Dostępne poziomy subskrypcji.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Opcje cyklu rozliczeniowego dla opłat cyklicznych.

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

Klasyfikuje płatność jako jednorazową, cykliczną lub bezpłatną.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Śledzi cykl życia pojedynczej próby płatności.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Obsługiwane instrumenty płatnicze.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Waluty akceptowane przez platformę.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Typ unijny wszystkich identyfikatorów dostawców usług płatniczych.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfejsy

### `PaymentIntent`

Reprezentuje oczekującą lub ukończoną płatność.

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

|Pole|Opis|
|-------|-------------|
|`id`|Identyfikator płatności przypisany przez dostawcę|
|`amount`|Kwota w centach (np. 1000 = 10,00 USD)|
|`currency`|Kod waluty ISO 4217|
|`clientSecret`|Token przekazany do frontonu SDK w celu potwierdzenia|

### `CheckoutParams`

Parametry inicjowania sesji realizacji transakcji.

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

Informacje rozliczeniowe klienta dołączone do płatności.

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

Poświadczenia potrzebne do zainicjowania dostawcy.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Konfiguracja bezpieczna dla frontendu zwrócona przez `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Przykład użycia

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

## Powiązane typy

- [Typy subskrypcji](./subscription-types.md) -- cykl życia i stan subskrypcji
- [Konfiguracja / Płatność](../configuration/payment-config.md) — konfiguracja dostawcy i poziomy cenowe
- [Typy konfiguracji](./config-types.md) -- `PaymentConfig` schemat
