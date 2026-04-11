---
id: database-scripts
title: "Datenbankskripte"
sidebar_label: "Datenbankskripte"
sidebar_position: 10
---

# Datenbankskripte

Die Vorlage bietet eine Sammlung von Datenbankverwaltungsskripten für Migrationen, Seeding und Wartung. Diese Skripte verwenden Drizzle ORM und sind für lokale Entwicklung, CI/CD-Pipelines und Vercel-Produktionsbereitstellungen ausgelegt.

## Skript-Inventar

| Skript | Befehl | Zweck |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Build-Time-Migrationsausführer |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Manuelle interaktive Migration |
| `cli-seed.ts` | `pnpm db:seed` | CLI-Einstiegspunkt für Seeding |
| `seed.ts` | Direkte Ausführung | Vollständiger Datenbank-Seeder |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Stripe-Produktkatalog-Einrichtung |
| `clean-database.js` | `node scripts/clean-database.js` | Vollständiges Zurücksetzen (löscht alles) |

## Migrationsskripte

### Build-Time-Migration (build-migrate.ts)

Wird automatisch während `pnpm build` bei Vercel-Bereitstellungen ausgeführt. Entwickelt für Schema-Updates ohne Ausfallzeiten.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**Umgebungsbewusstes Verhalten:**

| Umgebung | Migrationsfehler | Verbindungsfehler | Auth-Fehler |
|---|---|---|---|
| Produktion (`VERCEL_ENV=production`) | Build schlägt fehl | Build schlägt fehl | Build schlägt fehl |
| Vorschau (`VERCEL_ENV=preview`) | Build schlägt fehl | Build läuft (Warnung) | Build schlägt fehl |
| CI (GitHub Actions) | Vollständig übersprungen | Vollständig übersprungen | Vollständig übersprungen |
| Lokale Entwicklung | Build schlägt fehl | Build schlägt fehl | Build schlägt fehl |

**Schema-Überprüfung:**

Nach erfolgreicher Migration überprüft das Skript, ob kritische Spalten vorhanden sind:

```typescript
// Überprüfte Spalten in der client_profiles-Tabelle:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### Manuelle Migrations-CLI (cli-migrate.ts)

Interaktives Migrationswerkzeug für manuelle Ausführung gegen beliebige Datenbanken.

```bash
# Über package.json-Skript
pnpm db:migrate:cli

# Direkte Ausführung mit benutzerdefinierter Datenbank
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Drei-Schritt-Prozess:**

1. **Aktuellen Zustand prüfen** – Abfrage der `drizzle.__drizzle_migrations`-Tabelle für angewandte Migrationshistorie
2. **Migrationen ausführen** – Ruft `runMigrations()` aus `lib/db/migrate.ts` auf
3. **Schema überprüfen** – Bestätigt, dass erforderliche Spalten vorhanden sind

Beispielausgabe:

```
============================================================
Database Migration CLI
============================================================
Database: postgres://***:***@host:5432/db

Step 1: Checking current migration state...
  Found 14 applied migrations:
    1. abc123... (2024-01-15T10:30:00Z)
    ...

Step 2: Running migrations...

Step 3: Verifying schema...
  All required moderation columns exist

============================================================
MIGRATION COMPLETED SUCCESSFULLY
============================================================
```

## Seeding-Skripte

### Datenbank-Seeder (seed.ts)

Befüllt die Datenbank mit realistischen Testdaten. Führt Seeding nur durch, wenn Tabellen leer sind (idempotent für Rollen/Berechtigungen, benutzeranzahlgesteuert für Benutzer).

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Seeding-Reihenfolge und Abhängigkeiten:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**Generierte Daten:**

```typescript
// 20 Benutzer mit sequenziellen E-Mails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client-Profile mit verschiedenen Plänen
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Rollenzuweisung: erster Benutzer = Admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter-Abonnements: jeder 3. Benutzer
users.filter((_, i) => i % 3 === 0)
```

**Verbindungskonfiguration:**

```typescript
const conn = postgres(databaseUrl, {
  max: 1,              // Einzelne Verbindung (sicher für Skripte)
  idle_timeout: 20,     // Idle-Verbindungen nach 20s schließen
  connect_timeout: 10,  // Schnell bei Verbindungsproblemen scheitern
  prepare: false,       // Prepared Statements deaktivieren
});
```

### CLI-Seed-Einstiegspunkt (cli-seed.ts)

Wrapper-Skript, das Umgebungsvariablen lädt und an `lib/db/seed.ts` delegiert:

```bash
pnpm db:seed
```

Das Skript sucht Umgebungsdateien in dieser Reihenfolge:
1. `.env.local` (bevorzugt)
2. `.env` (Fallback)
3. Nur System-Umgebungsvariablen (wenn keine Datei vorhanden)

### Stripe-Produkt-Seeder (seed-stripe-products.ts)

Erstellt den vollständigen Stripe-Produktkatalog mit Abonnementplänen und Einmalkauf-Artikeln.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Erforderlich:** `STRIPE_SECRET_KEY` in `.env.local`

**Produkte und Preise:**

| Produkt | Plan-Schlüssel | Preistyp | Metadaten |
|---|---|---|---|
| Free | `free` | Abonnement ($0/Monat) | `type: subscription` |
| Standard | `standard` | $10/Monat, $96/Jahr | `annualDiscount: 20` |
| Premium | `premium` | $20/Monat, $180/Jahr | `annualDiscount: 25` |
| Sponsored Ad - Weekly | `sponsor_weekly` | $100 einmalig | `type: sponsor_ad` |
| Sponsored Ad - Monthly | `sponsor_monthly` | $300 einmalig | `type: sponsor_ad` |

**Produkt-Metadatenstruktur:**

```typescript
interface ProductConfig {
  name: string;
  description: string;
  metadata: {
    plan: string;
    type: string;
    features?: string;
    annualDiscount?: string;
  };
  prices: {
    monthly?: number;
    yearly?: number;
    oneTime?: number;
  };
}
```

## Datenbank-Bereinigung

### clean-database.js

Löscht alle Tabellen im `public`-Schema und das `drizzle`-Migrationsverfolgungsschema. Ermöglicht ein vollständiges Datenbank-Zurücksetzen.

```bash
node scripts/clean-database.js
```

**Durchgeführte Operationen:**

1. Alle Tabellen im `public`-Schema mit `CASCADE` löschen
2. `drizzle`-Schema (Migrationshistorie) löschen

```sql
-- Schritt 1: Alle öffentlichen Tabellen löschen
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Schritt 2: Migrationsverfolgung löschen
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**Warnung:** Dies ist irreversibel. Erstellen Sie immer ein Backup, bevor Sie dies in einer Umgebung mit echten Daten ausführen.

## Häufige Workflows

### Frische Entwicklungseinrichtung

```bash
# 1. Lokales PostgreSQL starten
docker compose up -d postgres

# 2. Migrationsdateien aus Schema generieren
pnpm db:generate

# 3. Migrationen anwenden
pnpm db:migrate:cli

# 4. Testdaten einsäen
pnpm db:seed

# 5. Stripe-Produkte einsäen (bei Verwendung von Zahlungen)
npx tsx scripts/seed-stripe-products.ts
```

### Zurücksetzen und neu einsäen

```bash
# 1. Alles bereinigen
node scripts/clean-database.js

# 2. Migrationen erneut anwenden
pnpm db:migrate:cli

# 3. Erneut einsäen
pnpm db:seed
```

### Schema-Änderungen

```bash
# 1. Schema in lib/db/schema.ts anpassen
# 2. Migration generieren
pnpm db:generate

# 3. Lokal anwenden
pnpm db:migrate:cli

# 4. Mit Drizzle Studio überprüfen
pnpm db:studio
```

## Umgebungsvariablen

| Variable | Verwendet von | Zweck |
|---|---|---|
| `DATABASE_URL` | Alle Skripte | PostgreSQL-Verbindungszeichenfolge |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Auf `true` setzen, um Build-Migrationen zu überspringen |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Stripe-API-Schlüssel für Produkterstellung |
