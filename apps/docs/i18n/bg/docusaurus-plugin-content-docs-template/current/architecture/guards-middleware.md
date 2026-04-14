---
id: guards-middleware
title: Предпазители и мидълуер
sidebar_label: Предпазители и междинен софтуер
sidebar_position: 40
---

# Предпазители и мидълуер

Тази страница обхваща две ключови подсистеми за оторизация в шаблона: **Plan Features Guard** за контрол на достъпа, базиран на абонамент, и **Permission Check Middleware** за прилагане на разрешения, базирани на роли.

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

### Самостоятелни функции

#### `getPlanLevel(plan): number`

Връща числовото ниво за планов низ. Връща `0` за неизвестни планове.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Проверява дали нивото на плана на потребителя е по-голямо или равно на необходимото ниво на план.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

Основната функция за проверка на достъпа. Оценява правилото за достъп до функция спрямо плана на потребителя.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Обработва всички типове правила за достъп: `'all'`, единичен план, масив от планове и `{ minPlan }` обекти.

#### `getFeatureLimit(limitName, userPlan): number | null`

Връща числения лимит за функция в плана на потребителя. Връща се към ограниченията на плана `FREE` за неизвестни планове.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Връща `true`, ако стойността не надвишава лимита на плана. Връща `true` за неограничени (`null`) лимити.

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Връща пълния списък с функции, достъпни от дадения план.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Връща най-ниския план, който предоставя достъп до дадената функция.

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

Създава сериализиращ резултатен обект, подходящ за кукички на React и използване от страна на клиента.

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

### Функции за проверка на разрешения

#### `hasPermission(userPermissions, permission): boolean`

Проверява дали потребителят има конкретно разрешение.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Връща `true`, ако потребителят има поне едно от изброените разрешения (ИЛИ логика).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Връща `true` само ако потребителят има всички изброени разрешения (И логика).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Създава низ за разрешение от `resource` и `action`, валидира го с помощта на `isValidPermission`, след което проверява достъпа. Регистрира предупреждение за невалидни низове за разрешение.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Връща всички разрешения на потребителя, които принадлежат към конкретен ресурс (филтриране по префикс).

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

### Полезни функции

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Групира разрешенията на потребителя по ресурс. Полезно за изобразяване на матрици за разрешения в администраторски потребителски интерфейси.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Връща `true`, ако низът е разпознато системно разрешение. Използва O(1) `Set` търсене, изградено от `PERMISSIONS` дефиниции.

#### `parsePermission(permission): object | null`

Разделя валиден низ за разрешение на `{ resource, action }`. Връща `null` за невалидни разрешения.

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

## Свързани файлове

|Файл|Връзка|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` дефиниция на enum|
|`lib/permissions/definitions.ts`|`PERMISSIONS` карта и `isValidPermission`|
|`lib/types/role.ts`|Дефиниции на типове роли|
