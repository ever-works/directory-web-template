---
id: polar-deep-dive
title: Polar Deep Dive
sidebar_label: Polar
sidebar_position: 6
---

# Polar Deep Dive

This page covers the complete Polar integration, including checkout creation, subscription management, customer portal, and webhook processing.

## Overview

Polar is a modern payment platform designed for software and digital products. The integration supports both one-time payments and subscriptions through Polar's checkout system, with webhook-driven lifecycle management. Polar uses organization-scoped products and the `@polar-sh/sdk` for API interactions.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/polar/checkout` | Session required | Create checkout session (subscription or one-time) |
| `GET` | `/api/polar/checkout` | Session required | Retrieve checkout session status |
| `POST` | `/api/polar/webhook` | Signature required | Process incoming webhook events |

## Checkout Creation (POST)

### Request Body

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Example Request

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### How It Works

The checkout route handles two flows:

**Subscription Mode:**
1. Authenticates the user and resolves the Polar customer
2. Sanitizes metadata (removes `undefined` values -- Polar rejects them)
3. Calls `polarProvider.createSubscription()` which creates a checkout session
4. Returns the checkout URL from the subscription result

**One-Time Payment Mode:**
1. Authenticates the user and resolves the Polar customer
2. Uses the Polar SDK directly to create a checkout
3. Returns the checkout URL

### Metadata Sanitization

Polar requires that all metadata values are non-null and non-undefined:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Success Response (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Retrieving a Checkout Session (GET)

### Query Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `checkout_id` | Yes | Polar checkout session ID |

### Success Response (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Subscription Management

### Creating Subscriptions

The `PolarProvider.createSubscription()` method creates a checkout for the subscription:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Cancelling Subscriptions

Polar supports two cancellation strategies:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

The provider validates the subscription state before cancellation:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Reactivating Subscriptions

Subscriptions scheduled for cancellation can be reactivated:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Updating Subscriptions

Plan changes are handled through `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Webhook Processing

### Signature Verification

Polar uses the `@polar-sh/sdk/webhooks` `validateEvent` function for verification. The webhook requires three headers:

| Header | Description |
|--------|-------------|
| `webhook-signature` | HMAC SHA256 signature (format: `v1,<hex_signature>`) |
| `webhook-timestamp` | Unix timestamp of the event |
| `webhook-id` | Unique webhook delivery ID |

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### Event Types

| Polar Event | Internal Mapping |
|-------------|-----------------|
| `checkout.succeeded` | Payment succeeded |
| `checkout.failed` | Payment failed |
| `subscription.created` | Subscription created |
| `subscription.updated` | Subscription updated |
| `subscription.canceled` | Subscription cancelled |
| `invoice.paid` | Subscription payment succeeded |
| `invoice.payment_failed` | Subscription payment failed |

### Webhook Router

Events are dispatched through a dedicated router module:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

The router maps event types to handler functions that update the database via `WebhookSubscriptionService` and send email notifications.

### Payload Validation

The webhook endpoint validates the payload structure before processing:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Customer Management

The provider follows the standard three-step resolution pattern:

1. Check user metadata for the Polar customer ID
2. Query the `PaymentAccount` database table
3. Create a new customer via the Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Product ID is required` | Missing `productId` in request |
| 400 | `Checkout ID is required` | GET request missing `checkout_id` |
| 400 | `No signature provided` | Webhook missing signature header |
| 401 | `Unauthorized` | No authenticated session |
| 500 | `Failed to create checkout` | Checkout URL not available |
| 500 | `Configuration error` | Polar provider not configured |
| 503 | Payment setup incomplete | Organization has not completed payment setup in Polar |

The checkout endpoint includes special detection for payment setup errors:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Yes | Polar API access token |
| `POLAR_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `POLAR_ORGANIZATION_ID` | Yes | Polar organization ID |

## Security Considerations

- Webhook signatures are verified using the `validateEvent` function from the official SDK
- Raw body text is preserved for signature verification (JSON re-serialization could alter the body)
- Three separate headers are checked: signature, timestamp, and webhook ID
- Metadata is sanitized server-side to prevent injection of undefined values
- Error responses use `safeErrorResponse` to prevent information leakage

## Related Pages

- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
