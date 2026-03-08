---
id: role-service
title: Role Service
sidebar_label: Role Service
sidebar_position: 12
---

# Role Service

The template includes a database-backed role management system that supports CRUD operations, permission assignment, and paginated queries. The `RoleDbService` uses Drizzle ORM with a roles and permissions junction table pattern.

## Overview

Roles define access levels within the application. Each role has a set of permissions assigned through a many-to-many relationship. The service supports soft delete, pagination with filtering and sorting, and atomic permission updates within transactions.

```
lib/services/
  role-db.service.ts    # Role CRUD and permission management
lib/db/schema.ts        # roles, permissions, rolePermissions tables
lib/permissions/
  definitions.ts        # Permission enum definitions
lib/types/
  role.ts               # Role type definitions
```

## Database Schema

The role system uses three tables:

| Table | Purpose |
|-------|---------|
| `roles` | Role definitions (id, name, description, status, isAdmin) |
| `permissions` | Available permissions (id, key, description) |
| `rolePermissions` | Junction table linking roles to permissions |

## Role Data Structure

```typescript
interface RoleData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isAdmin: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

## Creating Roles

```typescript
const roleService = new RoleDbService();

const role = await roleService.createRole({
  id: 'editor',
  name: 'Editor',
  description: 'Can manage content but not users',
  status: 'active',
  isAdmin: false,
  permissions: ['items:read', 'items:write', 'comments:moderate'],
});
```

### Creation Process

1. **Duplicate check** -- Verifies no role with the same ID exists (including soft-deleted)
2. **Insert role** -- Creates the role record within a transaction
3. **Resolve permissions** -- Looks up permission records by key from the `permissions` table
4. **Validate permissions** -- Throws an error if any permission keys are unknown
5. **Insert junction records** -- Links the role to its permissions

The entire operation runs within a database transaction, ensuring atomicity.

## Reading Roles

```typescript
// Get all active roles (excludes soft-deleted)
const allRoles = await roleService.readRoles();

// Find by ID
const role = await roleService.findById('editor');

// Find by any column
const role = await roleService.findBy('name', 'Editor');
```

### Efficient Permission Loading

The `getRolesWithPermissions()` internal method loads permissions for multiple roles in a single query using `INNER JOIN` and `IN` clauses, then groups them by role ID in memory. This avoids the N+1 query problem.

## Updating Roles

```typescript
const updated = await roleService.updateRole('editor', {
  name: 'Content Editor',
  description: 'Updated description',
  status: 'active',
  isAdmin: false,
  permissions: ['items:read', 'items:write', 'items:delete', 'comments:moderate'],
});
```

### Update Behavior

- Only fields present in the update request are modified
- If no role fields are changed (only permissions), the role record is left untouched
- `updatedAt` timestamp is set only when role fields are actually modified
- Permission updates are handled separately from role field updates

### Permission Update Process

Permission updates run within a transaction:

1. Resolve all new permission keys to their database IDs
2. Validate that all keys exist (throws if unknown keys are found)
3. Delete all existing permission assignments for the role
4. Insert new permission assignments

This "delete and recreate" approach ensures consistency without complex diff logic.

## Deleting Roles

```typescript
// Soft delete (sets deletedAt timestamp)
await roleService.deleteRole('editor');

// Hard delete (permanently removes from database)
await roleService.hardDeleteRole('editor');
```

Soft-deleted roles are excluded from all queries by default (filtered via `isNull(roles.deletedAt)`).

## Paginated Queries

```typescript
const result = await roleService.findRoles({
  page: 1,
  limit: 10,
  status: 'active',       // optional filter
  sortBy: 'name',         // 'name' | 'id' | 'created_at'
  sortOrder: 'asc',       // 'asc' | 'desc'
});
// {
//   roles: RoleData[],
//   total: 25,
//   page: 1,
//   limit: 10,
//   totalPages: 3,
// }
```

### Query Features

| Feature | Details |
|---------|---------|
| Filtering | By `status` (active/inactive) |
| Sorting | By `name`, `id`, or `created_at` |
| Sort order | Ascending or descending |
| Pagination | Offset-based with total count |
| Soft delete | Always excludes deleted roles |
| Permissions | Loaded in batch for returned page |

The total count query and data query use the same filters to ensure consistency between page count and results.

## Existence Check

```typescript
// Check if role exists (excludes soft-deleted)
const exists = await roleService.exists('editor');

// Include soft-deleted roles in the check
const existsIncDeleted = await roleService.exists('editor', { includeDeleted: true });
```

## Error Handling

The service provides specific error messages for common database connection issues:

| Error Code | Message |
|-----------|---------|
| `CONNECT_TIMEOUT` | Database connection timeout |
| `ECONNREFUSED` | Database connection refused |
| Duplicate ID | Role with ID already exists |
| Unknown permissions | Lists the unknown permission keys |
| Role not found | Role with ID not found |

## Internal Mapping

The `mapDbToRoleData()` method transforms raw database records into the `RoleData` interface, handling null/undefined defaults:

```typescript
{
  id: dbRole.id,
  name: dbRole.name,
  description: dbRole.description || '',
  status: dbRole.status || 'active',
  isAdmin: dbRole.isAdmin || false,
  permissions: rolePermissions,
  created_at: dbRole.createdAt.toISOString(),
  updated_at: dbRole.updatedAt.toISOString(),
  created_by: dbRole.created_by || 'system',
}
```

## Source Files

| File | Path |
|------|------|
| Role DB Service | `template/lib/services/role-db.service.ts` |
| Role Types | `template/lib/types/role.ts` |
| Permission Definitions | `template/lib/permissions/definitions.ts` |
| Database Schema | `template/lib/db/schema.ts` |
