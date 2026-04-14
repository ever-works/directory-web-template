---
id: permission-types
title: Дефиниции на типове разрешения
sidebar_label: Видове разрешения
sidebar_position: 13
---

# Дефиниции на типове разрешения

**Източник:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Системата за разрешения използва `resource:action` низов модел, за да дефинира подробен контрол на достъпа. Разрешенията се присвояват на роли, които се присвояват на потребители.

## Тип ядро

### `Permission`

Обединение на всички валидни низове за разрешение, получени от константата `PERMISSIONS`.

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

## Регистър на разрешенията

Константата `PERMISSIONS` организира разрешенията по ресурс.

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

## Интерфейси

### `PermissionGroup`

Свързани с групи разрешения за потребителския интерфейс на администратора.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Шаблонът се доставя с три вградени групи:

|Група|Включени разрешения|
|-------|---------------------|
|`content`|Всички разрешения за `items`, `categories` и `tags`|
|`users`|Всички разрешения `users` и `roles`|
|`system`|Всички разрешения `analytics` и `system`|

## Схема на база данни

### `permissions` маса

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` маса

Съединителна таблица, свързваща роли с техните разрешения.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Полезни функции

|функция|Връщане|Описание|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Връща всеки низ за разрешение|
|`getPermissionsForResource(resource)`|`Permission[]`|Връща разрешения за конкретен ресурс|
|`isValidPermission(str)`|`boolean`|Тип guard проверява дали даден низ е валидно разрешение|
|`getPermissionGroup(perm)`|`PermissionGroup`|Намира към коя група принадлежи дадено разрешение|
|`formatPermissionName(perm)`|`string`|Форматира `'items:create'` като `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Генерира разбираемо за човека описание|

## Пример за използване

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

## Свързани типове

- [Типове роли](./role-types.md) -- дефиниции на роли и присвояване
- [Auth Types](./auth-types.md) -- потребителска сесия с `isAdmin` флаг
