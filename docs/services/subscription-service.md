---
id: subscription-service
title: Subscription Service
sidebar_label: Subscription Service
sidebar_position: 9
---

# Subscription Service

The template includes a full subscription lifecycle management system that handles plan creation, cancellation, feature gating, expiration processing, auto-renewal, and failed payment tracking. Background jobs automate renewal reminders and expired subscription cleanup.

## Architecture

```
lib/services/
  subscription.service.ts    # Core subscription CRUD and plan logic
  subscription-jobs.ts       # Background jobs for renewals and cleanup
```

The `SubscriptionService` is exported as a singleton instance and delegates all database operations to the `queries` module (Drizzle ORM).

## Subscription Lifecycle

```
PENDING -> ACTIVE -> EXPIRED -> CANCELLED
                  -> CANCELLED (user-initiated)
```

### Creating a Subscription

```typescript
import { subscriptionService } from '@/lib/services/subscription.service';

const subscription = await subscriptionService.createSubscription({
  userId: 'user-123',
  planId: PaymentPlan.STANDARD,
  paymentProvider: PaymentProvider.STRIPE,
  subscriptionId: 'sub_stripe_abc',
  priceId: 'price_xyz',
  customerId: 'cus_456',
  currency: 'usd',
  amount: 999,               // in cents
  interval: 'month',
  intervalCount: 1,
  startDate: new Date(),
  endDate: new Date('2025-01-15'),
});
```

Every creation is logged to the subscription history with the event type `created`.

### Reading Subscriptions

| Method | Description |
|--------|-------------|
| `getSubscriptionById(id)` | Get subscription with user data |
| `getUserActiveSubscription(userId)` | Get user's currently active subscription |
| `getUserSubscriptions(userId)` | Get all subscriptions for a user |
| `getSubscriptionByProviderSubscriptionId(provider, id)` | Look up by payment provider ID |
| `hasActiveSubscription(userId)` | Boolean check for active subscription |
| `getUserPlan(userId)` | Get user's current plan ID string |
| `getSubscriptionHistory(id)` | Get full change history for a subscription |
| `getSubscriptionsExpiringSoon(days)` | Get subscriptions expiring within N days |
| `getSubscriptionStats()` | Aggregate subscription statistics |

### Plan with Expiration Details

The `getUserPlanWithExpiration()` method returns comprehensive plan status including expiration warnings:

```typescript
const planInfo = await subscriptionService.getUserPlanWithExpiration('user-123');
// {
//   planId: 'standard',
//   effectivePlan: 'standard',
//   isExpired: false,
//   expiresAt: Date,
//   daysUntilExpiration: 12,
//   isInWarningPeriod: true,
//   canAccessPlanFeatures: true,
//   warningMessage: 'Your Standard plan expires in 12 days',
//   status: 'active'
// }
```

## Plan Features and Limits

### Feature Gating

```typescript
const canAccess = await subscriptionService.canAccessFeature('user-123', 'priority_support');
```

Features are defined per plan tier:

| Plan | Features |
|------|----------|
| Free | `basic_access` |
| Standard | `basic_access`, `advanced_features`, `pro_features`, `priority_support` |
| Premium | All Standard features + `premium_features`, `enterprise_features` |

### Plan Limits

```typescript
const limits = subscriptionService.getPlanLimits('standard');
// { projects: 5, storage: 1000, users: 5, apiCalls: 10000 }
```

| Resource | Free | Standard | Premium |
|----------|------|----------|---------|
| Projects | 1 | 5 | 100 |
| Storage (MB) | 100 | 1,000 | 50,000 |
| Users | 1 | 5 | 100 |
| API Calls | 1,000 | 10,000 | 500,000 |

## Cancellation

```typescript
const cancelled = await subscriptionService.cancelSubscription(
  'subscription-id',
  'User requested cancellation',  // reason (optional)
  true                             // cancelAtPeriodEnd
);
```

When `cancelAtPeriodEnd` is `true`, the subscription remains active until the current billing period ends. When `false`, cancellation takes effect immediately.

## Auto-Renewal

### Enable/Disable

```typescript
await subscriptionService.setAutoRenewal('subscription-id', true);
await subscriptionService.setAutoRenewal('subscription-id', false);
```

Both operations are logged to subscription history with the event types `auto_renewal_enabled` or `auto_renewal_disabled`.

### Successful Renewal

After a payment provider confirms renewal, call:

```typescript
await subscriptionService.handleSuccessfulRenewal('subscription-id');
```

This atomically resets the renewal reminder flag and failed payment counter, then logs a `renewal_succeeded` event.

### Failed Payment

```typescript
const failedCount = await subscriptionService.handleFailedPayment('subscription-id');
// Returns the current failed payment count (e.g., 2)
```

Each failure increments the counter and logs a `payment_failed` event with the attempt number.

## Expiration Processing

```typescript
const result = await subscriptionService.processExpiredSubscriptions();
// {
//   processed: 3,
//   subscriptions: [/* updated subscription records */],
//   errors: []
// }
```

This method atomically updates all expired subscriptions (past their `endDate`) from `ACTIVE` to `EXPIRED` status, preventing race conditions between query and update. Each update is logged as a `subscription_expired` event.

## Background Jobs

Two background jobs automate subscription maintenance. Both return a consistent `JobResult`:

```typescript
interface JobResult {
  success: boolean;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
  duration: string;  // e.g., "1250ms"
}
```

### Renewal Reminder Job

```typescript
import { subscriptionRenewalReminderJob } from '@/lib/services/subscription-jobs';

const result = await subscriptionRenewalReminderJob();
```

This job:

1. Queries subscriptions expiring within 7 days that have not yet received a reminder
2. For each subscription, fetches the associated user's email
3. Sends a renewal reminder email using the `subscription-renewal-reminder` template
4. Marks the reminder as sent to prevent duplicate emails

The job requires a configured email service (Resend or Novu). If email is unavailable, it fails gracefully with an appropriate error message.

### Expired Cleanup Job

```typescript
import { subscriptionExpiredCleanupJob } from '@/lib/services/subscription-jobs';

const result = await subscriptionExpiredCleanupJob();
```

This job:

1. Queries subscriptions where auto-renewal is disabled and the end date has passed
2. Cancels each subscription with the reason "Subscription expired with auto-renewal disabled"
3. Reports success/failure counts

Both jobs are designed to be run daily, either via cron or the `BackgroundJobManager`.

## Subscription History

All state changes are logged to a dedicated history table via `logSubscriptionChange()`:

| Field | Description |
|-------|-------------|
| `subscriptionId` | Associated subscription |
| `changeType` | Event type (e.g., `created`, `payment_failed`, `renewal_succeeded`) |
| `previousStatus` | Status before the change |
| `newStatus` | Status after the change |
| `previousPlan` | Plan before the change |
| `newPlan` | Plan after the change |
| `reason` | Human-readable description |
| `metadata` | JSON object with additional context |

## Source Files

| File | Path |
|------|------|
| Subscription Service | `template/lib/services/subscription.service.ts` |
| Subscription Jobs | `template/lib/services/subscription-jobs.ts` |
| Plan Expiration Utilities | `template/lib/utils/plan-expiration.utils.ts` |
