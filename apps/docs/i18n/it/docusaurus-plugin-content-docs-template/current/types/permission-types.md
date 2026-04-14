---
id: permission-types
title: Definizioni dei tipi di autorizzazione
sidebar_label: Tipi di autorizzazione
sidebar_position: 13
---

# Definizioni dei tipi di autorizzazione

**Fonte:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

Il sistema di autorizzazione utilizza un modello di stringa `resource:action` per definire il controllo granulare degli accessi. Le autorizzazioni vengono assegnate ai ruoli, che a loro volta vengono assegnati agli utenti.

## Tipo di nucleo

### `Permission`

Un'unione di tutte le stringhe di autorizzazione valide, derivata dalla costante `PERMISSIONS`.

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

## Registro dei permessi

La costante `PERMISSIONS` organizza le autorizzazioni per risorsa.

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

|Risorsa|Azioni|
|----------|---------|
|`items`|`read`, `create`, `update`, `delete`, `review`, `approve`, `reject`|
|`categories`|`read`, `create`, `update`, `delete`|
|`tags`|`read`, `create`, `update`, `delete`|
|`roles`|`read`, `create`, `update`, `delete`|
|`users`|`read`, `create`, `update`, `delete`, `assignRoles`|
|`analytics`|`read`, `export`|
|`system`|`settings`|

## Interfacce

### `PermissionGroup`

Autorizzazioni relative ai gruppi per l'interfaccia utente di amministrazione.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

Il modello viene fornito con tre gruppi integrati:

|Gruppo|Autorizzazioni incluse|
|-------|---------------------|
|`content`|Tutte le autorizzazioni `items`, `categories` e `tags`|
|`users`|Tutte le autorizzazioni `users` e `roles`|
|`system`|Tutte le autorizzazioni `analytics` e `system`|

## Schema della banca dati

### `permissions` tabella

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` tabella

Tabella di giunzione che collega i ruoli alle relative autorizzazioni.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Funzioni di utilità

|Funzione|Ritorno|Descrizione|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|Restituisce ogni stringa di autorizzazione|
|`getPermissionsForResource(resource)`|`Permission[]`|Restituisce le autorizzazioni per una risorsa specifica|
|`isValidPermission(str)`|`boolean`|Digita guard controllando se una stringa è un'autorizzazione valida|
|`getPermissionGroup(perm)`|`PermissionGroup`|Trova a quale gruppo appartiene un'autorizzazione|
|`formatPermissionName(perm)`|`string`|Formati `'items:create'` come `'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|Genera una descrizione leggibile dall'uomo|

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di ruolo](./role-types.md) -- definizioni e assegnazioni di ruolo
- [Tipi di autenticazione](./auth-types.md) - sessione utente con flag `isAdmin`
