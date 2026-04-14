---
id: permission-types
title: Definições de tipo de permissão
sidebar_label: Tipos de permissão
sidebar_position: 13
---

# Definições de tipo de permissão

**Fonte:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

O sistema de permissão usa um padrão de string `resource:action` para definir o controle de acesso granular. As permissões são atribuídas a funções atribuídas aos usuários.

## Tipo de núcleo

### `Permission`

Uma união de todas as strings de permissão válidas, derivadas da constante `PERMISSIONS`.

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

## Registro de permissão

A constante `PERMISSIONS` organiza as permissões por recurso.

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

|Recurso|Ações|
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

Permissões relacionadas a grupos para a interface do administrador.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

O modelo vem com três grupos integrados:

|Grupo|Permissões incluídas|
|-------|---------------------|
|`content`|Todas as permissões `items`, `categories` e `tags`|
|`users`|Todas as permissões `users` e `roles`|
|`system`|Todas as permissões `analytics` e `system`|

## Esquema de banco de dados

### `permissions` tabela

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` tabela

Tabela de junção vinculando funções às suas permissões.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Funções utilitárias

|Função|Retorno|Descrição|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Retorna todas as strings de permissão|
|`getPermissionsForResource(resource)`|`Permission[]`|Retorna permissões para um recurso específico|
|`isValidPermission(str)`|`boolean`|Digite guard verificando se uma string é uma permissão válida|
|`getPermissionGroup(perm)`|`PermissionGroup`|Encontra a qual grupo uma permissão pertence|
|`formatPermissionName(perm)`|`string`|Formata `'items:create'` como `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Gera uma descrição legível por humanos|

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de função](./role-types.md) – definições e atribuições de funções
- [Tipos de autenticação](./auth-types.md) - sessão do usuário com sinalizador `isAdmin`
