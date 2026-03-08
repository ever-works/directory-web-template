---
id: user-service
title: "User Service"
sidebar_label: "User Service"
sidebar_position: 24
---

# User Service

The user service manages user accounts through a PostgreSQL database using Drizzle ORM. It provides CRUD operations, profile management, role assignments, and paginated queries with search and filtering. Unlike the Git-backed content services, the user service operates on relational database tables.

## Architecture

The `UserDbService` at `lib/services/user-db.service.ts` handles all user database operations. It works with four related tables:

| Table | Purpose |
|-------|---------|
| `users` | Core account data (email, password hash, timestamps) |
| `clientProfiles` | Extended profile (username, name, title, avatar, status) |
| `userRoles` | User-to-role assignments |
| `roles` | Role definitions |

## AuthUserData Type

The service returns user data through this interface:

```ts
interface AuthUserData {
  id: string;
  email: string;
  username?: string;
  name?: string;
  title?: string;
  avatar?: string;
  status?: UserStatus;
  role?: string;
  roleName?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}
```

## CRUD Operations

### Create a User

```ts
const userService = new UserDbService();

const user = await userService.createUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
});
```

Passwords are hashed with `bcryptjs` (cost factor 10) before storage. The email is normalized to lowercase and trimmed.

### Read Users

```ts
// Get all non-deleted users
const allUsers = await userService.readUsers();
```

Soft-deleted users (those with a `deletedAt` timestamp) are excluded from the result.

### Find by ID

```ts
const user = await userService.findById('user-uuid-here');
// Returns AuthUserData or null
```

### Check Email Availability

```ts
// Check if email exists (optionally excluding a specific user)
const exists = await userService.emailExists(
  'user@example.com',
  'exclude-this-user-id'
);
```

The check is case-insensitive and excludes soft-deleted accounts.

### Check Username Availability

```ts
const taken = await userService.clientProfileUsernameExists(
  'desired-username',
  'exclude-this-profile-id'
);
```

### Update a User

Updates use a database transaction to ensure consistency across multiple tables:

```ts
const updated = await userService.updateUser('user-id', {
  email: 'newemail@example.com',
  username: 'newusername',
  name: 'Jane Doe',
  title: 'Senior Developer',
  avatar: 'https://example.com/avatar.jpg',
  status: 'active',
  role: 'admin-role-id',
});
```

The transaction performs these steps:

1. Updates the `users` table (email, timestamps)
2. Updates the `clientProfiles` table (username, name, title, avatar, status)
3. Replaces role assignments: deletes existing roles, inserts the new role

```ts
const result = await db.transaction(async (tx) => {
  const updated = await tx.update(users)
    .set(userUpdateData)
    .where(eq(users.id, id))
    .returning();

  if (Object.keys(profileUpdateData).length > 1) {
    await tx.update(clientProfiles)
      .set(profileUpdateData)
      .where(eq(clientProfiles.userId, id));
  }

  if (data.role !== undefined) {
    await tx.delete(userRoles).where(eq(userRoles.userId, id));
    if (data.role) {
      await tx.insert(userRoles).values({
        userId: id,
        roleId: data.role,
      });
    }
  }

  return updated;
});
```

### Delete a User

Deletion is a soft delete that sets the `deletedAt` timestamp:

```ts
await userService.deleteUser('user-id');
```

The user record remains in the database but is excluded from queries.

## Paginated Search

The `findUsers` method supports advanced filtering, searching, and sorting:

```ts
const result = await userService.findUsers({
  page: 1,
  limit: 10,
  search: 'jane',
  sortBy: 'email',
  sortOrder: 'asc',
  role: 'admin',
  status: 'active',
});
```

The returned object:

```ts
{
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Search

The `search` parameter queries across three fields using case-insensitive `ILIKE`:

- `users.email`
- `clientProfiles.name`
- `clientProfiles.username`

Special characters (`%`, `_`, `\`) are escaped to prevent SQL pattern injection.

### Filtering

- **role** -- filters by role name (e.g., `admin`, `client`)
- **status** -- filters by profile status (e.g., `active`, `inactive`)

### Sorting

Supported `sortBy` values: `email`, `created_at`. Default is `email` ascending.

### Joins

The paginated query uses left joins across all four tables to assemble the full user profile:

```ts
const baseQuery = db.select({
  id: users.id,
  email: users.email,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  username: clientProfiles.username,
  name: clientProfiles.name,
  title: clientProfiles.jobTitle,
  avatar: clientProfiles.avatar,
  status: clientProfiles.status,
  roleId: userRoles.roleId,
  roleName: roles.name,
})
.from(users)
.leftJoin(clientProfiles, eq(users.id, clientProfiles.userId))
.leftJoin(userRoles, eq(users.id, userRoles.userId))
.leftJoin(roles, eq(userRoles.roleId, roles.id))
.where(and(...conditions));
```

## User Statistics

Aggregate statistics from the `clientProfiles` table:

```ts
const stats = await userService.getUserStats();
// {
//   total: number;
//   active: number;
//   inactive: number;
// }
```

The query uses PostgreSQL `FILTER` clauses for efficient counting:

```ts
const result = await db
  .select({
    total: sql<number>`count(*)`,
    active: sql<number>`count(*) filter (where ${clientProfiles.status} = 'active')`,
    inactive: sql<number>`count(*) filter (where ${clientProfiles.status} != 'active')`,
  })
  .from(clientProfiles);
```

## Data Mapping

The service uses two mapping functions to convert database rows to the `AuthUserData` interface:

- `mapDbToAuthUserData` -- maps a basic `users` table row (used by `readUsers`, `findById`, `createUser`)
- `mapJoinedDataToAuthUserData` -- maps a joined query result including profile and role data (used by `findUsers`)

The joined mapper provides default values for nullable fields:

```ts
private mapJoinedDataToAuthUserData(joinedData: JoinedUserData): AuthUserData {
  return {
    id: joinedData.id,
    email: joinedData.email ?? '',
    username: joinedData.username ?? '',
    name: joinedData.name ?? '',
    title: joinedData.title ?? '',
    avatar: joinedData.avatar ?? '',
    status: joinedData.status ?? 'active',
    role: joinedData.roleId ?? '',
    roleName: joinedData.roleName ?? 'No role',
    created_at: joinedData.createdAt.toISOString(),
    updated_at: joinedData.updatedAt.toISOString(),
  };
}
```

## Related Files

| File | Description |
|------|-------------|
| `lib/services/user-db.service.ts` | User CRUD with Drizzle ORM |
| `lib/types/user.ts` | User type definitions |
| `lib/db/drizzle.ts` | Database connection |
| `lib/db/schema.ts` | Drizzle table schemas |
| `lib/validations/auth.ts` | Password validation schema |
