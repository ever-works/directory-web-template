---
id: subscription-service-deep-dive
title: "Subscription Service Deep Dive"
sidebar_label: "Subscription Service"
sidebar_position: 48
---

# Subscription Service

## Overview

The Subscription Service is the central business logic layer for managing user subscriptions throughout their full lifecycle: creation, plan management, cancellation, expiration processing, auto-renewal, and feature gating. It wraps the database query layer with business rules, logging, and plan-specific logic. The service is implemented as an instance-based class with a pre-exported singleton (`subscriptionService`) for convenient usage.

## Architecture

The Subscription Service sits between the API/webhook handlers and the database query layer. It orchestrates subscription state transitions, logs all changes to a history table, and provides plan-based feature access control. It works alongside the Webhook Subscription Service (which handles inbound payment provider events) and the Stripe Products Service (which provides pricing data).

```
API Routes / Webhooks / Cron Jobs
        |
   subscription.service.ts  (business logic)
        |
   lib/db/queries (database operations)
        |
   Database (subscriptions, subscription_history tables)
```

## API Reference

### Types

#### `CreateSubscriptionData`

```typescript
interface CreateSubscriptionData {
  userId: string;
  planId: PaymentPlan;
  paymentProvider: PaymentProvider;
  subscriptionId: string;
  priceId?: string;
  customerId?: string;
  currency?: string;      // Default: 'usd'
  amount?: number;
  interval?: string;      // Default: 'month'
  intervalCount?: number;  // Default: 1
  startDate: Date;
  endDate?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: any;
}
```

#### `UpdateSubscriptionData`

```typescript
interface UpdateSubscriptionData {
  planId?: string;
  status?: string;
  endDate?: Date;
  amount?: number;
  interval?: string;
  intervalCount?: number;
  priceId?: string;
  metadata?: any;
}
```

### Subscription CRUD

#### `createSubscription(data: CreateSubscriptionData): Promise<Subscription>`

Creates a new subscription with `PENDING` status and logs the creation event.

---

#### `getSubscriptionById(subscriptionId: string): Promise<Subscription | null>`

Retrieves a subscription with its associated user data.

---

#### `getUserActiveSubscription(userId: string): Promise<Subscription | null>`

Returns the user's currently active subscription, or `null` if none exists.

---

#### `getUserSubscriptions(userId: string): Promise<Subscription[]>`

Returns all subscriptions for a user (active, cancelled, expired, etc.).

---

#### `getSubscriptionByProviderSubscriptionId(paymentProvider: string, subscriptionId: string): Promise<Subscription | null>`

Finds a subscription by the external payment provider's subscription ID.

---

#### `updateSubscription(subscriptionId: string, data: UpdateSubscriptionData): Promise<Subscription | null>`

Updates subscription fields. Metadata is JSON-serialized before storage.

---

#### `cancelSubscription(subscriptionId: string, reason?: string, cancelAtPeriodEnd?: boolean): Promise<Subscription | null>`

Cancels a subscription, optionally deferring cancellation to the end of the billing period.

### Plan and Feature Access

#### `hasActiveSubscription(userId: string): Promise<boolean>`

Returns `true` if the user has any active subscription.

---

#### `getUserPlan(userId: string): Promise<string>`

Returns the user's current plan ID (e.g., `'free'`, `'standard'`, `'premium'`).

---

#### `getUserPlanWithExpiration(userId: string): Promise<object>`

Returns comprehensive plan details including expiration state, warning period, and formatted warning messages.

**Returns:**
```typescript
{
  planId: string;
  effectivePlan: string;       // Actual plan after considering expiration
  isExpired: boolean;
  expiresAt: Date | null;
  daysUntilExpiration: number | null;
  isInWarningPeriod: boolean;
  canAccessPlanFeatures: boolean;
  warningMessage: string | null;
  status: string | null;
}
```

---

#### `canAccessFeature(userId: string, feature: string): Promise<boolean>`

Checks if the user's current plan includes a specific feature.

**Feature hierarchy:**
| Plan | Features |
|------|----------|
| Free | `basic_access` |
| Standard | `basic_access`, `advanced_features`, `pro_features`, `priority_support` |
| Premium | All Standard features + `premium_features`, `enterprise_features` |

---

#### `getPlanDisplayName(planId: string): string`

Returns a human-readable plan name from the `PAYMENT_PLAN_NAMES` constant map.

---

#### `getPlanLimits(planId: string): Record<string, number>`

Returns numerical limits for a plan.

| Limit | Free | Standard | Premium |
|-------|------|----------|---------|
| Projects | 1 | 5 | 100 |
| Storage (MB) | 100 | 1,000 | 50,000 |
| Users | 1 | 5 | 100 |
| API Calls | 1,000 | 10,000 | 500,000 |

### Expiration Processing

#### `processExpiredSubscriptions(): Promise<{ processed: number; subscriptions: Subscription[]; errors: string[] }>`

Batch-processes expired subscriptions. Uses an atomic query-and-update approach to prevent race conditions. Logs expiration events for each affected subscription.

---

#### `getSubscriptionsExpiringSoon(days?: number): Promise<Subscription[]>`

Returns subscriptions expiring within the specified number of days (default: 7).

### Auto-Renewal Management

#### `setAutoRenewal(subscriptionId: string, enabled: boolean): Promise<Subscription | null>`

Enables or disables auto-renewal for a subscription. Logs the change.

---

#### `getSubscriptionsDueForRenewalReminder(days?: number): Promise<Subscription[]>`

Returns subscriptions that need a renewal reminder (expiring within `days` and not yet reminded).

---

#### `markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>`

Marks that a renewal reminder has been sent for a subscription.

---

#### `handleSuccessfulRenewal(subscriptionId: string): Promise<void>`

Resets renewal state (reminder sent flag, failed payment counter) after a successful payment. Uses an atomic reset to ensure data consistency.

---

#### `handleFailedPayment(subscriptionId: string): Promise<number>`

Increments the failed payment counter and logs the event. Returns the current failed payment count.

### History and Statistics

#### `getSubscriptionHistory(subscriptionId: string)`

Returns the full change history for a subscription.

---

#### `getSubscriptionStats()`

Returns aggregate subscription statistics (counts by status, plan, etc.).

## Implementation Details

- **Singleton pattern:** The module exports a singleton instance `subscriptionService` for convenience, but the class can also be instantiated directly for testing.
- **Comprehensive logging:** Every state transition is logged via `queries.logSubscriptionChange` with the previous and new status, plan changes, and contextual metadata.
- **Atomic expiration processing:** `processExpiredSubscriptions` uses `updateExpiredSubscriptionsStatus()` which atomically finds and updates expired subscriptions, preventing race conditions between separate query and update operations.
- **Plan expiration utilities:** The service integrates with `plan-expiration.utils` for computing days until expiration, warning period detection, and formatted messages.
- **Feature-based access control:** The `canAccessFeature` method implements a simple but extensible feature gate using plan-to-feature mappings defined in the service.
- **Metadata serialization:** All metadata fields are JSON-serialized before database storage.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Create subscription | `queries.createSubscription()` | `subscriptions` |
| Get by ID | `queries.getSubscriptionWithUser()` | `subscriptions` + user join |
| Get active for user | `queries.getUserActiveSubscription()` | `subscriptions` |
| Get all for user | `queries.getUserSubscriptions()` | `subscriptions` |
| Get by provider ID | `queries.getSubscriptionByProviderSubscriptionId()` | `subscriptions` |
| Update | `queries.updateSubscription()` | `subscriptions` |
| Cancel | `queries.cancelSubscription()` | `subscriptions` |
| Get user plan | `queries.getUserPlan()` | `subscriptions` |
| Expire batch | `queries.updateExpiredSubscriptionsStatus()` | `subscriptions` |
| Log change | `queries.logSubscriptionChange()` | `subscription_history` |
| Set auto-renewal | `queries.setAutoRenewal()` | `subscriptions` |
| Atomic reset | `queries.resetRenewalStateAtomic()` | `subscriptions` |
| Increment failures | `queries.incrementFailedPaymentCount()` | `subscriptions` |
| Get expiring soon | `queries.getSubscriptionsExpiringSoon()` | `subscriptions` |
| Get stats | `queries.getSubscriptionStats()` | `subscriptions` |

## Error Handling

- `processExpiredSubscriptions` collects errors per subscription in an `errors` array rather than failing the entire batch. Individual subscription logging failures do not prevent other subscriptions from being processed.
- `handleSuccessfulRenewal` and `handleFailedPayment` throw errors when the subscription is not found, as these represent programming errors in the caller.
- Most other methods return `null` for not-found scenarios without throwing.

## Usage Examples

```typescript
import { subscriptionService } from '@/lib/services/subscription.service';

// Create a subscription
const subscription = await subscriptionService.createSubscription({
  userId: 'user-123',
  planId: PaymentPlan.STANDARD,
  paymentProvider: PaymentProvider.STRIPE,
  subscriptionId: 'sub_abc123',
  startDate: new Date(),
  currency: 'usd',
  amount: 29.99,
});

// Check feature access
const canUseAdvanced = await subscriptionService.canAccessFeature(userId, 'advanced_features');

// Get plan with expiration details
const planInfo = await subscriptionService.getUserPlanWithExpiration(userId);
if (planInfo.isInWarningPeriod) {
  console.log(planInfo.warningMessage);
  // "Your Standard plan expires in 5 days"
}

// Process expired subscriptions (e.g., in a cron job)
const { processed, errors } = await subscriptionService.processExpiredSubscriptions();
console.log(`Processed ${processed} expired subscriptions`);

// Handle renewal
await subscriptionService.setAutoRenewal(subscriptionId, true);
await subscriptionService.handleSuccessfulRenewal(subscriptionId);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection (subscriptions table must exist) |

Plan definitions (`PaymentPlan`, `PAYMENT_PLAN_NAMES`) are imported from `lib/constants`.

## Related Services

- [Webhook Subscription Service](./webhook-subscription-service.md) -- Handles inbound payment provider webhooks
- [Stripe Products Service](./stripe-products-service.md) -- Provides pricing and product data
- [Notification Service](./notification-service-deep-dive.md) -- Payment failure notifications
- [Currency Service](./currency-service.md) -- Multi-currency support for subscriptions
