---
id: webhook-service
title: "Webhook Subscription Service"
sidebar_label: "Webhook Subscriptions"
sidebar_position: 30
---

# Webhook Subscription Service

The `WebhookSubscriptionService` processes payment provider webhook events related to subscription lifecycle management. It handles creation, updates, cancellations, payment successes, payment failures, and trial endings for SaaS subscriptions.

**Source:** `lib/services/webhook-subscription.service.ts`

## Overview

This service acts as the bridge between external payment providers (Stripe, LemonSqueezy, SolidGate) and the internal subscription database. Every webhook event is:

1. **Formatted** into a normalized `WebhookSubscriptionData` structure
2. **Processed** by the appropriate handler method
3. **Persisted** to the database with full change history
4. **Logged** via subscription change tracking for audit purposes

## Initialization

The service accepts a `PaymentProvider` parameter to identify which provider sent the webhook:

```ts
import { WebhookSubscriptionService } from '@/lib/services/webhook-subscription.service';
import { PaymentProvider } from '@/lib/constants';

// Create for Stripe webhooks
const stripeWebhookService = new WebhookSubscriptionService(PaymentProvider.STRIPE);

// Create for LemonSqueezy webhooks
const lsWebhookService = new WebhookSubscriptionService(PaymentProvider.LEMONSQUEEZY);
```

If no provider is specified, it defaults to `PaymentProvider.STRIPE`.

## Data Normalization

The `formatData` function normalizes raw webhook payloads into a unified `WebhookSubscriptionData` structure:

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  subscription?: string;
  invoiceId?: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  amountDue?: number;
  amountPaid?: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  paymentProvider?: string;
  customer_email?: string;
  customer_name?: string;
  periodEnd?: number;
  periodStart?: number;
  hostedInvoiceUrl?: string;
  invoicePdf?: string;
}
```

This is exported as a standalone utility so it can be used outside the class when needed:

```ts
import { formatData } from '@/lib/services/webhook-subscription.service';
import { PaymentProvider } from '@/lib/constants';

const normalized = formatData(rawStripeData, PaymentProvider.STRIPE);
```

## Webhook Event Handlers

### Subscription Created

Handles `SUBSCRIPTION_CREATED` events. Creates a new subscription record:

```ts
const result = await service.handleSubscriptionCreated(webhookData);
```

The handler:
1. Checks if the subscription already exists (by provider subscription ID) -- returns early if so
2. Resolves the user via metadata `userId`, customer email, or customer ID
3. Creates a `NewSubscription` record with mapped status, pricing, and trial dates
4. Logs the creation event in subscription history

### Subscription Updated

Handles `SUBSCRIPTION_UPDATED` events. Updates an existing subscription:

```ts
const result = await service.handleSubscriptionUpdated(webhookData);
```

The handler:
1. Looks up the existing subscription by provider subscription ID
2. If not found, falls back to `handleSubscriptionCreated`
3. Computes a change diff between old and new field values
4. Updates the subscription record
5. Logs the update with previous and new status/plan

### Subscription Cancelled

Handles `SUBSCRIPTION_CANCELLED` events:

```ts
const result = await service.handleSubscriptionCancelled(webhookData);
```

Sets the subscription status to `CANCELLED`, records the cancellation time, and logs a cancellation reason (from metadata or default).

### Payment Succeeded

Handles `SUBSCRIPTION_PAYMENT_SUCCEEDED` events:

```ts
const result = await service.handleSubscriptionPaymentSucceeded(webhookData);
```

Updates the subscription to `ACTIVE` status and extends the billing period. Records invoice details including PDF URL and hosted invoice URL. Returns customer email and name for downstream notification use.

### Payment Failed

Handles `SUBSCRIPTION_PAYMENT_FAILED` events:

```ts
const result = await service.handleSubscriptionPaymentFailed(webhookData);
```

The status mapping depends on context:
- By default, the subscription stays `ACTIVE` (retry attempt)
- If `metadata.final_failure` is set or status is `past_due`, changes to `PAUSED`

### Trial Ending

Handles `SUBSCRIPTION_TRIAL_ENDING` events:

```ts
const result = await service.handleSubscriptionTrialEnding(webhookData);
```

Logs the event without changing the subscription status, providing a hook for sending reminder notifications.

### Generic Payment Events

For non-subscription payments:

```ts
const result = await service.handlePaymentSucceeded(webhookData);
const result = await service.handlePaymentFailed(webhookData);
```

## Unified Event Processing

The `processWebhookEvent` method routes events by type:

```ts
import { WebhookEventType } from '@/lib/payment/types/payment-types';

const result = await service.processWebhookEvent(
  WebhookEventType.SUBSCRIPTION_UPDATED,
  webhookData
);
```

This method validates the webhook data before processing and returns a `WebhookProcessingResult`.

## Processing Result

All handler methods return a `WebhookProcessingResult`:

```ts
interface WebhookProcessingResult {
  success: boolean;
  message: string;
  subscriptionId?: string;
  customer?: {
    customer_email?: string;
    customer_name?: string;
  };
  error?: string;
  data?: any;
}
```

## Status Mapping

The service maps provider-specific statuses to internal `SubscriptionStatus` values:

### Stripe Statuses

| Provider Status        | Internal Status |
|------------------------|-----------------|
| `active`               | `ACTIVE`        |
| `canceled`             | `CANCELLED`     |
| `incomplete`           | `PENDING`       |
| `incomplete_expired`   | `EXPIRED`       |
| `past_due`             | `PAUSED`        |
| `trialing`             | `ACTIVE`        |
| `unpaid`               | `PAUSED`        |

### LemonSqueezy Statuses

| Provider Status | Internal Status |
|-----------------|-----------------|
| `on_trial`      | `ACTIVE`        |
| `cancelled`     | `CANCELLED`     |
| `expired`       | `EXPIRED`       |
| `paused`        | `PAUSED`        |

### SolidGate Statuses

| Provider Status | Internal Status |
|-----------------|-----------------|
| `pending`       | `PENDING`       |
| `failed`        | `PAUSED`        |

Unknown statuses default to `PENDING`.

## User Resolution

The `findUserByCustomerData` method resolves a user through multiple strategies:

1. Direct `userId` from webhook data
2. `userId` from metadata
3. User lookup by `customer_email`

If no user is found, a warning is logged and `null` is returned.

## Data Validation

The `validateWebhookData` method checks for required fields before processing:

Required fields: `subscriptionId`, `customerId`, `paymentProvider`, `status`, `currentPeriodStart`

It also validates:
- `paymentProvider` matches a known `PaymentProvider` enum value
- `currentPeriodStart` is a valid `Date` instance

## Change Tracking

Every webhook handler logs changes via `queries.logSubscriptionChange`, recording:
- Previous and new status
- Previous and new plan
- A human-readable message
- Metadata including the webhook event type and provider subscription ID

The `getChangedFields` method computes field-level diffs for update events, comparing: `status`, `planId`, `amount`, `currency`, `interval`, and `endDate`.

## Currency Handling

Amounts from payment providers (typically in cents) are converted using `convertCentsToDecimal` before storage. Date fields are converted from Unix timestamps using `convertNumberToDate`.
