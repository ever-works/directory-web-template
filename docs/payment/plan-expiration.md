---
id: plan-expiration
title: "Plan Expiration Utilities"
sidebar_label: "Plan Expiration"
sidebar_position: 8
---

# Plan Expiration Utilities

The `plan-expiration.utils` module (`lib/utils/plan-expiration.utils.ts`) provides centralized logic for handling subscription plan expiration. It calculates expiration status, grace periods, warning windows, and effective plan levels. These utilities are used across both backend and frontend for consistent behavior.

## Configuration

The module exports a configuration object with default values:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Both values can be overridden on a per-call basis via function parameters.

## Core Functions

### isPlanExpired

Checks whether a subscription has expired based on its end date, with an optional grace period:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Implementation

```ts
export function isPlanExpired(
  endDate: Date | string | null | undefined,
  gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
  if (!endDate) return false;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return false;

  const now = new Date();
  const graceEndDate = new Date(expirationDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  return now > graceEndDate;
}
```

Key behaviors:
- Returns `false` for `null` or `undefined` end dates (plan never expires)
- Returns `false` for invalid date strings
- Accepts both `Date` objects and ISO date strings
- Grace period extends the effective expiration date

### getEffectivePlan

Determines the actual plan a user should have access to, considering expiration and status:

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

// Active paid plan
getEffectivePlan('pro', new Date('2099-12-31'));
// "pro"

// Expired paid plan falls back to FREE
getEffectivePlan('pro', new Date('2024-01-01'));
// "free"

// Free plan never expires
getEffectivePlan('free', null);
// "free"

// Explicitly cancelled
getEffectivePlan('pro', new Date('2099-12-31'), 'cancelled');
// "free"
```

#### Implementation

```ts
export function getEffectivePlan(
  planId: string,
  endDate: Date | string | null | undefined,
  status?: string
): string {
  // Free plan never expires
  if (planId === PaymentPlan.FREE) {
    return PaymentPlan.FREE;
  }

  // Explicit status check
  if (
    status &&
    ['expired', 'cancelled'].includes(status.toLowerCase())
  ) {
    return PaymentPlan.FREE;
  }

  // Date-based expiration check
  if (isPlanExpired(endDate)) {
    return PaymentPlan.FREE;
  }

  return planId;
}
```

The function applies three checks in order:

1. **Free plan bypass** -- Free plans are always returned as-is
2. **Explicit status** -- If the status is `"expired"` or `"cancelled"`, the user gets FREE
3. **Date check** -- If the end date has passed, the user gets FREE

### getDaysUntilExpiration

Calculates the number of full days until a subscription expires:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Implementation

```ts
export function getDaysUntilExpiration(
  endDate: Date | string | null | undefined
): number | null {
  if (!endDate) return null;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return null;

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
```

The function uses `Math.floor` to count full days remaining. This means a subscription expiring in 1 hour returns `0` (expires today), not `1`.

### isInExpirationWarningPeriod

Checks if the subscription is within the warning window before expiration:

```ts
import { isInExpirationWarningPeriod } from '@/lib/utils/plan-expiration.utils';

// Expires in 5 days with default 7-day warning
isInExpirationWarningPeriod(fiveDaysFromNow);   // true

// Expires in 10 days
isInExpirationWarningPeriod(tenDaysFromNow);    // false

// Already expired
isInExpirationWarningPeriod(yesterday);          // false

// Custom warning window
isInExpirationWarningPeriod(threeDaysFromNow, 3); // true
```

The function returns `true` only when the plan has **not yet expired** but is within the warning window. Already-expired plans return `false`.

### isInGracePeriod

Checks if the subscription is in the post-expiration grace period:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Grace period is the window **after** expiration where users still have limited access. With the default `GRACE_PERIOD_DAYS` of `0`, this function always returns `false`.

### getPlanStatusInfo

Returns a comprehensive status object combining all expiration checks into a single call:

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

const status = getPlanStatusInfo('pro', new Date('2025-04-01'));
// {
//   planId: 'pro',
//   effectivePlan: 'pro',       // or 'free' if expired
//   isExpired: false,
//   isInWarningPeriod: true,    // if within 7 days
//   isInGracePeriod: false,
//   daysUntilExpiration: 5,
//   expiresAt: Date,
//   canAccessPlanFeatures: true,
// }
```

#### Return Type

```ts
{
  planId: string;               // Original plan ID
  effectivePlan: string;        // Actual plan after expiration logic
  isExpired: boolean;           // Whether the plan has expired
  isInWarningPeriod: boolean;   // Within warning days before expiration
  isInGracePeriod: boolean;     // In post-expiration grace period
  daysUntilExpiration: number | null;
  expiresAt: Date | null;       // Parsed expiration date
  canAccessPlanFeatures: boolean; // true if not expired OR in grace period
}
```

The `canAccessPlanFeatures` field is the key decision field: it is `true` when the user can still use paid features, either because the plan is active or because they are within the grace period.

### formatExpirationMessage

Generates human-readable expiration messages for UI display:

```ts
import { formatExpirationMessage } from '@/lib/utils/plan-expiration.utils';

formatExpirationMessage('Pro', 0, false);
// "Your Pro subscription expires today."

formatExpirationMessage('Pro', 1, false);
// "Your Pro subscription expires tomorrow."

formatExpirationMessage('Pro', 5, false);
// "Your Pro subscription expires in 5 days."

formatExpirationMessage('Pro', -3, true);
// "Your Pro subscription has expired. Please renew to restore full access."

formatExpirationMessage('Pro', 30, false);
// null (outside warning period, no message needed)

formatExpirationMessage('Pro', null, false);
// null (no end date)
```

The function returns `null` when no message should be displayed (outside the warning period and not expired).

## Usage Patterns

### API Route Guard

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  const effectivePlan = getEffectivePlan(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  if (effectivePlan === 'free') {
    return Response.json(
      { error: 'This feature requires a paid plan' },
      { status: 403 }
    );
  }

  // Proceed with paid-tier logic
}
```

### Expiration Banner Component

```ts
import {
  getPlanStatusInfo,
  formatExpirationMessage,
} from '@/lib/utils/plan-expiration.utils';

function ExpirationBanner({ user }) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  const message = formatExpirationMessage(
    user.planName,
    status.daysUntilExpiration,
    status.isExpired
  );

  if (!message) return null;

  return (
    <div className={status.isExpired ? 'bg-red-100' : 'bg-yellow-100'}>
      <p>{message}</p>
      <a href="/pricing">Renew Now</a>
    </div>
  );
}
```

### Feature Access Check

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

function useCanAccessFeature(user) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate
  );

  return status.canAccessPlanFeatures;
}
```

## Timeline Visualization

The expiration lifecycle flows through these states:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Subscription expiration logic |
| `lib/constants.ts` | `PaymentPlan` enum with FREE plan identifier |
