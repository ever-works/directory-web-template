---
id: guards-system-deep-dive
title: "Guards System Deep Dive"
sidebar_label: "Guards System Deep Dive"
sidebar_position: 47
---

# Guards System Deep Dive

## Overview

The Guards System implements subscription-plan-based feature access control. It defines a centralized feature matrix mapping features to subscription plans (Free, Standard, Premium), provides numeric limits per plan, and offers both functional and class-based APIs for checking and enforcing access. The system supports server-side enforcement via throwing guards and client-side use via React-compatible result objects.

## Architecture

The guards module lives in `lib/guards/` with two files:

- **`lib/guards/plan-features.guard.ts`** -- The core implementation containing all feature definitions, the access matrix, plan limits, access-check functions, and the guard factory.
- **`lib/guards/index.ts`** -- Barrel export that re-exports everything from the guard file.

The guard system depends on `PaymentPlan` from `@/lib/constants` for plan type definitions and is consumed by API routes, services, and React hooks for feature gating.

```
lib/guards/
  |-- index.ts                  (barrel export)
  |-- plan-features.guard.ts    (core implementation)
      |-- PLAN_LEVELS           (hierarchy: FREE=1, STANDARD=2, PREMIUM=3)
      |-- FEATURES              (feature constants)
      |-- FEATURE_ACCESS        (feature -> plan mapping matrix)
      |-- PLAN_LIMITS           (numeric limits per plan)
      |-- canAccessFeature()    (check function)
      |-- createPlanGuard()     (guard factory)
      |-- createPlanGuardResult() (React hook helper)
      |-- PlanGuardError        (typed error class)
```

## API Reference

### Constants

#### `FEATURES`

An object containing all feature string constants:

| Category | Features |
|----------|----------|
| Submission | `SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE` |
| Review | `PRIORITY_REVIEW`, `INSTANT_REVIEW` |
| Visibility | `SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION` |
| Analytics | `VIEW_STATISTICS`, `ADVANCED_ANALYTICS` |
| Support | `EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT` |
| Social | `SOCIAL_SHARING`, `LEARN_MORE_BUTTON` |
| Other | `FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS` |

#### `PLAN_LEVELS: Record<string, number>`

Plan hierarchy values: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

The access matrix mapping each feature to its allowed plans. Access types:
- `'all'` -- All plans can access
- `PaymentPlan` -- Only that specific plan
- `PaymentPlan[]` -- Only listed plans
- `{ minPlan: PaymentPlan }` -- That plan and above

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Numeric limits per plan:

| Limit | Free | Standard | Premium |
|-------|------|----------|---------|
| `max_images` | 1 | 5 | unlimited |
| `max_description_words` | 200 | 500 | unlimited |
| `max_submissions` | 1 | 10 | unlimited |
| `review_days` | 7 | 3 | 1 |
| `free_modification_days` | 0 | 30 | 365 |

### Types

#### `Feature`

```typescript
type Feature = (typeof FEATURES)[keyof typeof FEATURES];
// Union of all feature string values
```

#### `PlanGuardResult`

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### Functions

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Checks whether a plan has access to a feature based on the access matrix.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Returns the numeric limit for a specific feature limit key. Returns `null` for unlimited.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Checks if a value is within the plan's limit. Returns `true` if the limit is `null` (unlimited).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Returns an array of all features accessible by the given plan.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Returns the lowest plan that can access a feature. Useful for upgrade prompts.

#### `getPlanLevel(plan: string): number`

Returns the numeric hierarchy level for a plan (0 if unknown).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Checks if the user's plan meets or exceeds the required plan level.

#### `createPlanGuard(userPlan: string)`

Factory function that returns a guard object bound to a specific user plan:

```typescript
const guard = createPlanGuard('standard');
guard.canAccess(feature)          // boolean check
guard.requireFeature(feature)     // throws PlanGuardError if denied
guard.getLimit(limitName)         // get numeric limit
guard.isWithinLimit(name, value)  // check within limit
guard.requireWithinLimit(name, v) // throws if exceeded
guard.getAccessibleFeatures()     // all accessible features
guard.getPlan()                   // current plan string
guard.getPlanLevel()              // current plan level number
```

#### `createPlanGuardResult(userPlan: string): PlanGuardResult`

Creates a result object suitable for React hooks, pre-computing the accessible features list.

### Error Classes

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Thrown by `requireFeature()` when access is denied. Contains all information needed to show an upgrade prompt.

## Implementation Details

**Access resolution**: `canAccessFeature()` evaluates the access type in order: `'all'` -> single plan string match -> array includes check -> `{ minPlan }` hierarchy comparison. Unknown features return `false` with a console warning.

**Hierarchy-based comparison**: `planMeetsRequirement()` compares numeric levels from `PLAN_LEVELS`, allowing features to be gated by "this plan and above" without listing every plan explicitly.

**Null for unlimited**: Limits use `null` to represent unlimited values. `isWithinLimit()` short-circuits to `true` when the limit is `null`.

**Prototype pollution safe**: Feature keys come from the `FEATURES` constant object and are never derived from user input.

## Configuration

Feature access rules are configured by modifying the `FEATURE_ACCESS` and `PLAN_LIMITS` objects in `plan-features.guard.ts`. To add a new feature:

1. Add a constant to `FEATURES`
2. Add an access rule to `FEATURE_ACCESS`
3. Optionally add numeric limits to `PLAN_LIMITS` (if the feature has quantity restrictions)

## Usage Examples

```typescript
// Simple feature check in an API route
import { canAccessFeature, FEATURES } from '@/lib/guards';

export async function POST(request: Request) {
  const userPlan = await getUserPlan(session);

  if (!canAccessFeature(FEATURES.UPLOAD_VIDEO, userPlan)) {
    return Response.json(
      { error: 'Video upload requires Premium plan' },
      { status: 403 }
    );
  }
  // ... handle upload
}

// Using the guard factory in a service
import { createPlanGuard, FEATURES } from '@/lib/guards';

async function submitProduct(data: ProductData, userPlan: string) {
  const guard = createPlanGuard(userPlan);

  // This throws PlanGuardError if not allowed
  guard.requireFeature(FEATURES.SUBMIT_PRODUCT);

  // Check numeric limits
  guard.requireWithinLimit('max_images', data.images.length);
  guard.requireWithinLimit('max_description_words', countWords(data.description));

  // Proceed with submission
  return await saveProduct(data);
}

// React hook usage
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

function SubmissionForm({ userPlan }: { userPlan: string }) {
  const guard = createPlanGuardResult(userPlan);
  const imageLimit = guard.getLimit('max_images');

  return (
    <form>
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
      <ImageUploader maxImages={imageLimit ?? Infinity} />
      {!guard.canAccess(FEATURES.VERIFIED_BADGE) && (
        <UpgradePrompt feature="Verified Badge" />
      )}
    </form>
  );
}

// Get minimum plan for upgrade messaging
import { getMinimumPlanForFeature, FEATURES } from '@/lib/guards';

const requiredPlan = getMinimumPlanForFeature(FEATURES.ADVANCED_ANALYTICS);
// Returns PaymentPlan.PREMIUM
```

## Best Practices

- Always use `FEATURES` constants instead of raw strings to get type safety and autocompletion.
- Use `createPlanGuard()` with `requireFeature()` in API routes and services for server-side enforcement that throws errors.
- Use `createPlanGuardResult()` in React components for client-side UI gating without exceptions.
- When adding new features, start by adding to the `FEATURES` constant and `FEATURE_ACCESS` matrix before writing any gating logic.
- Catch `PlanGuardError` at the API route level and translate it into a 403 response with upgrade information (`requiredPlan`).

## Related Modules

- [Config Manager System](./config-manager-system) -- Feature flags for database-dependent features
- [Query Client System](./query-client-system) -- Subscription data fetching that feeds into plan guards
