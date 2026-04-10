---
id: rbac
title: Control de acceso basado en roles (RBAC)
sidebar_label: RBAC
sidebar_position: 5
---

# Control de acceso basado en roles (RBAC)

The template implements a comprehensive RBAC system with four database tables, a typed permission definitions layer, and utility functions for UI organization and state management. Permissions follow a `resource:action` naming convention and are organized into logical groups for the admin interface.

## Database Schema

### Roles Table

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status'),        // 'active' | 'inactive'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),  // Soft delete
});
```

Roles are soft-deleted (using `deletedAt`) to preserve audit trails. Indexes are created on `status`, `isAdmin`, and `createdAt` for query performance.

### Permissions Table

```typescript
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text('key').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

Permission IDs are auto-generated UUIDs. The `key` field stores the permission identifier in `resource:action` format (e.g., `items:create`).

### Role Permissions (Junction Table)

```typescript
export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Uses a composite primary key on `(roleId, permissionId)` with cascading deletes in both directions. Indexed on both `roleId` and `permissionId` for efficient lookups.

### User Roles (Junction Table)

```typescript
export const userRoles = pgTable('user_roles', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Composite primary key on `(userId, roleId)` with cascading deletes. Users can have multiple roles assigned.

## Permission Definitions

All permissions are defined as constants in `lib/permissions/definitions.ts`:

```typescript
export const PERMISSIONS = {
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
  tags: {
    read: 'tags:read',
    create: 'tags:create',
    update: 'tags:update',
    delete: 'tags:delete',
  },
  roles: {
    read: 'roles:read',
    create: 'roles:create',
    update: 'roles:update',
    delete: 'roles:delete',
  },
  users: {
    read: 'users:read',
    create: 'users:create',
    update: 'users:update',
    delete: 'users:delete',
    assignRoles: 'users:assignRoles',
  },
  analytics: {
    read: 'analytics:read',
    export: 'analytics:export',
  },
  system: {
    settings: 'system:settings',
  },
} as const;
```

### Permission Type

The `Permission` type is derived from the `PERMISSIONS` constant, ensuring type safety:

```typescript
type Permission = PermissionValues<typeof PERMISSIONS>;
// Resolves to: 'items:read' | 'items:create' | ... | 'system:settings'
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `getAllPermissions()` | Returns flat array of all permission strings |
| `getPermissionsForResource(resource)` | Returns all permissions for a resource (e.g., `'items'`) |
| `isValidPermission(permission)` | Type guard that validates a string is a valid permission |

## Default Roles

Two default roles are defined for seeding:

### Super Administrator

```typescript
SUPER_ADMIN: {
  id: 'super-admin',
  name: 'Super Administrator',
  description: 'Full system access with all permissions',
  permissions: getAllPermissions(),  // All 26 permissions
}
```

### Content Manager

```typescript
CONTENT_MANAGER: {
  id: 'content-manager',
  name: 'Content Manager',
  description: 'Manage content including items, categories, and tags',
  permissions: [
    ...getPermissionsForResource('items'),       // 7 permissions
    ...getPermissionsForResource('categories'),  // 4 permissions
    ...getPermissionsForResource('tags'),         // 4 permissions
  ],  // 15 permissions total
}
```

## Permission Groups

Permissions are organized into UI groups in `lib/permissions/groups.ts` for the admin role management interface:

### Content Management

- **ID**: `content`
- **Icon**: `FileText`
- **Permissions**: All `items`, `categories`, and `tags` permissions (15 total)

### User Management

- **ID**: `users`
- **Icon**: `Users`
- **Permissions**: All `users` and `roles` permissions (9 total)

### System & Analytics

- **ID**: `system`
- **Icon**: `Settings`
- **Permissions**: All `analytics` and `system` permissions (3 total)

### Group Utility Functions

| Function | Return Type | Description |
|----------|-------------|-------------|
| `getPermissionGroup(permission)` | `PermissionGroup \| undefined` | Find which group a permission belongs to |
| `getPermissionsByGroup(groupId)` | `Permission[]` | Get all permissions in a group |
| `formatPermissionName(permission)` | `string` | Format `items:create` as `Create Items` |
| `formatPermissionDescription(permission)` | `string` | Format `items:create` as `Create new items and submissions` |

## Permission State Management

The `lib/permissions/utils.ts` module provides functions for managing permission state in the admin UI:

### State Creation

```typescript
function createPermissionState(currentPermissions: Permission[]): PermissionState;
// Returns: { 'items:read': true, 'items:create': true, ... }
```

### Change Detection

```typescript
function calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges;
// Returns: { added: ['tags:delete'], removed: ['users:create'] }
```

### Equality Check

```typescript
function arePermissionsEqual(permissions1: Permission[], permissions2: Permission[]): boolean;
```

### Filtering

```typescript
function filterPermissions(permissions: Permission[], searchTerm: string): Permission[];
// Matches against both 'items:read' and 'items read' formats
```

## Database Query Layer

### Role Queries (`lib/db/roles.ts`)

The role query module provides core RBAC operations:

```typescript
// Get all roles assigned to a user
async function getUserRoles(userId: string);

// Check if a user has a specific role by name
async function hasRole(userId: string, roleName: string): Promise<boolean>;

// Check if a user has a specific permission
async function hasPermission(userId: string, permissionKey: string): Promise<boolean>;

// Check if a user is an admin (has any role with isAdmin=true)
async function isAdmin(userId: string): Promise<boolean>;
```

The `hasPermission` function performs a multi-table join across `userRoles -> roles -> rolePermissions -> permissions`, filtering for active roles only:

```sql
SELECT permissions.id
FROM user_roles
JOIN roles ON user_roles.role_id = roles.id
JOIN role_permissions ON roles.id = role_permissions.role_id
JOIN permissions ON role_permissions.permission_id = permissions.id
WHERE user_roles.user_id = ? AND permissions.key = ? AND roles.status = 'active'
LIMIT 1
```

### Role Service (`lib/services/role-db.service.ts`)

The `RoleDbService` provides higher-level role management with efficient batch permission loading:

```typescript
class RoleDbService {
  // Get permissions for a single role
  private async getRolePermissions(roleId: string): Promise<Permission[]>;

  // Get multiple roles with their permissions in optimized queries
  private async getRolesWithPermissions(roleIds?: string[]): Promise<RoleData[]>;
}
```

Permission loading is optimized by fetching all role permissions in a single query and grouping them in application code, rather than making N+1 queries per role.

## Admin Guard Integration

The RBAC system integrates with the authentication guard middleware. The `withAdminAuth` wrapper in `lib/auth/admin-guard.ts` calls `isAdmin()` from the roles module to verify database-level admin status:

```typescript
export async function checkAdminAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userIsAdmin = await isAdmin(session.user.id);
  if (!userIsAdmin) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

  return null; // Authorized
}
```

This provides defense-in-depth: the JWT `isAdmin` claim provides fast client-side checks, while the `isAdmin()` database query provides authoritative server-side verification.

## Validated Actions

Server actions can require authentication using `validatedActionWithUser` from `lib/auth/middleware.ts`:

```typescript
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { z } from 'zod';

const schema = z.object({ name: z.string().min(1) });

export const updateProfile = validatedActionWithUser(schema, async (data, formData, user) => {
  // user is guaranteed to be authenticated
  // data is validated against the Zod schema
});
```

This combines Zod validation with authentication checking, returning structured `ActionState` errors for form handling.