---
id: stripe-subscription-deep-dive
title: Stripe Subscription Deep Dive
sidebar_label: Stripe Subscriptions
sidebar_position: 2
---

# Stripe Subscription Deep Dive

This page covers all subscription management routes: creating, updating, cancelling, and the underlying provider methods with request/response examples.

## Overview

The subscription API provides full lifecycle management for Stripe subscriptions. It supports creating subscriptions with payment methods and trial periods, updating plans or cancellation settings, and cancelling subscriptions either immediately or at the end of the billing period.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/stripe/subscription` | Session required | Create a new subscription |
| `PUT` | `/api/stripe/subscription` | Session required | Update an existing subscription |
| `DELETE` | `/api/stripe/subscription` | Session required | Cancel a subscription |

## Creating a Subscription (POST)

### Request Body

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### Example Request

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### How It Works

The route handler performs these steps:

1. Authenticates the user via `auth()`
2. Resolves or creates a Stripe customer via `stripeProvider.getCustomerId()`
3. Calls `stripeProvider.createSubscription()` with the customer ID, price, payment method, trial days, and metadata

### Provider Implementation

Inside `StripeProvider.createSubscription()`:

```typescript
// Attach payment method to customer
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Set as default payment method
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Create the subscription
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Without trial: charge immediately
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Success Response (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix timestamp
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix timestamp or null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." if available
}
```

## Updating a Subscription (PUT)

### Request Body

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### Example Request

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### Provider Implementation

The `updateSubscription` method handles plan changes by replacing the subscription item:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

It also supports setting `cancel_at_period_end`, `cancel_at`, and updating metadata.

### Success Response (200)

Returns the same `SubscriptionInfo` shape with the updated values.

## Cancelling a Subscription (DELETE)

### Request Body

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### Example Request

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Provider Implementation

The cancellation logic supports two strategies:

```typescript
if (cancelAtPeriodEnd) {
  // Soft cancel: subscription remains active until period ends
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Hard cancel: subscription ends immediately
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Success Response (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## Subscription Status Mapping

The provider maps Stripe statuses to the internal `SubscriptionStatus` enum:

| Stripe Status | Internal Status |
|---------------|-----------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Metadata Tracking

All subscription operations attach `userId` from the session to subscription metadata:

```typescript
metadata: {
  userId: session.user.id
}
```

This allows webhook handlers to reconcile subscriptions with internal user records.

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Failed to create customer` | Customer resolution failed |
| 401 | `Unauthorized` | No authenticated session |
| 500 | `Failed to create subscription` | Stripe API error during creation |
| 500 | `Failed to update subscription` | Stripe API error during update |
| 500 | `Failed to cancel subscription` | Stripe API error during cancellation |

## Security Considerations

- All subscription endpoints require authentication
- Payment method attachment and default setting are performed server-side
- The `off_session` flag is only set for non-trial subscriptions to enable automatic charges
- Subscription metadata always includes the authenticated user's ID for audit
- In development mode, subscription updates are logged with non-sensitive fields only

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
