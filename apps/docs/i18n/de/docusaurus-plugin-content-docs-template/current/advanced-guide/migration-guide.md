---
id: migration-guide
title: Leitfaden zur Versionsmigration
sidebar_label: Migrationsleitfaden
sidebar_position: 8
---

# Leitfaden zur Versionsmigration

Dieses Handbuch behandelt die Aktualisierung Ihrer Ever Works Template-Installation, die Handhabung von Datenbankmigrationen zwischen Versionen, die Verwaltung wichtiger Änderungen, das Schreiben und Anwenden von Migrationsskripts sowie Rollback-Verfahren.

## Übersicht über den Upgrade-Workflow

Die Aktualisierung der Vorlage folgt einem strukturierten Prozess, um das Risiko zu minimieren:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## Datenbankmigrationssystem

### So funktionieren Migrationen

Die Vorlage verwendet Drizzle ORM mit Drizzle Kit für Schemamigrationen. Das Schema ist in `lib/db/schema.ts` definiert und Migrationen werden als SQL-Dateien in `lib/db/migrations/` generiert.

Konfiguration in `drizzle.config.ts` :

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### Migrationsbefehle

| Befehl | Zweck | Wann zu verwenden |
|---------|---------|-------------|
| `pnpm db:generate` | SQL aus Schemaänderungen generieren | Nach der Änderung von `lib/db/schema.ts` |
| `pnpm db:migrate` | Ausstehende Migrationen anwenden (Drizzle CLI) | Vor dem Start der App nach Änderungen |
| `pnpm db:migrate:cli` | Mit ausführlicher Protokollierung anwenden | Zum Debuggen von Migrationsproblemen |
| `pnpm db:seed` | Anfangsdaten füllen | Nach Neumigration oder Saatgutveränderungen |
| `pnpm db:studio` | Visuelle Datenbankinspektion | Zum Debuggen oder zur Datenüberprüfung |

### Struktur der Migrationsdatei

Migrationen werden als nummerierte SQL-Dateien gespeichert:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Drizzle verfolgt angewandte Migrationen in `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Generieren einer neuen Migration

Nach der Änderung von `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Automatische Migrationen

Die Vorlage führt Migrationen automatisch an zwei Stellen aus:

**Bauzeit** (über `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**Laufzeit** (über `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### Migrationssicherheit durch Umgebung

| Umwelt | Bauzeit | Laufzeit | Bei Fehler |
|-------------|-----------|---------|------------|
| Produktion | Erforderlich | Rückfall | Build schlägt fehl / App löst | aus
| Vorschau | Verbindungsfehler toleriert | Aktiv | Protokollwarnung, App wird gestartet |
| Entwicklung | Nicht verwendet | Aktiv | Protokollwarnung, App wird gestartet |
| CI (nicht-Vercel) | Übersprungen | Nicht verwendet | N/A |

## Rollback-Prozeduren

### Drizzle unterstützt kein automatisches Rollback

Drizzle Kit generiert Nur-Vorwärts-Migrationen. So kehren Sie eine Migration um:

**Option 1: Manuelle Rückmigration**

1. Identifizieren Sie die problematische Migration in `lib/db/migrations/` 2. Reverse SQL manuell schreiben:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Direkt auf die Datenbank anwenden:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Entfernen Sie die Vorwärtsmigrationsdatei von `lib/db/migrations/` 5. Aktualisieren Sie das Drizzle-Journal bei Bedarf

**Option 2: Aus Backup wiederherstellen**

Der sicherste Rollback-Ansatz für komplexe Migrationen:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Option 3: Schema zurücksetzen und neu generieren**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Abhängigkeitsaktualisierungen

### Abhängigkeiten aktualisieren

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Kritische Abhängigkeiten

Diese Pakete müssen beim Upgrade sorgfältig getestet werden:

| Paket | Risiko | Notizen |
|---------|------|-------|
| `next` | Hoch | Hauptversionen ändern APIs, Routing, Konfiguration |
| `next-auth` | Hoch | Authentifizierungs-API-Änderungen, Sitzungsstrategie |
| `drizzle-orm` / `drizzle-kit` | Hoch | Schema-API, Änderungen des Migrationsformats |
| `next-intl` | Mittel | Änderungen beim Routing und beim Laden von Nachrichten |
| `@sentry/nextjs` | Mittel | Kompatibilität von Instrumentierungs-Hooks |
| `stripe` | Mittel | Versionierung der Zahlungs-API |
| `@heroui/react` | Mittel | Änderungen an UI-Komponenten-Requisiten |
| `@trigger.dev/sdk` | Mittel | Änderungen an der Jobplanungs-API |

### pnpm-Überschreibungen

Die Vorlage verwendet pnpm-Überschreibungen in `package.json` , um konsistente Versionen zu erzwingen:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

Wenn Sie React oder esbuild aktualisieren, aktualisieren Sie diese Überschreibungen entsprechend.

## Checkliste für bahnbrechende Änderungen

Überprüfen Sie beim Upgrade zwischen Vorlagenversionen jede Kategorie:

### Schemaänderungen

- [ ] Vergleichen Sie `lib/db/schema.ts` mit Upstream für neue/geänderte Spalten
- [ ] Migrationen generieren: `pnpm db:generate` - [ ] Überprüfen Sie generiertes SQL auf destruktive Vorgänge (Spaltenlöschungen, Typänderungen)
- [ ] Zuerst auf eine Testdatenbank anwenden
- [ ] Saatgutverträglichkeit prüfen: `pnpm db:seed` ### API-Routenänderungen

- [ ] Suchen Sie nach umbenannten oder entfernten Routen in `app/api/` - [ ] Externe Integrationen und Webhook-URLs aktualisieren
- [ ] Überprüfen Sie, ob die Cron-Endpunktpfade immer noch mit `vercel.json` übereinstimmen

### Konfigurationsänderungen

- [ ] Vergleichen Sie `.env.example` für neue oder umbenannte Variablen
- [ ] Überprüfen Sie `next.config.ts` Änderungen (Header, Webpack, Plugins)
- [ ] Überprüfen Sie `vercel.json` auf Cron-Zeitplanänderungen
- [ ] Überprüfen Sie `drizzle.config.ts` auf Pfadänderungen

### Authentifizierungsänderungen

- [ ] Vergleiche `auth.config.ts` mit Upstream
- [ ] Überprüfen Sie die Kompatibilität der Sitzungsstrategie
- [ ] OAuth-Rückruf-URLs testen
- [ ] Lesen Sie die Berechtigungsdefinitionen in `lib/permissions/definitions.ts` ### UI- und Styling-Änderungen

- [ ] Vergleichen Sie `tailwind.config.ts` für Themenänderungen
- [ ] Überprüfen Sie wichtige Seiten visuell
- [ ] Testen Sie responsive Layouts
- [ ] Überprüfen Sie, ob die Designanpassungen weiterhin gelten

## Schritt-für-Schritt-Upgrade-Prozess

### 1. Bereiten Sie sich vor

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Upstream zusammenführen

Wenn Sie die Vorlage als Upstream-Remote verfolgen:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Lösen Sie Konflikte und achten Sie dabei auf:
- `lib/db/schema.ts` – Schemaänderungen
- `next.config.ts` – Build-Konfiguration
- `auth.config.ts` – Authentifizierungsanbieter
- `package.json` – Abhängigkeitsversionen

### 3. Installieren und migrieren

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Lokal überprüfen

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Kritische Pfade testen

| Bereich | Was zu testen ist |
|------|-------------|
| Authentifizierung | Anmelden, Abmelden, OAuth, Sitzungspersistenz |
| Zahlungen | Abonnementflüsse, Webhook-Handhabung |
| Inhalt | Seitenrendering, Suche, Filterung |
| Admin | Dashboard-Zugriff, RBAC-Durchsetzung |
| i18n | Gebietsschemawechsel, Vollständigkeit der Übersetzung |
| Hintergrundjobs | Konsolenprotokolle für die Jobregistrierung |

### 6. Bereitstellen

1. Drücken Sie den Funktionszweig zur CI-Überprüfung
2. Bereitstellung in der Staging-/Vorschauumgebung
3. Führen Sie Rauchtests auf der Bühne durch
4. Führen Sie für die Produktionsbereitstellung eine Zusammenführung zu `main` durch

## Versionskompatibilität

### Node.js

Die Mindestversion ist in `package.json` definiert:

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Datenbank

| Anbieter | Unterstützt | Notizen |
|----------|-----------|-------|
| PostgreSQL 14+ | Ja | Produktion empfohlen |
| Supabase | Ja | Mit Verbindungspooling |
| Neon | Ja | Serverloses PostgreSQL |

### Plattformen

| Plattform | Status | Notizen |
|----------|--------|-------|
| Vercel | Primäres Ziel | Vollständige Cron-, Vorschau- und Edge-Unterstützung |
| Docker | Unterstützt | Standalone-Ausgabe für Container |
| Selbstgehostet | Unterstützt | Erfordert Prozessmanagement |

## Fehlerbehebung bei Upgrades

| Symptom | Wahrscheinliche Ursache | Lösung |
|---------|-------------|---------|
| Build schlägt fehl | Inkompatible Deps | Führen Sie `pnpm outdated` aus, lösen Sie Peer-Konflikte |
| DB-Fehler beim Start | Nicht angewendete Migrationen | `pnpm db:generate && pnpm db:migrate` |
| Authentifizierung defekt | Anbieterkonfiguration geändert | Vergleiche `auth.config.ts` mit Upstream |
| Fehlende Übersetzungen | Neue Schlüssel hinzugefügt | Überprüfen Sie `messages/` auf fehlende Einträge |
| Styling kaputt | Tailwind-Konfiguration geändert | Vergleiche `tailwind.config.ts` |
| Typen stimmen nicht überein | Schema aktualisiert | `pnpm db:generate` | erneut ausführen
