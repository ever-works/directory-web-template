---
id: role-types
title: Определения типов ролевой системы
sidebar_label: Типы ролей
sidebar_position: 19
---

# Определения типов ролевой системы

**Источник:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Роли группируют разрешения и назначаются пользователям. Система поддерживает пользовательские роли с детализированной матрицей разрешений.

## Интерфейсы

### `RoleData`

Основная структура данных роли, возвращаемая API.

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
|`id`|Маркер в нижнем регистре, 3–50 символов, шаблон: `^[a-z0-9-]+$`.|
|`name`|Понятное имя, 3-100 символов.|
|`isAdmin`|Если `true`, роль предоставляет полный доступ к системе независимо от индивидуальных разрешений.|
|`permissions`|Массив строк `resource:action` из реестра разрешений.|

### `RoleWithCount`

Данные о ролях расширены за счет количества назначений пользователей.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Полезная нагрузка для создания новой роли.

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

Полезная нагрузка для обновления роли. Требуется только `id`; все остальные поля являются необязательными.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Параметры запроса для получения списка ролей.

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

Ответ со списком ролей с разбивкой на страницы.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Типы назначений

### `RoleAssignment`

Минимальная полезная нагрузка назначения.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Назначает роль конкретному пользователю.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Обновляет разрешения для роли.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Введите псевдонимы

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Тип статуса

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Правила валидации

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

|Поле|Правило|
|-------|------|
|`id`|3–50 символов, только строчные буквы, цифры и дефисы.|
|`name`|3-100 символов|
|`description`|Максимум 500 символов|

## Роли по умолчанию

Шаблон поставляется с двумя встроенными ролями, определенными в `lib/permissions/definitions.ts`:

|Роль|идентификатор|Админ|Разрешения|
|------|----|-------|-------------|
|Супер администратор|`super-admin`|Да|Все разрешения|
|Контент-менеджер|`content-manager`|Нет|Все разрешения `items`, `categories` и `tags`|

## Схема базы данных

### `roles` стол

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

### `user_roles` стол

Таблица соединений, связывающая пользователей с ролями.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Пример использования

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

## Связанные типы

- [Типы разрешений](./permission-types.md) – определения и группы разрешений.
- [Типы аутентификации](./auth-types.md) — сеансы пользователей с флагом администратора.
- [Типы пользователей](./user-types.md) -- структуры пользовательских данных
