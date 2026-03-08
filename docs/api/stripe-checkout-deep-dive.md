---
id: stripe-checkout-deep-dive
title: Stripe Checkout Deep Dive
sidebar_label: Stripe Checkout
sidebar_position: 1
---

# Stripe Checkout Deep Dive

This page covers the complete Stripe checkout flow, including session creation, price ID resolution, currency handling, redirect URLs, success/cancel flows, and metadata propagation.

## Overview

The Stripe checkout integration provides a server-side API that creates Stripe Checkout Sessions for both one-time payments and subscriptions. The flow authenticates the user, resolves or creates a Stripe customer, builds line items with optional trial support, and returns a hosted checkout URL.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/stripe/checkout` | Session required | Create a new checkout session |
| `GET` | `/api/stripe/checkout` | Session required | Retrieve an existing checkout session |

## Creating a Checkout Session (POST)

### Request Body

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### Example Request

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### Success Response (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Mode Mapping

The API maps incoming modes to Stripe's expected `Mode` type:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` maps to Stripe `payment` mode
- `subscription` maps to Stripe `subscription` mode
- Any other value maps to `setup` mode

## Customer Resolution

Before creating a checkout session, the API resolves or creates a Stripe customer:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

The `getCustomerId` method follows a three-step resolution:

1. **Metadata check** -- Looks for `stripe_customer_id` in user metadata
2. **Database lookup** -- Queries the `PaymentAccount` table for an existing record
3. **Create new** -- Creates a new Stripe customer and synchronizes with the database

If customer creation fails, the endpoint returns a `400` error.

## Trial Configuration

Trials require two conditions to be met:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

When a trial is enabled, `trialAmountId` is required. This allows a setup fee to be charged during the trial period. The `buildCheckoutLineItems` helper constructs line items that include both the subscription price and the optional trial amount.

If `hasTrial` is true but `trialAmountId` is missing, the endpoint returns:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Subscription-Specific Configuration

When the mode is `subscription`, additional configuration is applied via `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

This attaches subscription metadata including `userId`, `planId`, `planName`, and billing interval to the checkout session's `subscription_data`.

## Metadata Propagation

Metadata from the request is merged with session user data:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

This ensures that user identity information (ID, email, name) is always attached to the checkout session for reconciliation in webhook handlers.

## Retrieving a Checkout Session (GET)

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `session_id` | Yes | Stripe checkout session ID |

### Example Request

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Success Response (200)

```json
{
  "session": { "...full Stripe checkout session object..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

The session is retrieved with expanded `line_items` and `subscription` data:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Multi-Currency Support

Currency handling is configured through `stripe.config.ts`. The `STRIPE_CONFIG` object maps plans to currency-specific price IDs:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Use `getStripePriceConfig(plan, currency, interval)` to resolve the correct price ID for a given plan, currency, and billing interval.

## Dynamic Pricing

When `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, the `/api/stripe/products` endpoint fetches products and prices directly from the Stripe API with a 5-minute cache TTL. Products must have the following metadata keys set in the Stripe Dashboard:

- `plan` -- Plan type (`free`, `standard`, `premium`)
- `type` -- Product type (`subscription`, `sponsor_ad`)
- `features` -- JSON array of feature strings
- `annualDiscount` -- Annual discount percentage

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Enable dynamic pricing |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Conditional | Price IDs per plan/currency |

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Failed to create customer` | Customer resolution/creation failed |
| 400 | `Invalid trial configuration` | Trial enabled without `trialAmountId` |
| 400 | `Session ID is required` | GET request missing `session_id` param |
| 401 | `Unauthorized` | No authenticated session |
| 500 | `Failed to create checkout session` | Stripe API error or internal error |

In development mode, error responses include a `details` field with the stack trace.

## Security Considerations

- All checkout endpoints require an authenticated session via `auth()`
- The Stripe secret key is never exposed to the client
- Metadata is merged server-side; clients cannot spoof user identity
- Checkout sessions are scoped to the authenticated user's Stripe customer
- Error messages are sanitized via `safeErrorMessage` to prevent information leakage in production

## Related Pages

- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
