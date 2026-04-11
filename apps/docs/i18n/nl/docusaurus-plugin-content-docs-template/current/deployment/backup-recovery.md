---
id: backup-recovery
title: Back-up & Herstel
sidebar_label: Back-up & Herstel
sidebar_position: 3
---

# Back-up & Herstel

Deze gids behandelt strategieën voor databaseback-ups, point-in-time-herstel, back-upautomatisering en procedures voor noodherstel voor het Ever Works Template. Het template gebruikt een dubbele opslagarchitectuur: PostgreSQL voor transactionele gegevens en een Git-gebaseerd CMS (`.content/`-map) voor inhoud. Elk vereist zijn eigen back-upbenadering.

## Opslagarchitectuur

| Gegevenstype | Opslag | Back-upmethode |
|-----------|---------|---------------|
| Gebruikers, rollen, machtigingen | PostgreSQL | Databasedumps |
| Sessies, OAuth-accounts | PostgreSQL | Databasedumps |
| Abonnementen, betalingen | PostgreSQL | Databasedumps |
| Reacties, stemmen, rapporten | PostgreSQL | Databasedumps |
| Items, categorieën, tags | Git-repository (`.content/`) | Git-geschiedenis |
| Collecties, pagina's | Git-repository (`.content/`) | Git-geschiedenis |
| Applicatie-instellingen | Bestandsgebaseerd (JSON) | Bestandsback-up |
| Categorie-back-upbestanden | YAML-bestanden | Automatische kopieën met tijdstempel |

## Databaseverbinding

De databaseverbinding is geconfigureerd in `lib/db/drizzle.ts` met verbindingsgroepering:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

De poolgrootte is standaard 20 in productie en 10 in ontwikkeling, configureerbaar via `DB_POOL_SIZE` (beperkt tussen 1 en 50).

## Databaseback-upmethoden

### Volledige back-up met pg_dump

Gebruik het native `pg_dump` van PostgreSQL voor betrouwbare back-ups:

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

### Tabelspecifieke back-ups

Maak afzonderlijk een back-up van kritieke tabellen voor sneller, gericht herstel:

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

### Beheerde databaseback-ups

Als u een beheerde PostgreSQL-provider gebruikt, maak dan gebruik van hun ingebouwde back-upfuncties:

- **Supabase**: Automatische dagelijkse back-ups met point-in-time-herstel bij Pro-abonnementen
- **Neon**: Branch-gebaseerde snapshots met direct herstel
- **Railway**: Automatische back-ups met configureerbare retentie
- **AWS RDS**: Geautomatiseerde back-ups met tot 35 dagen retentievenster

## Back-upautomatisering

### Geautomatiseerd back-upscript

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

### Cron-schema

Plan back-ups voordat de cron-jobs van de applicatie worden uitgevoerd. De `vercel.json` van het template plant een synchronisatietaak om 3 uur 's nachts:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Stel back-uptaken in om daarvoor te draaien:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Back-up migratiestatus

Leg de migratiestatus vast voordat u nieuwe versies met schemawijzigingen implementeert:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Het `cli-migrate.ts`-script van het template toont deze status automatisch:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Herstelprocedures

### Volledig databaseherstel

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

### Schone databasereset

Het `scripts/clean-database.js`-script verwijdert alle tabellen en het Drizzle-migratieschema:

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
Voer `clean-database.js` nooit uit tegen een productiedatabase zonder een geverifieerde back-up. Deze bewerking is onomkeerbaar.
:::

Na een schone reset:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Herstel van seed-status

`lib/db/initialize.ts` handelt seed-fouten automatisch af bij het opstarten:

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

Het advisory lock-mechanisme voorkomt race conditions tijdens multi-instantie-implementaties:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Git-gebaseerd inhoudsherstel

### Geschiedenis van inhoudsrepository

Inhoud in `.content/` wordt ondersteund door een Git-repository geconfigureerd via `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Het `scripts/clone.cjs`-script kloont deze repository tijdens `predev` en `prebuild`. Omdat inhoud Git-beheerd is, heeft elke wijziging een volledige versiegeschiedenis:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Inhoudswijzigingen terugdraaien

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Noodherstelplan

### Herstelchecklist

1. **Schade beoordelen** -- omvang van gegevensverlies bepalen
2. **Applicatie stoppen** -- verdere schrijfbewerkingen voorkomen
3. **Laatste schone back-up identificeren** -- integriteit verifiëren
4. **Database herstellen**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Inhoudsrepository klonen**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Openstaande migraties uitvoeren**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Seed-status verifiëren** -- `seed_status`-tabel controleren op `completed`-status
8. **Omgeving configureren** -- `.env.local` bijwerken met nieuwe verbindingsreeksen
9. **Applicatie implementeren** -- de instrumentation-hook verifieert de databasegezondheid bij opstarten
10. **Functionaliteit verifiëren** -- authenticatie, betalingen, inhoudsweergave testen

### Geschatte hersteltijden

| Component | Methode | Geschatte tijd |
|-----------|--------|---------------|
| Database | pg_restore uit back-up | 5–30 minuten |
| Inhoud | Git-kloon | 1–5 minuten |
| Applicatie | Implementeren vanuit Git | 2–10 minuten |
| SSL-certificaten | Automatisch ingericht (Vercel) | 1–5 minuten |
| DNS | Al geconfigureerd | Direct |

### Externe back-upopslag

Sla back-ups apart op van de productieserver:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Back-upverificatiechecklist

- [ ] Dagelijkse geautomatiseerde databaseback-ups geconfigureerd
- [ ] Back-upbestanden apart van productie opgeslagen
- [ ] Inhoud Git-repository gepusht naar extern
- [ ] Back-upherstel elk kwartaal getest
- [ ] Health-check-monitoring actief
- [ ] Omgevingsvariabelen gedocumenteerd en veilig opgeslagen
- [ ] OAuth-providerconfiguraties gedocumenteerd

## Gerelateerde bestanden

| Bestand | Doel |
|------|---------|
| `lib/db/drizzle.ts` | Databaseverbinding en pool-instelling |
| `lib/db/schema.ts` | Volledig databaseschema |
| `lib/db/initialize.ts` | Automatische migratie, seeding, lock-beheer |
| `lib/db/migrate.ts` | Idempotente migratie-runner |
| `scripts/clean-database.js` | Hulpprogramma voor databasereset |
| `scripts/cli-migrate.ts` | Handmatige migratie-CLI |
| `scripts/cli-seed.ts` | Handmatige seed-CLI |
| `scripts/clone.cjs` | Script voor klonen van inhoudsrepository |
| `drizzle.config.ts` | Drizzle ORM-configuratie |
