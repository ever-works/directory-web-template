---
id: permission-types
title: Definiciones de tipos de permisos
sidebar_label: Tipos de permisos
sidebar_position: 13
---

# Definiciones de tipos de permisos

**Fuente:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

El sistema de permisos utiliza un patrón de cadena `resource:action` para definir el control de acceso granular. Los permisos se asignan a roles, que a su vez se asignan a los usuarios.

## Tipo de núcleo

### `Permission`

Una unión de todas las cadenas de permisos válidas, derivada de la constante `PERMISSIONS`.

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

## Registro de permisos

La constante `PERMISSIONS` organiza los permisos por recurso.

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

|Recurso|Acciones|
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

Permisos relacionados con grupos para la interfaz de usuario del administrador.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

La plantilla se envía con tres grupos integrados:

|grupo|Permisos incluidos|
|-------|---------------------|
|`content`|Todos los permisos `items`, `categories` y `tags`|
|`users`|Todos los permisos `users` y `roles`|
|`system`|Todos los permisos `analytics` y `system`|

## Esquema de base de datos

### `permissions` tabla

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` tabla

Tabla de unión que vincula roles con sus permisos.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Funciones de utilidad

|Función|Regresar|Descripción|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Devuelve cada cadena de permiso|
|`getPermissionsForResource(resource)`|`Permission[]`|Devuelve permisos para un recurso específico|
|`isValidPermission(str)`|`boolean`|Escriba guardia comprobando si una cadena es un permiso válido|
|`getPermissionGroup(perm)`|`PermissionGroup`|Encuentra a qué grupo pertenece un permiso|
|`formatPermissionName(perm)`|`string`|Formatea `'items:create'` como `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Genera una descripción legible por humanos.|

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de roles](./role-types.md) -- definiciones y asignaciones de roles
- [Tipos de autenticación](./auth-types.md) -- sesión de usuario con el indicador `isAdmin`
