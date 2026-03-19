---
id: backup-recovery
title: Backup & Recovery
sidebar_label: Backup & Recovery
sidebar_position: 3
---

# Backup & Recovery

This guide covers database backup strategies, point-in-time recovery, backup automation, and disaster recovery procedures for the Ever Works Template. The template uses a dual storage architecture: PostgreSQL for transactional data, and a Git-based CMS (`.content/` directory) for content. Each requires its own backup approach.

## Storage Architecture

| Data Type | Storage | Backup Method |
|-----------|---------|---------------|
| Users, roles, permissions | PostgreSQL | Database dumps |
| Sessions, OAuth accounts | PostgreSQL | Database dumps |
| Subscriptions, payments | PostgreSQL | Database dumps |
| Comments, votes, reports | PostgreSQL | Database dumps |
| Items, categories, tags | Git repository (`.content/`) | Git history |
| Collections, pages | Git repository (`.content/`) | Git history |
| Application settings | File-based (JSON) | File backup |
| Category backup files | YAML files | Automatic timestamped copies |

## Database Connection

The database connection is configured in `lib/db/drizzle.ts` with connection pooling:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

The pool size defaults to 20 in production and 10 in development, configurable via `DB_POOL_SIZE` (clamped between 1 and 50).

## Database Backup Methods

### Full Backup with pg_dump

Use PostgreSQL's native `pg_dump` for reliable backups:

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

### Table-Specific Backups

Back up critical tables individually for faster, targeted recovery:

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

### Managed Database Backups

If using a managed PostgreSQL provider, leverage their built-in backup features:

- **Supabase**: Automatic daily backups with point-in-time recovery on Pro plans
- **Neon**: Branch-based snapshots with instant restore
- **Railway**: Automatic backups with configurable retention
- **AWS RDS**: Automated backups with up to 35-day retention window

## Backup Automation

### Automated Backup Script

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

### Cron Schedule

Schedule backups before the application's cron jobs run. The template's `vercel.json` schedules a sync job at 3 AM:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Set backup jobs to run before this:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Migration State Backup

Before deploying new versions with schema changes, capture the migration state:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

The template's `cli-migrate.ts` script displays this state automatically:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Recovery Procedures

### Full Database Restore

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

### Clean Database Reset

The `scripts/clean-database.js` script drops all tables and the Drizzle migration schema:

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
Never run `clean-database.js` against a production database without a verified backup. This operation is irreversible.
:::

After a clean reset:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Seed Status Recovery

The `lib/db/initialize.ts` handles seed failures automatically on startup:

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

The advisory lock mechanism prevents race conditions during multi-instance deployments:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Git-Based Content Recovery

### Content Repository History

Content in `.content/` is backed by a Git repository configured via `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

The `scripts/clone.cjs` script clones this repository during `predev` and `prebuild`. Since content is Git-managed, every change has full version history:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Reverting Content Changes

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Disaster Recovery Plan

### Recovery Checklist

1. **Assess damage** -- determine scope of data loss
2. **Stop the application** -- prevent further writes
3. **Identify latest clean backup** -- verify integrity
4. **Restore database**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Clone content repository**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Run pending migrations**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Verify seed state** -- check `seed_status` table for `completed` status
8. **Configure environment** -- update `.env.local` with new connection strings
9. **Deploy application** -- the instrumentation hook verifies database health on startup
10. **Verify functionality** -- test auth, payments, content display

### Recovery Time Estimates

| Component | Method | Estimated Time |
|-----------|--------|---------------|
| Database | pg_restore from backup | 5-30 minutes |
| Content | Git clone | 1-5 minutes |
| Application | Deploy from Git | 2-10 minutes |
| SSL certificates | Auto-provisioned (Vercel) | 1-5 minutes |
| DNS | Already configured | Immediate |

### Off-Site Backup Storage

Store backups separately from the production server:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Backup Verification Checklist

- [ ] Daily automated database backups configured
- [ ] Backup files stored separately from production
- [ ] Content Git repository pushed to remote
- [ ] Backup restore tested quarterly
- [ ] Health check monitoring active
- [ ] Environment variables documented and securely stored
- [ ] OAuth provider configurations documented

## Related Files

| File | Purpose |
|------|---------|
| `lib/db/drizzle.ts` | Database connection and pool setup |
| `lib/db/schema.ts` | Complete database schema |
| `lib/db/initialize.ts` | Auto-migration, seeding, lock management |
| `lib/db/migrate.ts` | Idempotent migration runner |
| `scripts/clean-database.js` | Database reset utility |
| `scripts/cli-migrate.ts` | Manual migration CLI |
| `scripts/cli-seed.ts` | Manual seed CLI |
| `scripts/clone.cjs` | Content repository clone script |
| `drizzle.config.ts` | Drizzle ORM configuration |
