---
id: stripe-webhook-deep-dive
title: Stripe Webhook Deep Dive
sidebar_label: Stripe Webhooks
sidebar_position: 4
---

# Stripe Webhook Deep Dive

This page covers webhook event handling, signature verification, supported event types, email notifications, and error handling patterns.

## Overview

The Stripe webhook endpoint processes incoming events from Stripe, verifies their authenticity via signature verification, maps them to internal event types, and dispatches them to specialized handlers. Each handler updates the database via `WebhookSubscriptionService` and sends transactional emails.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/stripe/webhook` | Stripe signature | Process incoming Stripe webhook events |

## Signature Verification

Every incoming webhook must include a `stripe-signature` header. The provider verifies it using Stripe's `constructEvent` method:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

If the signature is missing, the endpoint returns `400`:

```json
{ "error": "No signature provided" }
```

If the signature is invalid, the `constructEvent` call throws and the endpoint returns:

```json
{ "error": "Webhook processing failed" }
```

## Event Type Mapping

Stripe event types are mapped to internal `WebhookEventType` values:

| Stripe Event | Internal Type | Handler |
|-------------|---------------|---------|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | `handleSubscriptionCreated` |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | `handleSubscriptionUpdated` |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | `handleSubscriptionCancelled` |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | `handleSubscriptionPaymentSucceeded` |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | `handleSubscriptionPaymentFailed` |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | `handlePaymentSucceeded` |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | `handlePaymentFailed` |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | `handleSubscriptionTrialEnding` |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Logged only |

## Webhook Processing Flow

```
Stripe sends POST -> Read raw body -> Extract stripe-signature header
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (signature verification)
    -> Map event type to internal type
    -> Return { received: true, type, id, data }
  -> Switch on webhookResult.type
    -> Call appropriate handler
    -> Handler updates DB + sends email
  -> Return { received: true }
```

## Event Handlers

### Subscription Created

Handles new subscription creation:

1. Checks if the subscription is a sponsor ad (special handling)
2. Calls `webhookSubscriptionService.handleSubscriptionCreated(data)` to update the database
3. Extracts plan information (name, amount, billing period)
4. Sends a welcome email with subscription details and features

### Subscription Updated

Handles subscription changes (plan upgrades, downgrades, etc.):

1. Updates the database via `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Extracts updated plan information
3. Sends an update notification email

### Subscription Cancelled

Handles subscription cancellations:

1. Checks for sponsor ad subscriptions
2. Updates the database via `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Sends a cancellation email with the cancellation reason and reactivation URL

### Payment Succeeded (One-time)

Handles successful one-time payments:

1. Extracts customer info and payment details
2. Formats the amount and payment method
3. Sends a payment confirmation email with receipt URL

### Payment Failed

Handles failed one-time payments:

1. Extracts error information from `last_payment_error`
2. Constructs retry and payment method update URLs
3. Sends a payment failure notification email

### Subscription Payment Succeeded

Handles successful recurring subscription payments:

1. Updates the database via `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Extracts invoice and subscription details
3. Sends a subscription payment receipt email

### Subscription Payment Failed

Handles failed recurring subscription payments:

1. Updates the database via `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Sends a failure notification with retry and payment update URLs

### Trial Ending

Handles 3-day trial ending notifications from Stripe:

1. Updates the database via `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Sends a trial ending reminder email

## Email Notifications

Each handler uses the `paymentEmailService` to send transactional emails. Email configuration is loaded securely via `getEmailConfig()`:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

| Event | Email Template |
|-------|---------------|
| Subscription created | `sendNewSubscriptionEmail` |
| Subscription updated | `sendUpdatedSubscriptionEmail` |
| Subscription cancelled | `sendCancelledSubscriptionEmail` |
| Payment succeeded | `sendPaymentSuccessEmail` |
| Payment failed | `sendPaymentFailedEmail` |
| Subscription payment success | `sendSubscriptionPaymentSuccessEmail` |
| Subscription payment failed | `sendSubscriptionPaymentFailedEmail` |
| Trial ending | `sendUpdatedSubscriptionEmail` |

## Sponsor Ad Handling

The webhook includes special handling for sponsor ad subscriptions. These are identified by checking metadata:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Sponsor ad events trigger:
- **Activation**: Confirms payment and sets the ad to pending admin review
- **Cancellation**: Deactivates the sponsor ad
- **Renewal**: Extends the sponsor ad end date

## Plan Features

The `getSubscriptionFeatures` function maps plan names to feature lists used in welcome emails:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Error Handling

The webhook endpoint follows a resilient pattern:

- Each individual handler is wrapped in its own try/catch block
- Handler failures are logged but do not cause the webhook to return an error
- The outer try/catch catches signature verification and parsing errors
- Returns `400` for all webhook-level failures to tell Stripe not to retry on permanent errors

```typescript
try {
  // ... signature verification and event dispatch
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (from Stripe Dashboard) |

To configure the webhook in Stripe Dashboard:

1. Navigate to Developers > Webhooks
2. Add endpoint URL: `https://yourdomain.com/api/stripe/webhook`
3. Select the events listed in the event mapping table above
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

## Security Considerations

- Signature verification is mandatory; requests without valid signatures are rejected
- The raw request body is used for signature verification (not parsed JSON)
- Webhook secrets should never be committed to version control
- The endpoint does not require session authentication (Stripe calls it directly)
- Sensitive data in error messages is sanitized for production environments

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Payment Methods Deep Dive](./stripe-payment-methods-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
