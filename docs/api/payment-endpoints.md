---
id: payment-endpoints
title: Payment API Endpoints
sidebar_label: Payment Endpoints
sidebar_position: 3
---

# Payment API Endpoints

The template supports four payment providers: **Stripe**, **Lemon Squeezy**, **Polar**, and **Solidgate**. Each provider has its own set of API routes for checkout, subscription management, and webhook handling. A generic `/api/payment` group provides provider-agnostic subscription queries.

## Stripe (`/api/stripe`)

Stripe is the most feature-complete integration with 17 route handlers covering checkout, subscriptions, payment methods, setup intents, and products.

### Checkout

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/stripe/checkout` | Create a Stripe Checkout Session |

### Subscriptions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stripe/subscription` | Get current user's active subscription |
| `POST` | `/api/stripe/subscription` | Create a new subscription |
| `GET` | `/api/stripe/subscriptions` | List all user subscriptions |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Cancel a subscription |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Reactivate a cancelled subscription |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Update subscription (change plan) |
| `POST` | `/api/stripe/subscription/portal` | Create a Stripe Customer Portal session |

### Payment Methods

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | List saved payment methods |
| `POST` | `/api/stripe/payment-methods/create` | Add a new payment method |
| `PUT` | `/api/stripe/payment-methods/update` | Update default payment method |
| `DELETE` | `/api/stripe/payment-methods/delete` | Remove a payment method |
| `GET` | `/api/stripe/payment-methods/[id]` | Get payment method details |

### Setup Intents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/stripe/setup-intent` | Create a Setup Intent for saving payment method |
| `GET` | `/api/stripe/setup-intent/[id]` | Get Setup Intent status |

### Payment Intents

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/stripe/payment-intent` | Create a one-time Payment Intent |

### Products

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/stripe/products` | List available Stripe products/prices |

### Webhook

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/stripe/webhook` | Stripe webhook event handler |

The Stripe webhook handler processes events such as:
- `checkout.session.completed` - Checkout completion
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy provides a simpler subscription model with 7 endpoints.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Create a Lemon Squeezy checkout |
| `GET` | `/api/lemonsqueezy/list` | List user's subscriptions |
| `POST` | `/api/lemonsqueezy/cancel` | Cancel a subscription |
| `POST` | `/api/lemonsqueezy/reactivate` | Reactivate a cancelled subscription |
| `POST` | `/api/lemonsqueezy/update` | Update subscription details |
| `POST` | `/api/lemonsqueezy/update-plan` | Change subscription plan |
| `POST` | `/api/lemonsqueezy/webhook` | Lemon Squeezy webhook handler |

### Webhook Events

The Lemon Squeezy webhook processes:
- `subscription_created` - New subscription
- `subscription_updated` - Plan changes
- `subscription_cancelled` - Cancellation
- `subscription_payment_success` - Payment confirmation
- `subscription_payment_failed` - Payment failure

## Polar (`/api/polar`)

Polar provides 5 endpoints for checkout and subscription management.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/polar/checkout` | Create a Polar checkout session |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Cancel subscription |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Reactivate subscription |
| `POST` | `/api/polar/subscription/portal` | Access subscription portal |
| `POST` | `/api/polar/webhook` | Polar webhook handler |

## Solidgate (`/api/solidgate`)

Solidgate is the most minimal integration with 2 endpoints.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Create a Solidgate checkout |
| `POST` | `/api/solidgate/webhook` | Solidgate webhook handler |

## Generic Payment (`/api/payment`)

Provider-agnostic payment endpoints for managing subscriptions regardless of the underlying payment provider.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/payment/[subscriptionId]` | Get subscription details by ID |
| `GET` | `/api/payment/account` | Get payment account for current user |
| `GET` | `/api/payment/account/[userId]` | Get payment account for specific user (admin) |

## Webhook Security

All webhook endpoints implement provider-specific signature verification:

### Stripe

Stripe webhooks verify the `stripe-signature` header using the `STRIPE_WEBHOOK_SECRET` environment variable and the `stripe.webhooks.constructEvent()` method.

### Lemon Squeezy

Lemon Squeezy webhooks verify the `x-signature` header using HMAC-SHA256 with the `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

Polar webhooks verify request signatures using the `POLAR_WEBHOOK_SECRET`.

### Solidgate

Solidgate webhooks use their SDK's built-in signature verification with the `SOLIDGATE_SECRET_KEY`.

## Environment Variables

### Stripe

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (client-side) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |

### Lemon Squeezy

| Variable | Description |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Lemon Squeezy API key |
| `LEMONSQUEEZY_STORE_ID` | Store identifier |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook signing secret |

### Polar

| Variable | Description |
|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Polar API access token |
| `POLAR_WEBHOOK_SECRET` | Webhook signing secret |
| `POLAR_ORGANIZATION_ID` | Organization identifier |

### Solidgate

| Variable | Description |
|----------|-------------|
| `SOLIDGATE_MERCHANT_ID` | Merchant identifier |
| `SOLIDGATE_SECRET_KEY` | API secret key |

## Authentication Requirements

| Endpoint Type | Auth Required |
|--------------|---------------|
| Checkout creation | Yes (authenticated user) |
| Subscription management | Yes (subscription owner) |
| Payment method management | Yes (Stripe customer) |
| Product listing | Public (Stripe products) |
| Webhook handlers | Signature verification (no session) |
| Generic payment queries | Yes (account owner or admin) |
