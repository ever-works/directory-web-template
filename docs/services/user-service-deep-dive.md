---
id: user-service-deep-dive
title: User Service Deep Dive
sidebar_label: User Service (Deep Dive)
sidebar_position: 51
---

# User Service Deep Dive

## Overview

The User Service (`UserDbService`) manages all user-related database operations including registration, profile management, role assignment, and admin user listings. It operates against a PostgreSQL database using **Drizzle ORM** and handles joins across four tables: `users`, `clientProfiles`, `userRoles`, and `roles`.

## Source File

| File | Path |
|------|------|
| Service | `template/lib/services/user-db.service.ts` |
| Types | `template/lib/types/user.ts` |
| DB Schema | `template/lib/db/schema.ts` |

## Architecture

```
API Routes / Server Actions
        |
   UserDbService
        |
   Drizzle ORM
        |
   PostgreSQL
     ├── users             (auth identity, email, password)
     ├── clientProfiles     (username, name, title, avatar, status)
     ├── userRoles          (user-to-role mapping)
     └── roles              (role definitions)
```

User data is split across tables: `users` holds the auth identity, `clientProfiles` holds the display profile, and `userRoles`/`roles` handle RBAC. The service joins these for admin queries.

## Method Reference

### `readUsers(): Promise<AuthUserData[]>`

Returns all non-deleted users. Uses `isNull(users.deletedAt)` to filter soft-deleted users.

**Returns:** Array of `AuthUserData` objects with basic fields (id, email, created_at, updated_at).

### `findById(id: string): Promise<AuthUserData | null>`

Looks up a single non-deleted user by ID.

### `createUser(data: { email: string; password: string }): Promise<AuthUserData>`

Creates a new user account.

**Implementation details:**
- Trims and lowercases the email
- Hashes password using `bcryptjs` with 10 salt rounds
- Inserts into the `users` table and returns the created record

### `emailExists(email: string, excludeId?: string): Promise<boolean>`

Checks if an email is already registered. Uses case-insensitive comparison (`lower()`) and excludes soft-deleted users.

**Parameters:**
- `email` -- Email address to check
- `excludeId` -- Optional user ID to exclude (for update operations)

### `updateUser(id: string, data: UpdateUserRequest): Promise<AuthUserData>`

Updates user data across multiple tables in a single **database transaction**:

1. Updates `users` table (email, updatedAt)
2. Updates `clientProfiles` table (username, name, title/jobTitle, avatar, status, email sync)
3. If `role` is provided: deletes existing role assignments, inserts new role

**Transaction safety:** All three table updates happen atomically. If any step fails, the entire operation rolls back.

**UpdateUserRequest fields:**
```typescript
{
  email?: string;
  username?: string;
  name?: string;
  title?: string;
  avatar?: string;
  status?: UserStatus;
  role?: string;  // role ID
}
```

### `deleteUser(id: string): Promise<void>`

Performs a **soft delete** by setting `deletedAt` to the current timestamp. The user record is preserved but excluded from all queries.

### `findUsers(options?: UserListOptions): Promise<PaginatedResult>`

Full-featured paginated user listing with search, filter, and sort capabilities. Performs a 4-table LEFT JOIN to include profile and role data.

**Parameters:**
- `page` (default: `1`) -- Page number
- `limit` (default: `10`) -- Users per page
- `search` -- Case-insensitive search across email, name, and username (uses `ILIKE` with SQL injection prevention)
- `sortBy` -- `email` or `created_at`
- `sortOrder` -- `asc` or `desc`
- `role` -- Filter by role name (e.g., `admin`, `client`)
- `status` -- Filter by profile status

**Returns:**
```typescript
{
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**SQL injection protection:** The search input uses `ILIKE` with manual escaping of `%`, `_`, and `\` characters.

### `getUserStats(): Promise<UserStats>`

Returns aggregate user statistics from the `clientProfiles` table.

**Returns:**
```typescript
{
  total: number;    // Total profiles
  active: number;   // Profiles with status = 'active'
  inactive: number; // Profiles with status != 'active'
}
```

Uses PostgreSQL `FILTER` clause for efficient single-query aggregation.

### `clientProfileUsernameExists(username: string, excludeId?: string): Promise<boolean>`

Checks if a username is already taken in the `clientProfiles` table. Supports excluding a specific profile ID for update operations.

## Data Mapping

The service has two internal mappers:

### `mapDbToAuthUserData(dbUser)`

Maps a raw `users` table row to `AuthUserData`. Used for simple queries without joins.

### `mapJoinedDataToAuthUserData(joinedData)`

Maps a joined query result (users + clientProfiles + userRoles + roles) to `AuthUserData` with full profile data including username, name, title, avatar, status, role, and roleName.

## Error Handling

All methods follow a consistent pattern:
1. Wrap database operations in try/catch
2. Log the error with `console.error`
3. Throw a new descriptive `Error` (e.g., `'Failed to retrieve users'`)

The `updateUser` method is the exception -- it re-throws the original error to preserve Drizzle ORM error details for upstream handling.

## Usage Examples

```typescript
import { UserDbService } from '@/lib/services/user-db.service';

const userService = new UserDbService();

// Create a new user
const user = await userService.createUser({
  email: 'jane@example.com',
  password: 'securePassword123',
});

// Update profile and role
await userService.updateUser(user.id, {
  username: 'janedoe',
  name: 'Jane Doe',
  title: 'Developer',
  role: 'admin-role-id',
});

// Search users with pagination
const result = await userService.findUsers({
  search: 'jane',
  page: 1,
  limit: 20,
  sortBy: 'email',
  sortOrder: 'asc',
  role: 'admin',
});

// Check email availability
const taken = await userService.emailExists('jane@example.com');

// Get stats for admin dashboard
const stats = await userService.getUserStats();
// { total: 150, active: 142, inactive: 8 }
```
