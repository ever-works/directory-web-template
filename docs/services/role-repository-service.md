---
id: role-repository-service
title: Role Repository Service
sidebar_label: Role Repository
sidebar_position: 41
---

# Role Repository Service

The `RoleRepository` class manages user roles within the RBAC (Role-Based Access Control) system. Roles are stored in the relational database and define sets of permissions that can be assigned to users.

**Source file:** `template/lib/repositories/role.repository.ts`

---

## Architecture Overview

```
Admin Roles UI / API Route
        |
  RoleRepository           <-- thin wrapper, delegation
        |
  RoleDbService            <-- database CRUD via Drizzle ORM
        |
  PostgreSQL / SQLite      <-- roles table
```

Unlike the Git-backed repositories (items, tags, categories), the Role Repository operates against the relational database through `RoleDbService`. The repository layer is intentionally thin, serving primarily as a consistent interface that matches the pattern of other repositories.

---

## Class Definition

```ts
export class RoleRepository {
  private dbService: RoleDbService;

  constructor() {
    this.dbService = new RoleDbService();
  }
}
```

### Dependencies

| Import | Purpose |
|--------|---------|
| `RoleDbService` | Database service for role CRUD operations |
| `RoleData` | Role data model type |
| `CreateRoleRequest` | DTO for role creation |
| `UpdateRoleRequest` | DTO for role updates |
| `RoleListOptions` | Filtering and pagination options |
| `RoleWithCount` | Extended role type with user count |

---

## Query Methods

### `findAll(): Promise<RoleData[]>`

Returns all roles from the database without filtering or pagination.

```ts
async findAll(): Promise<RoleData[]>
```

Delegates to `dbService.readRoles()`.

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated, filtered list of roles.

```ts
async findAllPaginated(options: RoleListOptions = {}): Promise<{
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Delegates to `dbService.findRoles(options)`. The `RoleListOptions` type supports:

| Option | Type | Description |
|--------|------|-------------|
| `page` | `number` | Page number (1-based) |
| `limit` | `number` | Items per page |
| `status` | `string` | Filter by role status |
| `search` | `string` | Text search |

---

### `findById(id): Promise<RoleData | null>`

Retrieves a single role by its unique identifier.

```ts
async findById(id: string): Promise<RoleData | null>
```

---

### `findByName(name): Promise<RoleData | null>`

Retrieves a single role by its display name.

```ts
async findByName(name: string): Promise<RoleData | null>
```

Delegates to `dbService.findBy('name', name)`.

---

### `exists(id, options?): Promise<boolean>`

Checks whether a role with the given ID exists.

```ts
async exists(id: string, options?: { includeDeleted?: boolean }): Promise<boolean>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeDeleted` | `boolean` | `false` | Include soft-deleted roles in the check |

---

### `findWithCounts(): Promise<RoleWithCount[]>`

Returns all roles enriched with user assignment counts.

```ts
async findWithCounts(): Promise<RoleWithCount[]>
```

**Return type:**

```ts
interface RoleWithCount extends RoleData {
  userCount: number;
}
```

Currently returns `userCount: 0` as a placeholder. The actual user count logic will be implemented when user-role assignment tracking is added.

---

### `findActive(): Promise<RoleData[]>`

Returns only active roles (up to 1000).

```ts
async findActive(): Promise<RoleData[]>
```

Delegates to `dbService.findRoles({ status: 'active', limit: 1000 })` and extracts the `roles` array from the paginated result.

---

## Mutation Methods

### `create(data): Promise<RoleData>`

Creates a new role in the database.

```ts
async create(data: CreateRoleRequest): Promise<RoleData>
```

Delegates to `dbService.createRole(data)`. Validation is handled by the database service layer.

---

### `update(id, data): Promise<RoleData>`

Updates an existing role.

```ts
async update(id: string, data: UpdateRoleRequest): Promise<RoleData>
```

Delegates to `dbService.updateRole(id, data)`.

---

### `delete(id): Promise<void>`

Soft-deletes a role (marks as deleted but retains the record).

```ts
async delete(id: string): Promise<void>
```

Delegates to `dbService.deleteRole(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a role from the database.

```ts
async hardDelete(id: string): Promise<void>
```

Delegates to `dbService.hardDeleteRole(id)`.

---

## Design Notes

### Thin Repository Pattern

The `RoleRepository` follows a thin wrapper pattern where most methods directly delegate to `RoleDbService`. This is intentional:

1. **Consistent interface** -- all repositories expose the same method signatures (`findAll`, `findById`, `create`, `update`, `delete`)
2. **Future extensibility** -- business logic (validation, permission checks, cascading operations) can be added in the repository without changing the service or API layers
3. **Separation of concerns** -- the repository handles business rules while the service handles database access

### Soft Delete vs. Hard Delete

The repository exposes both `delete` (soft) and `hardDelete` operations:

- **`delete`** -- sets a `deleted_at` timestamp, preserving the record for audit purposes
- **`hardDelete`** -- permanently removes the record from the database

---

## RoleData Structure

A role record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `description` | `string` | Role description |
| `permissions` | `Permission[]` | Array of permission strings (e.g., `'items:read'`) |
| `isDefault` | `boolean` | Whether this role is assigned by default to new users |
| `status` | `string` | Active or inactive status |
| `created_at` | `string` | ISO timestamp |
| `updated_at` | `string` | ISO timestamp |

---

## Usage Example

```ts
import { RoleRepository } from '@/lib/repositories/role.repository';

const roleRepo = new RoleRepository();

// List all roles
const allRoles = await roleRepo.findAll();

// List active roles only
const activeRoles = await roleRepo.findActive();

// Paginated listing
const page = await roleRepo.findAllPaginated({
  page: 1,
  limit: 10,
  status: 'active',
});

// Create a new role
const editorRole = await roleRepo.create({
  name: 'Editor',
  description: 'Can create and edit items',
  permissions: ['items:read', 'items:create', 'items:update'],
});

// Find by name
const adminRole = await roleRepo.findByName('admin');

// Check existence
const exists = await roleRepo.exists('role-123');

// Get roles with user counts (for admin display)
const rolesWithCounts = await roleRepo.findWithCounts();

// Soft delete
await roleRepo.delete('old-role-id');

// Permanent delete
await roleRepo.hardDelete('old-role-id');
```

---

## Integration with Permission System

Roles serve as the bridge between users and permissions:

```
User  -->  Role  -->  Permission[]
                      e.g. ['items:read', 'items:create', 'users:read']
```

The permissions stored in each role are evaluated by the permission check middleware (`lib/middleware/permission-check.ts`) to determine what actions a user can perform. See the [Guards and Middleware](../architecture/guards-middleware.md) documentation for details on the permission evaluation logic.

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/role-db.service.ts` | Underlying database service |
| `lib/types/role.ts` | Type definitions (`RoleData`, `CreateRoleRequest`, etc.) |
| `lib/middleware/permission-check.ts` | Evaluates role permissions at runtime |
| `lib/permissions/definitions.ts` | Master list of all system permissions |
| `lib/repositories/user.repository.ts` | Users are assigned roles |
| `lib/db/drizzle.ts` | Database connection |
