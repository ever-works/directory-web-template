---
id: permission-types
title: Berechtigungstypdefinitionen
sidebar_label: Berechtigungstypen
sidebar_position: 13
---

# Berechtigungstypdefinitionen

**Quelle:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Das Berechtigungssystem verwendet ein Zeichenfolgenmuster `resource:action`, um eine differenzierte Zugriffskontrolle zu definieren. Berechtigungen werden Rollen zugewiesen, die Benutzern zugewiesen werden.

## Kerntyp

### `Permission`

Eine Vereinigung aller gültigen Berechtigungszeichenfolgen, abgeleitet von der Konstante `PERMISSIONS`.

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

## Berechtigungsregister

Die Konstante `PERMISSIONS` organisiert Berechtigungen nach Ressource.

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

|Ressource|Aktionen|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Schnittstellen

### `PermissionGroup`

Gruppiert verwandte Berechtigungen für die Admin-Benutzeroberfläche.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Die Vorlage wird mit drei integrierten Gruppen geliefert:

|Gruppe|Berechtigungen enthalten|
|-------|---------------------|
|`content`|Alle Berechtigungen `items`, `categories` und `tags`|
|`users`|Alle Berechtigungen `users` und `roles`|
|`system`|Alle Berechtigungen `analytics` und `system`|

## Datenbankschema

### `permissions` Tabelle

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` Tabelle

Verbindungstabelle, die Rollen mit ihren Berechtigungen verknüpft.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Utility-Funktionen

|Funktion|Rückkehr|Beschreibung|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Gibt jede Berechtigungszeichenfolge zurück|
|`getPermissionsForResource(resource)`|`Permission[]`|Gibt Berechtigungen für eine bestimmte Ressource zurück|
|`isValidPermission(str)`|`boolean`|Typschutz prüft, ob eine Zeichenfolge eine gültige Berechtigung ist|
|`getPermissionGroup(perm)`|`PermissionGroup`|Ermittelt, zu welcher Gruppe eine Berechtigung gehört|
|`formatPermissionName(perm)`|`string`|Formatiert `'items:create'` als `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Erzeugt eine für Menschen lesbare Beschreibung|

## Anwendungsbeispiel

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

## Verwandte Typen

- [Rollentypen](./role-types.md) – Rollendefinitionen und -zuweisungen
- [Auth-Typen](./auth-types.md) – Benutzersitzung mit `isAdmin`-Flag
