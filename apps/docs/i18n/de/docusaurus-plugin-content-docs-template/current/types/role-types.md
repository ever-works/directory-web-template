---
id: role-types
title: Rollensystemtypdefinitionen
sidebar_label: Rollentypen
sidebar_position: 19
---

# Rollensystemtypdefinitionen

**Quelle:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Rollen gruppieren Berechtigungen und werden Benutzern zugewiesen. Das System unterstützt benutzerdefinierte Rollen mit granularen Berechtigungsmatrizen.

## Schnittstellen

### `RoleData`

Die von der API zurückgegebene primäre Rollendatenstruktur.

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

|Feld|Beschreibung|
|-------|-------------|
|`id`|Kleinbuchstaben, 3–50 Zeichen, Muster: `^[a-z0-9-]+$`|
|`name`|Für Menschen lesbarer Name, 3–100 Zeichen|
|`isAdmin`|Wenn `true`, gewährt die Rolle unabhängig von individuellen Berechtigungen vollständigen Systemzugriff|
|`permissions`|Array von `resource:action` Zeichenfolgen aus der Berechtigungsregistrierung|

### `RoleWithCount`

Rollendaten erweitert um die Anzahl der Benutzerzuweisungen.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Nutzlast zum Erstellen einer neuen Rolle.

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

Nutzlast zum Aktualisieren einer Rolle. Es ist nur `id` erforderlich; Alle anderen Felder sind optional.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Abfrageparameter zum Auflisten von Rollen.

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

Antwort der paginierten Rollenliste.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Aufgabentypen

### `RoleAssignment`

Minimale Zuweisungsnutzlast.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Weist einem bestimmten Benutzer eine Rolle zu.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Aktualisiert die Berechtigungen für eine Rolle.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Geben Sie Aliase ein

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Statustyp

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Validierungsregeln

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

|Feld|Regel|
|-------|------|
|`id`|3–50 Zeichen, nur Kleinbuchstaben und Bindestriche|
|`name`|3-100 Zeichen|
|`description`|Maximal 500 Zeichen|

## Standardrollen

Die Vorlage wird mit zwei integrierten Rollen geliefert, die in `lib/permissions/definitions.ts` definiert sind:

|Rolle|Ausweis|Admin|Berechtigungen|
|------|----|-------|-------------|
|Superadministrator|`super-admin`|Ja|Alle Berechtigungen|
|Content-Manager|`content-manager`|Nein|Alle Berechtigungen `items`, `categories` und `tags`|

## Datenbankschema

### `roles` Tabelle

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

### `user_roles` Tabelle

Verbindungstabelle, die Benutzer mit Rollen verknüpft.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Anwendungsbeispiel

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

## Verwandte Typen

- [Berechtigungstypen](./permission-types.md) – Berechtigungsdefinitionen und -gruppen
- [Auth-Typen](./auth-types.md) – Benutzersitzungen mit Admin-Flag
- [Benutzertypen](./user-types.md) – Benutzerdatenstrukturen
