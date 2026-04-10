---
id: backup-recovery
title: Kopia zapasowa i Odzysk
sidebar_label: Backup & Recovery
sidebar_position: 3
---

# Kopia zapasowa i Odzysk

Ten przewodnik obejmuje strategie tworzenia kopii zapasowych bazy danych, odtwarzanie do punktu w czasie, automatyzację kopii zapasowych i procedury odtwarzania po awarii dla szablonu Ever Works. Szablon używa podwójnej architektury przechowywania: PostgreSQL dla danych transakcyjnych i CMS oparty na Git (katalog `.content/`) dla treści. Każde z nich wymaga własnego podejścia do tworzenia kopii zapasowych.

## Architektura Przechowywania

| Typ Danych | Przechowywanie | Metoda Kopii Zapasowej |
|-----------|---------|---------------|
| Użytkownicy, role, uprawnienia | PostgreSQL | Zrzuty bazy danych |
| Sesje, konta OAuth | PostgreSQL | Zrzuty bazy danych |
| Subskrypcje, płatności | PostgreSQL | Zrzuty bazy danych |
| Komentarze, głosy, zgłoszenia | PostgreSQL | Zrzuty bazy danych |
| Elementy, kategorie, tagi | Repozytorium Git (`.content/`) | Historia Git |
| Kolekcje, strony | Repozytorium Git (`.content/`) | Historia Git |
| Ustawienia aplikacji | Plikowe (JSON) | Kopia zapasowa pliku |
| Pliki kopii zapasowych kategorii | Pliki YAML | Automatyczne kopie ze znacznikiem czasu |

## Połączenie z Bazą Danych

Połączenie z bazą danych jest skonfigurowane w `lib/db/drizzle.ts` z pulą połączeń:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

Domyślny rozmiar puli to 20 w środowisku produkcyjnym i 10 w środowisku deweloperskim, konfigurowalny przez `DB_POOL_SIZE` (ograniczony między 1 a 50).

## Metody Tworzenia Kopii Zapasowych Bazy Danych

### Pełna Kopia Zapasowa z pg_dump

Użyj natywnego `pg_dump` PostgreSQL do niezawodnych kopii zapasowych:

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

### Kopie Zapasowe Konkretnych Tabel

Twórz kopie zapasowe krytycznych tabel osobno dla szybszego, ukierunkowanego odtwarzania:

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

### Zarządzane Kopie Zapasowe Bazy Danych

Jeśli używasz zarządzanego dostawcy PostgreSQL, skorzystaj z wbudowanych funkcji kopii zapasowych:

- **Supabase**: Automatyczne codzienne kopie zapasowe z odtwarzaniem do punktu w czasie w planach Pro
- **Neon**: Migawki oparte na gałęziach z natychmiastowym przywracaniem
- **Railway**: Automatyczne kopie zapasowe z konfigurowalnym przechowywaniem
- **AWS RDS**: Zautomatyzowane kopie zapasowe z oknem przechowywania do 35 dni

## Automatyzacja Kopii Zapasowych

### Zautomatyzowany Skrypt Kopii Zapasowej

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

### Harmonogram Cron

Zaplanuj kopie zapasowe przed uruchomieniem zadań cron aplikacji. `vercel.json` szablonu planuje zadanie synchronizacji o 3:00 rano:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Ustaw zadania kopii zapasowej na wcześniej:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Kopia Zapasowa Stanu Migracji

Przed wdrożeniem nowych wersji ze zmianami schematu zapisz stan migracji:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Skrypt `cli-migrate.ts` szablonu wyświetla ten stan automatycznie:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Procedury Odtwarzania

### Pełne Przywracanie Bazy Danych

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

### Czysty Reset Bazy Danych

Skrypt `scripts/clean-database.js` usuwa wszystkie tabele i schemat migracji Drizzle:

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
Nigdy nie uruchamiaj `clean-database.js` na produkcyjnej bazie danych bez zweryfikowanej kopii zapasowej. Ta operacja jest nieodwracalna.
:::

Po czystym resecie:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Odtwarzanie Stanu Seed

`lib/db/initialize.ts` automatycznie obsługuje błędy seedowania podczas uruchamiania:

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

Mechanizm advisory lock zapobiega sytuacjom wyścigu podczas wdrożeń wieloinstancyjnych:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Odtwarzanie Treści Opartej na Git

### Historia Repozytorium Treści

Treść w `.content/` jest wspierana przez repozytorium Git skonfigurowane przez `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Skrypt `scripts/clone.cjs` klonuje to repozytorium podczas `predev` i `prebuild`. Ponieważ treść jest zarządzana przez Git, każda zmiana ma pełną historię wersji:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Cofanie Zmian Treści

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Plan Odtwarzania po Awarii

### Lista Kontrolna Odtwarzania

1. **Oceń uszkodzenia** -- określ zakres utraty danych
2. **Zatrzymaj aplikację** -- zapobiegaj dalszym zapisom
3. **Zidentyfikuj ostatnią czystą kopię zapasową** -- zweryfikuj integralność
4. **Przywróć bazę danych**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Sklonuj repozytorium treści**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Uruchom oczekujące migracje**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Zweryfikuj stan seed** -- sprawdź tabelę `seed_status` pod kątem statusu `completed`
8. **Skonfiguruj środowisko** -- zaktualizuj `.env.local` o nowe ciągi połączeń
9. **Wdróż aplikację** -- hook instrumentation weryfikuje zdrowie bazy danych podczas uruchamiania
10. **Zweryfikuj funkcjonalność** -- przetestuj uwierzytelnianie, płatności, wyświetlanie treści

### Szacunkowe Czasy Odtwarzania

| Komponent | Metoda | Szacowany Czas |
|-----------|--------|---------------|
| Baza danych | pg_restore z kopii zapasowej | 5–30 minut |
| Treść | Klon Git | 1–5 minut |
| Aplikacja | Wdrożenie z Git | 2–10 minut |
| Certyfikaty SSL | Automatycznie (Vercel) | 1–5 minut |
| DNS | Już skonfigurowane | Natychmiast |

### Zewnętrzne Przechowywanie Kopii Zapasowych

Przechowuj kopie zapasowe oddzielnie od serwera produkcyjnego:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Lista Kontrolna Weryfikacji Kopii Zapasowych

- [ ] Skonfigurowane codzienne automatyczne kopie zapasowe bazy danych
- [ ] Pliki kopii zapasowych przechowywane oddzielnie od produkcji
- [ ] Repozytorium Git treści wypchnięte do zdalnego
- [ ] Przywracanie kopii zapasowej testowane kwartalnie
- [ ] Aktywne monitorowanie health check
- [ ] Zmienne środowiskowe udokumentowane i bezpiecznie przechowywane
- [ ] Konfiguracje dostawców OAuth udokumentowane

## Powiązane Pliki

| Plik | Cel |
|------|---------|
| `lib/db/drizzle.ts` | Połączenie z bazą danych i konfiguracja puli |
| `lib/db/schema.ts` | Kompletny schemat bazy danych |
| `lib/db/initialize.ts` | Automatyczna migracja, seedowanie, zarządzanie blokadami |
| `lib/db/migrate.ts` | Idempotentny runner migracji |
| `scripts/clean-database.js` | Narzędzie do resetu bazy danych |
| `scripts/cli-migrate.ts` | Ręczne CLI migracji |
| `scripts/cli-seed.ts` | Ręczne CLI seedowania |
| `scripts/clone.cjs` | Skrypt klonowania repozytorium treści |
| `drizzle.config.ts` | Konfiguracja Drizzle ORM |
