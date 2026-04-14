---
id: permission-types
title: Definities van machtigingstypen
sidebar_label: Toestemmingstypen
sidebar_position: 13
---

# Definities van machtigingstypen

**Bron:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Het toestemmingssysteem gebruikt een `resource:action` tekenreekspatroon om gedetailleerde toegangscontrole te definiëren. Machtigingen worden toegewezen aan rollen, die worden toegewezen aan gebruikers.

## Kerntype

### `Permission`

Een samenvoeging van alle geldige toestemmingsreeksen, afgeleid van de constante `PERMISSIONS`.

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

## Toestemmingsregister

De constante `PERMISSIONS` organiseert machtigingen per resource.

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

|Bron|Acties|
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

Groepsgerelateerde machtigingen voor de beheerdersinterface.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

De sjabloon wordt geleverd met drie ingebouwde groepen:

|Groep|Machtigingen inbegrepen|
|-------|---------------------|
|`content`|Alle `items`, `categories` en `tags` rechten|
|`users`|Alle `users` en `roles` rechten|
|`system`|Alle `analytics` en `system` rechten|

## Databaseschema

### `permissions` tabel

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` tabel

Verbindingstabel die rollen koppelt aan hun machtigingen.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Nuttige functies

|Functie|Keer terug|Beschrijving|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Retourneert elke toestemmingsreeks|
|`getPermissionsForResource(resource)`|`Permission[]`|Retourneert machtigingen voor een specifieke bron|
|`isValidPermission(str)`|`boolean`|Type guard controleert of een string een geldige toestemming is|
|`getPermissionGroup(perm)`|`PermissionGroup`|Zoekt tot welke groep een machtiging behoort|
|`formatPermissionName(perm)`|`string`|Formaten `'items:create'` als `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Genereert een voor mensen leesbare beschrijving|

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Roltypen](./role-types.md) -- roldefinities en toewijzingen
- [Auth Types](./auth-types.md) -- gebruikerssessie met `isAdmin` vlag
