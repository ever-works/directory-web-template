---
id: use-plan-guard-reference
title: usePlanGuard
sidebar_label: usePlanGuard
sidebar_position: 34
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePlanGuard

A React hook for checking feature access based on the user's subscription plan. It provides methods to check feature availability, query plan limits, determine upgrade requirements, and list all accessible features for the current plan.

The file also exports two companion hooks: `useFeatureAccess` for single-feature checks, and `useFeatureLimit` for numeric limit tracking.

## Import

```typescript
import { usePlanGuard, FEATURES } from '@/hooks/use-plan-guard';
import { useFeatureAccess } from '@/hooks/use-plan-guard';
import { useFeatureLimit } from '@/hooks/use-plan-guard';
import type { Feature, UsePlanGuardResult } from '@/hooks/use-plan-guard';
```

## API Reference

### `usePlanGuard()`

```typescript
function usePlanGuard(): UsePlanGuardResult;
```

#### Return Value -- `UsePlanGuardResult`

| Property | Type | Description |
|---|---|---|
| `canAccess` | `(feature: Feature) => boolean` | Returns `true` if the current plan includes access to the given feature. |
| `getLimit` | `<K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K]` | Returns the plan limit for a named limit key (e.g., `max_images`). Returns `null` for unlimited. |
| `isWithinLimit` | `(limitName: keyof FeatureLimits, value: number) => boolean` | Returns `true` if the given value is within the plan's limit for the named limit key. |
| `accessibleFeatures` | `Feature[]` | Array of all features the current plan has access to. |
| `requireUpgrade` | `(feature: Feature) => PaymentPlan \| null` | Returns the minimum plan required to access a feature, or `null` if the user already has access. |
| `effectivePlan` | `string` | The current effective plan identifier (accounts for expiration). |
| `isLoading` | `boolean` | `true` while plan status is being determined. |
| `isExpired` | `boolean` | `true` if the user's subscription has expired. |

### `useFeatureAccess(feature)`

A convenience hook for checking access to a single feature.

```typescript
function useFeatureAccess(feature: Feature): {
  hasAccess: boolean;
  requiredPlan: PaymentPlan | null;
  isLoading: boolean;
};
```

| Property | Type | Description |
|---|---|---|
| `hasAccess` | `boolean` | Whether the current plan includes the feature. |
| `requiredPlan` | `PaymentPlan \| null` | The minimum plan needed, or `null` if already accessible. |
| `isLoading` | `boolean` | Loading state. |

### `useFeatureLimit(limitName, currentValue?)`

A convenience hook for checking numeric feature limits.

```typescript
function useFeatureLimit(
  limitName: keyof FeatureLimits,
  currentValue?: number
): {
  limit: number | null;
  isUnlimited: boolean;
  remaining: number | null;
  isWithinLimit: boolean;
  isLoading: boolean;
};
```

| Property | Type | Description |
|---|---|---|
| `limit` | `number \| null` | The numeric limit, or `null` if unlimited. |
| `isUnlimited` | `boolean` | `true` if the limit is `null` (no cap). |
| `remaining` | `number \| null` | How many more items can be added before hitting the limit, or `null` if unlimited. |
| `isWithinLimit` | `boolean` | Whether `currentValue` is within the allowed limit. |
| `isLoading` | `boolean` | Loading state. |

## Usage Examples

### Feature Gating with Upgrade Prompt

```tsx
function VideoUploader() {
  const { canAccess, requireUpgrade } = usePlanGuard();

  if (!canAccess(FEATURES.UPLOAD_VIDEO)) {
    const requiredPlan = requireUpgrade(FEATURES.UPLOAD_VIDEO);
    return (
      <UpgradePrompt
        feature="video upload"
        requiredPlan={requiredPlan}
      />
    );
  }

  return <VideoUploadForm />;
}
```

### Limit-Based UI

```tsx
function ImageGallery({ images }: { images: Image[] }) {
  const { limit, isUnlimited, remaining, isWithinLimit } = useFeatureLimit(
    'max_images',
    images.length
  );

  return (
    <div>
      <div className="flex justify-between">
        <h2>Images</h2>
        {!isUnlimited && (
          <span className="text-sm text-gray-500">
            {images.length} / {limit} used ({remaining} remaining)
          </span>
        )}
      </div>
      <ImageGrid images={images} />
      {!isWithinLimit && (
        <p className="text-amber-600">
          You have reached your image limit. Upgrade to add more.
        </p>
      )}
      <button disabled={!isWithinLimit}>Add Image</button>
    </div>
  );
}
```

### Single Feature Check

```tsx
function VerifiedBadge({ userId }: { userId: string }) {
  const { hasAccess, requiredPlan, isLoading } = useFeatureAccess(FEATURES.VERIFIED_BADGE);

  if (isLoading) return null;

  if (!hasAccess) {
    return (
      <Tooltip content={`Available on ${requiredPlan} plan`}>
        <span className="text-gray-400">Unverified</span>
      </Tooltip>
    );
  }

  return <span className="text-blue-500">Verified</span>;
}
```

## Configuration

### Plan Features Guard

Feature definitions and plan limits are configured in `@/lib/guards/plan-features.guard`. This file exports:

- `FEATURES` -- Object mapping feature names to their identifiers.
- `PLAN_LIMITS` -- Plan-to-limits mapping defining what each plan allows.
- Helper functions: `canAccessFeature`, `getFeatureLimit`, `isWithinLimit`, `getAccessibleFeatures`, `getMinimumPlanForFeature`.

### Plan Status Provider

The hook depends on `usePlanStatus()` from `@/hooks/use-plan-status`, which provides:

- `effectivePlan` -- The resolved plan accounting for expiration and fallbacks.
- `isLoading` -- Whether the subscription status is still loading.
- `isExpired` -- Whether the current subscription period has ended.

Ensure the necessary authentication and subscription providers are in your component tree.

### Payment Plan Constants

Plans are defined in `@/lib/constants` as the `PaymentPlan` enum (e.g., `PaymentPlan.FREE`, `PaymentPlan.STANDARD`, `PaymentPlan.PREMIUM`).

## Edge Cases and Gotchas

- **Loading State**: All three hooks return `isLoading`. Always check this before making access decisions -- during loading, `canAccess` may return incorrect results based on default/empty plan state.
- **Expired Plans**: When `isExpired` is `true`, the `effectivePlan` may fall back to the free tier depending on your `usePlanStatus` implementation. Features that require a paid plan will be inaccessible.
- **Memoization**: All return values are memoized with `useMemo` keyed on `effectivePlan`, `isLoading`, and `isExpired`. The hook does not cause unnecessary re-renders when these values remain stable.
- **null vs 0 Limits**: A limit value of `null` means unlimited (no cap). A limit of `0` means the feature is not available at all. Always check `isUnlimited` rather than testing `limit === null` directly when building UI.
- **FEATURES Re-export**: The `FEATURES` constant is re-exported from the hook file for convenience, so you do not need a separate import from the guard module.
- **requireUpgrade Return**: Returns `null` when the user already has access (no upgrade needed), not when no plan supports the feature. If a feature is not defined in any plan, it returns the highest plan.

## Related Hooks

- [useRolePermissions](./use-role-permissions-reference.md) -- Role-based permission checking (complementary to plan-based guards).
- [useCheckoutButton / useCreateCheckoutSession](./use-checkout-reference.md) -- Initiate upgrade flows when a plan guard triggers.
