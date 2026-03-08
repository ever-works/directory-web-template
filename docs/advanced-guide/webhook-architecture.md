---
id: webhook-architecture
title: Webhook Architecture
sidebar_label: Webhooks
sidebar_position: 3
---

# Webhook Architecture

This guide covers the webhook handling system used for processing events from external services like Stripe, LemonSqueezy, and other payment providers, including signature verification, event routing, idempotency, and retry handling.

## Architecture Overview

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## Payment Provider Webhooks

The template uses the `PaymentServiceManager` pattern to support multiple payment providers:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### Webhook Route Handler Pattern

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## Signature Verification

### Stripe Webhooks

Stripe uses HMAC-SHA256 signatures with a timestamp to prevent replay attacks:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy Webhooks

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Event Routing

### Event Type to Handler Mapping

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## Idempotency

### Preventing Duplicate Processing

Webhook providers may resend events. Use the event ID to prevent duplicate processing:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## Retry Handling

### Provider Retry Behavior

| Provider | Retry Schedule | Max Retries | Timeout |
|----------|---------------|-------------|---------|
| Stripe | Exponential backoff over 3 days | ~16 attempts | 20 seconds |
| LemonSqueezy | Exponential backoff | 5 attempts | 15 seconds |

### Best Practices for Retry-Safe Handlers

1. **Return 200 quickly**: Acknowledge receipt within 5 seconds. Offload heavy processing.
2. **Idempotent handlers**: Ensure re-processing the same event produces the same result.
3. **Return 4xx for permanent failures**: Return 400 for invalid signatures. The provider will not retry.
4. **Return 5xx for transient failures**: Return 500 if your database is temporarily unavailable. The provider will retry.

## Dead Letter Queue Pattern

For events that repeatedly fail processing, implement a dead letter pattern:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## Security Considerations

1. **Always verify signatures** before processing any webhook payload.
2. **Use timing-safe comparison** (`crypto.timingSafeEqual`) to prevent timing attacks.
3. **Read raw body** before JSON parsing -- signature verification requires the exact bytes received.
4. **Restrict webhook endpoints** to POST only.
5. **Do not expose webhook secrets** in client-side code or logs.
6. **Validate event data** before acting on it -- do not trust webhook payloads blindly.

## Performance Considerations

1. **Quick acknowledgment**: Return 200 within the provider's timeout window. Offload heavy work to background jobs.
2. **Database writes**: Minimize DB operations in the webhook handler. Batch updates where possible.
3. **Logging**: Log event IDs and types for debugging, but avoid logging full payloads (may contain PII).

## Troubleshooting

### Signature verification fails

1. Ensure you are reading the **raw request body** (not parsed JSON).
2. Check that the webhook secret matches the one in your provider dashboard.
3. Verify there is no middleware modifying the request body before it reaches the handler.

### Duplicate events processed

1. Implement idempotency using the event ID as described above.
2. Check the `webhookEvents` table for duplicate entries.
3. Use database-level unique constraints on the event ID column.

### Events timing out

1. Move heavy processing to background jobs using the `BackgroundJobManager`.
2. Acknowledge the webhook immediately and process asynchronously.
3. Increase the timeout for external API calls if needed.

## Related Documentation

- [Error Recovery Patterns](./error-recovery-patterns.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
- [API Client Architecture](./api-client-architecture.md)
