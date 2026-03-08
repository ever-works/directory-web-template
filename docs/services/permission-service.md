---
id: permission-service
title: Permission Service
sidebar_label: Permission Service
sidebar_position: 34
---

# Permission Service

The permission system provides granular access control using resource-based permissions, role management, plan-based feature guards, and authentication utilities. It spans definitions, grouping, state management, database storage, and plan-gated feature access.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Definitions | `lib/permissions/definitions.ts` | Permission constants, types, default roles |
| Groups | `lib/permissions/groups.ts` | UI grouping for permission management |
| Utils | `lib/permissions/utils.ts` | State management and diff utilities |
| Role DB Service | `lib/services/role-db.service.ts` | Database CRUD for roles and permissions |
| Plan Guard | `lib/guards/plan-features.guard.ts` | Subscription plan feature access |
| Client Auth | `lib/utils/client-auth.ts` | API route authentication helpers |

## Permission Definitions

All permissions follow a `resource:action` naming pattern:

```ts
// lib/permissions/definitions.ts
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

### Helper Functions

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard for permission validation
isValidPermission(permission: string): permission is Permission
```

### Default Roles

Two built-in role templates are provided:

```ts
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    id: 'super-admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: getAllPermissions(),
  },
  CONTENT_MANAGER: {
    id: 'content-manager',
    name: 'Content Manager',
    description: 'Manage content including items, categories, and tags',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
};
```

## Permission Groups

For the admin UI, permissions are organized into logical groups:

```ts
// lib/permissions/groups.ts
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'content',
    name: 'Content Management',
    description: 'Manage items, categories, and tags',
    icon: 'FileText',
    permissions: [
      ...getPermissionsForResource('items'),
      ...getPermissionsForResource('categories'),
      ...getPermissionsForResource('tags'),
    ],
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage users and their roles',
    icon: 'Users',
    permissions: [
      ...getPermissionsForResource('users'),
      ...getPermissionsForResource('roles'),
    ],
  },
  {
    id: 'system',
    name: 'System & Analytics',
    description: 'System settings and analytics access',
    icon: 'Settings',
    permissions: [
      ...getPermissionsForResource('analytics'),
      ...getPermissionsForResource('system'),
    ],
  },
];
```

Utility functions for permission display:

```ts
formatPermissionName('items:create')    // "Create Items"
formatPermissionDescription('items:create') // "Create new items and submissions"
```

## Permission State Management

The `lib/permissions/utils.ts` module provides helpers for the role editing UI:

```ts
// Create a boolean map from a permission array
createPermissionState(currentPermissions: Permission[]): PermissionState

// Extract selected permissions from a state map
getSelectedPermissions(permissionState: PermissionState): Permission[]

// Calculate what changed between two permission sets
calculatePermissionChanges(
  originalPermissions: Permission[],
  newPermissions: Permission[]
): PermissionChanges  // { added: Permission[], removed: Permission[] }

// Compare two permission sets for equality
arePermissionsEqual(permissions1: Permission[], permissions2: Permission[]): boolean

// Filter permissions by search term
filterPermissions(permissions: Permission[], searchTerm: string): Permission[]
```

## Role Database Service

The `RoleDbService` class in `lib/services/role-db.service.ts` manages roles with their associated permissions in the database:

```ts
export class RoleDbService {
  async readRoles(): Promise<RoleData[]>
  async findById(id: string): Promise<RoleData | null>
  async findBy(key: keyof Role, value: string): Promise<RoleData | null>
  async createRole(data: CreateRoleRequest): Promise<RoleData>
  async updateRole(id: string, data: UpdateRoleRequest): Promise<RoleData>
  async deleteRole(id: string): Promise<void>       // soft delete
  async hardDeleteRole(id: string): Promise<void>    // permanent delete
  async findRoles(options?: RoleListOptions): Promise<PaginatedResult>
  async exists(id: string, options?): Promise<boolean>
}
```

Role creation uses transactions to atomically insert the role and its permissions:

```ts
async createRole(data: CreateRoleRequest): Promise<RoleData> {
  return await db.transaction(async (tx) => {
    const result = await tx.insert(roles).values(roleData).returning();
    const newRole = result[0];

    if (data.permissions && data.permissions.length > 0) {
      const permissionRecords = await tx
        .select({ id: permissions.id, key: permissions.key })
        .from(permissions)
        .where(inArray(permissions.key, data.permissions));

      await tx.insert(rolePermissions).values(
        permissionRecords.map(perm => ({
          roleId: newRole.id,
          permissionId: perm.id,
        }))
      );
    }
    return this.mapDbToRoleData(newRole, data.permissions || []);
  });
}
```

## Plan Feature Guards

The `lib/guards/plan-features.guard.ts` provides subscription-plan-based access control:

### Plan Hierarchy

```ts
export const PLAN_LEVELS: Record<string, number> = {
  free: 1,
  standard: 2,
  premium: 3,
};
```

### Feature Access Matrix

Features are gated by plan level. Access can be configured as `'all'`, a specific plan, an array of plans, or a minimum plan requirement:

```ts
export const FEATURE_ACCESS: Record<Feature, FeatureAccess> = {
  submit_product: 'all',
  extended_description: { minPlan: PaymentPlan.STANDARD },
  upload_video: PaymentPlan.PREMIUM,
  verified_badge: { minPlan: PaymentPlan.STANDARD },
  // ... more features
};
```

### Plan Limits

Numeric limits vary by plan:

```ts
export const PLAN_LIMITS: Record<PaymentPlan, FeatureLimits> = {
  free:     { max_images: 1,    max_submissions: 1,    review_days: 7  },
  standard: { max_images: 5,    max_submissions: 10,   review_days: 3  },
  premium:  { max_images: null, max_submissions: null,  review_days: 1  },
};
```

### Guard Factory

```ts
const guard = createPlanGuard(userPlan);

guard.canAccess('upload_video');           // boolean
guard.requireFeature('verified_badge');     // throws PlanGuardError if denied
guard.getLimit('max_images');              // number or null
guard.isWithinLimit('max_submissions', 5); // boolean
guard.getAccessibleFeatures();             // Feature[]
```

## Client Authentication

The `lib/utils/client-auth.ts` module provides API route helpers:

```ts
export async function requireClientAuth():
  Promise<ClientAuthResult | ClientAuthError>

// Usage in API routes:
const authResult = await requireClientAuth();
if (!authResult.success) {
  return authResult.response; // 401 Unauthorized
}
const { session, userId } = authResult;
```

Additional response helpers:

```ts
unauthorizedResponse(message?)   // 401
forbiddenResponse(message?)      // 403
notFoundResponse(message?)       // 404
badRequestResponse(message?)     // 400
conflictResponse(message?)       // 409
serverErrorResponse(error, msg?) // 500
```

## Database Schema

### roles

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` | Primary key |
| `name` | `text` | Unique role name |
| `description` | `text` | Role description |
| `is_admin` | `boolean` | Admin flag |
| `status` | `text` | `active` or `inactive` |
| `deleted_at` | `timestamp` | Soft delete |

### role_permissions (junction)

| Column | Type | Description |
|--------|------|-------------|
| `role_id` | `text` | FK to `roles.id` (cascade delete) |
| `permission_id` | `text` | FK to `permissions.id` (cascade delete) |

### user_roles (junction)

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | `text` | FK to `users.id` (cascade delete) |
| `role_id` | `text` | FK to `roles.id` (cascade delete) |

## Related Documentation

- [Role Service](/docs/template/services/role-service) -- Role management API
- [User Service](/docs/template/services/user-service) -- User management
- [Subscription Service](/docs/template/services/subscription-service) -- Plan management
