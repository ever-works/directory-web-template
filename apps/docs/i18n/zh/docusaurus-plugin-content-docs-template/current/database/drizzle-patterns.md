---
id: drizzle-patterns
title: "细雨 ORM 模式"
sidebar_label: "毛毛雨图案"
sidebar_position: 13
---

# 细雨 ORM 模式

该模板使用 Drizzle ORM 和 PostgreSQL 方言 (`drizzle-orm/postgres-js`)。本页面涵盖架构定义约定、列类型、索引策略、关系定义、迁移工作流程以及整个代码库中使用的查询构建器模式。

## 架构定义 (`lib/db/schema.ts`)

### 表结构

表用 `pgTable` 定义并遵循一致的模式：

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    createdAtIndex: index('users_created_at_idx').on(table.createdAt)
  })
);
```

### 列类型用法

|毛毛雨型|PostgreSQL 类型|用于|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|ID、电子邮件、姓名、别名、URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|以 JS `Date` 形式返回的日期字段|
|`timestamp('col')`|`TIMESTAMP`|具有默认模式的日期字段|
|`boolean('col')`|`BOOLEAN`|标志（isAdmin、isActive 等）|
|`integer('col')`|`INTEGER`|数字计数器，OAuth expires_at|
|`serial('col')`|`SERIAL`|自动递增ID|
|`varchar('col', { length: N })`|`VARCHAR(N)`|长度受限的字符串|
|`jsonb('col')`|`JSONB`|结构化元数据|
|`doublePrecision('col')`|`DOUBLE PRECISION`|纬度/经度坐标|

### UUID 主键

所有表都使用 `text` 列，并以 `crypto.randomUUID()` 作为默认函数：

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### 枚举列

字符串枚举在列上内联定义：

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### 复合主键

连接表使用`primaryKey` 与多列：

```typescript
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);
```

### 外键

外键使用内联 `.references()` 和级联删除：

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### 指数定义

索引在 `pgTable` 的第三个参数中定义：

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

常见的索引模式：
- `createdAt` 大多数表上的索引用于基于时间的排序
- 过滤器查询的状态/标志索引
- 用于查找查询的电子邮件索引
- 身份验证帐户查询的提供者索引

### 检查约束

用于数据库级别的域验证：

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## 类型推断

Drizzle 自动从表定义推断 TypeScript 类型：

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

这些推断类型直接从 `lib/db/schema.ts` 导出并在整个查询层中使用。

## 关系 (`lib/db/migrations/relations.ts`)

关系是使用 Drizzle 关系查询 API 的 `relations()` 帮助器单独定义的：

```typescript
import { relations } from "drizzle-orm/relations";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activityLogs: many(activityLogs),
  clientProfiles: many(clientProfiles),
  favorites: many(favorites),
  notifications: many(notifications),
  paymentAccounts: many(paymentAccounts),
  subscriptions: many(subscriptions),
  userRoles: many(userRoles),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  votes: many(votes),
}));
```

### 关系类型

|帮手|基数|示例|
|--------|------------|---------|
|`one()`|多对一|`clientProfile -> user`|
|`many()`|一对多|`user -> accounts`|

## 迁移工作流程

### 毛毛雨套件配置

```typescript
// drizzle.config.ts
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### 迁移命令

|命令|描述|
|---------|-------------|
|`pnpm db:generate`|根据架构更改生成 SQL 迁移文件|
|`pnpm db:migrate`|将待处理的迁移应用到数据库|
|`pnpm db:seed`|使用初始数据为数据库播种|
|`pnpm db:studio`|打开 Drizzle Studio 进行可视化数据库管理|

### 迁移运行者

`lib/db/migrate.ts` 中的 `runMigrations()` 函数是幂等的，并且可以在每次启动时安全地调用：

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle 跟踪 `drizzle.__drizzle_migrations` 表中已应用的迁移，并且仅运行新的迁移。

## 查询生成器模式

### 选择位置

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### 插入并返回

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### 更新并返回

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### 删除并返回

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### 更新插入（冲突时）

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### 动态SQL

原始 SQL 表达式用于复杂的条件和聚合：

```typescript
import { sql } from 'drizzle-orm';

// Conditional SUM
sql<number>`SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END)`

// ILIKE search
sql`${clientProfiles.name} ILIKE ${`%${search}%`}`

// COALESCE with subquery
sql<string>`coalesce(
  (SELECT provider FROM ${accounts}
   WHERE ${accounts.userId} = ${clientProfiles.userId}
   LIMIT 1),
  'unknown'
)`

// Date formatting
sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`
```

### 条件构成

过滤器是动态构建的，并由 `and()` 组成：

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### 连接模式

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
