---
id: guards-middleware
title: Strażnicy i oprogramowanie pośrednie
sidebar_label: Strażnicy i oprogramowanie pośrednie
sidebar_position: 40
---

# Strażnicy i oprogramowanie pośrednie

Na tej stronie omówiono dwa kluczowe podsystemy autoryzacji w szablonie: **Ochrona funkcji planu** do kontroli dostępu opartej na subskrypcji oraz **Oprogramowanie pośredniczące do sprawdzania uprawnień** do egzekwowania uprawnień w oparciu o role.

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

### Funkcje samodzielne

#### `getPlanLevel(plan): number`

Zwraca poziom liczbowy dla ciągu planu. Zwraca `0` dla nieznanych planów.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Sprawdza, czy poziom planu użytkownika jest większy lub równy wymaganemu poziomowi planu.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

Podstawowa funkcja kontroli dostępu. Ocenia regułę dostępu do funkcji względem planu użytkownika.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Obsługuje wszystkie typy reguł dostępu: `'all'`, pojedynczy plan, tablicę planów i obiekty `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

Zwraca limit liczbowy dla funkcji w ramach planu użytkownika. Wraca do limitów planu `FREE` dla nieznanych planów.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Zwraca `true` jeśli wartość nie przekracza limitu planu. Zwraca `true` dla nieograniczonych limitów (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Zwraca pełną listę funkcji dostępnych w ramach danego planu.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Zwraca najniższy plan, który zapewnia dostęp do danej funkcji.

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

### Reaguj na pomocnika haka

#### `createPlanGuardResult(userPlan): PlanGuardResult`

Tworzy możliwy do serializacji obiekt wynikowy odpowiedni do haków React i użycia po stronie klienta.

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

### Funkcje sprawdzania uprawnień

#### `hasPermission(userPermissions, permission): boolean`

Sprawdza, czy użytkownik ma określone uprawnienia.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Zwraca `true`, jeśli użytkownik ma co najmniej jedno z wymienionych uprawnień (logika OR).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Zwraca `true` tylko wtedy, gdy użytkownik ma wszystkie wymienione uprawnienia (logika ORAZ).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Tworzy ciąg uprawnień z `resource` i `action`, sprawdza go za pomocą `isValidPermission`, następnie sprawdza dostęp. Rejestruje ostrzeżenie dotyczące nieprawidłowych ciągów uprawnień.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Zwraca wszystkie uprawnienia użytkownika należące do określonego zasobu (filtrowanie według prefiksu).

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

### Funkcje użytkowe

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Grupuje uprawnienia użytkownika według zasobu. Przydatne do renderowania macierzy uprawnień w interfejsach administratora.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Zwraca `true`, jeśli ciąg znaków jest rozpoznanym uprawnieniem systemowym. Używa wyszukiwania O(1) `Set` zbudowanego na podstawie definicji `PERMISSIONS`.

#### `parsePermission(permission): object | null`

Dzieli prawidłowy ciąg uprawnień na `{ resource, action }`. Zwraca `null` w przypadku nieprawidłowych uprawnień.

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

## Powiązane pliki

|Plik|Związek|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` definicja wyliczenia|
|`lib/permissions/definitions.ts`|`PERMISSIONS` mapa i `isValidPermission`|
|`lib/types/role.ts`|Definicje typów ról|
