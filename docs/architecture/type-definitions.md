---
id: type-definitions
title: Type System Overview
sidebar_label: Type Definitions
sidebar_position: 41
---

# Type System Overview

The template centralizes its TypeScript type definitions in `template/lib/types/`. This directory contains interfaces, type aliases, Zod validation schemas, and request/response DTOs used across repositories, services, and API routes.

**Source directory:** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## Core Domain Types

### Item Types (`item.ts`)

The item type system is the most extensive, covering the full lifecycle of a directory listing.

**Key types:**

- **`ItemData`** -- the primary item data model with fields for `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at`, and more
- **`CreateItemRequest`** -- DTO for item creation; requires `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- partial DTO for item updates; all fields optional
- **`ReviewRequest`** -- contains `status` (`'approved'` or `'rejected'`) and optional `review_notes`
- **`ItemListOptions`** -- filtering and pagination options: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### User Types (`user.ts`)

Authentication-level user types with Zod validation schemas.

**Key types:**

- **`AuthUserData`** -- represents an authenticated user record (id, email, created_at, etc.)
- **`CreateUserRequest`** -- email and password for user creation
- **`UpdateUserRequest`** -- partial update fields
- **`UserListOptions`** -- pagination and filtering options
- **`AuthUserListResponse`** -- paginated response with `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Zod schema for full user creation validation
- **`updateUserValidationSchema`** -- Zod schema for partial user update validation

### Role Types (`role.ts`)

Role data types for the RBAC system.

**Key types:**

- **`RoleData`** -- role record with `id`, `name`, `description`, `permissions`, `isDefault`, `status`, timestamps
- **`CreateRoleRequest`** -- fields needed to create a new role
- **`UpdateRoleRequest`** -- partial role update
- **`RoleListOptions`** -- filtering options including `status`, search, and pagination
- **`RoleWithCount`** -- extends `RoleData` with `userCount` for admin display

### Tag Types (`tag.ts`)

Tag data types for the labeling/tagging system.

**Key types:**

- **`TagData`** -- tag record with `id`, `name`, and optional metadata
- **`CreateTagRequest`** -- requires `id` and `name`
- **`UpdateTagRequest`** -- partial tag update
- **`TagListResponse`** -- paginated tag list with `tags`, `total`, `page`, `limit`, `totalPages`

### Category Types (`category.ts`)

Category data types for the organizational taxonomy.

**Key types:**

- **`CategoryData`** -- category record with `id`, `name`, `description`, and metadata
- **`CategoryWithCount`** -- extends `CategoryData` with an item count
- **`CreateCategoryRequest`** -- requires `id`, `name`, optional `description`
- **`UpdateCategoryRequest`** -- partial category update (requires `id`)
- **`CategoryListOptions`** -- filtering, sorting, and pagination options
- **`CATEGORY_VALIDATION`** -- constants for field length validation (name min/max, description max, ID constraints)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## Type Pattern Conventions

### Request/Response DTOs

The codebase follows a consistent pattern for data transfer objects:

- **`Create[Entity]Request`** -- contains all required fields for creation
- **`Update[Entity]Request`** -- partial type where most fields are optional; typically requires `id`
- **`[Entity]ListOptions`** -- filtering, sorting, and pagination parameters
- **`[Entity]ListResponse`** -- paginated response with `items`, `total`, `page`, `limit`, `totalPages`

### Validation Schemas

Zod schemas are co-located with their corresponding types:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Repositories use `.parse()` or `.pick()` on these schemas before executing mutations.

### Validation Constants

For Git-backed entities (categories, collections), validation constants are exported as plain objects:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

These are referenced in repository validation methods.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## Usage Guidelines

1. **Always import types from `@/lib/types/`** rather than re-declaring them in components or API routes
2. **Use request DTOs** for API handler input validation, not the full data model
3. **Use Zod schemas** where available (user types) for runtime validation
4. **Use validation constants** (categories, collections) for consistent field constraints across frontend and backend
5. **Extend types locally** only when you need component-specific derived types that do not belong in the shared layer

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
