---
id: backup-recovery
title: Резервно Копие и Възстановяване
sidebar_label: Backup & Recovery
sidebar_position: 3
---

# Резервно Копие и Възстановяване

Това ръководство обхваща стратегии за резервно копиране на бази данни, възстановяване към точка от времето, автоматизация на резервните копия и процедури за аварийно възстановяване за шаблона Ever Works. Шаблонът използва двойна архитектура за съхранение: PostgreSQL за транзакционни данни и CMS базиран на Git (директория `.content/`) за съдържание. Всеки изисква свой собствен подход за резервно копиране.

## Архитектура на Съхранението

| Тип Данни | Съхранение | Метод за Резервно Копиране |
|-----------|---------|---------------|
| Потребители, роли, разрешения | PostgreSQL | Дъмпове на базата данни |
| Сесии, OAuth акаунти | PostgreSQL | Дъмпове на базата данни |
| Абонаменти, плащания | PostgreSQL | Дъмпове на базата данни |
| Коментари, гласове, заявки | PostgreSQL | Дъмпове на базата данни |
| Елементи, категории, тагове | Git хранилище (`.content/`) | История на Git |
| Колекции, страници | Git хранилище (`.content/`) | История на Git |
| Настройки на приложението | Файлово (JSON) | Резервно копиране на файл |
| Файлове за резервни копия на категории | YAML файлове | Автоматични копия с времеви печат |

## Връзка с Базата Данни

Връзката с базата данни е конфигурирана в `lib/db/drizzle.ts` с пул от връзки:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

Размерът на пула по подразбиране е 20 в производствена среда и 10 в среда за разработка, конфигурируем чрез `DB_POOL_SIZE` (ограничен между 1 и 50).

## Методи за Резервно Копиране на Базата Данни

### Пълно Резервно Копиране с pg_dump

Използвайте нативния PostgreSQL `pg_dump` за надеждни резервни копия:

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

### Резервни Копия на Конкретни Таблици

Правете резервни копия на критични таблици поотделно за по-бързо целево възстановяване:

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

### Управлявано Резервно Копиране на Базата Данни

Ако използвате управляван PostgreSQL доставчик, възползвайте се от вградените възможности за резервно копиране:

- **Supabase**: Автоматични ежедневни резервни копия с възстановяване към точка от времето в Pro планове
- **Neon**: Снимки базирани на клонове с мигновено възстановяване
- **Railway**: Автоматични резервни копия с конфигурируемо съхранение
- **AWS RDS**: Автоматизирани резервни копия с прозорец за съхранение до 35 дни

## Автоматизация на Резервните Копия

### Автоматизиран Скрипт за Резервно Копиране

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

### Cron Разписание

Планирайте резервни копия преди изпълнението на cron задачите на приложението. `vercel.json` на шаблона планира задачата sync в 3 часа сутринта:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Настройте задачи за резервно копиране по-рано:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Резервно Копие на Състоянието на Миграцията

Преди внедряване на нови версии с промени в схемата, запазете състоянието на миграцията:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Скриптът `cli-migrate.ts` на шаблона показва това състояние автоматично:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Процедури за Възстановяване

### Пълно Възстановяване на Базата Данни

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

### Чисто Нулиране на Базата Данни

Скриптът `scripts/clean-database.js` изтрива всички таблици и схемата за миграция на Drizzle:

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
Никога не стартирайте `clean-database.js` на производствена база данни без проверено резервно копие. Тази операция е необратима.
:::

След чисто нулиране:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Възстановяване на Seed Състоянието

`lib/db/initialize.ts` автоматично обработва грешките при засяване по време на стартиране:

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

Механизмът advisory lock предотвратява race conditions при многоинстансни внедрявания:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Възстановяване на Съдържание Базирано на Git

### История на Хранилището за Съдържание

Съдържанието в `.content/` е поддържано от Git хранилище, конфигурирано чрез `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Скриптът `scripts/clone.cjs` клонира това хранилище по време на `predev` и `prebuild`. Тъй като съдържанието се управлява с Git, всяка промяна има пълна история на версиите:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Отмяна на Промени в Съдържанието

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## План за Аварийно Възстановяване

### Контролен Списък за Възстановяване

1. **Оценете щетите** -- определете обхвата на загубата на данни
2. **Спрете приложението** -- предотвратете допълнителни записи
3. **Идентифицирайте последното чисто резервно копие** -- проверете целостта
4. **Възстановете базата данни**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Клонирайте хранилището за съдържание**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Стартирайте чакащите миграции**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Проверете seed състоянието** -- проверете таблицата `seed_status` за статус `completed`
8. **Конфигурирайте средата** -- актуализирайте `.env.local` с нови низове за връзка
9. **Внедрете приложението** -- куката instrumentation проверява здравето на базата данни при стартиране
10. **Проверете функционалността** -- тествайте удостоверяване, плащания, показване на съдържание

### Приблизително Време за Възстановяване

| Компонент | Метод | Приблизително Време |
|-----------|--------|---------------|
| База данни | pg_restore от резервно копие | 5–30 минути |
| Съдържание | Git клонинг | 1–5 минути |
| Приложение | Внедряване от Git | 2–10 минути |
| SSL сертификати | Автоматично (Vercel) | 1–5 минути |
| DNS | Вече конфигуриран | Незабавно |

### Външно Съхранение на Резервни Копия

Съхранявайте резервни копия отделно от производствения сървър:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Контролен Списък за Проверка на Резервните Копия

- [ ] Конфигурирани автоматични ежедневни резервни копия на базата данни
- [ ] Файловете с резервни копия се съхраняват отделно от производството
- [ ] Git хранилището за съдържание е изпратено към отдалеченото
- [ ] Тестване на възстановяване от резервно копие на тримесечна basis
- [ ] Активен мониторинг на health check
- [ ] Документирани и сигурно съхранени променливи на средата
- [ ] Документирани конфигурации на OAuth доставчиците

## Свързани Файлове

| Файл | Цел |
|------|---------|
| `lib/db/drizzle.ts` | Връзка с базата данни и конфигурация на пула |
| `lib/db/schema.ts` | Пълна схема на базата данни |
| `lib/db/initialize.ts` | Автоматична миграция, засяване, управление на заключвания |
| `lib/db/migrate.ts` | Идемпотентен изпълнител на миграции |
| `scripts/clean-database.js` | Инструмент за нулиране на базата данни |
| `scripts/cli-migrate.ts` | Ръчен CLI за миграции |
| `scripts/cli-seed.ts` | Ръчен CLI за засяване |
| `scripts/clone.cjs` | Скрипт за клониране на хранилището за съдържание |
| `drizzle.config.ts` | Конфигурация на Drizzle ORM |
