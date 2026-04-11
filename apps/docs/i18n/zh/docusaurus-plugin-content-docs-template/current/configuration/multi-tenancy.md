---
id: multi-tenancy
title: 多租户配置
sidebar_label: 多租户
sidebar_position: 13
---

# 多租户配置

本文档介绍 Directory Web Template 中多租户支持的工作原理。

## 概述

该模板使用**共享数据库、行级隔离**方案：

- 单个 PostgreSQL 数据库服务多个**租户**（目录网站）。
- 每张表都有一个 `tenant_id` 列，将数据限定到特定租户。
- 所有查询自动按当前租户过滤 —— 不会发生跨租户数据泄漏。

## 快速设置

### 1. 设置环境变量

在您的部署平台（Vercel、Docker 等）或 `.env.local` 中：

```bash
TENANT_ID="your-unique-tenant-id"
```

可以是任意唯一字符串（例如 UUID 或可读 slug，如 `"my-directory"`）。

### 2. 部署

首次启动时，应用程序将：

1. 运行数据库迁移（如果不存在则添加 `tenant_id` 列）
2. 创建与 `TENANT_ID` 值匹配的租户行
3. 将现有 `tenant_id` 为 NULL 的数据迁移到您的租户
4. 填充默认数据（管理员用户、角色、权限）

无需手动 SQL —— 一切自动完成。

### 3. 验证

检查服务器日志中的以下内容：

```
[DB Init] Ensured environment tenant 'your-unique-tenant-id' exists
[Tenant Migration] ✓ users: updated 3 rows
[Tenant Migration] ✅ Migration complete: 15 total rows updated across all tables.
```

## 租户解析工作原理

当应用程序需要确定当前租户时，使用**瀑布式**策略：

| 优先级 | 来源           | 描述                                                     |
| ------ | -------------- | -------------------------------------------------------- |
| 1      | **会话**       | JWT 令牌中的 `user.tenantId`（已认证用户）               |
| 2      | **环境变量**   | `TENANT_ID` 环境变量                                     |
| 3      | **HTTP 头部**  | `x-tenant-domain` 头部（用于子域名路由）                 |
| 4      | **数据库**     | 第一个活跃租户行（最终回退方案）                         |

`lib/auth/tenant.ts` 中的 `getTenantId()` 函数实现这一链式调用，并由每个数据库查询调用。

## 架构

### 关键文件

| 文件                                     | 用途                                                          |
| ---------------------------------------- | ------------------------------------------------------------- |
| `lib/auth/tenant.ts`                     | `getTenantId()` —— 带缓存的服务端租户解析                     |
| `lib/config/env.ts`                      | `TENANT_ID` 环境变量验证                                      |
| `lib/db/schema.ts`                       | 租户表 + 所有表的 `tenant_id` 外键                             |
| `lib/db/initialize.ts`                   | 自动创建环境租户 + 启动时运行数据迁移                         |
| `lib/db/migrate-tenant-data.ts`          | 将 `tenant_id` 为 NULL 的行分配到当前租户                     |
| `lib/auth/index.ts`                      | JWT/会话回调注入 `tenantId`                                    |
| `components/context/tenant-provider.tsx` | 客户端租户访问的 React 上下文                                  |
| `app/api/tenant/route.ts`                | `GET /api/tenant` —— 返回当前租户信息                         |

### 数据流

```
用户请求 → getTenantId() → 从会话/环境/头部/数据库解析
                                    ↓
                      所有数据库查询按此 tenant_id 过滤
                                    ↓
                      仅返回该租户的数据
```

### 认证集成

- **凭证登录**：管理员和客户端用户从其 `users.tenant_id` 列获取 `tenantId`。
- **OAuth 登录**：Drizzle 适配器被封装，以在创建用户时注入 `tenantId`。
- **JWT 回调**：从用户记录读取 `tenantId` 并将其嵌入令牌中。
- **会话回调**：将 `tenantId` 传播到 `session.user.tenantId`。
- **客户端组件**：使用 `TenantProvider` 中的 `useTenant()` hook 获取租户信息。

## 多个目录（多租户）

在单个数据库上运行多个目录网站：

1. **每个网站**在其环境中设置不同的 `TENANT_ID`：
    - 网站 A：`TENANT_ID="directory-a-uuid"`
    - 网站 B：`TENANT_ID="directory-b-uuid"`

2. **所有网站**连接到**同一数据库**（`DATABASE_URL`）。

3. **数据隔离**是自动的 —— 网站 A 只能看到 `tenant_id = 'directory-a-uuid'` 的行。

4. **用户、角色、评论、订阅**及所有其他数据都按租户完全隔离。

## 现有数据处理

从非租户版本升级时：

- `tenant_id` 列被添加为**可为空**（不会破坏现有数据）
- 首次启动时，`migrateNullTenantIds()` 自动将 NULL 行分配给已解析的租户
- 此迁移是**幂等的** —— 可安全多次运行
- 迁移后，所有现有数据在当前租户下均可见

## 子域名路由（高级）

基于子域名的租户路由（例如 `tenant-a.example.com`）：

1. 配置反向代理添加 `x-tenant-domain` 头部
2. 使用 `domain` 或 `slug` 字段创建租户记录：
    ```sql
    INSERT INTO tenant (id, name, domain, slug, status)
    VALUES ('uuid', 'Tenant A', 'tenant-a.example.com', 'tenant-a', 'active');
    ```
3. `resolveFromHeaders()` 策略将匹配域名并解析租户

## 租户表结构

```sql
CREATE TABLE tenant (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  domain TEXT UNIQUE,
  slug TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```
