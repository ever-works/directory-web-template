---
id: drizzle-config
title: Drizzle ORM 配置
sidebar_label: Drizzle 配置
sidebar_position: 9
---

# Drizzle ORM 配置

本页面记录了模板用于数据库模式管理、迁移和类型安全查询构建的 Drizzle ORM 配置。配置位于项目根目录的 `drizzle.config.ts` 中。

## 概述

模板使用 [Drizzle ORM](https://orm.drizzle.team/)，以 PostgreSQL 作为数据库方言。Drizzle 提供类型安全的数据库访问、自动迁移生成和用于检查数据库的可视化工作室。

## 配置文件

完整配置在 `drizzle.config.ts` 中定义：

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// 如果未设置 DATABASE_URL，使用虚拟 URL（数据库对本项目是可选的）
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## 配置属性

### `schema`

- **值：** `"./lib/db/schema.ts"`
- **用途：** 指向包含所有 Drizzle 表定义的文件。`pgTable` 声明在此处。

`lib/db/schema.ts` 中的模式文件使用 Drizzle 的 PostgreSQL 列构建器定义表：

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...其他列
});
```

### `out`

- **值：** `"./lib/db/migrations"`
- **用途：** 存储生成的 SQL 迁移文件的目录。每次运行 `drizzle-kit generate` 时，新的迁移文件会出现在这里。

### `dialect`

- **值：** `"postgresql"`
- **用途：** 指定数据库引擎。模板以 PostgreSQL 为目标用于生产部署。

### `dbCredentials`

- **值：** `{ url: databaseUrl }`
- **用途：** 数据库连接字符串。从 `DATABASE_URL` 环境变量读取。

## 环境变量加载

配置按顺序从两个文件加载环境变量：

1. `.env` — 基础环境变量
2. `.env.local` — 本地覆盖（优先级更高）

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

这种双重加载方式允许将共享默认值保存在 `.env` 中，同时在本地覆盖数据库 URL 和密钥。

## 回退数据库 URL

配置包含一个虚拟回退 URL：

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

此回退存在是因为数据库对本项目是可选的。它允许 `generate` 等 Drizzle Kit 命令在没有真实数据库的情况下运行，这在 CI/CD 或项目初始设置时很有用。

## 常用命令

模板在 `package.json` 中定义了几个数据库相关脚本：

| 命令 | 描述 |
|---------|-------------|
| `pnpm db:generate` | 根据模式变更生成迁移文件 |
| `pnpm db:migrate` | 将待处理的迁移应用到数据库 |
| `pnpm db:seed` | 用初始数据填充数据库 |
| `pnpm db:studio` | 打开 Drizzle Studio 进行可视化数据库管理 |

### 生成迁移

修改 `lib/db/schema.ts` 中的模式后，生成新的迁移：

```bash
pnpm db:generate
```

这会在 `lib/db/migrations/` 中创建一个新的 SQL 迁移文件，包含使数据库与模式同步所需的 DDL 语句。

### 运行迁移

应用所有待处理的迁移：

```bash
pnpm db:migrate
```

### 启动时自动迁移

模板还通过 instrumentation 文件在应用程序启动时支持自动迁移。这作为预览部署的回退：

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // 在生产环境中，重新抛出以表示严重失败
    // 在开发环境中，允许应用启动以进行调试
  }
}
```

对于 Vercel 上的生产构建，通过 `scripts/build-migrate.ts` 进行构建时迁移是首选方法。

## 设置 DATABASE_URL

### 本地开发（PostgreSQL）

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / 生产环境

在 Vercel 项目环境变量中设置 `DATABASE_URL`，通常指向托管的 PostgreSQL 实例（Neon、Supabase、Railway 等）：

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## 类型安全

由于 Drizzle 直接从模式生成 TypeScript 类型，所有查询在编译时完全进行类型检查。不需要单独的代码生成步骤——模式文件本身既是数据库结构的唯一真实来源，也是 TypeScript 类型的来源。

## 相关资源

- [环境变量参考](/template/configuration/environment-reference) — 包含 `DATABASE_URL` 的完整环境变量列表
- [数据库健康检查](/template/guides/database-health-check) — 监控数据库连接
- [Instrumentation 指南](/template/guides/instrumentation) — 启动时自动数据库初始化
