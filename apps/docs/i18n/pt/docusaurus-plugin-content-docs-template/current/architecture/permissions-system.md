---
id: permissions-system
title: "Sistema de permissões"
sidebar_label: "Sistema de permissões"
sidebar_position: 18
---

# Sistema de permissões

O modelo implementa um sistema de permissões granular baseado em recursos com definições de permissão de tipo seguro, agrupamentos lógicos para organização da interface do usuário e funções utilitárias para gerenciamento de estado e detecção de alterações.

## Visão geral da arquitetura

```mermaid
graph TD
    A[PERMISSIONS Constant] --> B[Permission Type]
    A --> C[getAllPermissions]
    A --> D[getPermissionsForResource]
    B --> E[PERMISSION_GROUPS]
    E --> F[Content Management Group]
    E --> G[User Management Group]
    E --> H[System & Analytics Group]
    B --> I[Permission Utils]
    I --> J[createPermissionState]
    I --> K[calculatePermissionChanges]
    I --> L[filterPermissions]
    A --> M[DEFAULT_ROLES]
    M --> N[Super Admin]
    M --> O[Content Manager]
```

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`lib/permissions/definitions.ts`|Constantes de permissão, extração de tipo, funções padrão|
|`lib/permissions/groups.ts`|Agrupamentos de permissões orientados à UI com metadados|
|`lib/permissions/utils.ts`|Gerenciamento de estado, cálculo de diferenças e filtragem|

## Definições de permissão

As permissões seguem uma convenção de nomenclatura `resource:action`. O objeto `PERMISSIONS` os organiza por recurso:

```typescript
export const PERMISSIONS = {
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
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  system: {
    settings: 'system:settings',
  },
} as const;
```

### Lista completa de permissões

|Recurso|Ações|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Tipo de permissão com segurança de tipo

O tipo `Permission` é extraído da constante `PERMISSIONS` usando tipos condicionais recursivos:

```typescript
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

Isso garante segurança em tempo de compilação: qualquer string de permissão que não exista na constante `PERMISSIONS` causará um erro de TypeScript.

## Funções de consulta

```typescript
// Get all permissions as a flat array
export function getAllPermissions(): Permission[];

// Get permissions for a specific resource
export function getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[];

// Validate whether a string is a valid permission
export function isValidPermission(permission: string): permission is Permission;
```

## Funções padrão

Duas definições de função integradas fornecem pontos de partida:

```typescript
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(), // Every permission
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
} as const;
```

## Grupos de permissão

Os grupos organizam permissões para exibição da IU com ícones e descrições:

```typescript
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;       // Lucide icon name
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [...items, ...categories, ...tags],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [...users, ...roles],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [...analytics, ...system],
  },
];
```

### Funções de consulta de grupo

```typescript
// Find which group a permission belongs to
export function getPermissionGroup(permission: Permission): PermissionGroup | undefined;

// Get all permissions in a group by group ID
export function getPermissionsByGroup(groupId: string): Permission[];
```

### Formatação de exibição de permissão

```typescript
// Format for display: "items:approve" -> "Approve Items"
export function formatPermissionName(permission: Permission): string;

// Generate description: "items:approve" -> "Approve submissions items and submissions"
export function formatPermissionDescription(permission: Permission): string;
```

O formatador de descrição usa tabelas de pesquisa para ações e recursos:

|Ação|Descrição Prefixo|
|--------|-------------------|
|`read`|Visualizar e acessar|
|`create`|Criar novo|
|`update`|Editar existente|
|`delete`|Remover|
|`review`|Revise e modere|
|`approve`|Aprovar envios|
|`reject`|Rejeitar envios|
|`assignRoles`|Atribuir funções a|
|`export`|Exportar dados de|
|`settings`|Gerenciar configurações para|

## Gerenciamento de estado de permissão

O módulo de utilitários fornece funções para gerenciar o estado de permissão na IU:

### Criando estado a partir de permissões

```typescript
export function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### Extraindo permissões selecionadas

```typescript
export function getSelectedPermissions(permissionState: PermissionState): Permission[];
// Filters the state object to return only permissions where value is `true`
```

### Detecção de alterações

```typescript
export function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: Permission[], removed: Permission[] }
```

### Verificação de igualdade

```typescript
export function arePermissionsEqual(
  permissions1: Permission[],
  permissions2: Permission[]
): boolean;
// Uses Set-based comparison for order-independent equality
```

### Filtragem de pesquisa

```typescript
export function filterPermissions(
  permissions: Permission[],
  searchTerm: string
): Permission[];
// Matches against permission string and space-separated format
// e.g., "assign" matches "users:assignRoles" and "users assignRoles"
```

## Exemplo de uso

```typescript
import { PERMISSIONS, getAllPermissions } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS, formatPermissionName } from '@/lib/permissions/groups';
import { createPermissionState, calculatePermissionChanges } from '@/lib/permissions/utils';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // User can approve items
}

// Build a permission editor UI
const state = createPermissionState(user.permissions);

// After user toggles permissions
const changes = calculatePermissionChanges(user.permissions, newPermissions);
console.log(`Added: ${changes.added.length}, Removed: ${changes.removed.length}`);
```
