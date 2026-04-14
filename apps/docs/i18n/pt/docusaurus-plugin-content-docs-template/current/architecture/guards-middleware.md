---
id: guards-middleware
title: Guardas e Middleware
sidebar_label: Guardas e Middleware
sidebar_position: 40
---

# Guardas e Middleware

Esta página abrange dois subsistemas de autorização principais no modelo: o **Plan Features Guard** para controle de acesso baseado em assinatura e o **Permission Check Middleware** para aplicação de permissão baseada em função.

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

### Funções autônomas

#### `getPlanLevel(plan): number`

Retorna o nível numérico de uma sequência de plano. Retorna `0` para planos desconhecidos.

```ts
function getPlanLevel(plan: string): number
```

#### `planMeetsRequirement(userPlan, requiredPlan): boolean`

Verifica se o nível do plano de um usuário é maior ou igual ao nível do plano necessário.

```ts
function planMeetsRequirement(userPlan: string, requiredPlan: string): boolean
```

#### `canAccessFeature(feature, userPlan): boolean`

A função de verificação de acesso principal. Avalia a regra de acesso ao recurso em relação ao plano do usuário.

```ts
function canAccessFeature(feature: Feature, userPlan: string): boolean
```

Lida com todos os tipos de regras de acesso: `'all'`, plano único, matriz de plano e objetos `{ minPlan }`.

#### `getFeatureLimit(limitName, userPlan): number | null`

Retorna o limite numérico para um recurso do plano do usuário. Volta aos limites do plano `FREE` para planos desconhecidos.

```ts
function getFeatureLimit<K extends keyof FeatureLimits>(
  limitName: K,
  userPlan: string
): FeatureLimits[K]
```

#### `isWithinLimit(limitName, value, userPlan): boolean`

Retorna `true` se o valor não ultrapassar o limite do plano. Retorna `true` para limites ilimitados (`null`).

```ts
function isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean
```

#### `getAccessibleFeatures(userPlan): Feature[]`

Retorna a lista completa de recursos acessíveis pelo plano determinado.

#### `getMinimumPlanForFeature(feature): PaymentPlan`

Retorna o plano mais baixo que concede acesso ao recurso determinado.

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

### Auxiliar de Gancho React

#### `createPlanGuardResult(userPlan): PlanGuardResult`

Cria um objeto de resultado serializável adequado para ganchos React e uso do lado do cliente.

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

### Funções de verificação de permissão

#### `hasPermission(userPermissions, permission): boolean`

Verifica se o usuário possui uma permissão específica.

```ts
function hasPermission(userPermissions: UserPermissions, permission: Permission): boolean
```

#### `hasAnyPermission(userPermissions, permissions): boolean`

Retorna `true` se o usuário tiver pelo menos uma das permissões listadas (lógica OR).

```ts
function hasAnyPermission(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasAllPermissions(userPermissions, permissions): boolean`

Retorna `true` somente se o usuário tiver todas as permissões listadas (lógica AND).

```ts
function hasAllPermissions(userPermissions: UserPermissions, permissions: Permission[]): boolean
```

#### `hasResourcePermission(userPermissions, resource, action): boolean`

Cria uma string de permissão de `resource` e `action`, valida-a usando `isValidPermission` e verifica o acesso. Registra um aviso para sequências de permissão inválidas.

```ts
function hasResourcePermission(
  userPermissions: UserPermissions,
  resource: string,
  action: string
): boolean
```

#### `getResourcePermissions(userPermissions, resource): Permission[]`

Retorna todas as permissões do usuário que pertencem a um recurso específico (filtrando por prefixo).

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

### Funções utilitárias

#### `getPermissionSummary(userPermissions): Record<string, string[]>`

Agrupa as permissões do usuário por recurso. Útil para renderizar matrizes de permissão em UIs administrativas.

```ts
// Example output:
{
  items: ['read', 'create', 'update'],
  users: ['read'],
  analytics: ['read', 'export']
}
```

#### `validatePermission(permission): boolean`

Retorna `true` se a string for uma permissão de sistema reconhecida. Usa uma pesquisa O(1) `Set` construída a partir de definições `PERMISSIONS`.

#### `parsePermission(permission): object | null`

Divide uma string de permissão válida em `{ resource, action }`. Retorna `null` para permissões inválidas.

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

## Arquivos relacionados

|Arquivo|Relacionamento|
|------|-------------|
|`lib/constants.ts`|`PaymentPlan` definição de enumeração|
|`lib/permissions/definitions.ts`|`PERMISSIONS` mapa e `isValidPermission`|
|`lib/types/role.ts`|Definições de tipo de função|
