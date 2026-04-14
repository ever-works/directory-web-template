---
id: user-repository
title: 用户存储库
sidebar_label: 用户存储库
sidebar_position: 17
---

# 用户存储库

`UserRepository` 类为身份验证级用户记录提供数据访问层。它通过验证（通过 Zod 模式）、唯一性检查和一致的错误处理来包装 `UserDbService`。

**源文件：** `template/lib/repositories/user.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  UserRepository           <-- validation, uniqueness checks, error wrapping
        |
  UserDbService            <-- database CRUD via Drizzle ORM
        |
  PostgreSQL / SQLite      <-- users table
```

Unlike the Git-backed repositories (items, tags, categories), the User Repository operates directly against the relational database through `UserDbService`.

---

## 类定义

```ts
export class UserRepository {
  private userDbService: UserDbService;

  constructor() {
    this.userDbService = new UserDbService();
  }
}
```

### 依赖关系

|进口|目的|
|--------|---------|
|`UserDbService`|为用户CRUD操作提供数据库服务|
|`AuthUserData`|表示经过身份验证的用户记录的类型|
|`CreateUserRequest` / `UpdateUserRequest`|请求 DTO 创建和更新|
|`UserListOptions`|过滤和分页选项|
|`AuthUserListResponse`|分页响应类型|
|`userValidationSchema` / `updateUserValidationSchema`|Zod 验证模式|

---

## Query Methods

### `findAll(options?): Promise<AuthUserListResponse>`

Returns a paginated list of users with optional filtering.

```ts
async findAll(options: UserListOptions = {}): Promise<AuthUserListResponse>
```

**Return type:**

```ts
interface AuthUserListResponse {
  users: AuthUserData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Delegates to `userDbService.findUsers(options)` and maps the result into the standard paginated response shape. Wraps all database errors with a generic "Failed to retrieve users" message.

---

### `findById(id): Promise<AuthUserData | null>`

通过唯一标识符检索单个用户。

```ts
async findById(id: string): Promise<AuthUserData | null>
```

当没有用户匹配时，返回`null`。

---

### `getAllUsers(): Promise<AuthUserData[]>`

Returns every user record without pagination. Intended for use in admin dropdowns, assignment lists, and similar UI elements where the full user set is needed.

```ts
async getAllUsers(): Promise<AuthUserData[]>
```

---

### `getStats(): Promise<UserStats>`

返回聚合用户统计信息。

```ts
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
}>
```

代表`userDbService.getUserStats()`。

---

### `usernameExists(username, excludeId?): Promise<boolean>`

Checks whether a given username is already taken. Optionally excludes a specific user ID (useful during updates).

```ts
async usernameExists(username: string, excludeId?: string): Promise<boolean>
```

Delegates to `userDbService.clientProfileUsernameExists`.

---

### `emailExists(email, excludeId?): Promise<boolean>`

检查电子邮件地址是否已被使用。通过加载所有用户并在内存中进行过滤来执行不区分大小写的比较。

```ts
async emailExists(email: string, excludeId?: string): Promise<boolean>
```

---

## Mutation Methods

### `create(data): Promise<AuthUserData>`

Creates a new user after validation and uniqueness enforcement.

```ts
async create(data: CreateUserRequest): Promise<AuthUserData>
```

**Processing steps:**

1. Validates `email` and `password` fields using `userValidationSchema.pick(...)` (Zod)
2. Checks email uniqueness via `userDbService.emailExists`
3. Creates the user record through `userDbService.createUser`

Throws an `Error("Email already in use")` if the email is taken.

---

### `update(id, data): Promise<AuthUserData>`

在验证和存在检查后更新现有用户。

```ts
async update(id: string, data: UpdateUserRequest): Promise<AuthUserData>
```

**处理步骤：**

1. 使用`updateUserValidationSchema.parse(data)` (Zod) 验证输入
2. 通过 `findById` 验证用户是否存在
3. 通过 `userDbService.updateUser` 应用更新

如果目标用户不存在，则抛出`Error("User not found")`。

---

### `delete(id): Promise<void>`

Permanently deletes a user record.

```ts
async delete(id: string): Promise<void>
```

**Processing steps:**

1. Verifies the user exists via `findById`
2. Deletes through `userDbService.deleteUser`

Throws an `Error("User not found")` if the target does not exist.

> **Note:** Role-based deletion checks are handled at the profile level since `AuthUserData` contains only authentication information.

---

## 错误处理模式

所有公共方法都遵循一致的错误处理策略：

```ts
try {
  // ... operation ...
} catch (error) {
  if (error instanceof Error) {
    throw error;           // Re-throw domain errors (validation, not-found)
  }
  console.error('Error [operation]:', error);
  throw new Error('Failed to [operation]');  // Generic fallback
}
```

这可确保特定于域的错误（已获取电子邮件、未找到用户）干净地传播到 API 路由，同时记录意外错误并替换为安全消息。

---

## Validation Schemas

The repository uses two Zod schemas from `@/lib/types/user`:

- **`userValidationSchema`** -- full user creation schema; the repository picks only `email` and `password`
- **`updateUserValidationSchema`** -- partial update schema that validates whichever fields are provided

---

## 使用示例

```ts
import { UserRepository } from '@/lib/repositories/user.repository';

const userRepo = new UserRepository();

// List users with pagination
const result = await userRepo.findAll({ page: 1, limit: 25 });

// Create a new user
const newUser = await userRepo.create({
  email: 'new@example.com',
  password: 'securePassword123',
});

// Check availability
const taken = await userRepo.emailExists('test@example.com');

// Get statistics
const stats = await userRepo.getStats();
// => { total: 150, active: 142, inactive: 8 }
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/user-db.service.ts` | Underlying database service |
| `lib/types/user.ts` | Type definitions and Zod schemas |
| `lib/db/drizzle.ts` | Database connection and Drizzle instance |
| `lib/repositories/role.repository.ts` | Role management (related to user permissions) |
