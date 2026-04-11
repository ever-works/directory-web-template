---
id: migration-guide
title: 版本迁移指南
sidebar_label: 迁移指南
sidebar_position: 8
---

# 版本迁移指南

本指南涵盖升级 Ever Works Template 安装、处理版本之间的数据库迁移、管理重大更改、编写和应用迁移脚本以及回滚过程。

## 升级工作流程概述

升级模板遵循结构化流程，以最大限度地降低风险：

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## 数据库迁移系统

### 迁移如何进行

该模板使用 Drizzle ORM 和 Drizzle Kit 进行架构迁移。模式在 0 中定义，迁移作为 SQL 文件生成到1。

2中的配置：

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### 迁移命令

|命令 |目的|何时使用 |
|---------|---------|-------------|
| 0 |从架构更改生成 SQL |修改后1|
| 2 |应用待处理的迁移 (Drizzle CLI) |更改后启动应用程序之前 |
| 3 |应用详细日志记录 |用于调试迁移问题|
| 4 |填充初始数据 |新鲜迁移或种子更换后 |
| 5 |可视化数据库检查 |用于调试或数据审查 |

### 迁移文件结构

迁移存储为编号的 SQL 文件：

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Drizzle 跟踪 0 中应用的迁移：

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### 生成新的迁移

修改0后：

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### 自动迁移

该模板在两个位置自动运行迁移：

**构建时间**（通过0）：

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**运行时**（通过0）：

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### 环境迁移安全

|环境 |构建时 |运行时 |关于失败|
|------------|------------|---------|------------|
|生产|必填|后备|构建失败/应用程序抛出 |
|预览 |容忍连接错误 |活跃|日志警告，应用程序启动 |
|发展|未使用过 |活跃|日志警告，应用程序启动 |
| CI（非 Vercel）|已跳过 |未使用过 |不适用 |

## 回滚过程

### 小雨不支持自动回滚

Drizzle Kit 生成只向前的迁移。要反转迁移：

**选项 1：手动反向迁移**

1. 识别 0 中存在问题的迁移
2、手动编写反向SQL：

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3.直接申请到数据库：

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. 从0中删除正向迁移文件
5. 如果需要，更新 Drizzle 日志

**选项 2：从备份恢复**

复杂迁移最安全的回滚方法：

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**选项 3：恢复架构并重新生成**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## 依赖项更新

### 更新依赖关系

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### 关键依赖项

这些包在升级时需要仔细测试：

|套餐 |风险|笔记|
|--------|------|--------|
| 0 |高|主要版本更改 API、路由、配置 |
| 1 |高| Auth API 变更、会话策略 |
| 2 / 3 |高| Schema API、迁移格式变更 |
| 4 |中等|路由和消息加载变化|
| 5 |中等|仪表挂钩兼容性|
| 6 |中等|支付 API 版本控制 |
| 7 |中等| UI 组件属性更改 |
| 8 |中等|作业调度 API 变更 |

### pnpm 覆盖

该模板在 9 中使用 pnpm 覆盖来强制版本一致：

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

升级 React 或 esbuild 时，更新这些覆盖以匹配。

## 重大变更清单

在模板版本之间升级时，请检查每个类别：

### 架构变更

- [ ] 将0与上游新/修改的色谱柱进行比较
- [ ] 生成迁移：1
- [ ] 检查生成的 SQL 是否有破坏性操作（列删除、类型更改）
- [ ] 首先应用于测试数据库
- [ ] 验证种子兼容性：2

### API 路由变更

- [ ] 检查 3 中是否有重命名或删除的路线
- [ ] 更新外部集成和 webhook URL
- [ ] 验证 cron 端点路径仍然匹配4

### 配置更改

- [ ] 比较 5 是否有新的或重命名的变量
- [ ] 审查 6 个更改（标头、Webpack、插件）
- [ ] 检查 7 是否有 cron 计划更改
- [ ] 查看 8 进行路径更改

### 身份验证更改

- [ ] 与上游比较9
- [ ] 验证会话策略兼容性
- [ ] 测试 OAuth 回调 URL
- [ ] 查看 10 中的权限定义

### 用户界面和样式更改

- [ ] 比较11 的主题变化
- [ ] 目视检查关键页面
- [ ] 测试响应式布局
- [ ] 验证主题自定义仍然适用

## 逐步升级过程

### 1. 准备

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. 合并上游

如果您将模板作为上游远程跟踪：

```bash
git fetch upstream
git merge upstream/main --no-commit
```

解决冲突，注意：
- 0 -- 模式改变
- 1 -- 构建配置
- 2 -- 授权提供者
- 3 -- 依赖版本

### 3.安装和迁移

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. 本地验证

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. 测试关键路径

|面积 |测试什么 |
|------|-------------|
|认证|登录、注销、OAuth、会话持久化 |
|付款 |订阅流程、webhook 处理 |
|内容 |页面渲染、搜索、过滤|
|管理员 |仪表板访问、RBAC 实施 |
|国际化 |语言环境切换、翻译完整性 |
|后台工作 |作业注册的控制台日志 |

### 6. 部署

1.推送功能分支进行CI验证
2. 部署到暂存/预览环境
3. 对分期进行冒烟测试
4. 合并到0进行生产部署

## 版本兼容性

### Node.js

最低版本在1中定义：

```json
{ "engines": { "node": ">=20.19.0" } }
```

### 数据库

|供应商|支持 |笔记|
|----------|------------|--------|
| PostgreSQL 14+ |是的 |制作推荐|
|苏帕巴斯|是的 |使用连接池|
|霓虹灯|是的 |无服务器 PostgreSQL |

### 平台

|平台|状态 |笔记|
|----------|--------|--------|
|韦尔塞尔 |主要目标 |完整的 cron、预览和边缘支持 |
|码头工人 |支持 |容器的独立输出 |
|自托管 |支持 |需要流程管理|

## 升级故障排除

|症状|可能的原因 |解决方案 |
|---------|-------------|---------|
|构建失败 |不兼容的部门 |运行0，解决同伴冲突|
|启动时出现数据库错误 |未应用的迁移 | 1 |
|身份验证已损坏 |提供商配置已更改 |与上游比较2
|缺少翻译 |添加新键 |检查 3 是否有缺失的条目 |
|造型破损| Tailwind 配置已更改 |比较4 |
|类型不匹配 |架构已更新 |重新运行5 |
