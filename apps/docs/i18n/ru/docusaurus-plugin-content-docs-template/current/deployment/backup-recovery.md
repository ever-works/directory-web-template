---
id: backup-recovery
title: Резервное Копирование и Восстановление
sidebar_label: Backup & Recovery
sidebar_position: 3
---

# Резервное Копирование и Восстановление

Это руководство охватывает стратегии резервного копирования баз данных, восстановление на момент времени, автоматизацию резервного копирования и процедуры аварийного восстановления для шаблона Ever Works. Шаблон использует двойную архитектуру хранения: PostgreSQL для транзакционных данных и CMS на основе Git (каталог `.content/`) для контента. Каждый из них требует собственного подхода к резервному копированию.

## Архитектура Хранения

| Тип Данных | Хранилище | Метод Резервного Копирования |
|-----------|---------|---------------|
| Пользователи, роли, разрешения | PostgreSQL | Дампы базы данных |
| Сессии, OAuth аккаунты | PostgreSQL | Дампы базы данных |
| Подписки, платежи | PostgreSQL | Дампы базы данных |
| Комментарии, голоса, заявки | PostgreSQL | Дампы базы данных |
| Элементы, категории, теги | Git репозиторий (`.content/`) | История Git |
| Коллекции, страницы | Git репозиторий (`.content/`) | История Git |
| Настройки приложения | Файловое (JSON) | Резервная копия файла |
| Файлы резервных копий категорий | YAML файлы | Автоматические копии с меткой времени |

## Подключение к Базе Данных

Подключение к базе данных настроено в `lib/db/drizzle.ts` с пулом соединений:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

Размер пула по умолчанию — 20 в производственной среде и 10 в среде разработки, настраивается через `DB_POOL_SIZE` (ограничен от 1 до 50).

## Методы Резервного Копирования Базы Данных

### Полное Резервное Копирование с pg_dump

Используйте нативный `pg_dump` PostgreSQL для надёжного резервного копирования:

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

### Резервные Копии Конкретных Таблиц

Создавайте резервные копии критических таблиц отдельно для более быстрого целевого восстановления:

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

### Управляемое Резервное Копирование Базы Данных

Если вы используете управляемого провайдера PostgreSQL, воспользуйтесь встроенными возможностями резервного копирования:

- **Supabase**: Автоматические ежедневные резервные копии с восстановлением на момент времени в планах Pro
- **Neon**: Снимки на основе веток с мгновенным восстановлением
- **Railway**: Автоматические резервные копии с настраиваемым хранением
- **AWS RDS**: Автоматизированные резервные копии с окном хранения до 35 дней

## Автоматизация Резервного Копирования

### Автоматизированный Скрипт Резервного Копирования

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

### Расписание Cron

Планируйте резервные копии перед запуском заданий cron приложения. `vercel.json` шаблона планирует задание sync на 3 часа ночи:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Настройте задания резервного копирования раньше:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Резервная Копия Состояния Миграции

Перед развёртыванием новых версий с изменениями схемы зафиксируйте состояние миграции:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Скрипт `cli-migrate.ts` шаблона отображает это состояние автоматически:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Процедуры Восстановления

### Полное Восстановление Базы Данных

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

### Чистый Сброс Базы Данных

Скрипт `scripts/clean-database.js` удаляет все таблицы и схему миграции Drizzle:

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
Никогда не запускайте `clean-database.js` на производственной базе данных без проверенной резервной копии. Эта операция необратима.
:::

После чистого сброса:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Восстановление Состояния Seed

`lib/db/initialize.ts` автоматически обрабатывает ошибки засева при запуске:

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

Механизм advisory lock предотвращает гонки состояний при многоинстансных развёртываниях:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Восстановление Контента на Основе Git

### История Репозитория Контента

Контент в `.content/` поддерживается Git репозиторием, настроенным через `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Скрипт `scripts/clone.cjs` клонирует этот репозиторий во время `predev` и `prebuild`. Поскольку контент управляется через Git, каждое изменение имеет полную историю версий:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Откат Изменений Контента

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## План Аварийного Восстановления

### Контрольный Список Восстановления

1. **Оценить ущерб** -- определить масштаб потери данных
2. **Остановить приложение** -- предотвратить дальнейшие записи
3. **Определить последнюю чистую резервную копию** -- проверить целостность
4. **Восстановить базу данных**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Клонировать репозиторий контента**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Запустить ожидающие миграции**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Проверить состояние seed** -- проверить таблицу `seed_status` на наличие статуса `completed`
8. **Настроить окружение** -- обновить `.env.local` с новыми строками подключения
9. **Развернуть приложение** -- хук инструментации проверяет работоспособность базы данных при запуске
10. **Проверить функциональность** -- протестировать аутентификацию, платежи, отображение контента

### Расчётное Время Восстановления

| Компонент | Метод | Расчётное Время |
|-----------|--------|---------------|
| База данных | pg_restore из резервной копии | 5–30 минут |
| Контент | Клон Git | 1–5 минут |
| Приложение | Развёртывание из Git | 2–10 минут |
| SSL сертификаты | Автоматически (Vercel) | 1–5 минут |
| DNS | Уже настроен | Немедленно |

### Внешнее Хранение Резервных Копий

Храните резервные копии отдельно от производственного сервера:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Контрольный Список Проверки Резервных Копий

- [ ] Настроены автоматические ежедневные резервные копии базы данных
- [ ] Файлы резервных копий хранятся отдельно от производства
- [ ] Git репозиторий контента отправлен на удалённый сервер
- [ ] Восстановление из резервной копии тестируется ежеквартально
- [ ] Активен мониторинг health check
- [ ] Переменные окружения задокументированы и безопасно хранятся
- [ ] Конфигурации OAuth провайдеров задокументированы

## Связанные Файлы

| Файл | Назначение |
|------|---------|
| `lib/db/drizzle.ts` | Подключение к базе данных и конфигурация пула |
| `lib/db/schema.ts` | Полная схема базы данных |
| `lib/db/initialize.ts` | Автоматическая миграция, засев, управление блокировками |
| `lib/db/migrate.ts` | Идемпотентный запуск миграций |
| `scripts/clean-database.js` | Инструмент сброса базы данных |
| `scripts/cli-migrate.ts` | Ручной CLI миграций |
| `scripts/cli-seed.ts` | Ручной CLI засева |
| `scripts/clone.cjs` | Скрипт клонирования репозитория контента |
| `drizzle.config.ts` | Конфигурация Drizzle ORM |
