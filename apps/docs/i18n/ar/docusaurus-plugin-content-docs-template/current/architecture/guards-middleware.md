---
id: guards-middleware
title: الحراس والوسيطة
sidebar_label: الحراس والوسيطة
sidebar_position: 40
---

# الحراس والوسيطة

تغطي هذه الصفحة نظامين فرعيين رئيسيين للتفويض في القالب: **Plan Features Guard** للتحكم في الوصول القائم على الاشتراك و**Permission Check Middleware** لفرض الأذونات على أساس الدور.

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

### وظائف مستقلة

#### `getPlanLevel(plan): number`

إرجاع المستوى الرقمي لسلسلة الخطة. إرجاع `0` للخطط غير المعروفة.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

يتحقق مما إذا كان مستوى خطة المستخدم أكبر من أو يساوي مستوى الخطة المطلوبة.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

وظيفة التحقق من الوصول الأساسي. يقوم بتقييم قاعدة الوصول إلى الميزة مقابل خطة المستخدم.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

يتعامل مع جميع أنواع قواعد الوصول: `'all'` والخطة الفردية ومصفوفة الخطة وكائنات `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

إرجاع الحد الرقمي لميزة ضمن خطة المستخدم. يعود إلى حدود الخطة `FREE` للخطط غير المعروفة.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

يُرجع `true` إذا كانت القيمة لا تتجاوز حد الخطة. إرجاع `true` لحدود غير محدودة (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

إرجاع القائمة الكاملة للميزات التي يمكن الوصول إليها من خلال الخطة المحددة.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

إرجاع أقل خطة تمنح الوصول إلى الميزة المحددة.

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

### رد فعل هوك مساعد

#### `createPlanGuardResult(userPlan): PlanGuardResult`

ينشئ كائن نتيجة قابل للتسلسل ومناسبًا لخطافات React والاستخدام من جانب العميل.

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

### وظائف التحقق من الأذونات

#### `hasPermission(userPermissions, permission): boolean`

يتحقق مما إذا كان المستخدم لديه إذن محدد.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

يُرجع `true` إذا كان لدى المستخدم واحد على الأقل من الأذونات المدرجة (أو المنطق).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

يُرجع `true` فقط إذا كان لدى المستخدم كل الأذونات المدرجة (والمنطق).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

ينشئ سلسلة إذن من `resource` و`action`، ويتحقق من صحتها باستخدام `isValidPermission`، ثم يتحقق من الوصول. يسجل تحذيرًا لسلاسل الأذونات غير الصالحة.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

إرجاع كافة أذونات المستخدم التي تنتمي إلى مورد معين (التصفية حسب البادئة).

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

### وظائف المرافق

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

تجميع أذونات المستخدم حسب المورد. مفيد لعرض مصفوفات الأذونات في واجهات المستخدم الإدارية.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

يُرجع `true` إذا كانت السلسلة عبارة عن إذن نظام معروف. يستخدم بحث O(1) `Set` المبني من تعريفات `PERMISSIONS`.

#### `parsePermission(permission): object | null`

يقسم سلسلة الأذونات الصالحة إلى `{ resource, action }`. إرجاع `null` للأذونات غير الصالحة.

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

## الملفات ذات الصلة

|ملف|العلاقة|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` تعريف التعداد|
|`lib/permissions/definitions.ts`|`PERMISSIONS` الخريطة و`isValidPermission`|
|`lib/types/role.ts`|تعريفات نوع الدور|
