---
id: webhook-subscription-service
title: "Webhook Subscription Service Deep Dive"
sidebar_label: "Webhook Subscription Service"
sidebar_position: 49
---

# Webhook Subscription Service

## Overview

The Webhook Subscription Service processes inbound payment provider webhook events related to subscriptions. It handles the complete set of subscription lifecycle events -- creation, updates, cancellations, payment successes, payment failures, and trial endings -- translating provider-specific data formats into the application's internal subscription model. The service supports multiple payment providers (Stripe, LemonSqueezy, SolidGate) through a configurable provider abstraction and status mapping system.

## Architecture

The Webhook Subscription Service is the entry point for all subscription-related webhook events from payment providers. It receives raw event data, transforms it using the `formatData` utility, and orchestrates database operations through the shared query layer. Each webhook handler follows a consistent pattern: find-or-create the subscription, update its state, log the change, and return a structured result.

```
Payment Provider (Stripe/LemonSqueezy/SolidGate)
        |
   Webhook API Route (/api/webhooks/stripe)
        |
   webhook-subscription.service.ts  (event handlers)
        |
   +----------------+------------------+
   | lib/db/queries  | formatData()    |
   | (DB operations) | (data transform)|
   +----------------+------------------+
        |
   Database (subscriptions, subscription_history)
```

## API Reference

### Types

#### `WebhookSubscriptionData`

Normalized subscription data format used internally after transforming raw webhook payloads.

```typescript
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  subscription?: string;       // Parent subscription ID (for invoice events)
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

#### `WebhookProcessingResult`

Standard result type for all webhook handlers.

```typescript
interface WebhookProcessingResult {
  success: boolean;
  message: string;
  subscriptionId?: string;
  customer?: { customer_email?: string; customer_name?: string };
  error?: string;
  data?: any;
}
```

### Utility Functions

#### `formatData(data: any, paymentProvider?: PaymentProvider): WebhookSubscriptionData`

Standalone utility function that transforms raw Stripe webhook payloads into the normalized `WebhookSubscriptionData` format. Extracts nested fields from Stripe's data structure (e.g., `items.data[0].price.unit_amount`).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `any` | Raw webhook event data from the payment provider |
| `paymentProvider` | `PaymentProvider` | Provider identifier (default: `STRIPE`) |

### Class: WebhookSubscriptionService

#### `constructor(paymentProvider?: PaymentProvider)`

Creates a new instance for a specific payment provider. Defaults to `PaymentProvider.STRIPE`.

### Event Handlers

#### `handleSubscriptionCreated(data: any): Promise<WebhookProcessingResult>`

Processes subscription creation webhooks. Checks for existing subscriptions (idempotency), resolves the user from customer data, creates a new subscription record, and logs the event.

**Behavior:**
1. Formats raw data using `formatData`
2. Checks for existing subscription (prevents duplicates)
3. Resolves user via `findUserByCustomerData`
4. Creates subscription with `PENDING` status mapped from provider status
5. Logs to subscription history
6. Returns created subscription

---

#### `handleSubscriptionUpdated(data: any): Promise<WebhookProcessingResult>`

Processes subscription update webhooks. If the subscription does not exist, it falls back to creating one. Tracks field-level changes between the old and new state.

**Updated fields:** status, planId, endDate, amount, priceId, currency, interval, intervalCount, trialStart, trialEnd, cancelAtPeriodEnd, metadata.

---

#### `handleSubscriptionCancelled(data: any): Promise<WebhookProcessingResult>`

Processes cancellation webhooks. Sets status to `CANCELLED`, records the cancellation timestamp and reason, and logs the event.

---

#### `handleSubscriptionPaymentSucceeded(data: any): Promise<WebhookProcessingResult>`

Processes successful payment webhooks (typically invoice.paid events). Activates the subscription, extends the billing period, and stores invoice data (PDF URL, hosted invoice URL). Returns customer email and name for potential follow-up actions.

**Key fields updated:** status (ACTIVE), endDate, amountDue, amountPaid, periodEnd, periodStart, invoicePdf, hostedInvoiceUrl, invoiceId.

---

#### `handleSubscriptionPaymentFailed(data: any): Promise<WebhookProcessingResult>`

Processes failed payment webhooks. Keeps the subscription active for retry attempts but transitions to `PAUSED` for final failures or `past_due` status.

**Status logic:**
- Default: Keep `ACTIVE` (for initial retry attempts)
- If `metadata.final_failure` or `status === 'past_due'`: Set to `PAUSED`

---

#### `handlePaymentSucceeded(data: any): Promise<WebhookProcessingResult>`

Handles generic (non-subscription) payment success events. Currently logs and returns the formatted data for future extension.

---

#### `handlePaymentFailed(data: any): Promise<WebhookProcessingResult>`

Handles generic (non-subscription) payment failure events. Currently logs and returns the formatted data.

---

#### `handleSubscriptionTrialEnding(data: WebhookSubscriptionData): Promise<WebhookProcessingResult>`

Processes trial-ending webhooks. Logs the event with the trial end date for notification purposes.

---

#### `processWebhookEvent(eventType: WebhookEventType, data: WebhookSubscriptionData): Promise<WebhookProcessingResult>`

Main entry point that routes webhook events to the appropriate handler based on event type. Validates data before processing.

**Supported event types:**
- `SUBSCRIPTION_CREATED`
- `SUBSCRIPTION_UPDATED`
- `SUBSCRIPTION_CANCELLED`
- `SUBSCRIPTION_PAYMENT_SUCCEEDED`
- `SUBSCRIPTION_PAYMENT_FAILED`
- `SUBSCRIPTION_TRIAL_ENDING`

### Private Methods

#### `findUserByCustomerData(response: any): Promise<string | null>`

Resolves a user ID from webhook data using a priority chain:
1. Direct `userId` field
2. `metadata.userId`
3. `customer_email` lookup

---

#### `mapProviderStatusToInternal(providerStatus: string): SubscriptionStatusValues`

Maps payment provider-specific statuses to internal status enum values.

| Provider Status | Internal Status |
|----------------|-----------------|
| `active`, `trialing`, `on_trial` | `ACTIVE` |
| `canceled`, `cancelled` | `CANCELLED` |
| `incomplete`, `pending` | `PENDING` |
| `incomplete_expired`, `expired` | `EXPIRED` |
| `past_due`, `unpaid`, `paused`, `failed` | `PAUSED` |

---

#### `getChangedFields(oldData: Subscription, newData: any): Record<string, { old: any; new: any }>`

Computes a diff of changed fields between the existing subscription and the update data. Checks: `status`, `planId`, `amount`, `currency`, `interval`, `endDate`.

---

#### `validateWebhookData(data: any): boolean`

Validates that required fields are present: `subscriptionId`, `customerId`, `paymentProvider`, `status`, `currentPeriodStart`. Also validates the payment provider value and date format.

---

#### `sanitizeMetadata(metadata: any): Record<string, any>`

Sanitizes metadata by stripping non-primitive values. Only allows strings, numbers, booleans, and arrays of primitives.

## Implementation Details

- **Idempotency:** `handleSubscriptionCreated` checks for existing subscriptions before creating new ones, preventing duplicate records from webhook retries.
- **Graceful fallback:** `handleSubscriptionUpdated` falls back to `handleSubscriptionCreated` if the subscription is not found, handling out-of-order webhook delivery.
- **Multi-provider support:** The service accepts a `PaymentProvider` at construction time and uses provider-specific status mapping, making it reusable across Stripe, LemonSqueezy, and SolidGate.
- **Amount conversion:** Amounts from webhooks (typically in cents) are converted to decimal using `convertCentsToDecimal` before storage.
- **Timestamp conversion:** Unix timestamps from payment providers are converted to Date objects using `convertNumberToDate`.
- **Change tracking:** The `getChangedFields` method provides a diff of what changed between subscription states, stored in the history log for audit purposes.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Find by provider ID | `queries.getSubscriptionByProviderSubscriptionId()` | `subscriptions` |
| Create subscription | `queries.createSubscription()` | `subscriptions` |
| Update subscription | `queries.updateSubscription()` | `subscriptions` |
| Log change | `queries.logSubscriptionChange()` | `subscription_history` |
| Find user by ID | `queries.getUserById()` | `users` |
| Find user by email | `queries.getUserByEmail()` | `users` |

## Error Handling

- All handlers return structured `WebhookProcessingResult` objects with `success: boolean` and `error?: string`.
- Errors are caught at the handler level, logged to console with descriptive prefixes, and returned as failure results.
- User lookup failures in `findUserByCustomerData` are logged as warnings and return `null` rather than throwing.
- Validation failures in `validateWebhookData` log specific missing fields.
- The service never throws uncaught exceptions -- all errors are captured and returned.

## Usage Examples

```typescript
import { WebhookSubscriptionService, formatData } from '@/lib/services/webhook-subscription.service';
import { PaymentProvider } from '@/lib/constants';
import { WebhookEventType } from '@/lib/payment/types/payment-types';

// Create service for Stripe webhooks
const webhookService = new WebhookSubscriptionService(PaymentProvider.STRIPE);

// Process a webhook event via the router
const result = await webhookService.processWebhookEvent(
  WebhookEventType.SUBSCRIPTION_CREATED,
  webhookData
);

// Or call handlers directly
const createResult = await webhookService.handleSubscriptionCreated(stripeEventData);
const paymentResult = await webhookService.handleSubscriptionPaymentSucceeded(invoiceData);

if (paymentResult.success && paymentResult.customer) {
  // Send confirmation email to customer
  await sendEmail(paymentResult.customer.customer_email);
}

// Use the standalone format utility
const normalized = formatData(rawStripeData, PaymentProvider.STRIPE);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection for subscription storage |
| `STRIPE_SECRET_KEY` | Yes | Required for Stripe webhook signature verification (at the route level) |

The payment provider is configured per-instance via the constructor parameter.

## Related Services

- [Subscription Service](./subscription-service-deep-dive.md) -- Core subscription management (non-webhook operations)
- [Stripe Products Service](./stripe-products-service.md) -- Product and pricing data from Stripe
- [Notification Service](./notification-service-deep-dive.md) -- In-app notifications for payment events
- [Webhook Service](./webhook-service.md) -- General webhook handling and routing
