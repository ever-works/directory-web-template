---
id: backup-recovery
title: النسخ الاحتياطي والاسترداد
sidebar_label: النسخ الاحتياطي
sidebar_position: 3
---

# النسخ الاحتياطي والاسترداد

يغطي هذا الدليل استراتيجيات النسخ الاحتياطي لقاعدة البيانات، والاسترداد في نقطة زمنية معينة، وأتمتة النسخ الاحتياطي، وإجراءات التعافي من الكوارث لقالب Ever Works. يستخدم القالب بنية تخزين مزدوجة: PostgreSQL للبيانات المعاملاتية، ونظام CMS المستند إلى Git (مجلد `.content/`) للمحتوى. كل نوع تخزين يتطلب أسلوب نسخ احتياطي مختلف.

## بنية التخزين

| نوع البيانات | التخزين | أسلوب النسخ الاحتياطي |
|-----------|---------|---------------|
| المستخدمون، الأدوار، الصلاحيات | PostgreSQL | تفريغ قاعدة البيانات |
| الجلسات، حسابات OAuth | PostgreSQL | تفريغ قاعدة البيانات |
| الاشتراكات، المدفوعات | PostgreSQL | تفريغ قاعدة البيانات |
| التعليقات، التصويتات، الإرسالات | PostgreSQL | تفريغ قاعدة البيانات |
| العناصر، الفئات، الوسوم | مستودع Git (`.content/`) | سجل Git |
| المجموعات، الصفحات | مستودع Git (`.content/`) | سجل Git |
| تهيئة التطبيق | ملفات JSON | نسخ احتياطي للملفات |
| ملفات نسخ الفئات الاحتياطية | ملفات YAML | نسخ تلقائية مُختومة بالوقت |

## اتصال قاعدة البيانات

يُهيَّأ اتصال قاعدة البيانات في `lib/db/drizzle.ts` باستخدام تجمع الاتصالات:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

حجم تجمع الاتصالات الافتراضي: 20 في الإنتاج، 10 في التطوير، قابل للتكوين عبر `DB_POOL_SIZE` (محدود بين 1 و50).

## أساليب النسخ الاحتياطي لقاعدة البيانات

### النسخ الاحتياطي الكامل باستخدام pg_dump

استخدم `pg_dump` الأصلي في PostgreSQL للنسخ الاحتياطية الموثوقة:

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

### النسخ الاحتياطي لجداول محددة

احتفظ بنسخ احتياطية من الجداول الحرجة بشكل منفصل لاسترداد أسرع ومستهدف:

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

### النسخ الاحتياطي لقواعد البيانات المُدارة

إذا كنت تستخدم مزود PostgreSQL مُدار، فاستفد من قدرات النسخ الاحتياطي المدمجة:

- **Supabase**: نسخ احتياطية يومية تلقائية واسترداد في نقطة زمنية مع الخطة المدفوعة
- **Neon**: لقطات قائمة على الفروع مع استرداد فوري
- **Railway**: نسخ احتياطية تلقائية مع فترة احتفاظ قابلة للتكوين
- **AWS RDS**: نسخ احتياطية تلقائية مع نافذة احتفاظ تصل إلى 35 يوماً

## أتمتة النسخ الاحتياطي

### سكريبت النسخ الاحتياطي الآلي

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

### جدولة Cron

جدولة النسخ الاحتياطية قبل تشغيل مهام cron الخاصة بالتطبيق. يجدول `vercel.json` في القالب مهمة المزامنة عند الساعة 3 صباحاً:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

جدولة النسخ الاحتياطية في وقت سابق:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### نسخ احتياطي لحالة الترحيل

التقاط حالة الترحيل قبل نشر إصدارات جديدة تحتوي على تغييرات في المخطط:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

يعرض سكريبت `cli-migrate.ts` الخاص بالقالب هذه الحالة تلقائياً:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## إجراءات الاسترداد

### الاسترداد الكامل لقاعدة البيانات

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

### إعادة تعيين قاعدة البيانات بشكل نظيف

يحذف سكريبت `scripts/clean-database.js` جميع الجداول ومخطط ترحيل Drizzle:

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
لا تشغّل أبداً `clean-database.js` على قاعدة بيانات الإنتاج دون نسخة احتياطية تم التحقق منها. هذه العملية لا يمكن عكسها.
:::

بعد إعادة التعيين النظيفة:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### استرداد حالة البذر

يتولى `lib/db/initialize.ts` تلقائياً معالجة أخطاء البذر أثناء بدء التشغيل:

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

تمنع آلية القفل الاستشاري حالات التسابق في نشر متعدد الحالات:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## استرداد المحتوى المستند إلى Git

### سجل مستودع المحتوى

المحتوى في `.content/` مدعوم بمستودع Git مُهيَّأ عبر `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

يستنسخ سكريبت `scripts/clone.cjs` هذا المستودع أثناء `predev` و`prebuild`. نظراً لإدارة المحتوى باستخدام Git، كل تغيير لديه سجل إصدار كامل:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### التراجع عن تغييرات المحتوى

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## خطة التعافي من الكوارث

### قائمة مراجعة الاسترداد

1. **تقييم الضرر** -- تحديد نطاق فقدان البيانات
2. **إيقاف التطبيق** -- منع الكتابة الإضافية
3. **تحديد آخر نسخة احتياطية نظيفة** -- التحقق من السلامة
4. **استرداد قاعدة البيانات**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **استنساخ مستودع المحتوى**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **تشغيل الترحيلات المعلقة**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **التحقق من حالة البذر** -- فحص جدول `seed_status` للحالة `completed`
8. **تكوين البيئة** -- تحديث `.env.local` بسلاسل الاتصال الجديدة
9. **نشر التطبيق** -- تتحقق خطافات الأجهزة من صحة قاعدة البيانات عند بدء التشغيل
10. **التحقق من الوظائف** -- اختبار المصادقة والمدفوعات وعرض المحتوى

### وقت الاسترداد المُقدَّر

| المكون | الأسلوب | الوقت المُقدَّر |
|-----------|--------|---------------|
| قاعدة البيانات | pg_restore من النسخة الاحتياطية | 5–30 دقيقة |
| المحتوى | استنساخ Git | 1–5 دقائق |
| التطبيق | النشر من Git | 2–10 دقائق |
| شهادة SSL | تلقائي (Vercel) | 1–5 دقائق |
| DNS | مُهيَّأ مسبقاً | فوري |

### تخزين النسخ الاحتياطية خارجياً

تخزين النسخ الاحتياطية خارج خوادم الإنتاج:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## قائمة مراجعة التحقق من النسخ الاحتياطية

- [ ] تم تكوين النسخ الاحتياطية اليومية التلقائية لقاعدة البيانات
- [ ] ملفات النسخ الاحتياطي مُخزَّنة في موقع منفصل عن بيئة الإنتاج
- [ ] مستودع Git للمحتوى مُدفوع إلى بعيد
- [ ] اختبار استرداد النسخ الاحتياطية ربع سنوياً
- [ ] مراقبة فحص الصحة نشطة
- [ ] متغيرات البيئة موثقة ومُخزَّنة بأمان
- [ ] تهيئة موفري OAuth موثقة

## الملفات ذات الصلة

| الملف | الغرض |
|------|---------|
| `lib/db/drizzle.ts` | اتصال قاعدة البيانات وتكوين تجمع الاتصالات |
| `lib/db/schema.ts` | مخطط قاعدة البيانات الكامل |
| `lib/db/initialize.ts` | الترحيل التلقائي، والبذر، وإدارة القفل |
| `lib/db/migrate.ts` | مشغّل الترحيل المتكرر |
| `scripts/clean-database.js` | أداة إعادة تعيين قاعدة البيانات |
| `scripts/cli-migrate.ts` | واجهة سطر أوامر الترحيل اليدوي |
| `scripts/cli-seed.ts` | واجهة سطر أوامر البذر اليدوي |
| `scripts/clone.cjs` | سكريبت استنساخ مستودع المحتوى |
| `drizzle.config.ts` | تكوين Drizzle ORM |
