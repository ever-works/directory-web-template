---
id: subscription-types
title: Subscription Type Definitions
sidebar_label: Subscription Types
sidebar_position: 12
---

# Subscription Type Definitions

**Source:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Subscription types model the full lifecycle of recurring billing -- from trial creation through cancellation and renewal.

## Enums

### `SubscriptionStatus` (Provider-level)

Status values returned by the payment provider SDK.

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

| Value | Description |
|-------|-------------|
| `incomplete` | Initial payment is still pending |
| `trialing` | Customer is within their trial period |
| `active` | Subscription is active and paid |
| `past_due` | Payment failed but subscription is not yet cancelled |
| `canceled` | Subscription has been cancelled |
| `unpaid` | Multiple payment failures; subscription is suspended |

### `SubscriptionStatus` (Database-level)

Status values stored in the `subscriptions` table.

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

Differentiates how a subscription was started.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfaces

### `SubscriptionInfo`

Normalised subscription data returned from any provider.

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

| Field | Description |
|-------|-------------|
| `id` | Provider subscription identifier |
| `customerId` | Provider customer identifier |
| `currentPeriodEnd` | Unix timestamp when the current billing period ends |
| `cancelAtPeriodEnd` | If `true`, the subscription cancels at period end instead of immediately |
| `trialEnd` | Unix timestamp when the trial expires |

### `CreateSubscriptionParams`

Parameters for creating a new subscription.

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

Parameters for modifying an existing subscription.

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

Formatted pricing information for display.

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

Localised pricing for a specific country.

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

## Database Schema

The `subscriptions` table stores the subscription record:

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

## Usage Example

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

## Related Types

- [Payment Types](./payment-types.md) -- payment intents, checkout params
- [Auth Types](./auth-types.md) -- user and session types linked to subscriptions
