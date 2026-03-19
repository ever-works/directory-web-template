---
id: role-types
title: Role System Type Definitions
sidebar_label: Role Types
sidebar_position: 19
---

# Role System Type Definitions

**Source:** `lib/types/role.ts`, `lib/permissions/definitions.ts`, `lib/db/schema.ts`

Roles group permissions together and are assigned to users. The system supports custom roles with granular permission matrices.

## Interfaces

### `RoleData`

The primary role data structure returned by the API.

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

| Field | Description |
|-------|-------------|
| `id` | Lowercase slug, 3-50 characters, pattern: `^[a-z0-9-]+$` |
| `name` | Human-readable name, 3-100 characters |
| `isAdmin` | When `true`, the role grants full system access regardless of individual permissions |
| `permissions` | Array of `resource:action` strings from the permission registry |

### `RoleWithCount`

Role data extended with user assignment count.

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

Payload for creating a new role.

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

Payload for updating a role. Only `id` is required; all other fields are optional.

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

Query parameters for listing roles.

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

Paginated role list response.

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## Assignment Types

### `RoleAssignment`

Minimal assignment payload.

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

Assigns a role to a specific user.

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

Updates the permissions on a role.

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### Type Aliases

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## Status Type

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## Validation Rules

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

| Field | Rule |
|-------|------|
| `id` | 3-50 chars, lowercase alphanumeric and hyphens only |
| `name` | 3-100 characters |
| `description` | Maximum 500 characters |

## Default Roles

The template ships with two built-in roles defined in `lib/permissions/definitions.ts`:

| Role | ID | Admin | Permissions |
|------|----|-------|-------------|
| Super Administrator | `super-admin` | Yes | All permissions |
| Content Manager | `content-manager` | No | All `items`, `categories`, and `tags` permissions |

## Database Schema

### `roles` table

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

### `user_roles` table

Junction table linking users to roles.

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## Usage Example

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

## Related Types

- [Permission Types](./permission-types.md) -- permission definitions and groups
- [Auth Types](./auth-types.md) -- user sessions with admin flag
- [User Types](./user-types.md) -- user data structures
