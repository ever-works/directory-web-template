---
id: database-management
title: 数据库管理
sidebar_label: 数据库管理
sidebar_position: 4
---

# 数据库管理

Ever Works 模板使用 PostgreSQL 和 Drizzle ORM 处理所有数据库操作。本指南涵盖生产数据库管理、迁移、连接池、监控和数据初始化系统。

## 架构

| 层 | 文件 | 职责 |
|----|------|------|
| **配置** | `drizzle.config.ts` | Schema 路径、迁移输出、方言 |
| **连接** | `lib/db/drizzle.ts` | 连接池、单例实例、懒加载初始化 |
| **配置** | `lib/db/config.ts` | 用于脚本的安全数据库 URL 和环境辅助函数 |
| **Schema** | `lib/db/schema.ts` | 表定义、索引、约束 |
| **迁移** | `lib/db/migrate.ts` | 幂等迁移执行器 |
| **初始化** | `lib/db/initialize.ts` | 自动迁移、数据初始化、advisory locks |
| **数据初始化** | `lib/db/seed.ts` | 初始数据：角色、权限、管理员用户 |

## 连接管理

### 懒加载初始化单例

数据库连接在首次使用时创建，并通过 `globalThis` 缓存，以在开发中的 HMR 重载后存活。来自 `lib/db/drizzle.ts`：

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

导出的 `db` 对象使用 JavaScript Proxy 实现透明的懒加载初始化：

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

这意味着在第一次实际查询之前不会建立数据库连接。不使用数据库的路由没有连接开销。

### 连接池配置

| 设置 | 生产默认值 | 开发默认值 | 说明 |
|------|----------|----------|------|
| `max` | 20 | 10 | 连接池最大连接数 |
| `idle_timeout` | 20 秒 | 20 秒 | 空闲连接超时关闭时间 |
| `connect_timeout` | 30 秒 | 30 秒 | 新连接尝试超时时间 |
| `prepare` | false | false | 禁用 prepared statements（Vercel 兼容性） |

通过环境变量配置连接池大小：

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Schema 概览

`lib/db/schema.ts` 中的 Schema 定义了以下主要表：

### 用户与认证

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### 基于角色的访问控制

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### 完整表列表

| 表 | 用途 |
|----|------|
| `users` | 用户账户 |
| `accounts` | OAuth 提供商关联（NextAuth 适配器）|
| `sessions` | 活跃用户会话 |
| `roles` | 带管理员标志的角色定义 |
| `permissions` | 权限定义（资源:操作）|
| `userRoles` | 用户-角色分配 |
| `rolePermissions` | 角色-权限分配 |
| `clientProfiles` | 目录列表的扩展用户档案 |
| `subscriptions` | 付款订阅记录 |
| `subscriptionHistory` | 订阅变更审计追踪 |
| `paymentProviders` | 多提供商支付配置 |
| `paymentAccounts` | 提供商特定账户详情 |
| `activityLogs` | 用户操作审计追踪 |
| `comments` | 用户对条目的评论 |
| `votes` | 用户投票/评分 |
| `favorites` | 用户收藏/书签 |
| `notifications` | 应用内通知 |
| `seedStatus` | 数据初始化追踪（单例记录）|

## 迁移系统

### 迁移命令

| 命令 | 脚本 | 说明 |
|------|------|------|
| `pnpm db:generate` | `drizzle-kit generate` | 从 Schema 变更生成 SQL |
| `pnpm db:migrate` | `drizzle-kit migrate` | 应用待处理迁移（Drizzle CLI）|
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | 带详细日志的迁移执行 |
| `pnpm db:studio` | `drizzle-kit studio` | 打开 Drizzle Studio GUI |

## 数据库初始化

### 启动时自动初始化

`instrumentation.ts` 在每次应用启动时触发 `initializeDatabase()`：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

## 数据初始化

### 手动数据初始化

```bash
# Seed the database with initial data
pnpm db:seed
```

### 管理员凭据

在生产环境中，设置明确的管理员凭据：

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## 监控

### Drizzle Studio

通过图形界面浏览数据库：

```bash
pnpm db:studio
```

### 数据库健康检查

`/api/health` 端点可以检查数据库连接：

```bash
curl -s https://yourdomain.com/api/health
```
