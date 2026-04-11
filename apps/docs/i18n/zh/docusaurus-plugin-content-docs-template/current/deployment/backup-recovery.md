---
id: backup-recovery
title: 备份与恢复
sidebar_label: 备份与恢复
sidebar_position: 3
---

# 备份与恢复

本指南涵盖 Ever Works 模板的数据库备份策略、时间点恢复、备份自动化和灾难恢复程序。该模板使用双重存储架构：PostgreSQL 用于事务数据，基于 Git 的 CMS（`.content/` 目录）用于内容。每种存储都需要各自的备份方法。

## 存储架构

| 数据类型 | 存储 | 备份方法 |
|-----------|---------|---------------|
| 用户、角色、权限 | PostgreSQL | 数据库转储 |
| 会话、OAuth 账户 | PostgreSQL | 数据库转储 |
| 订阅、支付 | PostgreSQL | 数据库转储 |
| 评论、投票、提交 | PostgreSQL | 数据库转储 |
| 条目、分类、标签 | Git 仓库（`.content/`） | Git 历史 |
| 集合、页面 | Git 仓库（`.content/`） | Git 历史 |
| 应用配置 | 文件型（JSON） | 文件备份 |
| 分类备份文件 | YAML 文件 | 带时间戳的自动副本 |

## 数据库连接

数据库连接在 `lib/db/drizzle.ts` 中配置，使用连接池：

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

默认连接池大小：生产环境 20，开发环境 10，可通过 `DB_POOL_SIZE` 配置（限制在 1 到 50 之间）。

## 数据库备份方法

### 使用 pg_dump 进行完整备份

使用 PostgreSQL 原生 `pg_dump` 进行可靠备份：

```bash
# Full database backup (custom format -- most flexible for restore)
pg_dump -Fc \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  -f backup_$(date +%Y%m%d_%H%M%S).dump

# Plain SQL backup (human-readable)
pg_dump \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup (for migration debugging)
pg_dump --schema-only \
  -h your-db-host \
  -U your-db-user \
  -d your-db-name \
  > schema_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -h your-db-host -U your-db-user -d your-db-name \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 特定表备份

单独备份关键表，以便更快的针对性恢复：

```bash
# User and authentication data
pg_dump -t users -t accounts -t sessions -t user_roles \
  -h host -U user -d dbname > users_backup.sql

# Payment and subscription data
pg_dump -t subscriptions -t subscription_history \
  -t payment_providers -t payment_accounts \
  -h host -U user -d dbname > payments_backup.sql

# Content interaction data
pg_dump -t comments -t votes -t favorites -t activity_logs \
  -h host -U user -d dbname > interactions_backup.sql
```

### 托管数据库备份

如果您使用托管 PostgreSQL 提供商，请利用内置备份功能：

- **Supabase**：Pro 计划提供自动每日备份和时间点恢复
- **Neon**：基于分支的快照，支持即时恢复
- **Railway**：可配置保留期的自动备份
- **AWS RDS**：自动备份，保留窗口最长 35 天

## 备份自动化

### 自动化备份脚本

```bash
#!/bin/bash
# backup-database.sh
set -euo pipefail

DB_URL="${DATABASE_URL}"
BACKUP_DIR="/backups/everworks"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[$(date)] Starting backup..."
pg_dump -Fc "${DB_URL}" -f "${BACKUP_FILE}"

if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[$(date)] Backup successful: ${BACKUP_FILE} (${SIZE})"
else
    echo "[$(date)] ERROR: Backup file missing or empty"
    exit 1
fi

# Clean up old backups
find "${BACKUP_DIR}" -name "backup_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
```

### Cron 计划

在应用程序 cron 任务运行前安排备份。模板的 `vercel.json` 将同步任务安排在凌晨 3 点：

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

将备份任务安排在更早时间：

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### 迁移状态备份

在部署包含 Schema 变更的新版本之前，捕获迁移状态：

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

模板的 `cli-migrate.ts` 脚本会自动显示此状态：

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## 恢复程序

### 完整数据库恢复

```bash
# Restore from custom format (drops and recreates objects)
pg_restore -c -d your-db-name backup_20250101_020000.dump

# Restore to a new database
createdb your-db-name-restored
pg_restore -d your-db-name-restored backup_20250101_020000.dump

# Restore from SQL file
psql -h host -U user -d dbname < backup_20250101_020000.sql

# Restore from compressed file
gunzip -c backup.sql.gz | psql -h host -U user -d dbname
```

### 干净重置数据库

`scripts/clean-database.js` 脚本删除所有表和 Drizzle 迁移 Schema：

```javascript
// Drop all tables in the public schema
await client`
  DO $$ DECLARE
    r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables
              WHERE schemaname = 'public') LOOP
      EXECUTE 'DROP TABLE IF EXISTS '
        || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
  END $$;
`;

// Drop drizzle schema (migration tracking)
await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
```

:::danger
切勿在没有已验证备份的情况下在生产数据库上运行 `clean-database.js`。此操作不可逆。
:::

干净重置后：

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### 恢复 Seed 状态

`lib/db/initialize.ts` 在启动期间自动处理种子播种错误：

```typescript
// Failed seeds are cleaned up for retry
if (status?.status === 'failed') {
  await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
}

// Stale seeding operations (over 5 minutes) are cleaned up
if (status?.status === 'seeding' && status.startedAt) {
  const startedAtMs = new Date(status.startedAt).getTime();
  if (Date.now() - startedAtMs > STALE_SEEDING_THRESHOLD) {
    await db.delete(seedStatus).where(eq(seedStatus.id, 'singleton'));
  }
}
```

咨询锁机制防止多实例部署中的竞态条件：

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## 基于 Git 的内容恢复

### 内容仓库历史

`.content/` 中的内容由通过 `DATA_REPOSITORY` 配置的 Git 仓库支持：

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

`scripts/clone.cjs` 脚本在 `predev` 和 `prebuild` 期间克隆此仓库。由于内容使用 Git 管理，每次更改都有完整的版本历史：

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### 撤销内容更改

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## 灾难恢复计划

### 恢复检查清单

1. **评估损害** -- 确定数据丢失范围
2. **停止应用程序** -- 防止进一步写入
3. **确定最后一个干净备份** -- 验证完整性
4. **恢复数据库**：
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **克隆内容仓库**：
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **运行待处理迁移**：
   ```bash
   pnpm db:migrate:cli
   ```
7. **验证 Seed 状态** -- 检查 `seed_status` 表是否有 `completed` 状态
8. **配置环境** -- 使用新连接字符串更新 `.env.local`
9. **部署应用程序** -- 仪器化钩子在启动时验证数据库健康状况
10. **验证功能** -- 测试身份验证、支付、内容显示

### 预计恢复时间

| 组件 | 方法 | 预计时间 |
|-----------|--------|---------------|
| 数据库 | 从备份 pg_restore | 5–30 分钟 |
| 内容 | Git 克隆 | 1–5 分钟 |
| 应用程序 | 从 Git 部署 | 2–10 分钟 |
| SSL 证书 | 自动（Vercel） | 1–5 分钟 |
| DNS | 已配置 | 立即 |

### 外部备份存储

将备份存储在生产服务器之外：

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## 备份验证检查清单

- [ ] 已配置每日自动数据库备份
- [ ] 备份文件存储在与生产环境分开的位置
- [ ] 内容 Git 仓库已推送到远程
- [ ] 每季度测试备份恢复
- [ ] 健康检查监控处于活跃状态
- [ ] 环境变量已记录并安全存储
- [ ] OAuth 提供商配置已记录

## 相关文件

| 文件 | 用途 |
|------|---------|
| `lib/db/drizzle.ts` | 数据库连接和连接池配置 |
| `lib/db/schema.ts` | 完整数据库 Schema |
| `lib/db/initialize.ts` | 自动迁移、种子播种、锁管理 |
| `lib/db/migrate.ts` | 幂等迁移运行器 |
| `scripts/clean-database.js` | 数据库重置工具 |
| `scripts/cli-migrate.ts` | 手动迁移 CLI |
| `scripts/cli-seed.ts` | 手动种子播种 CLI |
| `scripts/clone.cjs` | 内容仓库克隆脚本 |
| `drizzle.config.ts` | Drizzle ORM 配置 |
