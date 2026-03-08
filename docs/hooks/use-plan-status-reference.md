---
id: use-plan-status-reference
title: usePlanStatus Hook Reference
sidebar_label: usePlanStatus
sidebar_position: 63
---

# usePlanStatus

## Overview

`usePlanStatus` is a React hook for accessing the authenticated user's plan status with expiration awareness. It fetches plan data from the API and provides computed properties for feature gating, expiration warnings, and UI rendering. The module also exports two companion hooks: `usePlanAccess` for plan-level feature gating and `usePrefetchPlanStatus` for pre-loading plan data.

**Source:** `template/hooks/use-plan-status.ts`

## Signature

```typescript
function usePlanStatus(): PlanStatus
```

### Parameters

This hook takes no parameters. It reads the current user from `useCurrentUser()` and only fetches plan data when a user is authenticated.

## Return Values

The hook returns a `PlanStatus` object:

| Property | Type | Description |
|---|---|---|
| `planId` | `string` | The raw plan ID (e.g., `'free'`, `'standard'`, `'premium'`). |
| `effectivePlan` | `string` | The plan the user effectively has access to. May differ from `planId` if the plan has expired (falls back to `'free'`). |
| `isExpired` | `boolean` | Whether the user's plan has expired. |
| `expiresAt` | `Date \| null` | The plan expiration date as a `Date` object, or `null` if no expiration. |
| `daysUntilExpiration` | `number \| null` | Number of days until the plan expires, or `null` if no expiration. |
| `isInWarningPeriod` | `boolean` | Whether the plan is in its warning period (close to expiration). |
| `canAccessPlanFeatures` | `boolean` | Whether the user can currently access features of their plan. |
| `warningMessage` | `string \| null` | A human-readable warning message about plan status, or `null`. |
| `status` | `string \| null` | The raw subscription status string from the API. |
| `isLoading` | `boolean` | `true` while the initial data fetch is in progress. |
| `error` | `string \| null` | Error message string if the fetch failed, or `null`. |
| `refresh` | `() => Promise<void>` | Manually invalidate and refetch plan status data. |

## Type Definitions

### PlanStatusData

The raw response from the API:

```typescript
interface PlanStatusData {
  planId: string;
  effectivePlan: string;
  isExpired: boolean;
  expiresAt: string | null;
  daysUntilExpiration: number | null;
  isInWarningPeriod: boolean;
  canAccessPlanFeatures: boolean;
  warningMessage: string | null;
  status: string | null;
}
```

### PlanStatus

The extended interface returned by the hook (converts `expiresAt` from string to `Date`):

```typescript
interface PlanStatus extends Omit<PlanStatusData, 'expiresAt'> {
  expiresAt: Date | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}
```

## Implementation Details

- **Query Key:** `['plan-status']` (available via `planStatusQueryKeys.all`)
- **Stale Time:** 5 minutes
- **Garbage Collection Time:** 10 minutes
- **Retry:** 2 retries with exponential backoff (max 10 seconds)
- **Enabled:** Only when a user is authenticated (`!!user`)
- **Default State:** Unauthenticated users receive a default `FREE` plan status with `canAccessPlanFeatures: true`
- **Memoization:** The result object is memoized with `useMemo` to prevent unnecessary re-renders
- **API Endpoint:** `GET /api/user/plan-status`

### Default Plan Status (Unauthenticated)

```typescript
const DEFAULT_PLAN_STATUS: PlanStatusData = {
  planId: PaymentPlan.FREE,
  effectivePlan: PaymentPlan.FREE,
  isExpired: false,
  expiresAt: null,
  daysUntilExpiration: null,
  isInWarningPeriod: false,
  canAccessPlanFeatures: true,
  warningMessage: null,
  status: null
};
```

## Companion Hooks

### usePlanAccess

Checks whether the user can access features at a specific plan level.

```typescript
function usePlanAccess(requiredPlan: string): {
  hasAccess: boolean;
  effectivePlan: string;
  isExpired: boolean;
  isLoading: boolean;
  reason: 'allowed' | 'insufficient_plan' | 'expired' | 'loading';
}
```

**Plan hierarchy:** `free` (1) < `standard` (2) < `premium` (3). Unknown plans default to level `999` for the required plan (deny by default) or `0` for the effective plan.

### usePrefetchPlanStatus

Utility hook for pre-loading plan status data before navigation.

```typescript
function usePrefetchPlanStatus(): {
  prefetch: () => void;
}
```

## Usage Examples

### Basic Plan Status Display

```tsx
import { usePlanStatus } from '@/hooks/use-plan-status';

function PlanBanner() {
  const { effectivePlan, isExpired, warningMessage, isLoading } = usePlanStatus();

  if (isLoading) return <Skeleton />;

  if (isExpired) {
    return <ExpiredPlanBanner message={warningMessage} />;
  }

  return <p>Current plan: {effectivePlan}</p>;
}
```

### Feature Gating with usePlanAccess

```tsx
import { usePlanAccess } from '@/hooks/use-plan-status';

function PremiumFeature() {
  const { hasAccess, isLoading, reason } = usePlanAccess('premium');

  if (isLoading) return <Spinner />;

  if (!hasAccess) {
    return (
      <UpgradeRequired
        reason={reason === 'expired' ? 'Your plan has expired' : 'Premium plan required'}
      />
    );
  }

  return <PremiumContent />;
}
```

### Expiration Warning

```tsx
function ExpirationWarning() {
  const { isInWarningPeriod, daysUntilExpiration, warningMessage } = usePlanStatus();

  if (!isInWarningPeriod) return null;

  return (
    <Alert variant="warning">
      {warningMessage || `Your plan expires in ${daysUntilExpiration} days.`}
    </Alert>
  );
}
```

### Prefetching Plan Data

```tsx
import { usePrefetchPlanStatus } from '@/hooks/use-plan-status';

function SettingsLink() {
  const { prefetch } = usePrefetchPlanStatus();

  return (
    <Link href="/settings/billing" onMouseEnter={prefetch}>
      Billing Settings
    </Link>
  );
}
```

## Related Hooks

- [`useBillingData`](./use-billing-data-reference.md) -- Fetch subscription and payment history details.
- [`useAutoRenewal`](./use-auto-renewal-reference.md) -- Manage auto-renewal for subscriptions.
- [`usePaymentAvailability`](./use-payment-availability-reference.md) -- Check whether payment providers are configured.
- [`usePaymentMethods`](./use-payment-methods-reference.md) -- Manage stored payment methods.
