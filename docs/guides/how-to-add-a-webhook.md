---
id: how-to-add-a-webhook
title: "How to Add a Webhook Handler"
sidebar_label: "Add a Webhook"
sidebar_position: 73
---

# How to Add a Webhook Handler

This guide explains how to add webhook handlers for payment providers (Stripe, LemonSqueezy, Polar) or any external service. The template already includes webhook endpoints for all three payment providers -- this guide shows how to extend them or create new ones.

## Prerequisites

- Understanding of webhook concepts (signature verification, idempotency)
- Access to the external service's dashboard for configuring webhook URLs
- Relevant API keys and webhook secrets configured in environment variables

---

## Architecture Overview

Webhook handlers live under `app/api/<provider>/webhook/`:

```
app/api/
  stripe/webhook/route.ts           <-- Stripe webhooks
  lemonsqueezy/webhook/route.ts     <-- LemonSqueezy webhooks
  polar/webhook/
    route.ts                        <-- Polar webhook entry point
    router.ts                       <-- Event routing logic
    utils.ts                        <-- Validation helpers
```

Each webhook handler follows the same structure:

1. **Receive** the raw request body
2. **Verify** the signature using the provider's secret
3. **Parse** the event type and data
4. **Route** to the appropriate handler function
5. **Return** a `200` response quickly (before heavy processing if possible)

---

## Extending an Existing Payment Webhook

### Adding a New Stripe Event Handler

The Stripe webhook (`app/api/stripe/webhook/route.ts`) uses a switch statement to route events. To handle a new event type:

**Step 1:** Add a new case to the switch in the `POST` handler:

```typescript
// app/api/stripe/webhook/route.ts

switch (webhookResult.type) {
  case WebhookEventType.SUBSCRIPTION_CREATED:
    await handleSubscriptionCreated(webhookResult.data);
    break;
  // ... existing cases ...

  // Add your new event handler
  case WebhookEventType.REFUND_SUCCEEDED:
    await handleRefundSucceeded(webhookResult.data);
    break;

  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

**Step 2:** Implement the handler function in the same file:

```typescript
async function handleRefundSucceeded(data: any) {
  console.log("Refund succeeded:", data.id);

  try {
    const emailConfig = await getEmailConfig();
    const customerInfo = extractCustomerInfo(data);

    // Update subscription status in database
    await webhookSubscriptionService.handleRefundSucceeded(data);

    // Send refund confirmation email
    const emailData = createEmailData(
      {
        customerName: customerInfo.customerName,
        customerEmail: customerInfo.customerEmail,
        amount: formatAmount(data.amount_refunded, data.currency),
        currency: data.currency,
        transactionId: data.id,
      },
      emailConfig
    );

    await paymentEmailService.sendRefundConfirmationEmail(emailData);
    console.log("Refund confirmation email sent");
  } catch (error) {
    console.error("Error handling refund succeeded:", error);
  }
}
```

### Adding a New LemonSqueezy Event

The LemonSqueezy webhook works the same way but maps provider-specific event names to the generic `WebhookEventType` enum:

```typescript
// In app/api/lemonsqueezy/webhook/route.ts

function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
  const eventMapping: Record<string, string> = {
    subscription_created: WebhookEventType.SUBSCRIPTION_CREATED,
    // ... existing mappings ...
    order_refunded: WebhookEventType.REFUND_SUCCEEDED, // Add new mapping
  };

  return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}
```

### Adding a New Polar Event

The Polar webhook uses a router pattern for cleaner separation:

```typescript
// app/api/polar/webhook/router.ts

export async function routeWebhookEvent(
  eventType: string,
  data: unknown
): Promise<void> {
  switch (eventType) {
    // ... existing cases ...
    case "refund.succeeded":
      await handleRefundSucceeded(data);
      break;
  }
}
```

---

## Creating a New Webhook Endpoint

For a completely new external service (e.g., a CRM or analytics provider):

### Step 1: Create the Route

```typescript
// app/api/webhooks/my-service/route.ts

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { Logger } from "@/lib/logger";
import crypto from "crypto";

const logger = Logger.create("MyServiceWebhook");

/**
 * Verify the webhook signature from MyService
 */
function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Timing-safe comparison
  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("x-webhook-signature");

    // Step 1: Verify signature
    if (!signature) {
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.MY_SERVICE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("Webhook secret not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (!verifySignature(body, signature, webhookSecret)) {
      logger.warn("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Step 2: Parse event
    const event = JSON.parse(body);
    logger.info("Webhook received", {
      eventType: event.type,
      eventId: event.id,
    });

    // Step 3: Route to handler
    switch (event.type) {
      case "contact.created":
        await handleContactCreated(event.data);
        break;
      case "contact.updated":
        await handleContactUpdated(event.data);
        break;
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Step 4: Return 200 quickly
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Webhook processing failed", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 }
    );
  }
}

async function handleContactCreated(data: unknown) {
  // Delegate to a service
  logger.info("Processing contact.created event");
  // await myService.syncContact(data);
}

async function handleContactUpdated(data: unknown) {
  logger.info("Processing contact.updated event");
  // await myService.updateContact(data);
}
```

### Step 2: Configure the Webhook URL

In your external service's dashboard, set the webhook URL to:

- **Production**: `https://your-domain.com/api/webhooks/my-service`
- **Development**: Use a tunneling tool like `ngrok` or Vercel's preview URL

### Step 3: Add Environment Variables

```bash
# .env.local
MY_SERVICE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

Add the same variable to your Vercel project settings for production.

---

## Webhook Security Checklist

- [ ] Always verify the webhook signature before processing
- [ ] Use timing-safe comparison (`crypto.timingSafeEqual`) to prevent timing attacks
- [ ] Read the raw body as text (not JSON) before signature verification
- [ ] Return `200` quickly -- do heavy processing asynchronously if possible
- [ ] Log the event ID and type for debugging and audit trails
- [ ] Handle duplicate events gracefully (idempotency)
- [ ] Never expose webhook secrets in client-side code or logs

---

## The WebhookSubscriptionService

The template provides `WebhookSubscriptionService` in `lib/services/webhook-subscription.service.ts` as a shared handler for subscription lifecycle events across all payment providers. It handles:

- Creating and updating subscription records in the database
- Tracking payment success and failure
- Managing trial endings

All three payment provider webhooks delegate to this service, ensuring consistent behavior regardless of which provider is active.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Parsing JSON before signature verification | Always verify the signature against the raw string body, then parse JSON |
| Webhook endpoint returning errors causes retries | Return `200` even for unhandled event types to prevent infinite retries |
| Testing webhooks locally | Use `ngrok` to expose your local server, or use the provider's webhook testing tools |
| Not handling duplicate events | Providers may retry webhooks. Store processed event IDs or make handlers idempotent |
| Webhook secret not set in production | Add the secret to Vercel environment variables; the endpoint will reject all requests without it |
| Long-running webhook handlers timing out | Move heavy processing to a background job and return `200` immediately |

---

## Related Pages

- [How to Add a Payment Provider](/template/guides/how-to-add-a-payment-provider) -- configuring Stripe, LemonSqueezy, or Polar
- [How to Add a Service](/template/guides/how-to-add-a-service) -- building services that webhook handlers delegate to
- [Error Handling](/template/guides/error-handling) -- consistent error response patterns
- [How to Add Notifications](/template/guides/how-to-add-notifications) -- sending notifications from webhook events
