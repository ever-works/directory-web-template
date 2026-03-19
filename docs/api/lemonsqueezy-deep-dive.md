---
id: lemonsqueezy-deep-dive
title: LemonSqueezy Deep Dive
sidebar_label: LemonSqueezy
sidebar_position: 5
---

# LemonSqueezy Deep Dive

This page covers the complete LemonSqueezy integration, including checkout creation, subscription management, webhook processing, and product sync.

## Overview

LemonSqueezy is a merchant-of-record payment provider that handles tax collection, compliance, and payment processing. The integration uses LemonSqueezy's hosted checkout flow, variant-based product model, and webhook system. Unlike Stripe, LemonSqueezy does not support setup intents or direct payment method management -- all payment handling occurs through their hosted UI.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Session required | Create checkout session from JSON body |
| `GET` | `/api/lemonsqueezy/checkout` | None | Create checkout session from query params |
| `POST` | `/api/lemonsqueezy/webhook` | Signature required | Process incoming webhook events |

## Checkout Creation (POST)

### Request Body

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### Example Request

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### How It Works

1. Authenticates the user via `auth()`
2. Validates the request body using `validateCheckoutRequestBody()`
3. Calls `lemonsqueezyProvider.createCustomCheckout()` with user metadata
4. Returns the checkout URL

### Provider Implementation

The `createCustomCheckout` method creates a LemonSqueezy checkout with comprehensive configuration:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Checkout via Query Parameters (GET)

The GET endpoint supports creating checkouts via query parameters for direct link scenarios:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `variantId` | Yes | LemonSqueezy variant ID |
| `email` | Yes | Customer email |
| `customPrice` | No | Custom price in cents |
| `metadata` | No | JSON string of metadata |

## Subscription Management

### Creating Subscriptions

Subscriptions are created through the checkout flow. The `createSubscription` method wraps LemonSqueezy's checkout API:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Cancelling Subscriptions

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Updating Subscriptions

The update method supports plan changes, pausing, resuming, and reactivation:

```typescript
// Plan change via variant ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pause subscription
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Resume subscription
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Webhook Processing

### Signature Verification

LemonSqueezy uses HMAC SHA-256 for webhook signature verification. The provider verifies signatures using the Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Event Mapping

| LemonSqueezy Event | Internal Type |
|-------------------|---------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Webhook Handler Structure

Each handler follows a consistent pattern:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Sponsor Ad Detection

LemonSqueezy uses `custom_data` instead of Stripe's `metadata`:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Customer Management

The provider follows the same three-step customer resolution pattern as other providers:

1. Check user metadata for `lemonsqueezy_customer_id`
2. Query the `PaymentAccount` database table
3. Create a new customer via the LemonSqueezy API

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Error Handling

| Status | Error Code | Cause |
|--------|-----------|-------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 401 | `Unauthorized` | No authenticated session |
| 500 | `CONFIGURATION_ERROR` | Missing environment variables |
| 500 | `INTERNAL_ERROR` | Unhandled error |
| 503 | `PAYMENT_SERVICE_ERROR` | LemonSqueezy API unavailable |

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Yes | LemonSqueezy API key |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `LEMONSQUEEZY_STORE_ID` | Yes | Numeric store ID |

## Limitations

- **No setup intents**: LemonSqueezy does not support saving cards without a purchase. The `createSetupIntent` method throws an error.
- **No direct refund API**: Refunds must be processed through the LemonSqueezy dashboard.
- **Variant-based pricing**: Products use variant IDs instead of price IDs. Plan changes use `variantId`.

## Security Considerations

- Webhook signatures are verified using HMAC SHA-256
- The raw body text is used for signature verification to prevent JSON re-serialization issues
- API keys are never exposed to the client
- Development mode logging sanitizes PII (email addresses are partially redacted)

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
