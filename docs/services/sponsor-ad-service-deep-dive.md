---
id: sponsor-ad-service-deep-dive
title: Sponsor Ad Service Deep Dive
sidebar_label: Sponsor Ad Service (Deep Dive)
sidebar_position: 59
---

# Sponsor Ad Service Deep Dive

## Overview

The Sponsor Ad Service manages sponsored advertisements that promote items on the platform. It handles the full lifecycle from submission through payment, admin review, activation, renewal, and expiration. The service delegates database operations to a repository layer while owning all business logic, pricing calculations, and status transition rules.

## Source Files

| File | Path |
|------|------|
| Service | `template/lib/services/sponsor-ad.service.ts` |
| Repository | `template/lib/repositories/sponsor-ad.repository.ts` |
| Types | `template/lib/types/sponsor-ad.ts` |
| Validations | `template/lib/validations/sponsor-ad.ts` |
| DB Schema | `template/lib/db/schema.ts` |

## Architecture

```
Client UI / API Routes
        |
   SponsorAdService (business logic, validation, pricing)
        |
   sponsor-ad.repository (database queries via Drizzle ORM)
        |
   PostgreSQL (sponsor_ads table)
```

## Sponsor Ad Lifecycle

```
User submits ad
        |
        v
  PENDING_PAYMENT -----> User pays -----> PENDING (awaiting review)
        |                                     |
        |  (admin force approve)              |
        v                                     v
     ACTIVE <-------- Admin approves ----  PENDING
        |                                     |
        |                                Admin rejects
        v                                     |
     EXPIRED                                  v
        |                                REJECTED
        v
  RENEWED (back to ACTIVE)

  Any of PENDING_PAYMENT, PENDING, ACTIVE --> CANCELLED
```

### Status Values

| Status | Description |
|--------|-------------|
| `PENDING_PAYMENT` | Ad created, awaiting payment from user |
| `PENDING` | Payment received, awaiting admin review |
| `ACTIVE` | Approved and currently displayed |
| `REJECTED` | Rejected by admin with reason |
| `EXPIRED` | Active period has ended |
| `CANCELLED` | Cancelled by user or admin |

## Method Reference -- Read Operations

### `getSponsorAdById(id: string): Promise<SponsorAd | null>`

Retrieves a single sponsor ad by ID.

### `getSponsorAdWithUser(id: string): Promise<SponsorAdWithUser | null>`

Retrieves a sponsor ad with joined user details.

### `getSponsorAdsByUserId(userId: string): Promise<SponsorAd[]>`

Returns all sponsor ads owned by a specific user.

### `getActiveSponsorAds(limit?: number): Promise<SponsorAd[]>`

Returns currently active sponsor ads for display. Optional limit parameter.

### `getActiveSponsorAdsWithItems(limit?: number): Promise<SponsorWithItem[]>`

Returns active ads with their associated item data. Used for sidebar sponsor display where item metadata is needed.

### `getPendingSponsorAds(): Promise<SponsorAd[]>`

Returns ads awaiting admin review (status = `PENDING`).

### `getSponsorAdsPaginated(options?: SponsorAdListOptions): Promise<PaginatedResult>`

Full paginated listing with filters.

**Returns:**
```typescript
{
  sponsorAds: SponsorAd[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `getSponsorAdStats(): Promise<SponsorAdStats>`

Returns aggregate statistics for all sponsor ads.

### `getSponsorAdStatsByUser(userId: string): Promise<SponsorAdStats>`

Returns aggregate statistics for a specific user's sponsor ads.

## Method Reference -- Write Operations

### `createSponsorAd(userId, data): Promise<SponsorAd>`

Creates a new sponsor ad submission.

**Parameters:**
```typescript
interface CreateSponsorAdRequest {
  itemSlug: string;
  interval: string;          // 'weekly' | 'monthly'
  paymentProvider: string;
}
```

**Validation:**
- User must not have an existing pending ad for the same item
- User must not have an existing active ad for the same item

**Auto-calculated fields:**
- `amount` -- Calculated from interval using configurable pricing
- `currency` -- Always `'usd'`
- `status` -- Starts as `PENDING_PAYMENT`

### `approveSponsorAd(id, adminUserId, forceApprove?): Promise<SponsorAd | null>`

Admin approval with two paths:

1. **Normal approval** (from `PENDING`): Payment already received. Calculates start/end dates and activates immediately.
2. **Force approval** (from `PENDING_PAYMENT`): Requires `forceApprove: true`. Activates without payment confirmation.

Sets `reviewedBy` and `reviewedAt` on the ad.

Throws `'PAYMENT_NOT_RECEIVED'` if attempting to approve from `PENDING_PAYMENT` without `forceApprove`.

### `confirmPayment(id, subscriptionId?, customerId?): Promise<SponsorAd | null>`

Called by payment webhooks when payment is received. Transitions from `PENDING_PAYMENT` to `PENDING`.

Optionally stores `subscriptionId` and `customerId` from the payment provider.

### `rejectSponsorAd(id, adminUserId, rejectionReason): Promise<SponsorAd | null>`

Admin rejection with a required reason. Can reject from `PENDING_PAYMENT` or `PENDING` status.

### `cancelSponsorAd(id, cancelReason?): Promise<SponsorAd | null>`

Cancels a sponsor ad. Can cancel from `PENDING_PAYMENT`, `PENDING`, or `ACTIVE` status.

### `expireSponsorAd(id): Promise<SponsorAd | null>`

Marks an active ad as expired. Typically called by a cron job or webhook when the subscription period ends. Only works on `ACTIVE` ads.

### `renewSponsorAd(id): Promise<SponsorAd | null>`

Renews an active or expired ad. Calculates new dates from the current end date (or now if expired).

### `deleteSponsorAd(id): Promise<void>`

Hard delete of a sponsor ad record. Admin-only operation.

## Helper Methods

### `getAmountForInterval(interval: string): number`

Returns the price for a given interval using configurable settings:
- `'weekly'` -- from `getSponsorAdWeeklyPrice()`
- `'monthly'` -- from `getSponsorAdMonthlyPrice()`

### `getCurrency(): string`

Returns the configured currency from `getSponsorAdCurrency()`.

### `calculateEndDate(startDate: Date, interval: string): Date`

Calculates the end date:
- Weekly: +7 days
- Monthly: +1 month

### `formatAmount(amount: number, currency?: string): string`

Formats a numeric amount to a currency string using `Intl.NumberFormat` (e.g., `25` becomes `$25.00`).

### `getIntervalDisplayName(interval: string): string`

Returns human-readable interval name: `'Weekly'` or `'Monthly'`.

### `getStatusDisplayName(status: string): string`

Returns human-readable status:
- `PENDING_PAYMENT` becomes `'Waiting for Payment'`
- `PENDING` becomes `'Pending Review'`
- `ACTIVE` becomes `'Active'`
- etc.

### `canEdit(sponsorAd: SponsorAd): boolean`

Returns `true` only if status is `PENDING_PAYMENT` (before payment, user can still modify).

### `canCancel(sponsorAd: SponsorAd): boolean`

Returns `true` if status is `PENDING_PAYMENT`, `PENDING`, or `ACTIVE`.

### `hasPayment(sponsorAd: SponsorAd): boolean`

Returns `true` if status is anything other than `PENDING_PAYMENT`.

## Singleton Access

```typescript
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';

const ad = await sponsorAdService.getSponsorAdById('ad_123');
```

## Error Handling

All write operations follow a consistent pattern:
1. Fetch the current ad from the database
2. Validate the status transition is allowed
3. Throw descriptive errors for invalid states:
   - `'Sponsor ad not found'`
   - `'You already have a pending sponsorship for this item'`
   - `'You already have an active sponsorship for this item'`
   - `'PAYMENT_NOT_RECEIVED'`
   - `'Cannot approve/reject/cancel/expire sponsor ad with status: {status}'`

## Usage Examples

```typescript
import { sponsorAdService } from '@/lib/services/sponsor-ad.service';

// User creates a sponsor ad
const ad = await sponsorAdService.createSponsorAd('user_123', {
  itemSlug: 'my-awesome-tool',
  interval: 'monthly',
  paymentProvider: 'stripe',
});
// ad.status === 'pending_payment'
// ad.amount === configured monthly price

// Payment webhook confirms payment
await sponsorAdService.confirmPayment(ad.id, 'sub_xxx', 'cus_xxx');
// ad.status === 'pending'

// Admin approves
await sponsorAdService.approveSponsorAd(ad.id, 'admin_456');
// ad.status === 'active', startDate and endDate set

// Get active ads for display
const activeAds = await sponsorAdService.getActiveSponsorAdsWithItems(5);

// Cron job expires old ads
await sponsorAdService.expireSponsorAd(ad.id);

// User renews
await sponsorAdService.renewSponsorAd(ad.id);
// ad.status === 'active' again with new dates

// Admin views stats
const stats = await sponsorAdService.getSponsorAdStats();

// Format for display
const price = sponsorAdService.formatAmount(ad.amount); // "$25.00"
const interval = sponsorAdService.getIntervalDisplayName(ad.interval); // "Monthly"
const status = sponsorAdService.getStatusDisplayName(ad.status); // "Active"
```
