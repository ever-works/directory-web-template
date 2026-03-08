---
id: webhook-api-endpoints
title: Webhook API Endpoints
sidebar_label: Webhooks
sidebar_position: 27
---

# Webhook API Endpoints

The template supports payment webhook handlers for four providers: Stripe, LemonSqueezy, Polar, and Solidgate. Each webhook endpoint processes incoming events from its respective payment provider, handling subscription lifecycle management, payment notifications, and email delivery. All endpoints verify request signatures for security.

## Overview

| Endpoint | Provider | Signature Header | Description |
|---|---|---|---|
| `/api/stripe/webhook` | Stripe | `stripe-signature` | Process Stripe payment and subscription events |
| `/api/lemonsqueezy/webhook` | LemonSqueezy | `x-signature` | Process LemonSqueezy payment events |
| `/api/polar/webhook` | Polar | `webhook-signature` | Process Polar payment events |
| `/api/solidgate/webhook` | Solidgate | `x-signature` | Process Solidgate payment events |

All webhook endpoints accept only POST requests and return `{"received": true}` on success.

## Shared Architecture

All four webhook handlers follow the same general pattern:

1. Read the raw request body as text (needed for signature verification)
2. Extract the signature from provider-specific headers
3. Pass the body and signature to the provider's `handleWebhook()` method for verification and parsing
4. Route the parsed event to the appropriate handler based on `WebhookEventType`
5. Execute business logic (database updates, email notifications)
6. Return `{"received": true}` to acknowledge the webhook

### Common Event Types

The `WebhookEventType` enum from `lib/payment/types/payment-types` standardizes events across providers:

| Event Type | Description |
|---|---|
| `SUBSCRIPTION_CREATED` | New subscription activated |
| `SUBSCRIPTION_UPDATED` | Subscription plan or details changed |
| `SUBSCRIPTION_CANCELLED` | Subscription cancelled |
| `PAYMENT_SUCCEEDED` | One-time payment completed |
| `PAYMENT_FAILED` | Payment attempt failed |
| `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Recurring subscription payment completed |
| `SUBSCRIPTION_PAYMENT_FAILED` | Recurring subscription payment failed |
| `SUBSCRIPTION_TRIAL_ENDING` | Trial period about to expire |
| `REFUND_SUCCEEDED` | Refund processed |
| `BILLING_PORTAL_SESSION_UPDATED` | Billing portal session changed (Stripe only) |

## Stripe Webhook

```
POST /api/stripe/webhook
```

Processes Stripe webhook events with signature verification via the `stripe-signature` header. This is the most feature-complete webhook handler, including email notifications for all event types and sponsor ad subscription handling.

**Required Header:**

| Header | Description |
|---|---|
| `stripe-signature` | Stripe webhook signature (`t=...,v1=...` format) |

**Supported Events:**

| Stripe Event | Mapped Type | Actions |
|---|---|---|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | Database update, welcome email |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | Database update, update email |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | Database update, cancellation email |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Database update, receipt email |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | Database update, retry email |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | Confirmation email |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | Failure notification email |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | Trial ending email |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Logging only |

**Sponsor Ad Handling:**

Stripe webhooks detect sponsor ad subscriptions via `metadata.type === "sponsor_ad"` in the subscription data. When detected, dedicated handlers activate, cancel, or renew sponsor ads instead of processing regular subscriptions.

**Error Responses:**

| Status | Condition |
|---|---|
| 400 | Missing `stripe-signature` header |
| 400 | Webhook not processed (invalid signature) |
| 400 | Webhook processing failed |

**Source:** `template/app/api/stripe/webhook/route.ts`

## LemonSqueezy Webhook

```
POST /api/lemonsqueezy/webhook
```

Processes LemonSqueezy webhook events with signature verification via the `x-signature` header. Uses an event mapping function to translate LemonSqueezy-specific event names to the generic `WebhookEventType`.

**Required Header:**

| Header | Description |
|---|---|
| `x-signature` | LemonSqueezy webhook signature |

**Event Mapping:**

| LemonSqueezy Event | Mapped Type |
|---|---|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

**Sponsor Ad Handling:**

LemonSqueezy uses `custom_data.type === "sponsor_ad"` or `meta.custom_data.type === "sponsor_ad"` to identify sponsor ad subscriptions.

**Source:** `template/app/api/lemonsqueezy/webhook/route.ts`

## Polar Webhook

```
POST /api/polar/webhook
```

Processes Polar webhook events with multi-header signature verification. Polar uses three headers for security verification and delegates event routing to a separate router module.

**Required Headers:**

| Header | Description |
|---|---|
| `webhook-signature` | HMAC SHA256 signature (`v1,<hex_signature>` format) |
| `webhook-timestamp` | Unix timestamp of the webhook event |
| `webhook-id` | Unique identifier for the webhook delivery |

**Supported Events:**

| Polar Event | Description |
|---|---|
| `checkout.succeeded` | Checkout completed |
| `checkout.failed` | Checkout failed |
| `subscription.created` | Subscription created |
| `subscription.updated` | Subscription updated |
| `subscription.canceled` | Subscription cancelled |
| `invoice.paid` | Invoice payment completed |
| `invoice.payment_failed` | Invoice payment failed |

**Processing:**

Unlike the other providers, Polar's webhook handler uses a separate `routeWebhookEvent()` function from a `router` module and a `validateWebhookPayload()` utility for payload structure validation before signature verification.

**Source:** `template/app/api/polar/webhook/route.ts`

## Solidgate Webhook

```
POST /api/solidgate/webhook
```

Processes Solidgate webhook events with signature verification. Includes in-memory idempotency protection to prevent duplicate processing of the same webhook event.

**Required Header:**

| Header | Description |
|---|---|
| `x-signature` or `solidgate-signature` | Solidgate webhook signature |

**Idempotency:**

The handler maintains an in-memory `Set` of processed webhook IDs. Duplicate webhooks return `{"received": true}` without reprocessing. Webhook IDs expire from the cache after 24 hours.

**Note:** The in-memory idempotency cache does not persist across serverless function invocations. In production serverless environments, this should be replaced with Redis or a database-backed solution.

**Supported Events:**

The handler accepts both the generic `WebhookEventType` constants and string-based event names (e.g., both `WebhookEventType.PAYMENT_SUCCEEDED` and `"payment_succeeded"`).

| Event | Actions |
|---|---|
| `payment_succeeded` | Record payment |
| `payment_failed` | Record failure |
| `subscription_created` | Create subscription |
| `subscription_updated` | Update subscription |
| `subscription_cancelled` | Cancel subscription |
| `subscription_payment_succeeded` | Record subscription payment |
| `subscription_payment_failed` | Record subscription payment failure |
| `subscription_trial_ending` | Handle trial ending |
| `refund_processed` | Log refund |

**GET Endpoint:**

Solidgate also exposes a GET handler that returns an informational message about the webhook endpoint:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**Source:** `template/app/api/solidgate/webhook/route.ts`

## Email Notifications

The Stripe webhook handler sends the most comprehensive email notifications. All providers delegate to the `WebhookSubscriptionService` for database operations, but email templates vary by provider.

| Email Type | Trigger |
|---|---|
| Welcome / New Subscription | Subscription created |
| Subscription Update | Subscription plan changed |
| Cancellation Confirmation | Subscription cancelled |
| Payment Receipt | Subscription or one-time payment succeeded |
| Payment Failed / Retry | Payment attempt failed |
| Trial Ending | Trial period about to expire |

Email configuration is loaded from `lib/config/server-config` via `getEmailConfig()` and includes company name, company URL, and support email address.

## Key Implementation Details

- **Signature Verification:** All providers verify webhook signatures before processing events. Invalid signatures result in a 400 response.
- **Raw Body Parsing:** Webhooks read the request body as text using `request.text()` rather than `request.json()` because signature verification requires the raw, unmodified payload.
- **WebhookSubscriptionService:** The shared `WebhookSubscriptionService` class handles database operations for subscription lifecycle events across all providers.
- **Sponsor Ad Detection:** Stripe and LemonSqueezy webhooks detect sponsor ad subscriptions via metadata and route them to separate handlers for ad activation, cancellation, and renewal.
- **Graceful Error Handling:** Email send failures are caught and logged but do not cause the webhook to return an error. The webhook always acknowledges receipt to prevent provider retries.
