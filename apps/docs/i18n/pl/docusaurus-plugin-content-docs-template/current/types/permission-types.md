---
id: permission-types
title: Definicje typów uprawnień
sidebar_label: Typy uprawnień
sidebar_position: 13
---

# Definicje typów uprawnień

**Źródło:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

System uprawnień wykorzystuje ciąg znaków `resource:action` do definiowania szczegółowej kontroli dostępu. Uprawnienia przypisane są do ról, które są przypisane do użytkowników.

## Typ rdzenia

### `Permission`

Suma wszystkich prawidłowych ciągów uprawnień, wyprowadzona ze stałej `PERMISSIONS`.

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

## Rejestr uprawnień

Stała `PERMISSIONS` porządkuje uprawnienia według zasobu.

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

|Zasób|Działania|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Interfejsy

### `PermissionGroup`

Grupy powiązane uprawnienia w interfejsie administratora.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Szablon jest dostarczany z trzema wbudowanymi grupami:

|Grupa|Uprawnienia uwzględnione|
|-------|---------------------|
|`content`|Wszystkie uprawnienia `items`, `categories` i `tags`|
|`users`|Wszystkie uprawnienia `users` i `roles`|
|`system`|Wszystkie uprawnienia `analytics` i `system`|

## Schemat bazy danych

### `permissions` stół

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` stół

Tabela połączeń łącząca role z ich uprawnieniami.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Funkcje użytkowe

|Funkcja|Wróć|Opis|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Zwraca każdy ciąg uprawnień|
|`getPermissionsForResource(resource)`|`Permission[]`|Zwraca uprawnienia dla określonego zasobu|
|`isValidPermission(str)`|`boolean`|Wpisz strażnik sprawdzający, czy ciąg znaków jest prawidłowym uprawnieniem|
|`getPermissionGroup(perm)`|`PermissionGroup`|Sprawdza, do której grupy należy dane uprawnienie|
|`formatPermissionName(perm)`|`string`|Formatuje `'items:create'` jako `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Generuje opis czytelny dla człowieka|

## Przykład użycia

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

## Powiązane typy

- [Typy ról](./role-types.md) -- definicje i przypisania ról
- [Typy uwierzytelniania](./auth-types.md) -- sesja użytkownika z flagą `isAdmin`
