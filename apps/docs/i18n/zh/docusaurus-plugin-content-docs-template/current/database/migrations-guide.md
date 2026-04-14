---
id: migrations-guide
title: 迁移指南
sidebar_label: 迁移
sidebar_position: 4
---

# 迁移指南

Ever Works 模板使用 **Drizzle Kit** 进行数据库迁移。迁移是跟踪架构随时间变化的 SQL 文件，确保跨环境和团队成员的数据库状态保持一致。

## 迁移如何进行

Drizzle Kit 将当前架构定义 (`lib/db/schema.ts`) 与之前生成的迁移进行比较，并针对任何差异生成 SQL 迁移文件。

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## 迁移目录结构

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

`meta/` 目录包含 Drizzle Kit 的内部跟踪元数据。迁移目录中的`relations.ts` 和`schema.ts` 文件是参考快照，不应手动编辑。

## 命令

### 生成迁移

修改`lib/db/schema.ts`后，生成迁移：

```bash
pnpm db:generate
```

这运行 `drizzle-kit generate` 其中：
1. 从 `lib/db/schema.ts` 读取当前模式
2. 将其与最新的迁移快照进行比较
3. 在 `lib/db/migrations/` 中生成新的 SQL 文件
4. 更新 `meta/` 中的迁移元数据

### 运行待处理的迁移

将所有未应用的迁移应用到您的数据库：

```bash
pnpm db:migrate
```

这会调用`lib/db/migrate.ts`，其中：
1. 使用 `DATABASE_URL` 连接到数据库
2. 检查 `drizzle.__drizzle_migrations` 表中已应用的迁移
3. 运行所有尚未应用的迁移
4. 更新跟踪表

### 打开细雨工作室

启动可视化数据库编辑器：

```bash
pnpm db:studio
```

## 迁移运行者 (`lib/db/migrate.ts`)

迁移运行器 (`runMigrations()`) 是幂等的，并且可以在每次启动时安全地调用：

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

关键行为：
- **幂等**：Drizzle 跟踪 `drizzle.__drizzle_migrations` 中应用的迁移；已应用的迁移将被跳过
- **日志记录**：报告执行前后最近应用的迁移
- **错误处理**：失败时返回`false`，并提供详细的错误消息
- **自动启动**：在应用程序启动期间通过`lib/db/initialize.ts`调用

## 启动时自动迁移

当应用程序启动时，模板会自动运行迁移。这是由 `instrumentation.ts` 触发的，`instrumentation.ts` 从 `lib/db/initialize.ts` 调用 `initializeDatabase()`。

启动流程：
1. 检查`DATABASE_URL`是否配置（没有配置则跳过）
2. 运行所有待处理的迁移
3. 检查数据库是否已播种
4. 如果未播种，则获取咨询锁并运行种子

在生产中，迁移失败会向监控系统发出错误信号。在开发和预览环境中，应用程序会继续运行并发出警告。

## 创建新的迁移

### 第 1 步：修改架构

编辑 `lib/db/schema.ts` 以添加、修改或删除表定义：

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### 第 2 步：生成迁移

```bash
pnpm db:generate
```

这将创建一个新的 SQL 文件，如 `0029_some_name.sql`。

### 第 3 步：查看生成的 SQL

在应用生成的迁移之前，请务必检查它。检查：
- 正确的表名和列名
- 正确的数据类型和约束
- 索引定义
- 外键关系
- 任何破坏性操作（DROP TABLE、DROP COLUMN）

### 第 4 步：应用迁移

```bash
pnpm db:migrate
```

### 第 5 步：承诺

提交架构更改和生成的迁移文件：
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/`（更新元数据）

## 团队工作流程

### 处理并发架构更改

当多个团队成员同时修改架构时：

1. 每个开发者在本地生成自己的迁移
2. 合并时，如果序列号冲突，迁移文件可能需要重新编号
3. Drizzle Kit 通过哈希而不是数字来跟踪迁移，因此可以处理乱序执行
4. 合并后，运行 `pnpm db:migrate` 以应用所有新迁移

### 环境考虑因素

|环境|迁移策略|
|-------------|-------------------|
|发展|启动时自动运行；本地生成并测试|
|预览/分期|通过 `instrumentation.ts` 部署时自动运行|
|生产|部署时自动运行；监控故障|

### 最佳实践

1. **每次迁移一个问题**：使迁移集中于单个功能或更改
2. **永远不要编辑现有迁移**：一旦将迁移应用到任何地方，请将其视为不可变
3. **查看生成的 SQL**：在应用之前始终检查 Drizzle Kit 生成的内容
4. **测试迁移**：在部署到生产环境之前针对测试数据库运行迁移
5. **在代码审查中包括迁移文件**：迁移 SQL 应该像应用程序代码一样进行审查
6. **在破坏性迁移之前备份**：始终在运行删除表或列的迁移之前进行备份
