---
id: guards-middleware
title: Bewakers en middleware
sidebar_label: Bewakers en middleware
sidebar_position: 40
---

# Bewakers en middleware

Deze pagina behandelt twee belangrijke autorisatiesubsystemen in de sjabloon: de **Plan Features Guard** voor op abonnementen gebaseerde toegangscontrole en de **Permission Check Middleware** voor op rollen gebaseerde toestemmingsafdwinging.

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

### Zelfstandige functies

#### `getPlanLevel(plan): number`

Retourneert het numerieke niveau voor een planreeks. Retourneert `0` voor onbekende abonnementen.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Controleert of het abonnementsniveau van een gebruiker groter is dan of gelijk is aan het vereiste abonnementsniveau.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

De primaire toegangscontrolefunctie. Evalueert de functietoegangsregel op basis van het abonnement van de gebruiker.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Verwerkt alle typen toegangsregels: `'all'`, enkelvoudig plan, planarray en `{ minPlan }`-objecten.

#### `getFeatureLimit(limitName, userPlan): number | null`

Retourneert de numerieke limiet voor een functie onder het abonnement van de gebruiker. Valt terug op `FREE` abonnementslimieten voor onbekende abonnementen.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Retourneert `true` als de waarde de limiet van het plan niet overschrijdt. Retourneert `true` voor onbeperkte (`null`) limieten.

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Retourneert de volledige lijst met functies die toegankelijk zijn via het opgegeven abonnement.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Retourneert het laagste abonnement dat toegang verleent tot de gegeven functie.

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

### Reageer haakhelper

#### `createPlanGuardResult(userPlan): PlanGuardResult`

Creëert een serialiseerbaar resultaatobject dat geschikt is voor React-hooks en gebruik aan de clientzijde.

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

### Toestemmingscontrolefuncties

#### `hasPermission(userPermissions, permission): boolean`

Controleert of de gebruiker een specifieke machtiging heeft.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Retourneert `true` als de gebruiker ten minste één van de vermelde machtigingen heeft (OF-logica).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Retourneert `true` alleen als de gebruiker over alle vermelde machtigingen beschikt (EN-logica).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Bouwt een machtigingsreeks op van `resource` en `action`, valideert deze met `isValidPermission` en controleert vervolgens de toegang. Registreert een waarschuwing voor ongeldige machtigingsreeksen.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Retourneert alle machtigingen van de gebruiker die bij een specifieke bron horen (filteren op voorvoegsel).

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

### Nuttige functies

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Groepeert de machtigingen van de gebruiker op resource. Handig voor het weergeven van toestemmingsmatrices in beheerdersinterfaces.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Retourneert `true` als de tekenreeks een erkende systeemmachtiging is. Gebruikt een O(1) `Set` lookup opgebouwd uit `PERMISSIONS` definities.

#### `parsePermission(permission): object | null`

Splitst een geldige toestemmingsreeks in `{ resource, action }`. Retourneert `null` voor ongeldige machtigingen.

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

## Gerelateerde bestanden

|Bestand|Relatie|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` opsomdefinitie|
|`lib/permissions/definitions.ts`|`PERMISSIONS` kaart en `isValidPermission`|
|`lib/types/role.ts`|Definities van roltypen|
