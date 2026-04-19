---
id: role-types
title: Definiciones de tipos de sistemas de roles
sidebar_label: Tipos de roles
sidebar_position: 19
---

# Definiciones de tipos de sistemas de roles

**Fuente:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Los roles agrupan permisos y se asignan a los usuarios. El sistema admite roles personalizados con matrices de permisos granulares.

## Interfaces

### `RoleData`

La estructura de datos de la función principal devuelta por la API.

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

|campo|Descripción|
|-------|-------------|
|`id`|Babosa minúscula, de 3 a 50 caracteres, patrón: `^[a-z0-9-]+$`|
|`name`|Nombre legible por humanos, entre 3 y 100 caracteres|
|`isAdmin`|Cuando `true`, el rol otorga acceso completo al sistema independientemente de los permisos individuales|
|`permissions`|Matriz de cadenas `resource:action` del registro de permisos|

### `RoleWithCount`

Datos de roles ampliados con recuento de asignaciones de usuarios.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Carga útil para crear un nuevo rol.

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

Carga útil para actualizar un rol. Sólo se requiere `id`; todos los demás campos son opcionales.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Parámetros de consulta para enumerar roles.

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

Respuesta de lista de roles paginada.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Tipos de tareas

### `RoleAssignment`

Carga útil de asignación mínima.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Asigna un rol a un usuario específico.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Actualiza los permisos de un rol.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Tipo de alias

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Tipo de estado

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Reglas de validación

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

|campo|regla|
|-------|------|
|`id`|3-50 caracteres, alfanuméricos en minúsculas y guiones solamente|
|`name`|3-100 caracteres|
|`description`|Máximo 500 caracteres|

## Roles predeterminados

La plantilla se entrega con dos roles integrados definidos en `lib/permissions/definitions.ts`:

|Rol|identificación|administrador|Permisos|
|------|----|-------|-------------|
|superadministrador|`super-admin`|si|Todos los permisos|
|Administrador de contenido|`content-manager`|No|Todos los permisos `items`, `categories` y `tags`|

## Esquema de base de datos

### `roles` tabla

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

### `user_roles` tabla

Tabla de unión que vincula a los usuarios con los roles.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de permisos](./permission-types.md) -- definiciones y grupos de permisos
- [Tipos de autenticación](./auth-types.md) -- sesiones de usuario con indicador de administrador
- [Tipos de usuario](./user-types.md) -- estructuras de datos de usuario
