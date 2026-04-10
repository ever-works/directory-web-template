---
id: security-config
title: "安全配置"
sidebar_label: "安全配置"
sidebar_position: 5
---

# 安全配置

该模板实现了深度防御安全策略，包括基于权限的访问控制、输入验证、安全错误响应和 URL 净化。本指南记录了每个安全层及其配置方法。

## 权限系统

模板使用在 `lib/permissions/definitions.ts` 中定义、并通过 `lib/middleware/permission-check.ts` 强制执行的细粒度资源-操作权限模型。

### 权限格式

权限遵循 `resource:action` 格式：

```
items:read
items:create
items:update
items:delete
items:review
items:approve
items:reject
categories:read
categories:create
users:assignRoles
analytics:read
system:settings
```

### 权限检查函数

`lib/middleware/permission-check.ts` 中的权限中间件提供了一套全面的授权辅助函数：

```ts
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  canManageResource,
  canReviewItems,
  canManageUsers,
  canManageRoles,
  canViewAnalytics,
  isSuperAdmin
} from '@/lib/middleware/permission-check';

// Check a single permission
hasPermission(userPermissions, 'items:create');

// Check if user has ANY of the given permissions
hasAnyPermission(userPermissions, ['items:review', 'items:approve']);

// Check if user has ALL of the given permissions
hasAllPermissions(userPermissions, ['items:read', 'items:update']);

// Check a resource:action pair (with validation)
hasResourcePermission(userPermissions, 'items', 'delete');

// Get all permissions for a resource
const itemPerms = getResourcePermissions(userPermissions, 'items');
// e.g., ['items:read', 'items:create', 'items:update']

// Check if user can manage (create/update/delete) a resource
canManageResource(userPermissions, 'categories');
```

### UserPermissions 接口

```ts
interface UserPermissions {
  userId: string;
  roles: string[];
  permissions: Permission[];
}
```

### 角色特定检查

```ts
// Check if user can review items (review, approve, or reject)
canReviewItems(userPermissions);

// Check if user can manage users
canManageUsers(userPermissions);

// Check if user can manage roles
canManageRoles(userPermissions);

// Check if user can view analytics
canViewAnalytics(userPermissions);
```

### 超级管理员检测

`isSuperAdmin` 函数检查两个条件：

1. 用户具有 `'super-admin'` 角色（首选），或者
2. 用户拥有所有系统权限（备用方案）

```ts
export function isSuperAdmin(userPermissions: UserPermissions): boolean {
  if (userPermissions.roles.includes('super-admin')) {
    return true;
  }
  // Fallback: check if user has ALL system permissions
  const allPermissions: Permission[] = [
    'items:read', 'items:create', 'items:update', 'items:delete',
    'items:review', 'items:approve', 'items:reject',
    'categories:read', 'categories:create', 'categories:update', 'categories:delete',
    'tags:read', 'tags:create', 'tags:update', 'tags:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:assignRoles',
    'analytics:read', 'analytics:export',
    'system:settings'
  ];
  return hasAllPermissions(userPermissions, allPermissions);
}
```

### 权限验证

```ts
// Validate a permission string is recognized
validatePermission('items:read'); // true
validatePermission('invalid:perm'); // false

// Parse a permission into resource and action
parsePermission('items:create');
// Returns: { resource: 'items', action: 'create' }

// Get a summary grouped by resource
getPermissionSummary(userPermissions);
// Returns: { items: ['read', 'create'], categories: ['read'], ... }
```

## API 路由保护

API 路由使用基于会话的身份验证和管理员角色检查：

```ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  // Proceed with authorized logic...
}
```

## 输入验证

模板在整个应用中使用 Zod 模式进行输入验证：

```ts
import { z } from 'zod';

const createNotificationSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  userId: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

// In API route
const body = await request.json();
const parsed = createNotificationSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
}
```

## URL 净化

编辑器模块在 `lib/editor/utils/utils.ts` 中包含 URL 净化功能：

```ts
export function isAllowedUri(uri: string | undefined, protocols?: ProtocolConfig): boolean {
  const allowedProtocols = [
    "http", "https", "ftp", "ftps", "mailto", "tel",
    "callto", "sms", "cid", "xmpp"
  ];
  // Validates URI against whitelist and strips ATTR_WHITESPACE
  // ...
}

export function sanitizeUrl(inputUrl: string, baseUrl: string, protocols?: ProtocolConfig): string {
  try {
    const url = new URL(inputUrl, baseUrl);
    if (isAllowedUri(url.href, protocols)) return url.href;
  } catch { /* invalid URL */ }
  return "#";
}
```

这可以防止 `javascript:` 和其他危险协议 URL 嵌入到编辑器内容中。

## 原型污染防护

`ConfigManager` 在更新嵌套配置键时防止原型污染：

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

async updateNestedKey(keyPath: string, value: any): Promise<boolean> {
  const keys = keyPath.split('.');
  for (const key of keys) {
    if (this.isPrototypePollutingKey(key)) {
      return false; // Silently reject
    }
  }
  // ...
}
```

## Cookie 安全

Cookie 配置通过 Zod 模式进行验证：

```ts
const cookieConfigSchema = z.object({
  secret: z.string().optional(),
  domain: z.string().default('localhost'),
  secure: z.boolean().default(false),
});
```

生产环境设置：

```bash
COOKIE_SECRET=<random-32-byte-base64>
COOKIE_DOMAIN=yourdomain.com
COOKIE_SECURE=true
```

## Next.js 安全标头

`next.config.ts` 文件配置安全标头。常用的安全标头：

| 标头 | 用途 |
|------|------|
| `X-Frame-Options` | 防止点击劫持 |
| `X-Content-Type-Options` | 防止 MIME 类型嗅探 |
| `Referrer-Policy` | 控制 referrer 信息 |
| `X-XSS-Protection` | 启用浏览器 XSS 过滤 |
| `Strict-Transport-Security` | 强制使用 HTTPS |
| `Permissions-Policy` | 限制浏览器功能 |

## 环境变量安全

配置系统确保敏感变量仅在服务器端可用：

```ts
// lib/config/config-service.ts
import 'server-only';  // Prevents importing in client bundles
```

带有 `NEXT_PUBLIC_` 前缀的变量会暴露给客户端。其他所有变量（密钥、数据库 URL、API 令牌）仅保留在服务器端：

- `STRIPE_SECRET_KEY` -- 仅服务器端
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` -- 客户端安全
- `DATABASE_URL` -- 仅服务器端
- `AUTH_SECRET` -- 仅服务器端

## 最佳实践

1. **始终验证输入** 使用 Zod 模式进行处理前验证
2. **检查身份验证** 在每个 API 路由处理程序的顶部
3. **使用权限检查** 进行基于角色的访问控制
4. **净化 URL** 在将其嵌入内容之前
5. **保持密钥仅在服务器端** 使用 `server-only` 导入保护
6. **在生产环境中设置 `COOKIE_SECURE=true`**
7. **使用强密钥** 为 `AUTH_SECRET` 和 `COOKIE_SECRET`（最少 32 字节 base64）
8. **添加新资源或操作时审查权限模型**

## 相关文件

| 路径 | 描述 |
|------|------|
| `lib/middleware/permission-check.ts` | 权限执行函数 |
| `lib/permissions/definitions.ts` | 权限和角色定义 |
| `lib/config/config-service.ts` | 仅服务器端配置单例 |
| `lib/config/schemas/auth.schema.ts` | 认证/Cookie 配置模式 |
| `lib/editor/utils/utils.ts` | URL 净化工具 |
| `lib/config-manager.ts` | 带原型污染防护的配置 YAML 管理器 |
| `auth.config.ts` | NextAuth 配置 |
| `next.config.ts` | 安全标头和 CSP |
