---
id: solidgate-deep-dive
title: Solidgate Deep Dive
sidebar_label: Solidgate
sidebar_position: 7
---

# Solidgate Deep Dive

This page covers the complete Solidgate integration, including checkout creation, webhook processing, payment verification, and the embedded payment form.

## Overview

Solidgate is a payment infrastructure provider that supports both hosted checkout flows and an embeddable React SDK for inline payment forms. The integration creates payment intents via the Solidgate API and supports webhook-driven event processing with idempotency protection. Solidgate uses HMAC-SHA512 for webhook signature verification.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Session required | Create a checkout session / payment intent |
| `POST` | `/api/solidgate/webhook` | Signature required | Process incoming webhook events |
| `GET` | `/api/solidgate/webhook` | None | Returns endpoint documentation |

## Checkout Creation (POST)

### Request Body

The checkout endpoint uses Zod validation for strict input checking:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Payment amount
  currency: z.string().default('USD'),         // Currency code
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // Redirect URL
  cancelUrl: z.string().url(),                 // Cancel URL
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Example Request

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### How It Works

1. Authenticates the user via `auth()`
2. Validates the request body with Zod schema
3. Resolves or creates a Solidgate customer
4. Creates a payment intent via the Solidgate API
5. Returns the payment ID and client secret for the embedded SDK

### Provider Implementation

The `createPaymentIntent` method constructs the API request:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Amount in cents
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Success Response (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

The `url` field contains the payment intent ID used to initialize the Solidgate React SDK.

## Embedded Payment Form

Solidgate provides a React SDK for inline payment forms. The provider generates a signature for SDK initialization:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

The `getUIComponents()` method returns a configured payment form wrapper:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Webhook Processing

### Signature Verification

Solidgate uses HMAC-SHA512 for webhook signatures. The signature header can be `x-signature` or `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

The provider verifies the signature against the raw body:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Idempotency Protection

The webhook endpoint includes in-memory idempotency protection to prevent duplicate processing:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acknowledge without processing
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
In a production serverless environment, the in-memory Set should be replaced with Redis or a database table for cross-instance idempotency.
:::

### Event Mapping

| Solidgate Event | Internal Type |
|----------------|---------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Handler Structure

Each handler delegates to the `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

The `WebhookSubscriptionService` is initialized with the `SOLIDGATE` provider constant:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Payment Verification

The provider supports payment verification via the Solidgate API:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Subscription Management

### Creating Subscriptions

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Returns SubscriptionInfo with mapped status
}
```

### Cancelling Subscriptions

Supports both immediate and period-end cancellation:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Updating Subscriptions

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## API Communication

All Solidgate API calls use a centralized `makeApiRequest` method:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Error handling and JSON parsing
}
```

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | `Invalid request body` | Zod validation failed |
| 400 | `Invalid JSON` | Malformed request body |
| 400 | `Failed to create customer` | Customer resolution failed |
| 400 | `No signature provided` | Webhook missing signature |
| 400 | `Webhook not processed` | Signature verification failed |
| 401 | `Unauthorized` | No authenticated session |
| 500 | `Failed to create checkout session` | Solidgate API error |

Zod validation errors return detailed field-level messages:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLIDGATE_API_KEY` | Yes | Solidgate API key |
| `SOLIDGATE_SECRET_KEY` | Yes | Secret key for signature generation |
| `SOLIDGATE_WEBHOOK_SECRET` | Yes | Webhook signing secret |
| `SOLIDGATE_PUBLISHABLE_KEY` | Yes | Publishable key for the React SDK |
| `SOLIDGATE_MERCHANT_ID` | Yes | Merchant identifier |
| `SOLIDGATE_API_BASE_URL` | No | API base URL (default: `https://api.solidgate.com/v1`) |

## Security Considerations

- HMAC-SHA512 is used for both webhook and payment intent signature verification
- The secret key and webhook secret are never exposed to the client
- Idempotency protection prevents duplicate webhook processing
- Zod validation ensures strict input checking on the checkout endpoint
- Error stack traces are only included in development mode
- The `safeErrorMessage` utility sanitizes error messages for production

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Polar Deep Dive](./polar-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
