---
id: users-queries-deep-dive
title: 用户查询深入探讨
sidebar_label: 用户查询深入探讨
sidebar_position: 61
---

# 用户查询深入探讨

所有与用户相关的数据库查询功能的综合参考，包括用户查找、身份验证帮助程序、管理员角色检查和客户端配置文件管理实用程序。

## 概述

用户查询层分为多个模块：

- **`user.queries.ts`** -- 核心用户 CRUD 操作、身份验证查找和管理检查
- **`client.queries.ts`** -- 客户资料管理、搜索、统计和账户操作
- **`utils.ts`** -- 用于用户名生成和电子邮件处理的共享实用程序
- **`auth.queries.ts`** -- 密码重置和电子邮件验证令牌管理

## 源文件

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

通过 ID 查找用户。

```typescript
async function getUserById(id: string): Promise<User | null>
```

**参数：**

|参数|类型|必填|描述|
|-----------|----------|----------|-------------|
|`id`|`string`|是的|用户ID|

**返回：** `Promise<User | null>` -- 用户对象或`null`（如果未找到）

**SQL 模式：**

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

更新用户的密码哈希。

```typescript
async function updateUserPassword(
  newPasswordHash: string,
  userId: string
): Promise<void>
```

**参数：**

|参数|类型|必填|描述|
|-------------------|----------|----------|----------------------|
|`newPasswordHash`|`string`|是的|新的 bcrypt 哈希值|
|`userId`|`string`|是的|目标用户ID|

**SQL 模式：**

```sql
UPDATE users SET password_hash = ? WHERE id = ?;
```

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

设置或清除用户的电子邮件验证时间戳。

```typescript
async function updateUserVerification(
  email: string,
  verified: boolean
): Promise<void>
```

**参数：**

|参数|类型|必填|描述|
|------------|-----------|----------|------------------------|
|`email`|`string`|是的|用户邮箱|
|`verified`|`boolean`|是的|验证状态|

**SQL 模式：**

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

更新客户档案上的姓名。

```typescript
async function updateClientProfileName(
  userId: string,
  name: string
): Promise<void>
```

**参数：**

|参数|类型|必填|描述|
|-----------|----------|----------|--------------|
|`userId`|`string`|是的|用户ID|
|`name`|`string`|是的|新名称|

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

---

## 函数参考：auth.queries.ts

### `getPasswordResetTokenByEmail`

```typescript
async function getPasswordResetTokenByEmail(email: string)
```

通过电子邮件检索密码重置令牌。返回令牌记录或`undefined`。

### `getPasswordResetTokenByToken`

```typescript
async function getPasswordResetTokenByToken(token: string)
```

通过令牌字符串本身检索密码重置令牌。

### `deletePasswordResetToken`

```typescript
async function deletePasswordResetToken(token: string)
```

使用后删除密码重置令牌。

### `getVerificationTokenByEmail`

```typescript
async function getVerificationTokenByEmail(email: string)
```

通过电子邮件检索电子邮件验证令牌。

### `getVerificationTokenByToken`

```typescript
async function getVerificationTokenByToken(token: string)
```

通过令牌字符串检索电子邮件验证令牌。

### `deleteVerificationToken`

```typescript
async function deleteVerificationToken(token: string)
```

消耗验证令牌后将其删除。

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

## 性能说明

1. **DATABASE_URL 防护** -- `getUserByEmail`、`getUserById` 和 `isUserAdmin` 在查询之前检查 `DATABASE_URL`。这允许应用程序在未配置数据库时正常降级。

2. **软删除模式** - `softDeleteUser` 使用电子邮件修改而不是物理删除，从而保持整个系统的引用完整性。

3. **角色检查** -- `isUserAdmin` 使用单个 JOIN 查询而不是多个查找，在一个操作中检查管理标志和活动状态。

## 使用示例

### 检查中间件中的管理员访问权限

```typescript
import { getUserByEmail, isUserAdmin } from '@/lib/db/queries';

const user = await getUserByEmail(session.user.email);
if (user && await isUserAdmin(user.id)) {
  // Grant admin access
}
```

### 用户注册流程

```typescript
import { insertNewUser, updateUserVerification } from '@/lib/db/queries';

const [user] = await insertNewUser({
  email: 'newuser@example.com',
  passwordHash: hashedPassword,
});

// After email verification
await updateUserVerification('newuser@example.com', true);
```
