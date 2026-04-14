---
id: permission-definitions
title: 权限定义
sidebar_label: 权限定义
sidebar_position: 32
---

# 权限定义

该模板包括一个细粒度的权限系统，该系统组织为基于资源的定义、UI 友好的组和状态管理实用程序。该系统控制对管理功能、内容管理和分析的访问。

## 文件结构

```
lib/permissions/
  definitions.ts    # Permission constants, types, default roles
  groups.ts         # UI-oriented permission groups, formatting helpers
  utils.ts          # State management utilities for permission UIs
```

## 权限定义 (`definitions.ts`)

所有权限都遵循 `resource:action` 命名约定。 `PERMISSIONS` 对象是唯一的事实来源：

```ts
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

### 权限类型

`Permission` 类型自动从 `PERMISSIONS` 对象派生，确保类型安全，无需手动复制：

```ts
type PermissionValues<T> = T extends Record<string, infer U>
  ? U extends Record<string, infer V>
    ? V extends string ? V : never
    : never
  : never;

export type Permission = PermissionValues<typeof PERMISSIONS>;
// Results in: 'items:read' | 'items:create' | ... | 'system:settings'
```

### 实用功能

```ts
// Get all permissions as a flat array
getAllPermissions(): Permission[]

// Get permissions for a specific resource
getPermissionsForResource(resource: keyof typeof PERMISSIONS): Permission[]

// Type guard to validate a string is a valid permission
isValidPermission(permission: string): permission is Permission
```

使用示例：

```ts
import { getAllPermissions, getPermissionsForResource, isValidPermission } from '@/lib/permissions/definitions';

const allPerms = getAllPermissions();
// => ['items:read', 'items:create', ..., 'system:settings']

const itemPerms = getPermissionsForResource('items');
// => ['items:read', 'items:create', 'items:update', ...]

if (isValidPermission(userInput)) {
  // userInput is typed as Permission
}
```

### 默认角色

两个内置角色定义提供了合理的默认值：

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
} as const;
```

## 权限组 (`groups.ts`)

权限组组织权限以在管理 UI 组件（例如角色编辑器）中显示：

```ts
export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  icon: string;        // Lucide icon name
  permissions: Permission[];
}

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

### 组实用函数

```ts
// Find which group a permission belongs to
getPermissionGroup(permission: Permission): PermissionGroup | undefined

// Get all permissions in a group by ID
getPermissionsByGroup(groupId: string): Permission[]

// Format "items:read" into "Read Items"
formatPermissionName(permission: Permission): string

// Format "items:read" into "View and access items and submissions"
formatPermissionDescription(permission: Permission): string
```

使用示例：

```ts
import {
  getPermissionGroup,
  formatPermissionName,
  formatPermissionDescription,
} from '@/lib/permissions/groups';

const group = getPermissionGroup('items:read');
// => { id: 'content', name: 'Content Management', ... }

formatPermissionName('items:approve');
// => "Approve Items"

formatPermissionDescription('users:assignRoles');
// => "Assign roles to users"
```

## 许可状态实用程序 (`utils.ts`)

这些函数管理管理 UI 中的权限切换状态（例如角色创建或编辑表单）：

### 创建权限状态

将权限数组转换为基于复选框的 UI 的布尔映射：

```ts
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

const currentPerms: Permission[] = ['items:read', 'items:create'];

const state = createPermissionState(currentPerms);
// => { 'items:read': true, 'items:create': true }

// After user toggles checkboxes...
state['items:update'] = true;
state['items:read'] = false;

const selected = getSelectedPermissions(state);
// => ['items:create', 'items:update']
```

### 计算变化

比较权限集时确定添加和删除的内容：

```ts
import { calculatePermissionChanges } from '@/lib/permissions/utils';

const original = ['items:read', 'items:create'];
const updated = ['items:read', 'items:update'];

const changes = calculatePermissionChanges(original, updated);
// => { added: ['items:update'], removed: ['items:create'] }
```

### 比较权限

检查两个权限数组是否包含相同的权限，无论顺序如何：

```ts
import { arePermissionsEqual } from '@/lib/permissions/utils';

arePermissionsEqual(['items:read', 'items:create'], ['items:create', 'items:read']);
// => true
```

### 过滤权限

按关键字搜索权限：

```ts
import { filterPermissions } from '@/lib/permissions/utils';

const allPerms = getAllPermissions();
const results = filterPermissions(allPerms, 'delete');
// => ['items:delete', 'categories:delete', 'tags:delete', ...]
```

## 常见模式

### 检查组件中的权限

```ts
import { PERMISSIONS } from '@/lib/permissions/definitions';

function canUserApprove(userPermissions: string[]): boolean {
  return userPermissions.includes(PERMISSIONS.items.approve);
}
```

### 构建角色编辑器

```ts
import { PERMISSION_GROUPS } from '@/lib/permissions/groups';
import { createPermissionState, getSelectedPermissions } from '@/lib/permissions/utils';

function RoleEditor({ role }) {
  const [permState, setPermState] = useState(
    createPermissionState(role.permissions)
  );

  // Render groups with toggleable checkboxes
  return PERMISSION_GROUPS.map(group => (
    <PermissionGroupCard key={group.id} group={group} state={permState} />
  ));
}
```

## 相关文件

- `lib/permissions/definitions.ts` - 权限常量、类型和默认角色
- `lib/permissions/groups.ts` - UI 组和格式化助手
- `lib/permissions/utils.ts` - 状态管理实用程序
- `lib/guards/` - 消耗权限的路由和组件防护
