---
id: guards-middleware
title: Gardes et middleware
sidebar_label: Gardes et intergiciels
sidebar_position: 40
---

# Gardes et middleware

Cette page couvre deux sous-systèmes d'autorisation clés dans le modèle : le **Plan Features Guard** pour le contrôle d'accès basé sur l'abonnement et le **Permission Check Middleware** pour l'application des autorisations basées sur les rôles.

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

### Fonctions autonomes

#### `getPlanLevel(plan): number`

Renvoie le niveau numérique d'une chaîne de plan. Renvoie `0` pour les plans inconnus.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Vérifie si le niveau de plan d'un utilisateur est supérieur ou égal au niveau de plan requis.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

La fonction de contrôle d'accès principale. Évalue la règle d’accès aux fonctionnalités par rapport au plan de l’utilisateur.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Gère tous les types de règles d'accès : `'all'`, plan unique, tableau de plans et objets `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

Renvoie la limite numérique pour une fonctionnalité dans le cadre du forfait de l'utilisateur. Revient aux limites du plan `FREE` pour les plans inconnus.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Renvoie `true` si la valeur ne dépasse pas la limite du plan. Renvoie `true` pour des limites illimitées (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Renvoie la liste complète des fonctionnalités accessibles par le plan donné.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Renvoie le plan le plus bas qui accorde l'accès à la fonctionnalité donnée.

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

### Aide au crochet de réaction

#### `createPlanGuardResult(userPlan): PlanGuardResult`

Crée un objet de résultat sérialisable adapté aux hooks React et à l'utilisation côté client.

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

### Fonctions de vérification des autorisations

#### `hasPermission(userPermissions, permission): boolean`

Vérifie si l'utilisateur dispose d'une autorisation spécifique.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Renvoie `true` si l'utilisateur dispose d'au moins une des autorisations répertoriées (logique OU).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Renvoie `true` uniquement si l'utilisateur dispose de toutes les autorisations répertoriées (logique ET).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Construit une chaîne d'autorisation à partir de `resource` et `action`, la valide à l'aide de `isValidPermission`, puis vérifie l'accès. Enregistre un avertissement pour les chaînes d'autorisation non valides.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Renvoie toutes les autorisations de l'utilisateur qui appartiennent à une ressource spécifique (filtrage par préfixe).

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

### Fonctions utilitaires

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Regroupe les autorisations de l'utilisateur par ressource. Utile pour restituer les matrices d'autorisations dans les interfaces utilisateur d'administration.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Renvoie `true` si la chaîne est une autorisation système reconnue. Utilise une recherche O(1) `Set` construite à partir des définitions `PERMISSIONS`.

#### `parsePermission(permission): object | null`

Divise une chaîne d'autorisation valide en `{ resource, action }`. Renvoie `null` pour les autorisations non valides.

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

## Fichiers associés

|Fichier|Relation|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` définition d'énumération|
|`lib/permissions/definitions.ts`|`PERMISSIONS` carte et `isValidPermission`|
|`lib/types/role.ts`|Définitions des types de rôles|
