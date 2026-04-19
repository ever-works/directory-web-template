---
id: guards-middleware
title: שומרים וכלי ביניים
sidebar_label: שומרים וכלי ביניים
sidebar_position: 40
---

# שומרים וכלי ביניים

דף זה מכסה שתי תתי-מערכות הרשאות מרכזיות בתבנית: **משמר תכונות התוכנית** לבקרת גישה מבוססת מנויים ו-**תוכנת בדיקת הרשאות** לאכיפת הרשאות מבוססת תפקידים.

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

### פונקציות עצמאיות

#### `getPlanLevel(plan): number`

מחזירה את הרמה המספרית עבור מחרוזת תוכנית. מחזיר `0` עבור תוכניות לא ידועות.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

בודק אם רמת התוכנית של משתמש גדולה או שווה לרמת התוכנית הנדרשת.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

פונקציית בדיקת הגישה הראשית. מעריך את כלל הגישה לתכונה מול התוכנית של המשתמש.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

מטפל בכל סוגי כללי הגישה: `'all'`, תוכנית יחידה, מערך תוכנית ואובייקטים `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

מחזירה את המגבלה המספרית עבור תכונה במסגרת התוכנית של המשתמש. נופל בחזרה למגבלות התוכנית `FREE` עבור תוכניות לא ידועות.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

מחזירה `true` אם הערך אינו חורג מהמגבלה של התוכנית. מחזירה `true` עבור מגבלות בלתי מוגבלות (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

מחזירה את הרשימה המלאה של התכונות הנגישות על ידי התוכנית הנתונה.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

מחזירה את התוכנית הנמוכה ביותר שמעניקה גישה לתכונה הנתונה.

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

יוצר אובייקט תוצאה הניתן לסידרה המתאים ל-React Hook ולשימוש בצד הלקוח.

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

### פונקציות בדיקת הרשאות

#### `hasPermission(userPermissions, permission): boolean`

בודק אם למשתמש יש הרשאה ספציפית.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

מחזירה `true` אם למשתמש יש לפחות אחת מההרשאות המפורטות (או לוגיקה).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

מחזירה `true` רק אם למשתמש יש את כל ההרשאות הרשומות (והיגיון).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

בונה מחרוזת הרשאות מ-`resource` ו-`action`, מאמת אותה באמצעות `isValidPermission`, ואז בודק גישה. רושם אזהרה עבור מחרוזות הרשאות לא חוקיות.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

מחזירה את כל ההרשאות של המשתמש השייכות למשאב ספציפי (סינון לפי קידומת).

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

### פונקציות שירות

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

מקבץ את ההרשאות של המשתמש לפי משאב. שימושי לעיבוד מטריצות הרשאות בממשקי ממשק מנהל.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

מחזירה `true` אם המחרוזת היא הרשאת מערכת מוכרת. משתמש בחיפוש O(1) `Set` הבנוי מהגדרות `PERMISSIONS`.

#### `parsePermission(permission): object | null`

מפצל מחרוזת הרשאה חוקית ל-`{ resource, action }`. מחזירה `null` עבור הרשאות לא חוקיות.

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

## קבצים קשורים

|קובץ|מערכת יחסים|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` הגדרת enum|
|`lib/permissions/definitions.ts`|`PERMISSIONS` מפה ו-`isValidPermission`|
|`lib/types/role.ts`|הגדרות סוגי תפקידים|
