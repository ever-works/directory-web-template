---
id: permission-types
title: Permission Type Definitions
sidebar_label: Permission Types
sidebar_position: 13
---

# Permission Type Definitions

**Source:** `lib/permissions/definitions.ts`, `lib/permissions/groups.ts`, `lib/db/schema.ts`

The permission system uses a `resource:action` string pattern to define granular access control. Permissions are assigned to roles, which are assigned to users.

## Core Type

### `Permission`

A union of all valid permission strings, derived from the `PERMISSIONS` constant.

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

## Permission Registry

The `PERMISSIONS` constant organises permissions by resource.

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

| Resource | Actions |
|----------|---------|
| `items` | `read`, `create`, `update`, `delete`, `review`, `approve`, `reject` |
| `categories` | `read`, `create`, `update`, `delete` |
| `tags` | `read`, `create`, `update`, `delete` |
| `roles` | `read`, `create`, `update`, `delete` |
| `users` | `read`, `create`, `update`, `delete`, `assignRoles` |
| `analytics` | `read`, `export` |
| `system` | `settings` |

## Interfaces

### `PermissionGroup`

Groups related permissions for the admin UI.

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

The template ships with three built-in groups:

| Group | Permissions Included |
|-------|---------------------|
| `content` | All `items`, `categories`, and `tags` permissions |
| `users` | All `users` and `roles` permissions |
| `system` | All `analytics` and `system` permissions |

## Database Schema

### `permissions` table

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions` table

Junction table linking roles to their permissions.

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## Utility Functions

| Function | Return | Description |
|----------|--------|-------------|
| `getAllPermissions()` | `Permission[]` | Returns every permission string |
| `getPermissionsForResource(resource)` | `Permission[]` | Returns permissions for a specific resource |
| `isValidPermission(str)` | `boolean` | Type guard checking if a string is a valid permission |
| `getPermissionGroup(perm)` | `PermissionGroup` | Finds which group a permission belongs to |
| `formatPermissionName(perm)` | `string` | Formats `'items:create'` as `'Create Items'` |
| `formatPermissionDescription(perm)` | `string` | Generates a human-readable description |

## Usage Example

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

## Related Types

- [Role Types](./role-types.md) -- role definitions and assignments
- [Auth Types](./auth-types.md) -- user session with `isAdmin` flag
