---
id: use-users-reference
title: useUsers Hook Reference
sidebar_label: useUsers
sidebar_position: 117
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useUsers

A comprehensive collection of React Query hooks for admin user management -- listing, fetching, creating, updating, deleting, and validating users. Also exports query key factories, a management facade (`useUsersManagement`), and a legacy imperative API (`useUsersLegacy`).

**Source:** `template/hooks/use-users.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useUsers` | Paginated/filtered user list query |
| `useUser` | Single user detail query |
| `useUserStats` | User count statistics query |
| `useCreateUser` | Create user mutation |
| `useUpdateUser` | Update user mutation |
| `useDeleteUser` | Delete user mutation |
| `useCheckUsername` | Username availability mutation |
| `useCheckEmail` | Email availability mutation |
| `useUsersManagement` | Facade that bundles all hooks and cache utilities |
| `useUsersLegacy` | Imperative API for backward compatibility (deprecated) |

## Exported Constants

```ts
const userQueryKeys = {
  all:     ['users'],
  lists:   () => [...userQueryKeys.all, 'list'],
  list:    (options: UserListOptions) => [...userQueryKeys.lists(), options],
  details: () => [...userQueryKeys.all, 'detail'],
  detail:  (id: string) => [...userQueryKeys.details(), id],
  stats:   () => [...userQueryKeys.all, 'stats'],
};
```

These query keys are exported for external cache operations.

---

## useUsers

Fetches a paginated and filtered list of users.

### Signature

```ts
function useUsers(options?: UserListOptions): UseQueryResult<UserListResponse>;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options` | `UserListOptions` | `{}` | Filtering and pagination parameters passed as query string to the API |

### Cache Configuration

| Setting | Value |
|---------|-------|
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |

### Usage

```tsx
function UserList() {
  const { data, isLoading, error } = useUsers({ page: 1, limit: 20 });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner message={error.message} />;

  return (
    <div>
      <p>Total: {data?.total}</p>
      {data?.users.map((user) => (
        <UserRow key={user.id} user={user} />
      ))}
    </div>
  );
}
```

---

## useUser

Fetches a single user by ID.

### Signature

```ts
function useUser(id: string, enabled?: boolean): UseQueryResult<UserData | null>;
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `id` | `string` | -- | User ID to fetch |
| `enabled` | `boolean` | `true` | Set to `false` to skip the query; also automatically disabled when `id` is empty |

### Cache Configuration

| Setting | Value |
|---------|-------|
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |

### Usage

```tsx
function UserDetail({ userId }: { userId: string }) {
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;

  return <ProfileCard user={user} />;
}
```

---

## useUserStats

Fetches aggregate user statistics.

### Signature

```ts
function useUserStats(): UseQueryResult<{ total: number; active: number; inactive: number }>;
```

### Cache Configuration

| Setting | Value |
|---------|-------|
| `staleTime` | 10 minutes |
| `gcTime` | 15 minutes |

### Usage

```tsx
function UserStatsCards() {
  const { data: stats } = useUserStats();

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Total" value={stats?.total} />
      <StatCard label="Active" value={stats?.active} />
      <StatCard label="Inactive" value={stats?.inactive} />
    </div>
  );
}
```

---

## useCreateUser

Creates a new user. Automatically invalidates user list and stats caches on success.

### Signature

```ts
function useCreateUser(): UseMutationResult<UserData, Error, CreateUserRequest>;
```

### Usage

```tsx
function CreateUserForm() {
  const { mutate: createUser, isPending } = useCreateUser();

  const handleSubmit = (formData: CreateUserRequest) => {
    createUser(formData, {
      onSuccess: (user) => toast.success(`User ${user.name} created`),
      onError: (err) => toast.error(err.message),
    });
  };

  return <UserForm onSubmit={handleSubmit} loading={isPending} />;
}
```

---

## useUpdateUser

Updates an existing user. On success, updates the individual user cache entry and invalidates list/stats caches.

### Signature

```ts
function useUpdateUser(): UseMutationResult<UserData, Error, { id: string; userData: UpdateUserRequest }>;
```

### Usage

```tsx
function EditUserForm({ user }: { user: UserData }) {
  const { mutate: updateUser, isPending } = useUpdateUser();

  const handleSave = (updates: UpdateUserRequest) => {
    updateUser({ id: user.id, userData: updates });
  };

  return <UserForm defaultValues={user} onSubmit={handleSave} loading={isPending} />;
}
```

---

## useDeleteUser

Deletes a user by ID. On success, removes the user from the detail cache and invalidates list/stats caches.

### Signature

```ts
function useDeleteUser(): UseMutationResult<void, Error, string>;
```

### Usage

```tsx
function DeleteUserButton({ userId }: { userId: string }) {
  const { mutate: deleteUser, isPending } = useDeleteUser();

  return (
    <button
      onClick={() => deleteUser(userId)}
      disabled={isPending}
    >
      {isPending ? 'Deleting...' : 'Delete User'}
    </button>
  );
}
```

---

## useCheckUsername

Checks if a username is available. Accepts an optional `excludeId` to exclude the current user during edits.

### Signature

```ts
function useCheckUsername(): UseMutationResult<boolean, Error, { username: string; excludeId?: string }>;
```

### Usage

```tsx
function UsernameField({ currentUserId }: Props) {
  const { mutateAsync: checkUsername } = useCheckUsername();

  const validateUsername = async (username: string) => {
    const available = await checkUsername({ username, excludeId: currentUserId });
    return available || 'Username already taken';
  };

  return <input {...register('username', { validate: validateUsername })} />;
}
```

---

## useCheckEmail

Checks if an email address is available. Same pattern as `useCheckUsername`.

### Signature

```ts
function useCheckEmail(): UseMutationResult<boolean, Error, { email: string; excludeId?: string }>;
```

---

## useUsersManagement

A facade hook that returns all individual hooks plus cache invalidation utilities. Useful when a component needs access to multiple user operations.

### Signature

```ts
function useUsersManagement(): UsersManagementReturn;
```

### Return Value

```ts
const {
  // Query hooks (call these as hooks in your component)
  useUsers,
  useUser,
  useUserStats,

  // Mutation hooks
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useCheckUsername,
  useCheckEmail,

  // Cache utilities
  invalidateUsers,      // () => void -- Invalidate all user queries
  invalidateUser,       // (id: string) => void -- Invalidate a specific user detail query
  invalidateUserLists,  // () => void -- Invalidate user list queries only
  invalidateUserStats,  // () => void -- Invalidate user stats query only
} = useUsersManagement();
```

---

## useUsersLegacy (Deprecated)

An imperative API preserved for backward compatibility. Prefer the React Query-based hooks above for new code.

### Signature

```ts
function useUsersLegacy(): UseUsersLegacyReturn;
```

### Return Value

```ts
const {
  loading,        // boolean
  error,          // string | null
  getUsers,       // (options?: UserListOptions) => Promise<UserListResponse>
  getUser,        // (id: string) => Promise<UserData | null>
  createUser,     // (userData: CreateUserRequest) => Promise<UserData | null>
  updateUser,     // (id: string, userData: UpdateUserRequest) => Promise<UserData | null>
  deleteUser,     // (id: string) => Promise<boolean>
  getUserStats,   // () => Promise<{ total; active; inactive } | null>
  checkUsername,   // (username: string, excludeId?: string) => Promise<boolean>
  checkEmail,     // (email: string, excludeId?: string) => Promise<boolean>
  clearError,     // () => void
} = useUsersLegacy();
```

:::warning Deprecated
`useUsersLegacy` does not benefit from React Query caching, deduplication, or automatic refetching. Use the individual React Query hooks (`useUsers`, `useCreateUser`, etc.) for new development.
:::

## Implementation Details

### API Layer

All hooks share a private `userApi` object that wraps `serverClient` from `@/lib/api/server-api-client`:

| Method | HTTP | Endpoint |
|--------|------|----------|
| `getUsers` | `GET` | `/api/admin/users?...` |
| `getUser` | `GET` | `/api/admin/users/:id` |
| `createUser` | `POST` | `/api/admin/users` |
| `updateUser` | `PUT` | `/api/admin/users/:id` |
| `deleteUser` | `DELETE` | `/api/admin/users/:id` |
| `getUserStats` | `GET` | `/api/admin/users/stats` |
| `checkUsername` | `POST` | `/api/admin/users/check-username` |
| `checkEmail` | `POST` | `/api/admin/users/check-email` |

### Cache Invalidation Strategy

| Mutation | Caches Invalidated |
|----------|--------------------|
| `createUser` | User lists, user stats |
| `updateUser` | Specific user detail (optimistic set), user lists, user stats |
| `deleteUser` | Specific user detail (removed), user lists, user stats |

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery`, `useMutation`, `useQueryClient` for data fetching and caching |
| `@/lib/api/server-api-client` | `serverClient` for HTTP calls, `apiUtils` for response handling |
| `@/lib/types/user` | `UserData`, `CreateUserRequest`, `UpdateUserRequest`, `UserListOptions`, `UserListResponse` types |

## Related Hooks

- [`useAdminUsers`](/docs/template/hooks/use-admin-users-reference) -- Admin user management with additional admin-specific operations
- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) -- Fetches the currently authenticated user (different from admin user listing)
- [`useUserUtils`](/docs/template/hooks/use-user-utils-reference) -- Derived user properties like display role and online status
- [`useRoles`](/docs/template/hooks/use-roles-reference) -- Role data used in user management forms
