---
id: role-types
title: 角色系统类型定义
sidebar_label: 角色类型
sidebar_position: 19
---

# 角色系统类型定义

**来源：** `lib/types/role.ts`、`lib/permissions/definitions.ts`、`lib/db/schema.ts`

角色将权限组合在一起并分配给用户。系统支持具有精细权限矩阵的自定义角色。

## 接口

### `RoleData`

API 返回的主要角色数据结构。

```typescript
interface RoleData {
  id: string;               // Slug-style identifier (e.g., 'content-manager')
  name: string;             // Display name
  description: string;      // What this role is for
  status: RoleStatus;       // 'active' | 'inactive'
  isAdmin: boolean;         // Has full admin access
  permissions: Permission[]; // Array of permission strings
  created_at: string;       // ISO 8601 timestamp
  updated_at: string;
  created_by: string;       // User ID or 'system'
}
```

|领域|描述|
|-------|-------------|
|`id`|小写字母，3-50 个字符，模式：`^[a-z0-9-]+$`|
|`name`|人类可读的名称，3-100 个字符|
|`isAdmin`|当 `true` 时，角色授予完整的系统访问权限，无论个人权限如何|
|`permissions`|权限注册表中的 `resource:action` 字符串数组|

### `RoleWithCount`

角色数据通过用户分配计数进行扩展。

```typescript
interface RoleWithCount extends RoleData {
  userCount?: number;  // Number of users with this role
}
```

### `CreateRoleRequest`

用于创建新角色的负载。

```typescript
interface CreateRoleRequest {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;
  isAdmin?: boolean;
  permissions: Permission[];
}
```

### `UpdateRoleRequest`

用于更新角色的负载。仅需要`id`；所有其他字段都是可选的。

```typescript
interface UpdateRoleRequest extends Partial<Omit<CreateRoleRequest, 'id'>> {
  id: string;
}
```

### `RoleListOptions`

列出角色的查询参数。

```typescript
interface RoleListOptions {
  page?: number;
  limit?: number;
  status?: RoleStatus;
  sortBy?: 'name' | 'id' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

### `RoleListResponse`

分页角色列表响应。

```typescript
interface RoleListResponse {
  roles: RoleData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## 作业类型

### `RoleAssignment`

最小分配有效负载。

```typescript
interface RoleAssignment {
  roleId: string;
}
```

### `UserRoleAssignment`

将角色分配给特定用户。

```typescript
interface UserRoleAssignment extends RoleAssignment {
  userId: string;
}
```

### `PermissionAssignment`

更新角色的权限。

```typescript
interface PermissionAssignment extends RoleAssignment {
  permissions: Permission[];
}
```

### 类型别名

```typescript
type RolePermissionUpdate = PermissionAssignment;
type UserRoleUpdate = UserRoleAssignment;
```

## 状态类型

```typescript
const ROLE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

type RoleStatus = 'active' | 'inactive';
```

## 验证规则

```typescript
const ROLE_VALIDATION = {
  ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-z0-9-]+$/,
  },
  NAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
  DESCRIPTION: {
    MAX_LENGTH: 500,
  },
} as const;
```

|领域|规则|
|-------|------|
|`id`|3-50 个字符，仅限小写字母数字和连字符|
|`name`|3-100个字符|
|`description`|最多 500 个字符|

## 默认角色

该模板附带了 `lib/permissions/definitions.ts` 中定义的两个内置角色：

|角色|身份证号|管理员|权限|
|------|----|-------|-------------|
|超级管理员|`super-admin`|是的|所有权限|
|内容经理|`content-manager`|否|所有 `items`、`categories` 和 `tags` 权限|

## 数据库架构

### `roles`表

```typescript
{
  id: text,            // Primary key
  name: text,          // Unique
  description: text,
  isAdmin: boolean,    // Default: false
  status: text,        // 'active' | 'inactive'
  created_by: text,    // Default: 'system'
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp, // Soft delete
}
```

### `user_roles`表

将用户链接到角色的连接表。

```typescript
{
  userId: text,   // FK -> users.id
  roleId: text,   // FK -> roles.id
  createdAt: timestamp,
}
// Composite primary key: (userId, roleId)
```

## 使用示例

```typescript
import type { CreateRoleRequest } from '@/lib/types/role';
import { PERMISSIONS } from '@/lib/permissions/definitions';

const newRole: CreateRoleRequest = {
  id: 'reviewer',
  name: 'Content Reviewer',
  description: 'Can review and approve submitted items',
  status: 'active',
  isAdmin: false,
  permissions: [
    PERMISSIONS.items.read,
    PERMISSIONS.items.review,
    PERMISSIONS.items.approve,
    PERMISSIONS.items.reject,
  ],
};
```

## 相关类型

- [权限类型](./permission-types.md) -- 权限定义和组
- [Auth Types](./auth-types.md) -- 带有管理员标志的用户会话
- [用户类型](./user-types.md) -- 用户数据结构
