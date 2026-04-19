---
id: permission-types
title: Определения типов разрешений
sidebar_label: Типы разрешений
sidebar_position: 13
---

# Определения типов разрешений

**Источник:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Система разрешений использует строковый шаблон `resource:action` для определения детального контроля доступа. Разрешения назначаются ролям, которые назначаются пользователям.

## Тип ядра

### `Permission`

Объединение всех допустимых строк разрешений, полученное из константы `PERMISSIONS`.

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

## Реестр разрешений

Константа `PERMISSIONS` упорядочивает разрешения по ресурсам.

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

|Ресурс|Действия|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Интерфейсы

### `PermissionGroup`

Разрешения, связанные с группами, для пользовательского интерфейса администратора.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Шаблон поставляется с тремя встроенными группами:

|Группа|Разрешения включены|
|-------|---------------------|
|`content`|Все разрешения `items`, `categories` и `tags`|
|`users`|Все разрешения `users` и `roles`|
|`system`|Все разрешения `analytics` и `system`|

## Схема базы данных

### `permissions` стол

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` стол

Таблица соединений, связывающая роли с их разрешениями.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Служебные функции

|Функция|Возврат|Описание|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Возвращает каждую строку разрешения|
|`getPermissionsForResource(resource)`|`Permission[]`|Возвращает разрешения для определенного ресурса|
|`isValidPermission(str)`|`boolean`|Защита типа проверяет, является ли строка действительным разрешением|
|`getPermissionGroup(perm)`|`PermissionGroup`|Находит, к какой группе принадлежит разрешение|
|`formatPermissionName(perm)`|`string`|Форматирует `'items:create'` как `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Создает удобочитаемое описание|

## Пример использования

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

## Связанные типы

- [Типы ролей](./role-types.md) – определения и назначения ролей.
- [Типы аутентификации](./auth-types.md) – сеанс пользователя с флагом `isAdmin`
