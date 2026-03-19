---
id: payment-types
title: Payment Type Definitions
sidebar_label: Payment Types
sidebar_position: 11
---

# Payment Type Definitions

**Source:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Payment types power the multi-provider billing system. They define how payments are created, verified, and managed across Stripe, LemonSqueezy, Polar, and Solidgate.

## Enums

### `PaymentPlan`

Available subscription tiers.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Billing cycle options for recurring charges.

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

Classifies a payment as one-time, recurring, or free.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Tracks the lifecycle of a single payment attempt.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Supported payment instruments.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Currencies accepted by the platform.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Union type of all payment provider identifiers.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfaces

### `PaymentIntent`

Represents a pending or completed payment.

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

| Field | Description |
|-------|-------------|
| `id` | Provider-assigned payment identifier |
| `amount` | Amount in cents (e.g., 1000 = $10.00) |
| `currency` | ISO 4217 currency code |
| `clientSecret` | Token passed to the frontend SDK for confirmation |

### `CheckoutParams`

Parameters for initiating a checkout session.

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

Customer billing information attached to a payment.

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

Credentials needed to initialise a provider.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Frontend-safe configuration returned by `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Usage Example

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

## Related Types

- [Subscription Types](./subscription-types.md) -- subscription lifecycle and status
- [Configuration / Payment](../configuration/payment-config.md) -- provider setup and pricing tiers
- [Config Types](./config-types.md) -- `PaymentConfig` schema
