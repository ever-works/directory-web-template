---
id: sponsor-ad-service
title: "Sponsor Ad Service"
sidebar_label: "Sponsor Ads"
sidebar_position: 31
---

# Sponsor Ad Service

The `SponsorAdService` manages the full lifecycle of sponsor advertisements -- from submission and payment through admin review, activation, expiration, and renewal.

**Source:** `lib/services/sponsor-ad.service.ts`

## Overview

Sponsor ads allow users to promote items on the platform by purchasing placement slots. The service enforces a multi-step workflow:

```
PENDING_PAYMENT --> (payment confirmed) --> PENDING --> (admin approved) --> ACTIVE
                                                    --> (admin rejected) --> REJECTED
ACTIVE --> (time elapsed) --> EXPIRED
ACTIVE --> (user/admin cancel) --> CANCELLED
EXPIRED/ACTIVE --> (renewed) --> ACTIVE
```

## Initialization

The service is exported as a singleton:

```ts
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';
```

Or create a new instance:

```ts
import { SponsorAdService } from '@/lib/services/sponsor-ad.service';
const service = new SponsorAdService();
```

## Status Lifecycle

| Status            | Display Name           | Description                              |
|-------------------|------------------------|------------------------------------------|
| `PENDING_PAYMENT` | Waiting for Payment    | Submitted, awaiting payment              |
| `PENDING`         | Pending Review         | Payment received, awaiting admin review  |
| `REJECTED`        | Rejected               | Admin rejected the submission            |
| `ACTIVE`          | Active                 | Live and displayed on the site           |
| `EXPIRED`         | Expired                | Duration elapsed, no longer displayed    |
| `CANCELLED`       | Cancelled              | Manually cancelled by user or admin      |

## Pricing Intervals

| Interval  | Configuration Source        |
|-----------|-----------------------------|
| `weekly`  | `getSponsorAdWeeklyPrice()` |
| `monthly` | `getSponsorAdMonthlyPrice()`|

Prices are read from application settings at runtime, with built-in defaults. Currency is also configurable via `getSponsorAdCurrency()`.

## Read Operations

### Get Sponsor Ad by ID

```ts
const ad = await sponsorAdService.getSponsorAdById('ad-uuid');
```

### Get Sponsor Ad with User Details

```ts
const adWithUser = await sponsorAdService.getSponsorAdWithUser('ad-uuid');
// Returns SponsorAdWithUser (includes user profile data)
```

### Get Ads by User

```ts
const userAds = await sponsorAdService.getSponsorAdsByUserId('user-uuid');
```

### Get Active Ads for Display

```ts
// Simple list
const activeAds = await sponsorAdService.getActiveSponsorAds(5);

// With associated item data (for sidebar display)
const adsWithItems = await sponsorAdService.getActiveSponsorAdsWithItems(5);
```

### Get Pending Ads for Admin Review

```ts
const pendingAds = await sponsorAdService.getPendingSponsorAds();
```

### Paginated List with Filters

```ts
const result = await sponsorAdService.getSponsorAdsPaginated({
  page: 1,
  limit: 20,
  status: 'active',
});

// result: { sponsorAds, total, page, limit, totalPages }
```

### Statistics

```ts
// Global statistics
const stats = await sponsorAdService.getSponsorAdStats();

// Per-user statistics
const userStats = await sponsorAdService.getSponsorAdStatsByUser('user-uuid');
```

## Write Operations

### Create a Sponsor Ad

Creates a new submission in `PENDING_PAYMENT` status:

```ts
const ad = await sponsorAdService.createSponsorAd('user-uuid', {
  itemSlug: 'my-awesome-tool',
  interval: 'weekly',
  paymentProvider: 'stripe',
});
```

The method enforces uniqueness -- a user cannot have:
- An existing pending sponsorship for the same item
- An existing active sponsorship for the same item

The `amount` is automatically calculated based on the selected interval using configured pricing.

### Confirm Payment

Called by the payment webhook when payment is received. Transitions from `PENDING_PAYMENT` to `PENDING`:

```ts
const ad = await sponsorAdService.confirmPayment(
  'ad-uuid',
  'sub_stripe_123',   // optional subscriptionId
  'cus_stripe_456',   // optional customerId
);
```

### Approve Sponsor Ad (Admin)

Approves and immediately activates the ad, calculating start and end dates:

```ts
// Normal approval (from PENDING status, payment already confirmed)
const ad = await sponsorAdService.approveSponsorAd('ad-uuid', 'admin-user-id');

// Force approval (from PENDING_PAYMENT, without payment)
const ad = await sponsorAdService.approveSponsorAd('ad-uuid', 'admin-user-id', true);
```

The `forceApprove` parameter allows admins to activate ads without payment (e.g., for promotional partnerships).

### Reject Sponsor Ad (Admin)

Rejects the ad with a reason. Can reject from either `PENDING_PAYMENT` or `PENDING` status:

```ts
const ad = await sponsorAdService.rejectSponsorAd(
  'ad-uuid',
  'admin-user-id',
  'Content does not meet our guidelines'
);
```

### Cancel Sponsor Ad

Can cancel from `PENDING_PAYMENT`, `PENDING`, or `ACTIVE` status:

```ts
const ad = await sponsorAdService.cancelSponsorAd('ad-uuid', 'User requested cancellation');
```

### Expire Sponsor Ad

Called by a cron job or webhook when the ad duration has elapsed. Only `ACTIVE` ads can be expired:

```ts
const ad = await sponsorAdService.expireSponsorAd('ad-uuid');
```

### Renew Sponsor Ad

Extends an active or expired ad for another interval period:

```ts
const ad = await sponsorAdService.renewSponsorAd('ad-uuid');
```

The new start date is set to the current end date (or now if no end date), and the new end date is calculated from the interval.

### Delete Sponsor Ad (Admin)

Hard delete, available to admins only:

```ts
await sponsorAdService.deleteSponsorAd('ad-uuid');
```

## Helper Methods

### Date Calculation

The end date is calculated based on the interval:

```ts
const endDate = sponsorAdService.calculateEndDate(startDate, 'weekly');
// 7 days from startDate

const endDate = sponsorAdService.calculateEndDate(startDate, 'monthly');
// 1 month from startDate
```

### Amount Formatting

```ts
const display = sponsorAdService.formatAmount(29.99, 'usd');
// "$29.99"
```

### Display Names

```ts
sponsorAdService.getIntervalDisplayName('weekly');   // "Weekly"
sponsorAdService.getIntervalDisplayName('monthly');  // "Monthly"

sponsorAdService.getStatusDisplayName('pending_payment'); // "Waiting for Payment"
sponsorAdService.getStatusDisplayName('active');          // "Active"
```

### State Checks

```ts
// Can the ad be edited? (only in PENDING_PAYMENT status)
const editable = sponsorAdService.canEdit(ad);

// Can the ad be cancelled?
const cancellable = sponsorAdService.canCancel(ad);

// Has payment been received?
const paid = sponsorAdService.hasPayment(ad);
```

## Integration with Payment Webhooks

The typical flow for Stripe integration:

1. User submits a sponsor ad via the UI (creates ad in `PENDING_PAYMENT` status)
2. User is redirected to Stripe checkout
3. Stripe sends a `checkout.session.completed` webhook
4. Webhook handler calls `sponsorAdService.confirmPayment(adId, subscriptionId, customerId)`
5. Ad moves to `PENDING` status
6. Admin reviews and calls `sponsorAdService.approveSponsorAd(adId, adminId)`
7. Ad is now `ACTIVE` with calculated start/end dates

## Expiration via Cron Job

Sponsor ad expiration is typically handled by a scheduled job that:

1. Queries all `ACTIVE` ads where `endDate` is in the past
2. Calls `sponsorAdService.expireSponsorAd(adId)` for each

For subscription-based ads, the payment provider webhook can also trigger renewal or expiration.
