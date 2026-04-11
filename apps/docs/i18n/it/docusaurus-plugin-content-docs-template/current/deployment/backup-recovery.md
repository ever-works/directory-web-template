---
id: backup-recovery
title: Backup & Ripristino
sidebar_label: Backup & Ripristino
sidebar_position: 3
---

# Backup & Ripristino

Questa guida tratta le strategie di backup del database, il ripristino point-in-time, l'automazione dei backup e le procedure di disaster recovery per il Template Ever Works. Il template utilizza un'architettura di archiviazione doppia: PostgreSQL per i dati transazionali e un CMS basato su Git (directory `.content/`) per i contenuti. Ognuno richiede il proprio approccio al backup.

## Architettura di Archiviazione

| Tipo di Dati | Archiviazione | Metodo di Backup |
|-----------|---------|---------------|
| Utenti, ruoli, permessi | PostgreSQL | Dump del database |
| Sessioni, account OAuth | PostgreSQL | Dump del database |
| Abbonamenti, pagamenti | PostgreSQL | Dump del database |
| Commenti, voti, segnalazioni | PostgreSQL | Dump del database |
| Elementi, categorie, tag | Repository Git (`.content/`) | Cronologia Git |
| Collezioni, pagine | Repository Git (`.content/`) | Cronologia Git |
| Impostazioni applicazione | Basato su file (JSON) | Backup file |
| File di backup categorie | File YAML | Copie automatiche con timestamp |

## Connessione al Database

La connessione al database è configurata in `lib/db/drizzle.ts` con connection pooling:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

La dimensione del pool è predefinita a 20 in produzione e 10 in sviluppo, configurabile tramite `DB_POOL_SIZE` (limitata tra 1 e 50).

## Metodi di Backup del Database

### Backup Completo con pg_dump

Usa il nativo `pg_dump` di PostgreSQL per backup affidabili:

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

### Backup per Tabelle Specifiche

Esegui il backup delle tabelle critiche singolarmente per un ripristino più veloce e mirato:

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

### Backup di Database Gestiti

Se utilizzi un provider PostgreSQL gestito, sfrutta le funzionalità di backup integrate:

- **Supabase**: Backup giornalieri automatici con ripristino point-in-time nei piani Pro
- **Neon**: Snapshot basati su branch con ripristino istantaneo
- **Railway**: Backup automatici con retention configurabile
- **AWS RDS**: Backup automatizzati con finestra di retention fino a 35 giorni

## Automazione dei Backup

### Script di Backup Automatizzato

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

### Pianificazione Cron

Pianifica i backup prima che vengano eseguiti i cron job dell'applicazione. Il `vercel.json` del template pianifica un job di sincronizzazione alle 3 del mattino:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Imposta i job di backup per essere eseguiti prima:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Backup dello Stato delle Migrazioni

Prima di distribuire nuove versioni con modifiche allo schema, acquisisci lo stato delle migrazioni:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Lo script `cli-migrate.ts` del template visualizza questo stato automaticamente:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Procedure di Ripristino

### Ripristino Completo del Database

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

### Reset Pulito del Database

Lo script `scripts/clean-database.js` elimina tutte le tabelle e lo schema di migrazione Drizzle:

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
Non eseguire mai `clean-database.js` su un database di produzione senza un backup verificato. Questa operazione è irreversibile.
:::

Dopo un reset pulito:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Ripristino dello Stato del Seed

`lib/db/initialize.ts` gestisce automaticamente i fallimenti del seed all'avvio:

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

Il meccanismo di advisory lock previene le race condition durante le distribuzioni multi-istanza:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Ripristino dei Contenuti Basato su Git

### Cronologia del Repository dei Contenuti

I contenuti in `.content/` sono supportati da un repository Git configurato tramite `DATA_REPOSITORY`:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Lo script `scripts/clone.cjs` clona questo repository durante `predev` e `prebuild`. Poiché i contenuti sono gestiti da Git, ogni modifica ha una cronologia completa delle versioni:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Annullamento delle Modifiche ai Contenuti

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Piano di Disaster Recovery

### Checklist di Ripristino

1. **Valutare il danno** -- determinare l'entità della perdita di dati
2. **Fermare l'applicazione** -- prevenire ulteriori scritture
3. **Identificare l'ultimo backup pulito** -- verificare l'integrità
4. **Ripristinare il database**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Clonare il repository dei contenuti**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Eseguire le migrazioni in sospeso**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Verificare lo stato del seed** -- controllare la tabella `seed_status` per lo stato `completed`
8. **Configurare l'ambiente** -- aggiornare `.env.local` con le nuove stringhe di connessione
9. **Distribuire l'applicazione** -- l'hook di instrumentation verifica la salute del database all'avvio
10. **Verificare la funzionalità** -- testare autenticazione, pagamenti, visualizzazione dei contenuti

### Stime dei Tempi di Ripristino

| Componente | Metodo | Tempo Stimato |
|-----------|--------|---------------|
| Database | pg_restore da backup | 5–30 minuti |
| Contenuti | Clone Git | 1–5 minuti |
| Applicazione | Deploy da Git | 2–10 minuti |
| Certificati SSL | Provisioning automatico (Vercel) | 1–5 minuti |
| DNS | Già configurato | Immediato |

### Archiviazione Backup Esterna

Archivia i backup separatamente dal server di produzione:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Checklist di Verifica Backup

- [ ] Backup del database automatizzati giornalieri configurati
- [ ] File di backup archiviati separatamente dalla produzione
- [ ] Repository Git dei contenuti sincronizzato con il remoto
- [ ] Ripristino da backup testato trimestralmente
- [ ] Monitoraggio health check attivo
- [ ] Variabili d'ambiente documentate e archiviate in modo sicuro
- [ ] Configurazioni dei provider OAuth documentate

## File Correlati

| File | Scopo |
|------|---------|
| `lib/db/drizzle.ts` | Connessione al database e configurazione del pool |
| `lib/db/schema.ts` | Schema completo del database |
| `lib/db/initialize.ts` | Auto-migrazione, seeding, gestione dei lock |
| `lib/db/migrate.ts` | Runner di migrazione idempotente |
| `scripts/clean-database.js` | Utility di reset del database |
| `scripts/cli-migrate.ts` | CLI per migrazione manuale |
| `scripts/cli-seed.ts` | CLI per seed manuale |
| `scripts/clone.cjs` | Script di clonazione del repository dei contenuti |
| `drizzle.config.ts` | Configurazione Drizzle ORM |
