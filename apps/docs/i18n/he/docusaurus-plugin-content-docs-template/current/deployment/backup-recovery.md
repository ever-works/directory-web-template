---
id: backup-recovery
title: גיבוי ושחזור
sidebar_label: גיבוי ושחזור
sidebar_position: 3
---

# גיבוי ושחזור

מדריך זה מכסה אסטרטגיות גיבוי למסד נתונים, שחזור לנקודת זמן, אוטומציה של גיבויים ונהלי התאוששות מאסון עבור תבנית Ever Works. התבנית משתמשת בארכיטקטורת אחסון כפולה: PostgreSQL לנתונים טרנסקציוניים, ו-CMS מבוסס Git (תיקיית `.content/`) לתוכן. כל סוג אחסון דורש גישת גיבוי שונה.

## ארכיטקטורת האחסון

| סוג נתונים | אחסון | שיטת גיבוי |
|-----------|---------|---------------|
| משתמשים, תפקידים, הרשאות | PostgreSQL | זריקת מסד נתונים |
| סשנים, חשבונות OAuth | PostgreSQL | זריקת מסד נתונים |
| מנויים, תשלומים | PostgreSQL | זריקת מסד נתונים |
| תגובות, הצבעות, הגשות | PostgreSQL | זריקת מסד נתונים |
| פריטים, קטגוריות, תגיות | מאגר Git (`.content/`) | היסטוריית Git |
| אוספים, דפים | מאגר Git (`.content/`) | היסטוריית Git |
| תצורת אפליקציה | ממשק JSON | גיבוי קבצים |
| קבצי גיבוי קטגוריות | קבצי YAML | עותקים אוטומטיים עם חותמת זמן |

## חיבור מסד הנתונים

חיבור מסד הנתונים מוגדר ב-`lib/db/drizzle.ts` עם מאגר חיבורים:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

גודל מאגר החיבורים הברירמחדלי: 20 בייצור, 10 בפיתוח, ניתן לתצורה דרך `DB_POOL_SIZE` (מוגבל בין 1 ל-50).

## שיטות גיבוי למסד הנתונים

### גיבוי מלא עם pg_dump

השתמש ב-`pg_dump` הייעודי של PostgreSQL לגיבויים אמינים:

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

### גיבוי טבלאות ספציפיות

קבל גיבויים של טבלאות קריטיות בנפרד לשחזור מהיר וממוקד:

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

### גיבוי מסדי נתונים מנוהלים

אם אתה משתמש בספק PostgreSQL מנוהל, נצל יכולות גיבוי מובנות:

- **Supabase**: גיבויים יומיים אוטומטיים ושחזור לנקודת זמן בתוכנית Pro
- **Neon**: תמונות מצב מבוססות ענפים עם שחזור מיידי
- **Railway**: גיבויים אוטומטיים עם תקופת שמירה הניתנת לתצורה
- **AWS RDS**: גיבויים אוטומטיים עם חלון שמירה של עד 35 יום

## אוטומציה של גיבויים

### סקריפט גיבוי אוטומטי

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

### תזמון Cron

תזמן גיבויים לפני הרצת משימות ה-cron של האפליקציה. `vercel.json` של התבנית מתזמן את משימת הסנכרון בשעה 3 לפנות בוקר:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

תזמן גיבויים מוקדם יותר:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### גיבוי מצב המיגרציה

לכוד את מצב המיגרציה לפני פריסת גרסאות חדשות המכילות שינויים בסכמה:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

סקריפט `cli-migrate.ts` של התבנית מציג מצב זה אוטומטית:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## נהלי שחזור

### שחזור מלא של מסד הנתונים

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

### איפוס נקי של מסד הנתונים

סקריפט `scripts/clean-database.js` מוחק את כל הטבלאות וסכמת מיגרציית Drizzle:

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
לעולם אל תריץ את `clean-database.js` על מסד נתונים ייצורי ללא גיבוי מאומת. פעולה זו היא בלתי הפיכה.
:::

לאחר איפוס נקי:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### שחזור מצב הזריעה

`lib/db/initialize.ts` מטפל אוטומטית בשגיאות זריעה במהלך האתחול:

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

מנגנון הנעילה הייעוצית מונע תנאי מרוץ בפריסות רב-מופעים:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## שחזור תוכן מבוסס Git

### היסטוריית מאגר התוכן

התוכן ב-`.content/` מגובה על ידי מאגר Git המוגדר דרך `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

סקריפט `scripts/clone.cjs` משכפל מאגר זה במהלך `predev` ו-`prebuild`. מכיוון שהתוכן מנוהל עם Git, לכל שינוי יש היסטוריית גרסאות מלאה:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### ביטול שינויי תוכן

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## תוכנית התאוששות מאסון

### רשימת בדיקה לשחזור

1. **הערכת הנזק** -- קבע את היקף אובדן הנתונים
2. **עצירת האפליקציה** -- מנע כתיבות נוספות
3. **זיהוי הגיבוי הנקי האחרון** -- אמת שלמות
4. **שחזור מסד הנתונים**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **שכפול מאגר התוכן**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **הרצת מיגרציות ממתינות**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **אימות מצב הזריעה** -- בדוק טבלת `seed_status` לסטטוס `completed`
8. **תצורת הסביבה** -- עדכן `.env.local` עם מחרוזות חיבור חדשות
9. **פריסת האפליקציה** -- וו האינסטרומנטציה מאמת את בריאות מסד הנתונים בהפעלה
10. **אימות פונקציונליות** -- בדוק אימות, תשלומים, הצגת תוכן

### זמן שחזור מוערך

| רכיב | שיטה | זמן מוערך |
|-----------|--------|---------------|
| מסד נתונים | pg_restore מגיבוי | 5–30 דקות |
| תוכן | שכפול Git | 1–5 דקות |
| אפליקציה | פריסה מ-Git | 2–10 דקות |
| תעודת SSL | אוטומטי (Vercel) | 1–5 דקות |
| DNS | מוגדר מראש | מיידי |

### אחסון גיבויים חיצוני

אחסן גיבויים מחוץ לשרתי הייצור:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## רשימת אימות גיבויים

- [ ] גיבויים אוטומטיים יומיים למסד הנתונים מוגדרים
- [ ] קבצי גיבוי מאוחסנים במיקום נפרד מהייצור
- [ ] מאגר ה-Git של תוכן נדחף למרוחק
- [ ] שחזור גיבוי נבדק רבעונית
- [ ] ניטור בדיקות בריאות פעיל
- [ ] משתני סביבה מתועדים ומאוחסנים בבטחה
- [ ] תצורת ספקי OAuth מתועדת

## קבצים קשורים

| קובץ | מטרה |
|------|---------|
| `lib/db/drizzle.ts` | חיבור מסד נתונים ותצורת מאגר חיבורים |
| `lib/db/schema.ts` | סכמת מסד נתונים מלאה |
| `lib/db/initialize.ts` | מיגרציה אוטומטית, זריעה, ניהול נעילה |
| `lib/db/migrate.ts` | מריץ מיגרציה אידמפוטנטי |
| `scripts/clean-database.js` | כלי איפוס מסד נתונים |
| `scripts/cli-migrate.ts` | ממשק שורת פקודה למיגרציה ידנית |
| `scripts/cli-seed.ts` | ממשק שורת פקודה לזריעה ידנית |
| `scripts/clone.cjs` | סקריפט שכפול מאגר תוכן |
| `drizzle.config.ts` | תצורת Drizzle ORM |
