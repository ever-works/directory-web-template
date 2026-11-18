---
id: users-queries-deep-dive
title: User Queries Deep Dive
sidebar_label: User Queries Deep Dive
sidebar_position: 61
---

# User Queries Deep Dive

Comprehensive reference for all user-related database query functions, including user lookup, authentication helpers, admin role checks, and client profile management utilities.

## Overview

The user query layer is split across multiple modules:

- **`user.queries.ts`** -- Core user CRUD operations, authentication lookups, and admin checks
- **`client.queries.ts`** -- Client profile management, search, statistics, and account operations
- **`utils.ts`** -- Shared utilities for username generation and email processing
- **`auth.queries.ts`** -- Password reset and email verification token management

## Source Files

```
lib/db/queries/user.queries.ts
lib/db/queries/client.queries.ts (profile CRUD section)
lib/db/queries/utils.ts
lib/db/queries/auth.queries.ts
```

---

## Function Reference: user.queries.ts

### `getUserByEmail`

Looks up a user by their email address. Includes a guard for missing `DATABASE_URL`.

```typescript
async function getUserByEmail(email: string): Promise<User | null>
```

**Parameters:**

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `email`   | `string` | Yes      | User email  |

**Returns:** `Promise<User | null>` -- User object or `null` if not found or database unavailable

**SQL Pattern:**

```sql
SELECT * FROM users WHERE email = ? LIMIT 1;
```

**Performance Notes:**
- Checks `DATABASE_URL` env var before querying; returns `null` immediately if unset
- Uses `.limit(1)` for efficient single-row retrieval
- Logs warnings for missing users and database errors

---

### `getUserById`

Looks up a user by their ID.

```typescript
async function getUserById(id: string): Promise<User | null>
```

**Parameters:**

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `id`      | `string` | Yes      | User ID     |

**Returns:** `Promise<User | null>` -- User object or `null` if not found

**SQL Pattern:**

```sql
SELECT * FROM users WHERE id = ? LIMIT 1;
```

---

### `insertNewUser`

Creates a new user record.

```typescript
async function insertNewUser(user: NewUser): Promise<User[]>
```

**Parameters:**

| Parameter | Type      | Required | Description     |
|-----------|-----------|----------|-----------------|
| `user`    | `NewUser` | Yes      | New user data   |

**Returns:** `Promise<User[]>` -- Array containing the created user (via `RETURNING`)

**SQL Pattern:**

```sql
INSERT INTO users (...) VALUES (...) RETURNING *;
```

---

### `updateUserPassword`

Updates a user's password hash.

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**Parameters:**

| Parameter         | Type     | Required | Description          |
|-------------------|----------|----------|----------------------|
| `newPasswordHash` | `string` | Yes      | New bcrypt hash      |
| `userId`          | `string` | Yes      | Target user ID       |

**SQL Pattern:**

```sql
UPDATE users SET password_hash = ? WHERE id = ?;
```

This writes `users.passwordHash` only and does not stamp `users.password_changed_at`, so it ends no session. Admin sign-in reads that column and client sign-in does not. Nothing in the app calls it any more: password reset, change-password and the `updatePassword` server action use `setUserPasswordHash` instead.

---

### `setUserPasswordHash`

Stores a new password hash where sign-in reads it. Client sign-in (`verifyClientPassword`) reads only the hash on the user's `credentials` row in `accounts`; admin sign-in reads `users.passwordHash`. Used by the password reset (`newPasswordAction`) and `POST /api/auth/change-password`.

```typescript
async function setUserPasswordHash(
  userId: string,
  newPasswordHash: string
): Promise<{ accounts: number; users: number }>
```

**Parameters:**

| Parameter         | Type     | Required | Description          |
|-------------------|----------|----------|----------------------|
| `userId`          | `string` | Yes      | Target user ID       |
| `newPasswordHash` | `string` | Yes      | New bcrypt hash      |

**Returns:** how many `accounts` and `users` rows now hold the new hash.

**SQL Pattern (one transaction, current tenant):**

```sql
UPDATE accounts SET password_hash = ?
  WHERE "userId" = ? AND provider = 'credentials' AND tenant_id = ?;
UPDATE users SET password_hash = ?, updated_at = now()
  WHERE id = ? AND tenant_id = ?
    AND password_hash IS NOT NULL;  -- this condition only when an accounts row was updated
UPDATE users SET password_changed_at = now()
  WHERE id = ? AND tenant_id = ?;
```

When a credentials account was updated, the users row is written only if it already has a hash (the admin case), so a client does not gain a second password store. A user with no credentials account has the users row written, as before, so an admin who signed up through OAuth can still set a password with a reset.

The last statement stamps `users.password_changed_at` for admins and clients alike (a client's row is skipped by the hash update). The jwt callback ends every session that signed in before it, and `GET /api/auth/security/settings` returns it as `lastPasswordChange` (see [Session Management](../authentication/session-management.md#a-password-reset-or-change-ends-older-sessions)).

---

### `getSignInPasswordHash`

Returns the one password hash sign-in accepts for a user (`lib/auth/credentials.ts`): `users.passwordHash` for an admin that has one, otherwise the hash on the user's `credentials` row in `accounts`. Every check of a password that a signed-in user submits to confirm a sensitive action uses it: `POST /api/auth/change-password`, the `deleteAccount` and `deactivateAccount` server actions (the danger-zone forms) and `updatePassword`.

```typescript
async function getSignInPasswordHash(
  user: Pick<User, 'id' | 'passwordHash'>
): Promise<string | null>
```

**Parameters:**

| Parameter | Type                                  | Required | Description                     |
|-----------|---------------------------------------|----------|---------------------------------|
| `user`    | `Pick<User, 'id' \| 'passwordHash'>` | Yes      | The user's `users` row          |

**Returns:** the hash, or `null` when the user has no hash in either store (OAuth only).

**Logic (current tenant):**

```sql
-- only when users.passwordHash is set; a database error throws (isUserAdminOrThrow)
SELECT roles.is_admin FROM user_roles INNER JOIN roles ... LIMIT 1;
-- not an admin, or an admin without users.passwordHash:
SELECT password_hash FROM accounts
  WHERE "userId" = ? AND provider = 'credentials' AND tenant_id = ?
  LIMIT 1;
-- result: that hash, or users.passwordHash when there is none
```

A match in the other store is never accepted. Before `setUserPasswordHash` (#1140), resets and changes wrote `users.passwordHash` only, so deployed databases can still hold a stale hash there or on the credentials row (for example the seed password on a seeded admin's credentials row); accepting either store let that stale password authorize a change, an account deletion or a deactivation. A user with no credentials account hash gets `users.passwordHash`, the only hash they have (compatibility only: sign-in never reads it for a non-admin). It fails closed: a missing tenant or a failed role lookup throws instead of reading as "not an admin", which would check an admin against the credentials account hash.

---

### `updateUser`

Updates user details (currently limited to email).

```typescript
async function updateUser(
  values: Pick<NewUser, 'email'>,
  userId: string
): Promise<void>
```

**Parameters:**

| Parameter | Type                       | Required | Description      |
|-----------|----------------------------|----------|------------------|
| `values`  | `Pick<NewUser, 'email'>`   | Yes      | Fields to update |
| `userId`  | `string`                   | Yes      | Target user ID   |

---

### `updateUserVerification`

Sets or clears the email verification timestamp for a user.

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**Parameters:**

| Parameter  | Type      | Required | Description            |
|------------|-----------|----------|------------------------|
| `email`    | `string`  | Yes      | User email             |
| `verified` | `boolean` | Yes      | Verification status    |

**SQL Pattern:**

```sql
UPDATE users SET email_verified = CASE WHEN ? THEN NOW() ELSE NULL END
WHERE email = ?;
```

---

### `softDeleteUser`

Soft deletes a user by setting `deletedAt` and mangling the email to prevent reuse.

```typescript
async function softDeleteUser(userId: string): Promise<void>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**SQL Pattern:**

```sql
UPDATE users
SET deleted_at = CURRENT_TIMESTAMP,
    email = CONCAT(email, '-', id, '-deleted')
WHERE id = ?;
```

**Design Note:** The email is mangled with the user ID and a `-deleted` suffix to free up the original email address for potential re-registration while maintaining audit traceability.

---

### `updateClientProfileName`

Updates the name on a client profile.

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |
| `name`    | `string` | Yes      | New name     |

---

### `isUserAdmin`

Checks if a user has an active admin role by joining `userRoles` with `roles`.

```typescript
async function isUserAdmin(userId: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description  |
|-----------|----------|----------|--------------|
| `userId`  | `string` | Yes      | User ID      |

**Returns:** `Promise<boolean>` -- `true` if user has an active admin role

**SQL Pattern:**

```sql
SELECT roles.is_admin FROM user_roles
INNER JOIN roles ON user_roles.role_id = roles.id
WHERE user_roles.user_id = ?
  AND roles.is_admin = true
  AND roles.status = 'active'
LIMIT 1;
```

**Performance Notes:**
- Uses `INNER JOIN` for efficient filtering
- Checks both `isAdmin` flag and `active` status
- Returns `false` silently when `DATABASE_URL` is not set
- Returns `false` on a database error (logged); the query itself lives in `isUserAdminOrThrow`

---

### `isUserAdminOrThrow`

The same role check, failing closed: a missing tenant or a database error throws instead of
reading as "not an admin". `getSignInPasswordHash` uses it to pick the password store a
submitted password is checked against, so a failed lookup refuses (500 on
`POST /api/auth/change-password`) rather than checking an admin against the credentials account
hash.

```typescript
async function isUserAdminOrThrow(userId: string): Promise<boolean>
```

---

## Function Reference: auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

Retrieves password reset token by email. Returns the token record or `undefined`.

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

Retrieves password reset token by the token string itself.

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

Deletes a password reset token after it has been consumed.

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

Retrieves email verification token by email.

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

Retrieves email verification token by the token string.

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

Deletes a verification token after it has been consumed.

---

## Function Reference: utils.ts

### `extractUsernameFromEmail`

Safely extracts a username from an email address.

```typescript
function extractUsernameFromEmail(email: string): string | null
```

**Rules:**
- Splits email at `@` and takes the local part
- Removes invalid characters (keeps `a-zA-Z0-9._-`)
- Truncates to 30 characters
- Normalizes to lowercase
- Returns `null` for malformed input

### `ensureUniqueUsername`

Generates a unique username by appending numeric suffixes if needed.

```typescript
async function ensureUniqueUsername(baseUsername: string): Promise<string>
```

**Behavior:**
- Checks if `baseUsername` is available in `clientProfiles`
- If taken, tries `baseUsername1`, `baseUsername2`, etc.
- Fails after 1000 attempts with an error

---

## Performance Notes

1. **DATABASE_URL guard** -- `getUserByEmail`, `getUserById`, and `isUserAdmin` check for `DATABASE_URL` before querying. This allows the application to degrade gracefully when no database is configured.

2. **Soft delete pattern** -- `softDeleteUser` uses email mangling rather than physical deletion, preserving referential integrity across the system.

3. **Role checking** -- `isUserAdmin` uses a single JOIN query rather than multiple lookups, checking both the admin flag and active status in one operation.

## Usage Examples

### Checking admin access in middleware

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### User registration flow

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
