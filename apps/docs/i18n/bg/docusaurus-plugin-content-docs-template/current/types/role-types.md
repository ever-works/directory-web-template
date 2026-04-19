---
id: role-types
title: Дефиниции на типа ролева система
sidebar_label: Типове роли
sidebar_position: 19
---

# Дефиниции на типа ролева система

**Източник:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Ролите групират разрешения заедно и се присвояват на потребителите. Системата поддържа потребителски роли с подробни матрици на разрешения.

## Интерфейси

### `RoleData`

Структурата на данните за основната роля, върната от API.

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

|Поле|Описание|
|-------|-------------|
|`id`|Малки букви, 3-50 знака, модел: `^[a-z0-9-]+$`|
|`name`|Четимо име, 3-100 знака|
|`isAdmin`|Когато `true`, ролята предоставя пълен достъп до системата, независимо от индивидуалните разрешения|
|`permissions`|Масив от `resource:action` низове от регистъра на разрешенията|

### `RoleWithCount`

Данните за ролята са разширени с броя на присвоените потребители.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Полезен товар за създаване на нова роля.

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

Полезен товар за актуализиране на роля. Изисква се само `id`; всички останали полета не са задължителни.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Параметри на заявка за изброяване на роли.

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

Страниран списък с роли.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Видове задания

### `RoleAssignment`

Минимален полезен товар за присвояване.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Присвоява роля на конкретен потребител.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Актуализира разрешенията за роля.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Тип псевдоними

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Тип състояние

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Правила за валидиране

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

|Поле|правило|
|-------|------|
|`id`|3-50 символа, само малки букви, цифри и тирета|
|`name`|3-100 знака|
|`description`|Максимум 500 знака|

## Роли по подразбиране

Шаблонът се доставя с две вградени роли, дефинирани в `lib/permissions/definitions.ts`:

|Роля|ID|Админ|Разрешения|
|------|----|-------|-------------|
|Супер администратор|`super-admin`|да|Всички разрешения|
|Мениджър на съдържанието|`content-manager`|не|Всички разрешения за `items`, `categories` и `tags`|

## Схема на база данни

### `roles` маса

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

### `user_roles` маса

Съединителна таблица, свързваща потребители с роли.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Пример за използване

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

## Свързани типове

- [Типове разрешения](./permission-types.md) -- дефиниции на разрешения и групи
- [Auth Types](./auth-types.md) -- потребителски сесии с администраторски флаг
- [Потребителски типове](./user-types.md) -- структури на потребителски данни
