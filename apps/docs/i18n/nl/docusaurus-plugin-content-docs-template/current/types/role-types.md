---
id: role-types
title: Definities van rolsysteemtypen
sidebar_label: Roltypen
sidebar_position: 19
---

# Definities van rolsysteemtypen

**Bron:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Rollen groeperen machtigingen en worden toegewezen aan gebruikers. Het systeem ondersteunt aangepaste rollen met gedetailleerde machtigingsmatrices.

## Interfaces

### `RoleData`

De gegevensstructuur van de primaire rol die door de API wordt geretourneerd.

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

|Veld|Beschrijving|
|-------|-------------|
|`id`|Kleine letter, 3-50 tekens, patroon: `^[a-z0-9-]+$`|
|`name`|Voor mensen leesbare naam, 3-100 tekens|
|`isAdmin`|Wanneer `true`, verleent de rol volledige systeemtoegang, ongeacht individuele machtigingen|
|`permissions`|Array van `resource:action` tekenreeksen uit het toestemmingsregister|

### `RoleWithCount`

Rolgegevens uitgebreid met aantal gebruikerstoewijzingen.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Payload voor het maken van een nieuwe rol.

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

Payload voor het bijwerken van een rol. Alleen `id` is vereist; alle andere velden zijn optioneel.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Queryparameters voor het weergeven van rollen.

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

Gepagineerde rollijstreactie.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Toewijzingstypen

### `RoleAssignment`

Minimale opdrachtpayload.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Wijst een rol toe aan een specifieke gebruiker.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Werkt de machtigingen voor een rol bij.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Typ aliassen

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Statustype

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Validatieregels

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

|Veld|Regel|
|-------|------|
|`id`|3-50 tekens, alleen alfanumerieke kleine letters en koppeltekens|
|`name`|3-100 tekens|
|`description`|Maximaal 500 tekens|

## Standaardrollen

De sjabloon wordt geleverd met twee ingebouwde rollen gedefinieerd in `lib/permissions/definitions.ts`:

|Rol|Identiteitskaart|Beheerder|Machtigingen|
|------|----|-------|-------------|
|Superbeheerder|`super-admin`|Ja|Alle rechten|
|Inhoudsbeheerder|`content-manager`|Nee|Alle `items`, `categories` en `tags` rechten|

## Databaseschema

### `roles` tabel

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

### `user_roles` tabel

Verbindingstabel die gebruikers aan rollen koppelt.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Permissietypen](./permission-types.md) -- machtigingsdefinities en -groepen
- [Auth Types](./auth-types.md) -- gebruikerssessies met beheerdersvlag
- [Gebruikerstypen](./user-types.md) -- gebruikersgegevensstructuren
