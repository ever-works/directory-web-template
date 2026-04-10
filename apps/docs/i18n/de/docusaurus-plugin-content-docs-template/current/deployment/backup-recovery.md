---
id: backup-recovery
title: Backup & Wiederherstellung
sidebar_label: Backup & Wiederherstellung
sidebar_position: 3
---

# Backup & Wiederherstellung

Dieser Leitfaden behandelt Datenbank-Backup-Strategien, Point-in-Time-Recovery, Backup-Automatisierung und Disaster-Recovery-Verfahren für das Ever Works Template. Das Template verwendet eine duale Speicherarchitektur: PostgreSQL für transaktionale Daten und ein Git-basiertes CMS (`.content/`-Verzeichnis) für Inhalte. Jedes erfordert einen eigenen Backup-Ansatz.

## Speicherarchitektur

| Datentyp | Speicher | Backup-Methode |
|-----------|---------|---------------|
| Benutzer, Rollen, Berechtigungen | PostgreSQL | Datenbank-Dumps |
| Sitzungen, OAuth-Konten | PostgreSQL | Datenbank-Dumps |
| Abonnements, Zahlungen | PostgreSQL | Datenbank-Dumps |
| Kommentare, Abstimmungen, Meldungen | PostgreSQL | Datenbank-Dumps |
| Einträge, Kategorien, Tags | Git-Repository (`.content/`) | Git-Verlauf |
| Sammlungen, Seiten | Git-Repository (`.content/`) | Git-Verlauf |
| Anwendungseinstellungen | Dateibasiert (JSON) | Datei-Backup |
| Kategorie-Backup-Dateien | YAML-Dateien | Automatisch zeitgestempelte Kopien |

## Datenbankverbindung

Die Datenbankverbindung ist in `lib/db/drizzle.ts` mit Connection-Pooling konfiguriert:

```typescript
const conn = postgres(getDatabaseUrl()!, {
  max: poolSize,
  idle_timeout: 20,
  connect_timeout: 30,
  prepare: false,
});
globalForDb.db = drizzle(conn, { schema });
```

Die Pool-Größe beträgt standardmäßig 20 in der Produktion und 10 in der Entwicklung, konfigurierbar über `DB_POOL_SIZE` (begrenzt zwischen 1 und 50).

## Datenbank-Backup-Methoden

### Vollständiges Backup mit pg_dump

Verwenden Sie das native `pg_dump` von PostgreSQL für zuverlässige Backups:

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

### Tabellen-spezifische Backups

Sichern Sie kritische Tabellen einzeln für eine schnellere, gezieltere Wiederherstellung:

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

### Verwaltete Datenbank-Backups

Wenn Sie einen verwalteten PostgreSQL-Anbieter verwenden, nutzen Sie dessen integrierte Backup-Funktionen:

- **Supabase**: Automatische tägliche Backups mit Point-in-Time-Recovery für Pro-Pläne
- **Neon**: Branch-basierte Snapshots mit sofortiger Wiederherstellung
- **Railway**: Automatische Backups mit konfigurierbarer Aufbewahrung
- **AWS RDS**: Automatisierte Backups mit bis zu 35 Tagen Aufbewahrungsfenster

## Backup-Automatisierung

### Automatisiertes Backup-Skript

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

### Cron-Zeitplan

Planen Sie Backups, bevor die Cron-Jobs der Anwendung ausgeführt werden. Die `vercel.json` des Templates plant einen Synchronisierungsjob um 3 Uhr morgens:

```json
{ "path": "/api/cron/sync", "schedule": "0 3 * * *" }
```

Setzen Sie Backup-Jobs vor diesem Zeitpunkt:

```bash
# Daily backup at 2 AM (before the 3 AM sync)
0 2 * * * /path/to/backup-database.sh >> /var/log/db-backup.log 2>&1

# Weekly full backup on Sundays at 1 AM
0 1 * * 0 /path/to/backup-database.sh >> /var/log/db-backup-weekly.log 2>&1
```

### Migrations-Zustands-Backup

Erfassen Sie vor dem Einsetzen neuer Versionen mit Schemaänderungen den Migrationszustand:

```bash
psql "${DATABASE_URL}" -c \
  "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at" \
  > migration_state_$(date +%Y%m%d).txt
```

Das `cli-migrate.ts`-Skript des Templates zeigt diesen Zustand automatisch an:

```typescript
const result = await db.execute(sql`
  SELECT hash, created_at
  FROM drizzle.__drizzle_migrations
  ORDER BY created_at DESC
`);
console.log(`Found ${rows.length} applied migrations:`);
```

## Wiederherstellungsverfahren

### Vollständige Datenbankwiederherstellung

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

### Sauberes Datenbank-Reset

Das `scripts/clean-database.js`-Skript löscht alle Tabellen und das Drizzle-Migrationschema:

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
Führen Sie `clean-database.js` niemals gegen eine Produktionsdatenbank ohne ein verifiziertes Backup aus. Dieser Vorgang ist unumkehrbar.
:::

Nach einem sauberen Reset:

```bash
pnpm db:migrate    # Recreate the schema
pnpm db:seed       # Populate initial data (roles, permissions, admin user)
```

### Seed-Zustands-Wiederherstellung

`lib/db/initialize.ts` behandelt Seed-Fehler automatisch beim Start:

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

Der Advisory-Lock-Mechanismus verhindert Race-Conditions während Multi-Instanz-Deployments:

```typescript
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Git-basierte Inhaltswiederherstellung

### Inhalt-Repository-Verlauf

Inhalte in `.content/` werden durch ein Git-Repository gesichert, das über `DATA_REPOSITORY` konfiguriert ist:

```bash
DATA_REPOSITORY=https://github.com/your-org/your-data-repo
```

Das `scripts/clone.cjs`-Skript klont dieses Repository während `predev` und `prebuild`. Da Inhalte Git-verwaltet sind, hat jede Änderung einen vollständigen Versionsverlauf:

```bash
cd .content
git log --oneline -10    # View recent changes
git diff HEAD~1          # Compare with previous version
```

### Inhalt-Änderungen rückgängig machen

```bash
cd .content

# Revert a specific commit
git revert <commit-hash>

# Restore a specific file to a previous state
git checkout <commit-hash> -- categories.yml

# View file history
git log --follow -- items/your-item.yml
```

## Disaster-Recovery-Plan

### Wiederherstellungs-Checkliste

1. **Schaden einschätzen** – Umfang des Datenverlusts bestimmen
2. **Anwendung stoppen** – weitere Schreibvorgänge verhindern
3. **Letztes sauberes Backup identifizieren** – Integrität verifizieren
4. **Datenbank wiederherstellen**:
   ```bash
   pg_restore -h new-host -U user -d dbname -c latest-backup.dump
   ```
5. **Inhalts-Repository klonen**:
   ```bash
   git clone $DATA_REPOSITORY .content
   ```
6. **Ausstehende Migrationen ausführen**:
   ```bash
   pnpm db:migrate:cli
   ```
7. **Seed-Zustand verifizieren** – `seed_status`-Tabelle auf `completed`-Status prüfen
8. **Umgebung konfigurieren** – `.env.local` mit neuen Verbindungszeichenketten aktualisieren
9. **Anwendung deployen** – der Instrumentation-Hook verifiziert beim Start die Datenbankgesundheit
10. **Funktionalität verifizieren** – Auth, Zahlungen, Inhaltsanzeige testen

### Wiederherstellungszeit-Schätzungen

| Komponente | Methode | Geschätzte Zeit |
|-----------|--------|---------------|
| Datenbank | pg_restore aus Backup | 5–30 Minuten |
| Inhalt | Git-Klon | 1–5 Minuten |
| Anwendung | Deploy aus Git | 2–10 Minuten |
| SSL-Zertifikate | Automatisch bereitgestellt (Vercel) | 1–5 Minuten |
| DNS | Bereits konfiguriert | Sofort |

### Außerhalb gespeicherte Backups

Speichern Sie Backups getrennt vom Produktionsserver:

```bash
# AWS S3
aws s3 cp backup.dump s3://your-backup-bucket/everworks/

# Google Cloud Storage
gsutil cp backup.dump gs://your-backup-bucket/everworks/
```

## Backup-Verifizierungs-Checkliste

- [ ] Tägliche automatisierte Datenbankbackups konfiguriert
- [ ] Backup-Dateien getrennt von der Produktion gespeichert
- [ ] Inhalts-Git-Repository auf Remote gepusht
- [ ] Backup-Wiederherstellung vierteljährlich getestet
- [ ] Health-Check-Monitoring aktiv
- [ ] Umgebungsvariablen dokumentiert und sicher gespeichert
- [ ] OAuth-Anbieterkonfigurationen dokumentiert

## Verwandte Dateien

| Datei | Zweck |
|------|---------|
| `lib/db/drizzle.ts` | Datenbankverbindung und Pool-Einrichtung |
| `lib/db/schema.ts` | Vollständiges Datenbankschema |
| `lib/db/initialize.ts` | Automatische Migration, Seeding, Lock-Verwaltung |
| `lib/db/migrate.ts` | Idempotenter Migrations-Runner |
| `scripts/clean-database.js` | Datenbank-Reset-Hilfsprogramm |
| `scripts/cli-migrate.ts` | Manuelles Migrations-CLI |
| `scripts/cli-seed.ts` | Manuelles Seed-CLI |
| `scripts/clone.cjs` | Inhalts-Repository-Klon-Skript |
| `drizzle.config.ts` | Drizzle ORM-Konfiguration |
