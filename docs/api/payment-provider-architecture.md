---
id: payment-provider-architecture
title: Payment Provider Architecture
sidebar_label: Provider Architecture
sidebar_position: 8
---

# Payment Provider Architecture

This page explains how the payment provider factory and service layer work, how to swap providers, and the provider-agnostic interfaces that unify all four payment integrations.

## Overview

The template implements a provider-agnostic payment architecture using the Strategy pattern. A factory creates provider instances, a service layer exposes a unified API, and each provider implements a common interface. This design allows the application to support Stripe, LemonSqueezy, Polar, and Solidgate through a single set of interfaces.

## Architecture Diagram

```
Application Code
      |
      v
PaymentService (unified API)
      |
      v
PaymentProviderFactory.createProvider()
      |
      +---> StripeProvider
      +---> LemonSqueezyProvider
      +---> PolarProvider
      +---> SolidgateProvider
```

## Supported Providers

| Provider | Type ID | Features |
|----------|---------|----------|
| Stripe | `stripe` | Full checkout, subscriptions, payment methods, setup intents, refunds |
| LemonSqueezy | `lemonsqueezy` | Hosted checkout, subscriptions, variant-based pricing |
| Polar | `polar` | Checkout, subscriptions, organization-scoped products |
| Solidgate | `solidgate` | API-based payments, embedded SDK, subscriptions, refunds |

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## The Provider Interface

All providers implement `PaymentProviderInterface`:

```typescript
interface PaymentProviderInterface {
  // Customer management
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;

  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
    timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

## The Factory

`PaymentProviderFactory` creates provider instances based on a string identifier:

```typescript
export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## The Service Layer

`PaymentService` wraps a provider instance and exposes the unified API:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  // Delegates all calls to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }

  // ... all other methods delegate to this.provider
}
```

### Usage Example

```typescript
const paymentService = new PaymentService({
  provider: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    options: {
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    }
  }
});

// Same API regardless of provider
const intent = await paymentService.createPaymentIntent({
  amount: 29.99,
  currency: 'usd',
  customerId: 'cus_123'
});
```

## Singleton Provider Management

The template uses singleton patterns for provider instances, managed through `@/lib/auth`:

```typescript
import { getOrCreateStripeProvider } from '@/lib/auth';
import { getOrCreateLemonsqueezyProvider } from '@/lib/auth';
import { getOrCreatePolarProvider } from '@/lib/auth';
import { getOrCreateSolidgateProvider } from '@/lib/auth';
```

These functions ensure that only one provider instance exists per runtime, avoiding unnecessary API client re-initialization.

## Key Type Definitions

### PaymentProviderConfig

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  secretKey?: string;
  webhookSecret?: string;
  options?: {
    publishableKey?: string;
    storeId?: string;
    organizationId?: string;
    merchantId?: string;
    apiBaseUrl?: string;
    testMode?: boolean;
    appUrl?: string;
  };
}
```

### PaymentIntent

```typescript
interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

### SubscriptionInfo

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: any;
}
```

### SubscriptionStatus

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid'
}
```

### WebhookResult

```typescript
interface WebhookResult {
  received: boolean;
  type: string;
  id: string;
  data: any;
}
```

### WebhookEventType

```typescript
enum WebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  BILLING_PORTAL_SESSION_UPDATED = 'billing_portal_session_updated',
  REFUND_SUCCEEDED = 'refund_succeeded'
}
```

## How to Swap Providers

### Step 1: Set Environment Variables

Each provider requires its own set of environment variables. Configure only the variables for your chosen provider.

### Step 2: Update the Provider Initialization

Change which `getOrCreate*Provider` function is used in your route handlers, or configure `PaymentService` with a different provider string:

```typescript
// Before (Stripe)
const paymentService = new PaymentService({
  provider: 'stripe',
  config: { apiKey: process.env.STRIPE_SECRET_KEY!, ... }
});

// After (Polar)
const paymentService = new PaymentService({
  provider: 'polar',
  config: { apiKey: process.env.POLAR_ACCESS_TOKEN!, ... }
});
```

### Step 3: Update Webhook Endpoints

Each provider has its own webhook route (`/api/stripe/webhook`, `/api/lemonsqueezy/webhook`, etc.). Ensure only the active provider's webhook is registered.

### Step 4: Handle Provider-Specific Features

Some features are provider-specific:
- **Setup intents**: Only Stripe and Solidgate (mock)
- **Embedded payment forms**: Stripe and Solidgate via React SDK
- **Variant-based pricing**: LemonSqueezy only
- **Organization-scoped products**: Polar only
- **Direct refund API**: Stripe and Solidgate only

## Customer Resolution Pattern

All four providers follow the same three-step customer resolution pattern:

```
1. Check user metadata (e.g., user.user_metadata.stripe_customer_id)
   |
   v (not found)
2. Query PaymentAccount database table
   |
   v (not found)
3. Create new customer via provider API
   -> Synchronize to PaymentAccount table
   -> Return new customer ID
```

This pattern is implemented identically in each provider's `getCustomerId()` method, ensuring consistent behavior regardless of which provider is active.

## Webhook Event Normalization

Each provider maps its native event types to the common `WebhookEventType` enum. This allows the `WebhookSubscriptionService` to handle events generically:

| Action | Stripe | LemonSqueezy | Polar | Solidgate |
|--------|--------|-------------|-------|-----------|
| Sub created | `customer.subscription.created` | `subscription_created` | `subscription.created` | `subscription.created` |
| Sub cancelled | `customer.subscription.deleted` | `subscription_cancelled` | `subscription.canceled` | `subscription.cancelled` |
| Payment success | `payment_intent.succeeded` | `order_created` | `checkout.succeeded` | `payment.succeeded` |
| Payment failed | `payment_intent.payment_failed` | N/A | `checkout.failed` | `payment.failed` |

## UI Components

Each provider exposes UI components through `getUIComponents()`:

```typescript
interface UIComponents {
  PaymentForm: (props: PaymentFormProps) => React.ReactElement | null;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

This allows the frontend to render the correct payment form, logos, and card brand icons without knowing which provider is active.

## File Structure

```
lib/payment/
  lib/
    payment-service.ts            # PaymentService class
    payment-provider-factory.ts   # PaymentProviderFactory
    providers/
      stripe-provider.ts          # StripeProvider
      lemonsqueezy-provider.ts    # LemonSqueezyProvider
      polar-provider.ts           # PolarProvider
      solidgate-provider.ts       # SolidgateProvider
  types/
    payment-types.ts              # Shared interfaces and enums
  ui/
    stripe/                       # Stripe Elements wrapper
    solidgate/                    # Solidgate Elements wrapper
```

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
