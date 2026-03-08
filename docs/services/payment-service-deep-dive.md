---
id: payment-service-deep-dive
title: Payment Service Deep Dive
sidebar_label: Payment Service (Deep Dive)
sidebar_position: 53
---

# Payment Service Deep Dive

## Overview

The Payment Service provides a **provider-agnostic** payment processing layer. It uses the **Strategy pattern** through `PaymentProviderFactory` to delegate all operations to a concrete provider (Stripe, Polar, etc.) while exposing a unified API to the rest of the application.

## Source Files

| File | Path |
|------|------|
| Payment Service | `template/lib/payment/lib/payment-service.ts` |
| Provider Factory | `template/lib/payment/lib/payment-provider-factory.ts` |
| Service Manager | `template/lib/payment/lib/payment-service-manager.ts` |
| Types | `template/lib/payment/types/payment-types.ts` |
| Stripe Provider | `template/lib/payment/lib/providers/stripe-provider.ts` |
| Payment Hook | `template/lib/payment/hooks/use-payment.tsx` |
| Payment Email Service | `template/lib/payment/services/payment-email.service.ts` |

## Architecture

```
React Components / API Routes
        |
   PaymentService           (unified API)
        |
   PaymentProviderInterface  (strategy interface)
        |
  ┌─────┼──────────────┐
  │     │              │
Stripe  Polar    LemonSqueezy
Provider Provider  Provider
```

The `PaymentService` constructor accepts a provider name and config, then creates the appropriate provider via `PaymentProviderFactory`.

## Configuration

```typescript
interface PaymentServiceConfig {
  provider: SupportedProvider; // 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar'
  config: PaymentProviderConfig;
}

interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

## Payment Plans

```typescript
enum PaymentPlanId {
  FREE = "1",
  ONE_TIME = "2",
  SUBSCRIPTION = "3",
  PREMIUM = "4",
}

interface PaymentPlan {
  id: PaymentPlanId;
  amount: number;
  isSubscription: boolean;
  features: string[];
}
```

## Method Reference

### Customer Management

#### `hasCustomerId(user: User | null): boolean`

Checks if the user object contains a customer ID for the active payment provider.

#### `getCustomerId(user: User | null): Promise<string | null>`

Retrieves the customer ID from the user's metadata.

#### `createCustomer(params: CreateCustomerParams): Promise<CustomerResult>`

Creates a new customer record in the payment provider.

**Parameters:**
```typescript
{
  email: string;
  name?: string;
  metadata?: Record<string, any>;
}
```

**Returns:** `{ id, email, name?, metadata? }`

### Payment Intents

#### `createSetupIntent(user: User | null): Promise<SetupIntent>`

Creates a setup intent for saving payment methods without charging.

#### `createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>`

Creates a payment intent for a one-time charge.

**Parameters:**
```typescript
{
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
  customerId?: string;
  productId?: string;
  successUrl?: string;
  cancelUrl?: string;
}
```

**Returns:**
```typescript
{
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
  customerId?: string;
}
```

#### `confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>`

Confirms a previously created payment intent with a specific payment method.

#### `verifyPayment(paymentId: string): Promise<PaymentVerificationResult>`

Checks the status of a payment.

**Returns:** `{ isValid: boolean; paymentId: string; status: string; details?: any }`

### Subscriptions

#### `createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>`

Creates a recurring subscription.

**Parameters:**
```typescript
{
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

#### `cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>`

Cancels a subscription. If `cancelAtPeriodEnd` is `true` (default), the subscription remains active until the current period ends.

#### `updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>`

Updates subscription parameters (price, cancellation schedule, metadata).

### Webhooks

#### `handleWebhook(payload, signature, rawBody?, timestamp?, webhookId?): Promise<WebhookResult>`

Processes an incoming payment webhook. Signature verification is handled by the provider.

**Returns:** `{ received: boolean; type: string; id: string; data?: any }`

### Refunds

#### `refundPayment(paymentId: string, amount?: number): Promise<any>`

Issues a full or partial refund. If `amount` is omitted, the full payment is refunded.

### Client Configuration

#### `getClientConfig(): ClientConfig`

Returns the public key and gateway identifier for frontend integration.

```typescript
{
  publicKey: string;
  paymentGateway: 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
  options?: Record<string, any>;
}
```

#### `getUIComponents(): UIComponents`

Returns provider-specific UI components including the payment form React component, logo, card brand icons, supported payment methods, and translations.

## Subscription Statuses

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

## Webhook Event Types

The service handles a comprehensive set of webhook events:

- Payment events: `payment_succeeded`, `payment_failed`, `payment_intent_succeeded`, `payment_intent_failed`
- Subscription events: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_trial_ending`
- Invoice events: `invoice_paid`, `invoice_payment_failed`
- Refund events: `refund_succeeded`, `refund_created`
- Billing portal events: session created, expired, updated, deleted

## Utility Functions

### `formatCentsToCurrency(cents, currency?, locale?): string`

Converts cents to a formatted currency string (e.g., `1999` to `$19.99`).

### `convertCentsToDecimal(cents): number`

Converts cents to decimal (e.g., `1999` to `19.99`).

### `convertDecimalToCents(decimal): number`

Converts decimal to cents (e.g., `19.99` to `1999`).

### `safeTimestampToDate(timestamp): Date | undefined`

Safely converts a Unix timestamp (seconds or milliseconds) to a `Date` object. Handles null, undefined, and invalid values.

## Error Handling

All methods delegate to the provider implementation. Errors from Stripe or other providers propagate to the caller. The service does not add additional error handling -- this is by design to let the API layer handle HTTP-specific error responses.

## Usage Examples

```typescript
import { PaymentService } from '@/lib/payment/lib/payment-service';

const paymentService = new PaymentService({
  provider: 'stripe',
  config: {
    apiKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
});

// Create a customer
const customer = await paymentService.createCustomer({
  email: 'user@example.com',
  name: 'Jane Doe',
});

// One-time payment
const intent = await paymentService.createPaymentIntent({
  amount: 2999,
  currency: 'usd',
  customerId: customer.id,
});

// Create subscription
const subscription = await paymentService.createSubscription({
  customerId: customer.id,
  priceId: 'price_xxx',
  trialPeriodDays: 7,
});

// Handle webhook
const result = await paymentService.handleWebhook(
  payload,
  request.headers.get('stripe-signature')!
);
```
