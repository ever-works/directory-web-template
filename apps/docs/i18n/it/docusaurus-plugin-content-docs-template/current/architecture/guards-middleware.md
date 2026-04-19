---
id: guards-middleware
title: Guardie e Middleware
sidebar_label: Protezioni e middleware
sidebar_position: 40
---

# Guardie e Middleware

Questa pagina copre due sottosistemi di autorizzazione chiave nel modello: **Plan Features Guard** per il controllo degli accessi in base all'abbonamento e il **Permission Check Middleware** per l'applicazione delle autorizzazioni in base al ruolo.

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

### Funzioni autonome

#### `getPlanLevel(plan): number`

Restituisce il livello numerico per una stringa del piano. Restituisce `0` per piani sconosciuti.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Controlla se il livello del piano di un utente è maggiore o uguale al livello del piano richiesto.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

La funzione di controllo dell'accesso primario. Valuta la regola di accesso alle funzionalità rispetto al piano dell'utente.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Gestisce tutti i tipi di regole di accesso: `'all'`, piano singolo, array di piani e oggetti `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

Restituisce il limite numerico per una funzionalità nel piano dell'utente. Rientra nei limiti del piano `FREE` per i piani sconosciuti.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Restituisce `true` se il valore non supera il limite del piano. Restituisce `true` per limiti illimitati (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Restituisce l'elenco completo delle funzionalità accessibili dal piano specificato.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Restituisce il piano più basso che garantisce l'accesso alla funzionalità specificata.

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

Crea un oggetto risultato serializzabile adatto agli hook React e all'utilizzo lato client.

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

### Funzioni di controllo dei permessi

#### `hasPermission(userPermissions, permission): boolean`

Controlla se l'utente dispone di un'autorizzazione specifica.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Restituisce `true` se l'utente dispone di almeno una delle autorizzazioni elencate (OR logico).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Restituisce `true` solo se l'utente dispone di tutte le autorizzazioni elencate (logica AND).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Crea una stringa di autorizzazione da `resource` e `action`, la convalida utilizzando `isValidPermission`, quindi controlla l'accesso. Registra un avviso per stringhe di autorizzazione non valide.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Restituisce tutte le autorizzazioni dell'utente che appartengono a una risorsa specifica (filtrando per prefisso).

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

### Funzioni di utilità

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Raggruppa le autorizzazioni dell'utente per risorsa. Utile per il rendering delle matrici di autorizzazione nelle interfacce utente di amministrazione.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Restituisce `true` se la stringa è un'autorizzazione di sistema riconosciuta. Utilizza una ricerca O(1) `Set` creata dalle definizioni `PERMISSIONS`.

#### `parsePermission(permission): object | null`

Divide una stringa di autorizzazione valida in `{ resource, action }`. Restituisce `null` per autorizzazioni non valide.

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

## File correlati

|Archivio|Relazione|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` definizione enum|
|`lib/permissions/definitions.ts`|`PERMISSIONS` mappa e `isValidPermission`|
|`lib/types/role.ts`|Definizioni del tipo di ruolo|
