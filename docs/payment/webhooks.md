---
id: webhooks
title: Payment Webhooks
sidebar_label: Webhooks
sidebar_position: 7
---

# Payment Webhooks

The Ever Works template processes payment webhooks from all four supported providers through dedicated API routes. Each webhook endpoint handles signature verification, event routing, subscription lifecycle management, and email notifications.

## Source Locations

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Webhook Architecture

All provider webhook routes follow the same pattern:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Each route delegates business logic to the shared `WebhookSubscriptionService`, which normalizes provider-specific data into a common format before updating the database.

## Webhook Event Types

The template defines a comprehensive set of event types that all providers map into:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Solidgate Webhook Handler

### Endpoint

```
POST /api/solidgate/webhook
```

### Signature Verification

The Solidgate webhook route reads the signature from the `x-signature` or `solidgate-signature` header:

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

The provider verifies the signature using HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotency

The handler implements in-memory idempotency checking to prevent duplicate event processing:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
In a production serverless environment, replace the in-memory `Set` with Redis or a database table for reliable idempotency across instances.
:::

### Event Routing

After verification, events are routed to specific handlers:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Solidgate Event Mapping

The provider maps Solidgate-specific event names to the template's generic types:

| Solidgate Event | Template Event |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookSubscriptionService

All webhook handlers delegate to the shared `WebhookSubscriptionService`. This service is instantiated per provider:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Data Normalization

The service normalizes webhook payloads into a common `WebhookSubscriptionData` format:

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### Handler Methods

The service provides handlers for each webhook event type:

| Method | Event | Description |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Payment completed | Updates payment record, triggers confirmation email |
| `handlePaymentFailed` | Payment failed | Logs failure, may notify user |
| `handleSubscriptionCreated` | New subscription | Creates subscription record in database |
| `handleSubscriptionUpdated` | Plan change | Updates subscription details |
| `handleSubscriptionCancelled` | Cancellation | Updates status, sets cancellation date |
| `handleSubscriptionPaymentSucceeded` | Recurring payment | Extends subscription period |
| `handleSubscriptionPaymentFailed` | Recurring failure | Marks as past due, notifies user |
| `handleSubscriptionTrialEnding` | Trial ending | Sends trial-ending notification |

## Webhook Response Format

All webhook endpoints return a consistent format:

**Success (200):**
```json
{ "received": true }
```

**Client Error (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Returning a 200 status is critical to acknowledge receipt. If a 400 or 500 is returned, payment providers will typically retry the webhook delivery.

## GET Endpoint

Each webhook route also handles GET requests for diagnostic purposes:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Configuring Webhooks in Provider Dashboards

### Solidgate

1. Navigate to your Solidgate dashboard
2. Go to **Settings** then **Webhooks**
3. Add your webhook URL: `https://yourdomain.com/api/solidgate/webhook`
4. Select events to subscribe to: payments, subscriptions, refunds
5. Copy the webhook secret to your `SOLIDGATE_WEBHOOK_SECRET` environment variable

### Webhook URL Pattern

Each provider has its own dedicated endpoint:

| Provider | Webhook URL |
|----------|-------------|
| Stripe | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Polar | `/api/polar/webhook` |

## Testing Webhooks Locally

### Using ngrok or similar tunnel

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Then configure the ngrok URL as your webhook endpoint in the provider dashboard (e.g., `https://abc123.ngrok.io/api/solidgate/webhook`).

### Manual Testing with curl

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## Error Handling

Each handler function is wrapped in try/catch to prevent a single handler failure from causing a 400/500 response:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

This ensures the webhook is always acknowledged with a 200 response, even if internal processing fails. Processing errors are logged for investigation without causing provider retry loops.

## Security Considerations

- **Always verify signatures** -- never process webhook payloads without signature validation
- **Use raw body** -- parse the raw request text for signature verification, not the JSON-parsed body
- **Idempotency** -- implement deduplication to handle provider retries gracefully
- **Logging** -- log webhook IDs and event types for audit trails
- **HTTPS only** -- webhook endpoints must be served over HTTPS in production
