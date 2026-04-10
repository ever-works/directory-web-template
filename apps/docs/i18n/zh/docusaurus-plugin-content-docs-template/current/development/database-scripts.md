---
id: database-scripts
title: "数据库脚本"
sidebar_label: "数据库脚本"
sidebar_position: 10
---

# 数据库脚本

该模板提供了一套数据库管理脚本，用于迁移、数据填充和维护。这些脚本使用 Drizzle ORM，旨在用于本地开发、CI/CD 流水线和 Vercel 生产部署。

## 脚本清单

| 脚本 | 命令 | 用途 |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | 构建时迁移执行器 |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | 交互式手动迁移 |
| `cli-seed.ts` | `pnpm db:seed` | 数据填充 CLI 入口点 |
| `seed.ts` | 直接执行 | 完整数据库填充 |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Stripe 产品目录配置 |
| `clean-database.js` | `node scripts/clean-database.js` | 核重置（删除所有内容）|

## 迁移脚本

### 构建时迁移（build-migrate.ts）

在 Vercel 部署期间的 `pnpm build` 时自动运行。设计用于无停机时间的架构更新。

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**环境行为：**

| 环境 | 迁移失败 | 连接错误 | 认证错误 |
|---|---|---|---|
| 生产环境（`VERCEL_ENV=production`） | 构建失败 | 构建失败 | 构建失败 |
| 预览环境（`VERCEL_ENV=preview`） | 构建失败 | 构建通过（警告） | 构建失败 |
| CI（GitHub Actions） | 完全跳过 | 完全跳过 | 完全跳过 |
| 本地开发 | 构建失败 | 构建失败 | 构建失败 |

**架构验证：**

迁移成功后，脚本验证关键列是否存在：

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### 手动迁移 CLI（cli-migrate.ts）

针对任何数据库手动执行迁移的交互式工具。

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**三步流程：**

1. **检查当前状态** -- 查询 `drizzle.__drizzle_migrations` 表以获取已应用迁移的历史记录
2. **执行迁移** -- 调用来自 `lib/db/migrate.ts` 的 `runMigrations()`
3. **验证架构** -- 确认所需列存在

## 数据填充脚本

### 数据库填充（seed.ts）

用真实的测试数据填充数据库。仅在表为空时填充。

```bash
DATABASE_URL=postgres://... pnpm seed
```

**填充顺序和依赖关系：**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**生成的数据：**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

### 填充 CLI 入口点（cli-seed.ts）

加载环境变量并委托给 `lib/db/seed.ts` 的包装脚本。

脚本按以下顺序查找环境文件：
1. `.env.local`（首选）
2. `.env`（备选）
3. 仅系统环境变量（如果文件不存在）

### Stripe 产品填充（seed-stripe-products.ts）

创建包含订阅计划和一次性购买产品的完整 Stripe 产品目录。

```bash
npx tsx scripts/seed-stripe-products.ts
```

**需要：** `.env.local` 中的 `STRIPE_SECRET_KEY`

**产品和价格：**

| 产品 | 计划键 | 价格类型 | 元数据 |
|---|---|---|---|
| Free | `free` | 订阅（$0/月） | `type: subscription` |
| Standard | `standard` | $10/月，$96/年 | `annualDiscount: 20` |
| Premium | `premium` | $20/月，$180/年 | `annualDiscount: 25` |
| 赞助广告 - 周 | `sponsor_weekly` | $100 一次性 | `type: sponsor_ad` |
| 赞助广告 - 月 | `sponsor_monthly` | $300 一次性 | `type: sponsor_ad` |

## 数据库清理

### clean-database.js

删除所有表和 Drizzle 迁移跟踪架构。提供完整的数据库重置。

```bash
node scripts/clean-database.js
```

**执行的操作：**

1. 使用 `CASCADE` 删除 `public` 架构中的所有表
2. 删除 `drizzle` 架构（迁移历史记录）

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**警告：** 此操作不可逆。在任何包含真实数据的环境中运行前，请始终先备份。

## 常见工作流程

### 全新开发设置

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### 重置并重新填充

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## 环境变量

| 变量 | 使用于 | 用途 |
|---|---|---|
| `DATABASE_URL` | 所有脚本 | PostgreSQL 连接字符串 |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | 设置为 `true` 以跳过构建迁移 |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | 用于产品创建的 Stripe API 密钥 |
| `SEED_ADMIN_EMAIL` | seed.ts（通过 lib） | 管理员账户邮箱 |
| `SEED_ADMIN_PASSWORD` | seed.ts（通过 lib） | 管理员账户密码 |

## 错误处理

所有数据库脚本遵循以下约定：

- 成功或可接受的跳过条件时退出码为 `0`
- 应停止流水线的失败时退出码为 `1`
- 连接字符串在日志中被遮蔽（`://***:***@`）
- 详细错误信息记录在服务器端
- 生产错误始终导致构建失败（不会沉默）
