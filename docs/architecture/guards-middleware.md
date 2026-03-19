---
id: guards-middleware
title: Guards and Middleware
sidebar_label: Guards & Middleware
sidebar_position: 40
---

# Guards and Middleware

This page covers two key authorization subsystems in the template: the **Plan Features Guard** for subscription-based access control and the **Permission Check Middleware** for role-based permission enforcement.

---

## Plan Features Guard

**Source file:** `template/lib/guards/plan-features.guard.ts`

The plan features guard provides a centralized, declarative system for restricting functionality based on user subscription plans.

### Plan Hierarchy

Plans are organized in a numeric hierarchy where higher numbers grant more access:

| Plan | Level |
|------|-------|
| `FREE` | 1 |
| `STANDARD` | 2 |
| `PREMIUM` | 3 |

### Exported Constants

#### `PLAN_LEVELS`

```ts
const PLAN_LEVELS: Record<string, number>
```

Maps plan name strings to their numeric level.

#### `FEATURES`

A `const` object defining all feature identifiers in the system:

| Category | Features |
|----------|----------|
| **Submission** | `submit_product`, `extended_description`, `unlimited_description`, `upload_images`, `upload_video`, `verified_badge`, `sponsored_badge` |
| **Review** | `priority_review`, `instant_review` |
| **Visibility** | `search_visibility`, `category_placement`, `sponsored_position`, `homepage_featured`, `newsletter_mention` |
| **Analytics** | `view_statistics`, `advanced_analytics` |
| **Support** | `email_support`, `priority_email_support`, `phone_support` |
| **Social** | `social_sharing`, `learn_more_button` |
| **Other** | `free_modifications`, `unlimited_submissions` |

#### `FEATURE_ACCESS`

Maps each feature to its access rule. Access rules can be:

- **`'all'`** -- available to all plans (e.g., `submit_product`, `upload_images`)
- **Single plan** -- exact plan match (e.g., `upload_video` requires `PREMIUM`)
- **`{ minPlan: PaymentPlan }`** -- minimum plan requirement (e.g., `extended_description` requires `STANDARD` or above)
- **Plan array** -- any of the listed plans

#### `PLAN_LIMITS`

Numeric limits per plan for quantity-restricted features:

| Limit | FREE | STANDARD | PREMIUM |
|-------|------|----------|---------|
| `max_images` | 1 | 5 | unlimited |
| `max_description_words` | 200 | 500 | unlimited |
| `max_submissions` | 1 | 10 | unlimited |
| `review_days` | 7 | 3 | 1 |
| `free_modification_days` | 0 | 30 | 365 |

`null` represents unlimited.

---

### Standalone Functions

#### `getPlanLevel(plan): number`

Returns the numeric level for a plan string. Returns `0` for unknown plans.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Checks if a user's plan level is greater than or equal to the required plan level.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

The primary access check function. Evaluates the feature access rule against the user's plan.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Handles all access rule types: `'all'`, single plan, plan array, and `{ minPlan }` objects.

#### `getFeatureLimit(limitName, userPlan): number | null`

Returns the numeric limit for a feature under the user's plan. Falls back to `FREE` plan limits for unknown plans.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Returns `true` if the value does not exceed the plan's limit. Returns `true` for unlimited (`null`) limits.

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Returns the full list of features accessible by the given plan.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Returns the lowest plan that grants access to the given feature.

---

### PlanGuard Class Factory

#### `createPlanGuard(userPlan)`

Creates a guard instance bound to a specific plan. Provides an object-oriented API for checking access.

```ts
function createPlanGuard(userPlan: string): PlanGuard
```

**Returned methods:**

| Method | Description |
|--------|-------------|
| `canAccess(feature)` | Returns boolean access check |
| `requireFeature(feature)` | Throws `PlanGuardError` if not allowed |
| `getLimit(limitName)` | Returns numeric limit |
| `isWithinLimit(limitName, value)` | Boolean limit check |
| `requireWithinLimit(limitName, value)` | Throws if limit exceeded |
| `getAccessibleFeatures()` | Lists all accessible features |
| `getPlan()` | Returns the plan string |
| `getPlanLevel()` | Returns the numeric level |

#### `PlanGuardError`

Custom error class thrown by `requireFeature`:

```ts
class PlanGuardError extends Error {
  readonly feature: Feature;
  readonly userPlan: string;
  readonly requiredPlan: PaymentPlan;
}
```

---

### React Hook Helper

#### `createPlanGuardResult(userPlan): PlanGuardResult`

Creates a serializable result object suitable for React hooks and client-side usage.

```ts
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: (limitName) => number | null;
  isWithinLimit: (limitName, value) => boolean;
  accessibleFeatures: Feature[];
}
```

---

## Permission Check Middleware

**Source file:** `template/lib/middleware/permission-check.ts`

The permission check module provides functions for evaluating role-based permissions. Permissions follow a `resource:action` format (e.g., `items:create`, `users:delete`).

### `UserPermissions` Interface

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];   // e.g. ['items:read', 'items:create', ...]
}
```

---

### Permission Check Functions

#### `hasPermission(userPermissions, permission): boolean`

Checks if the user has a specific permission.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Returns `true` if the user has at least one of the listed permissions (OR logic).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Returns `true` only if the user has every listed permission (AND logic).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Builds a permission string from `resource` and `action`, validates it using `isValidPermission`, then checks access. Logs a warning for invalid permission strings.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Returns all of the user's permissions that belong to a specific resource (filtering by prefix).

```ts
function getResourcePermissions(
  userPermissions: UserPermissions,
  resource: string
): Permission[]
```

---

### Domain-Specific Checks

| Function | Checks For |
|----------|-----------|
| `canManageResource(perms, resource)` | Any of `create`, `update`, `delete` on the resource |
| `canReviewItems(perms)` | `items:review`, `items:approve`, or `items:reject` |
| `canManageUsers(perms)` | `users:read/create/update/delete/assignRoles` |
| `canManageRoles(perms)` | `roles:read/create/update/delete` |
| `canViewAnalytics(perms)` | `analytics:read` |

#### `isSuperAdmin(userPermissions): boolean`

Two-tier check:
1. Returns `true` if user has the `super-admin` role
2. Fallback: checks if the user has every defined system permission (items, categories, tags, roles, users, analytics, system)

---

### Utility Functions

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Groups the user's permissions by resource. Useful for rendering permission matrices in admin UIs.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Returns `true` if the string is a recognized system permission. Uses an O(1) `Set` lookup built from `PERMISSIONS` definitions.

#### `parsePermission(permission): object | null`

Splits a valid permission string into `{ resource, action }`. Returns `null` for invalid permissions.

---

## Usage Examples

### Plan Guard

```ts
import { createPlanGuard, FEATURES } from '@/lib/guards/plan-features.guard';

const guard = createPlanGuard('standard');

if (guard.canAccess(FEATURES.UPLOAD_VIDEO)) {
  // Allow video upload
}

guard.requireFeature(FEATURES.PRIORITY_REVIEW);
// Throws PlanGuardError if not STANDARD or above

const maxImages = guard.getLimit('max_images'); // 5
```

### Permission Middleware

```ts
import { hasPermission, canReviewItems, isSuperAdmin } from '@/lib/middleware/permission-check';

const userPerms: UserPermissions = {
  userId: 'user-123',
  roles: ['editor'],
  permissions: ['items:read', 'items:create', 'items:review'],
};

hasPermission(userPerms, 'items:create');   // true
canReviewItems(userPerms);                   // true
isSuperAdmin(userPerms);                     // false
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/constants.ts` | `PaymentPlan` enum definition |
| `lib/permissions/definitions.ts` | `PERMISSIONS` map and `isValidPermission` |
| `lib/types/role.ts` | Role type definitions |
