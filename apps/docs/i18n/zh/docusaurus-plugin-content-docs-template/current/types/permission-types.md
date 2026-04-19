---
id: permission-types
title: 权限类型定义
sidebar_label: 权限类型
sidebar_position: 13
---

# 权限类型定义

**来源：** `lib/permissions/definitions.ts`、`lib/permissions/groups.ts`、`lib/db/schema.ts`

权限系统使用 `resource:action` 字符串模式来定义精细的访问控制。权限分配给角色，角色分配给用户。

## 核心类型

### `Permission`

所有有效权限字符串的联合，派生自 `PERMISSIONS` 常量。

```typescript
type Permission =
  | 'items:read' | 'items:create' | 'items:update'
  | 'items:delete' | 'items:review' | 'items:approve' | 'items:reject'
  | 'categories:read' | 'categories:create'
  | 'categories:update' | 'categories:delete'
  | 'tags:read' | 'tags:create' | 'tags:update' | 'tags:delete'
  | 'roles:read' | 'roles:create' | 'roles:update' | 'roles:delete'
  | 'users:read' | 'users:create' | 'users:update'
  | 'users:delete' | 'users:assignRoles'
  | 'analytics:read' | 'analytics:export'
  | 'system:settings';
```

## 权限登记处

`PERMISSIONS` 常量按资源组织权限。

```typescript
const PERMISSIONS = {
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
  tags: { read, create, update, delete },
  roles: { read, create, update, delete },
  users: { read, create, update, delete, assignRoles },
  analytics: { read, export },
  system: { settings },
} as const;
```

|资源|行动|
|----------|---------|
|`items`|`read`、`create`、`update`、`delete`、`review`、`approve`、`reject`|
|`categories`|`read`、`create`、`update`、`delete`|
|`tags`|`read`、`create`、`update`、`delete`|
|`roles`|`read`、`create`、`update`、`delete`|
|`users`|`read`、`create`、`update`、`delete`、`assignRoles`|
|`analytics`|`read`、`export`|
|`system`|`settings`|

## 接口

### `PermissionGroup`

管理 UI 的组相关权限。

```typescript
interface PermissionGroup {
  id: string;           // 'content' | 'users' | 'system'
  name: string;         // Display name
  description: string;  // What this group covers
  icon: string;         // Lucide icon name
  permissions: Permission[];
}
```

该模板附带三个内置组：

|集团|包含的权限|
|-------|---------------------|
|`content`|所有 `items`、`categories` 和 `tags` 权限|
|`users`|所有 `users` 和 `roles` 权限|
|`system`|所有 `analytics` 和 `system` 权限|

## 数据库架构

### `permissions`表

```typescript
{
  id: text,          // UUID primary key
  key: text,         // Unique permission string (e.g., 'items:read')
  description: text,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

### `role_permissions`表

将角色与其权限链接起来的连接表。

```typescript
{
  roleId: text,       // FK -> roles.id
  permissionId: text, // FK -> permissions.id
  createdAt: timestamp,
}
```

## 实用功能

|功能|返回|描述|
|----------|--------|-------------|
|`getAllPermissions()`|`Permission[]`|返回每个权限字符串|
|`getPermissionsForResource(resource)`|`Permission[]`|返回特定资源的权限|
|`isValidPermission(str)`|`boolean`|类型防护检查字符串是否为有效权限|
|`getPermissionGroup(perm)`|`PermissionGroup`|查找权限属于哪个组|
|`formatPermissionName(perm)`|`string`|将`'items:create'` 格式设置为`'Create Items'`|
|`formatPermissionDescription(perm)`|`string`|生成人类可读的描述|

## 使用示例

```typescript
import { PERMISSIONS, isValidPermission } from '@/lib/permissions/definitions';
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';

// Check a specific permission
if (userPermissions.includes(PERMISSIONS.items.approve)) {
  // Show approve button
}

// Validate a permission string from API input
if (isValidPermission(input)) {
  // Safe to assign
}
```

## 相关类型

- [角色类型](./role-types.md) -- 角色定义和分配
- [Auth Types](./auth-types.md) -- 带有 `isAdmin` 标志的用户会话
