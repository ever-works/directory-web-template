---
id: role-types
title: Définitions des types de système de rôles
sidebar_label: Types de rôles
sidebar_position: 19
---

# Définitions des types de système de rôles

**Source :** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Les rôles regroupent les autorisations et sont attribués aux utilisateurs. Le système prend en charge les rôles personnalisés avec des matrices d'autorisations granulaires.

## Interfaces

### `RoleData`

Structure de données du rôle principal renvoyée par l'API.

```typescript
interface RoleData {
  id: string;               // Slug-style identifier (e.g., 'content-manager')
  name: string;             // Display name
  description: string;      // What this role is for
  status: RoleStatus;       // 'active' | 'inactive'
  isAdmin: boolean;         // Has full admin access
  permissions: Permission[]; // Array of permission strings
  created_at: string;       // ISO 8601 timestamp
  updated_at: string;
  created_by: string;       // User ID or 'system'
}
```

|Champ|Descriptif|
|-------|-------------|
|`id`|Limace minuscule, 3 à 50 caractères, modèle : `^[a-z0-9-]+$`|
|`name`|Nom lisible par l'homme, 3 à 100 caractères|
|`isAdmin`|Lorsque `true`, le rôle accorde un accès complet au système quelles que soient les autorisations individuelles|
|`permissions`|Tableau de chaînes `resource:action` du registre des autorisations|

### `RoleWithCount`

Données de rôle étendues avec le nombre d’affectations d’utilisateurs.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Charge utile pour la création d'un nouveau rôle.

```typescript
interface CreateRoleRequest {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin?: boolean;
  permissions: Permission[];
}
```

### `UpdateRoleRequest`

Charge utile pour la mise à jour d'un rôle. Seul `id` est requis ; tous les autres champs sont facultatifs.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Paramètres de requête pour répertorier les rôles.

```typescript
interface RoleListOptions {
  page?: number;
  limit?: number;
  status?: RoleStatus;
  sortBy?: 'name' | 'id' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

### `RoleListResponse`

Réponse de liste de rôles paginée.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Types d'affectations

### `RoleAssignment`

Charge utile d’affectation minimale.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Attribue un rôle à un utilisateur spécifique.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Met à jour les autorisations sur un rôle.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Tapez les alias

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Type de statut

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Règles de validation

```typescript
const ROLE_VALIDATION = {
  ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z0-9-]+$/,
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
} as const;
```

|Champ|Règle|
|-------|------|
|`id`|3 à 50 caractères, caractères alphanumériques minuscules et traits d'union uniquement|
|`name`|3 à 100 caractères|
|`description`|500 caractères maximum|

## Rôles par défaut

Le modèle est livré avec deux rôles intégrés définis dans `lib/permissions/definitions.ts` :

|Rôle|pièce d'identité|Administrateur|Autorisations|
|------|----|-------|-------------|
|Super administrateur|`super-admin`|Oui|Toutes les autorisations|
|Gestionnaire de contenu|`content-manager`|Non|Toutes les autorisations `items`, `categories` et `tags`|

## Schéma de base de données

### `roles` tableau

```typescript
{
  id: text,            // Primary key
  name: text,          // Unique
  description: text,
  isAdmin: boolean,    // Default: false
  status: text,        // 'active' | 'inactive'
  created_by: text,    // Default: 'system'
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp, // Soft delete
}
```

### `user_roles` tableau

Table de jonction reliant les utilisateurs aux rôles.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Exemple d'utilisation

```typescript
import type { CreateRoleRequest } from '@/lib/types/role';
import { PERMISSIONS } from '@/lib/permissions/definitions';

const newRole: CreateRoleRequest = {
  id: 'reviewer',
  name: 'Content Reviewer',
  description: 'Can review and approve submitted items',
  status: 'active',
  isAdmin: false,
  permissions: [
    PERMISSIONS.items.read,
    PERMISSIONS.items.review,
    PERMISSIONS.items.approve,
    PERMISSIONS.items.reject,
  ],
};
```

## Types associés

- [Types d'autorisations](./permission-types.md) - définitions et groupes d'autorisations
- [Types d'authentification](./auth-types.md) - sessions utilisateur avec indicateur administrateur
- [Types d'utilisateurs](./user-types.md) -- structures de données utilisateur
