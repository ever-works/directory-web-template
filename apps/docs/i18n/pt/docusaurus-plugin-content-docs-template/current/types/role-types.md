---
id: role-types
title: Definições de tipo de sistema de função
sidebar_label: Tipos de função
sidebar_position: 19
---

# Definições de tipo de sistema de função

**Fonte:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

As funções agrupam as permissões e são atribuídas aos usuários. O sistema oferece suporte a funções personalizadas com matrizes de permissão granulares.

## Interfaces

### `RoleData`

A estrutura de dados de função principal retornada pela API.

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

|Campo|Descrição|
|-------|-------------|
|`id`|Slug minúsculo, 3-50 caracteres, padrão: `^[a-z0-9-]+$`|
|`name`|Nome legível por humanos, 3 a 100 caracteres|
|`isAdmin`|Quando `true`, a função concede acesso total ao sistema, independentemente das permissões individuais|
|`permissions`|Matriz de strings `resource:action` do registro de permissão|

### `RoleWithCount`

Dados de função estendidos com contagem de atribuições de usuários.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Carga útil para criar uma nova função.

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

Carga útil para atualizar uma função. Somente `id` é necessário; todos os outros campos são opcionais.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Parâmetros de consulta para listar funções.

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

Resposta da lista de funções paginada.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Tipos de Atribuição

### `RoleAssignment`

Carga útil de atribuição mínima.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Atribui uma função a um usuário específico.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Atualiza as permissões em uma função.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Aliases de tipo

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Tipo de status

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Regras de validação

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

|Campo|Regra|
|-------|------|
|`id`|De 3 a 50 caracteres, somente letras minúsculas e hifens|
|`name`|3-100 caracteres|
|`description`|Máximo de 500 caracteres|

## Funções padrão

O modelo é fornecido com duas funções integradas definidas em `lib/permissions/definitions.ts`:

|Função|ID|Administrador|Permissões|
|------|----|-------|-------------|
|Superadministrador|`super-admin`|Sim|Todas as permissões|
|Gerenciador de conteúdo|`content-manager`|Não|Todas as permissões `items`, `categories` e `tags`|

## Esquema de banco de dados

### `roles` tabela

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

### `user_roles` tabela

Tabela de junção ligando usuários a funções.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de permissão](./permission-types.md) – definições de permissão e grupos
- [Tipos de autenticação](./auth-types.md) - sessões de usuário com sinalizador de administrador
- [Tipos de usuário](./user-types.md) - estruturas de dados do usuário
