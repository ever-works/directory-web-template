---
id: rbac
title: 基于角色的访问控制
sidebar_label: RBAC
sidebar_position: 4
---

# 基于角色的访问控制

## 概述

该模板使用存储在数据库中的角色实现 RBAC。

## 默认角色

| 角色 | 描述 |
|------|------|
| admin | 完全系统访问权限 |
| moderator | 内容审核访问权限 |
| user | 标准认证访问权限 |
| guest | 受限公共访问权限 |

## 分配角色

角色在数据库中分配。管理员用户可以通过 /admin/users 的管理面板管理角色。

## 检查权限

```typescript
// 在 API 路由中
const session = await auth();
if (!session?.user?.role || session.user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## 保护路由

使用中间件根据角色保护路由。认证中间件在允许访问之前检查会话和角色。
