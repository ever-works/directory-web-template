---
id: permission-types
title: Définitions des types d'autorisation
sidebar_label: Types d'autorisations
sidebar_position: 13
---

# Définitions des types d'autorisation

**Source :** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Le système d'autorisation utilise un modèle de chaîne `resource:action` pour définir un contrôle d'accès granulaire. Les autorisations sont attribuées aux rôles, qui sont attribués aux utilisateurs.

## Type de noyau

### `Permission`

Une union de toutes les chaînes d'autorisation valides, dérivées de la constante `PERMISSIONS`.

```typescript
type Permission =
  | 'items:read' | 'items:create' | 'items:update'
  | 'items:delete' | 'items:review' | 'items:approve' | 'items:reject'
  | 'categories:read' | 'categories:create'
  | 'categories:update' | 'categories:delete'
  | 'tags:read' | 'tags:create' | 'tags:update' | 'tags:delete'
  | 'roles:read' | 'roles:create' | 'roles:update' | 'roles:delete'
  | 'users:read' | 'users:create' | 'users:update'
  | 'users:delete' | 'users:assignRoles'
  | 'analytics:read' | 'analytics:export'
  | 'system:settings';
```

## Registre des autorisations

La constante `PERMISSIONS` organise les autorisations par ressource.

```typescript
const PERMISSIONS = {
  items: {
    read: 'items:read',
    create: 'items:create',
    update: 'items:update',
    delete: 'items:delete',
    review: 'items:review',
    approve: 'items:approve',
    reject: 'items:reject',
  },
  categories: {
    read: 'categories:read',
    create: 'categories:create',
    update: 'categories:update',
    delete: 'categories:delete',
  },
  tags: { read, create, update, delete },
  roles: { read, create, update, delete },
  users: { read, create, update, delete, assignRoles },
  analytics: { read, export },
  system: { settings },
} as const;
```

|Ressource|Actions|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Interfaces

### `PermissionGroup`

Groupes d’autorisations liées à l’interface utilisateur d’administration.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Le modèle est livré avec trois groupes intégrés :

|Groupe|Autorisations incluses|
|-------|---------------------|
|`content`|Toutes les autorisations `items`, `categories` et `tags`|
|`users`|Toutes les autorisations `users` et `roles`|
|`system`|Toutes les autorisations `analytics` et `system`|

## Schéma de base de données

### `permissions` tableau

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` tableau

Table de jonction reliant les rôles à leurs autorisations.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Fonctions utilitaires

|Fonction|Retour|Descriptif|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Renvoie chaque chaîne d'autorisation|
|`getPermissionsForResource(resource)`|`Permission[]`|Renvoie les autorisations pour une ressource spécifique|
|`isValidPermission(str)`|`boolean`|Tapez guard vérifiant si une chaîne est une autorisation valide|
|`getPermissionGroup(perm)`|`PermissionGroup`|Recherche à quel groupe appartient une autorisation|
|`formatPermissionName(perm)`|`string`|Formate `'items:create'` comme `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Génère une description lisible par l'homme|

## Exemple d'utilisation

```typescript
import { PERMISSIONS, isValidPermission } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // Show approve button
}

// Validate a permission string from API input
if (isValidPermission(input)) {
  // Safe to assign
}
```

## Types associés

- [Types de rôle](./role-types.md) -- définitions et affectations de rôles
- [Types d'authentification](./auth-types.md) -- session utilisateur avec l'indicateur `isAdmin`
