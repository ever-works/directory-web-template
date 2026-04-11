---
id: database-management
title: Datenbankverwaltung
sidebar_label: Datenbankverwaltung
sidebar_position: 4
---

# Datenbankverwaltung

Die Ever Works-Vorlage verwendet PostgreSQL mit Drizzle ORM für alle Datenbankoperationen. Dieser Leitfaden behandelt die Verwaltung von Produktionsdatenbanken, Migrationen, Verbindungspooling, Überwachung und das Seeding-System.

## Architektur

| Schicht | Datei | Verantwortlichkeit |
|-------|------|----------------|
| **Konfiguration** | `drizzle.config.ts` | Schema-Pfad, Migrationsausgabe, Dialekt |
| **Verbindung** | `lib/db/drizzle.ts` | Verbindungspooling, Singleton-Instanz, Lazy Init |
| **Konfiguration** | `lib/db/config.ts` | Script-sichere Datenbank-URL und Umgebungshilfen |
| **Schema** | `lib/db/schema.ts` | Tabellendefinitionen, Indizes, Constraints |
| **Migrationen** | `lib/db/migrate.ts` | Idempotenter Migrations-Runner |
| **Initialisierung** | `lib/db/initialize.ts` | Auto-Migration, Seeding, Advisory Locks |
| **Seeding** | `lib/db/seed.ts` | Initialdaten: Rollen, Berechtigungen, Admin-Benutzer |

## Verbindungsverwaltung

### Singleton mit Lazy Initialization

Die Datenbankverbindung wird beim ersten Aufruf erstellt und über `globalThis` gecacht, um HMR in der Entwicklung zu überstehen. Aus `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

Das exportierte `db`-Objekt verwendet einen JavaScript-Proxy für transparente Lazy Initialization:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Das bedeutet, dass keine Datenbankverbindung hergestellt wird, bis die erste Abfrage erfolgt. Routen, die keine Datenbank verwenden, haben keinen Verbindungsaufwand.

### Verbindungspool-Konfiguration

| Einstellung | Produktions-Standard | Entwicklungs-Standard | Beschreibung |
|---------|-------------------|---------------------|-------------|
| `max` | 20 | 10 | Maximale Verbindungen im Pool |
| `idle_timeout` | 20 s | 20 s | Inaktive Verbindungen nach dieser Zeit schließen |
| `connect_timeout` | 30 s | 30 s | Timeout für neue Verbindungsversuche |
| `prepare` | false | false | Prepared Statements deaktivieren (Vercel-Kompatibilität) |

Poolgröße über Umgebungsvariable konfigurieren:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

Die Poolgröße wird validiert und begrenzt:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

## Drizzle-Konfiguration

Die Drizzle-Kit-Konfiguration in `drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL
  || "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

Hinweis: Eine Dummy-URL als Fallback wird verwendet, damit `drizzle-kit generate` ohne Live-Datenbankverbindung ausgeführt werden kann (es liest nur die Schema-Datei).

## Schema-Übersicht

Das Schema in `lib/db/schema.ts` definiert diese Kerntabellen:

### Benutzer und Authentifizierung

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### Rollenbasierte Zugriffskontrolle

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### Vollständige Tabellenliste

| Tabelle | Zweck |
|-------|---------|
| `users` | Benutzerkonten |
| `accounts` | OAuth-Anbieterverknüpfungen (NextAuth-Adapter) |
| `sessions` | Aktive Benutzersitzungen |
| `roles` | Rollendefinitionen mit Admin-Flag |
| `permissions` | Berechtigungsdefinitionen (Ressource:Aktion) |
| `userRoles` | Benutzer-zu-Rollen-Zuweisungen |
| `rolePermissions` | Rollen-zu-Berechtigungs-Zuweisungen |
| `clientProfiles` | Erweiterte Benutzerprofile für Verzeichniseinträge |
| `subscriptions` | Zahlungsabonnement-Datensätze |
| `subscriptionHistory` | Abonnementänderungs-Auditprotokoll |
| `paymentProviders` | Multi-Anbieter-Zahlungseinrichtung |
| `paymentAccounts` | Anbieterspezifische Kontodetails |
| `activityLogs` | Benutzeraktions-Auditprotokoll |
| `comments` | Benutzerkommentare zu Einträgen |
| `votes` | Benutzerbewertungen |
| `favorites` | Benutzer-Favoriten/Lesezeichen |
| `notifications` | In-App-Benachrichtigungen |
| `seedStatus` | Seed-Verfolgung (Singleton-Datensatz) |

## Migrationssystem

### Migrationsbefehle

| Befehl | Skript | Beschreibung |
|---------|--------|-------------|
| `pnpm db:generate` | `drizzle-kit generate` | SQL aus Schemaänderungen generieren |
| `pnpm db:migrate` | `drizzle-kit migrate` | Ausstehende Migrationen anwenden (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Migrationen mit detailliertem Logging anwenden |
| `pnpm db:studio` | `drizzle-kit studio` | Drizzle Studio GUI öffnen |

### Migrationsdateien

Migrationen werden als SQL-Dateien in `lib/db/migrations/` gespeichert:

```
lib/db/migrations/
  0000_burly_darkstar.sql
  0001_add_image_to_users.sql
  0002_silly_victor_mancha.sql
  ...
  0028_tiresome_mauler.sql
  meta/
    _journal.json
```

Jede Datei enthält die SQL-Anweisungen für diese Migration. Drizzle verfolgt angewendete Migrationen in der Tabelle `drizzle.__drizzle_migrations`.

### Idempotenter Migrations-Runner

Der Migrations-Runner in `lib/db/migrate.ts` kann sicher bei jedem Anwendungsstart aufgerufen werden:

```typescript
export async function runMigrations(): Promise<boolean> {
  try {
    const { db } = await import('./drizzle');

    // Log current migration state
    const result = await db.execute(sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Run migrations (skips already-applied ones)
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    return true;
  } catch (error) {
    console.error('[Migration] Database migrations failed:', error);
    return false;
  }
}
```

### Build-Zeit-Migrationen

Das Skript `scripts/build-migrate.ts` wird während `pnpm build` ausgeführt, um sicherzustellen, dass das Schema vor der Bereitstellung aktuell ist:

- **Produktions-Builds**: Migrationsfehler schlagen den Build fehl
- **Preview-Deployments**: Verbindungsfehler werden toleriert
- **CI-Builds** (nicht-Vercel): Migrationen werden übersprungen
- **Schema-Verifikation**: Prüft, ob kritische Spalten nach der Migration vorhanden sind

```bash
# Skip build-time migrations for environments without DB
SKIP_BUILD_MIGRATIONS=true pnpm build
```

### CLI-Migrationstool

Das `scripts/cli-migrate.ts` bietet ein ausführliches Migrationstool für manuelle Operationen:

```bash
# Run against DATABASE_URL from .env.local
pnpm db:migrate:cli

# Run against a specific database
DATABASE_URL=postgres://... tsx scripts/cli-migrate.ts
```

Es führt drei Schritte aus:
1. Aktuellen Migrationsstatus prüfen (angewendete Migrationen auflisten)
2. Ausstehende Migrationen ausführen
3. Schema-Integrität prüfen (auf erforderliche Spalten prüfen)

## Datenbankinitialisierung

### Automatische Initialisierung beim Start

Die Datei `instrumentation.ts` löst `initializeDatabase()` bei jedem Anwendungsstart aus:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

### Initialisierungssequenz

`lib/db/initialize.ts` führt diese Schritte aus:

1. **Überspringen, wenn keine DATABASE_URL** – die Datenbank ist für den Nur-Inhalt-Modus optional
2. **Migrationen ausführen** – Drizzle handhabt Idempotenz (nur neue Migrationen werden ausgeführt)
3. **Seed-Status prüfen** – `seed_status`-Tabelle abfragen
4. **Advisory Lock erwerben** – verhindert Race Conditions in Multi-Instanz-Deployments
5. **Seed ausführen** – Rollen, Berechtigungen, Admin-Benutzer befüllen
6. **Lock freigeben** – wird immer freigegeben, auch bei Fehler

```typescript
// Advisory lock prevents concurrent seeding
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

### Seed-Status-Verfolgung

Die `seedStatus`-Tabelle verwendet ein Singleton-Muster:

| Status | Bedeutung |
|--------|---------|
| `seeding` | Seed-Operation läuft gerade |
| `completed` | Datenbank wurde erfolgreich geseedet |
| `failed` | Seed-Operation fehlgeschlagen (wird wiederholt) |

Fehlgeschlagene Seeds werden beim nächsten Start automatisch bereinigt. Veraltete `seeding`-Datensätze (älter als 5 Minuten) werden ebenfalls bereinigt.

## Seeding

### Manuelles Seeding

```bash
# Seed the database with initial data
pnpm db:seed
```

Das Seed-Skript in `lib/db/seed.ts`:

1. Prüft, ob `DATABASE_URL` gesetzt ist
2. Prüft Tabellenexistenz vor dem Einfügen
3. Seeded Rollen (super-admin, admin, editor, user, viewer)
4. Seeded Berechtigungen (items, categories, tags, roles, users, analytics, system)
5. Erstellt Rollen-Berechtigungs-Zuordnungen
6. Erstellt einen Admin-Benutzer (aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` oder automatisch generiert)

### Admin-Anmeldedaten

In der Produktion explizite Admin-Anmeldedaten setzen:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

Wenn nicht gesetzt, generiert das Seed-Skript automatisch Anmeldedaten und schreibt sie in die Konsole.

## Überwachung

### Drizzle Studio

Datenbank mit grafischer Oberfläche durchsuchen:

```bash
pnpm db:studio
```

Öffnet unter `https://local.drizzle.studio` mit Tabellenbrowsing, Abfrageausführung und Beziehungsvisualisierung.

### Verbindungsintegrität

| Szenario | Verhalten |
|----------|----------|
| Serverstart | Keine Verbindung bis zur ersten Abfrage (Lazy Init) |
| Verbindungsabbruch | Automatische Wiederverbindung bei der nächsten Abfrage |
| Pool erschöpft | Anfragen werden in die Warteschlange gestellt |
| Idle-Timeout | Verbindungen nach 20 Sekunden freigegeben |
| HMR-Reload | Vorhandenen Pool über `globalThis` wiederverwenden |

### Datenbank-Healthcheck

Der `/api/health`-Endpunkt kann die Datenbankkonnektivität überprüfen. Für Uptime-Monitoring verwenden:

```bash
curl -s https://yourdomain.com/api/health
```

## Verwandte Dateien

| Datei | Zweck |
|------|---------|
| `drizzle.config.ts` | Drizzle-Kit-Konfiguration |
| `lib/db/config.ts` | Script-sichere Umgebungshilfen |
| `lib/db/drizzle.ts` | Verbindungspool und Singleton |
| `lib/db/schema.ts` | Vollständige Schema-Definitionen |
| `lib/db/migrate.ts` | Idempotenter Migrations-Runner |
| `lib/db/initialize.ts` | Auto-Migration, Seeding, Lock-Management |
| `lib/db/seed.ts` | Datenbank-Seeding-Logik |
| `scripts/build-migrate.ts` | Build-Zeit-Migrations-Runner |
| `scripts/cli-migrate.ts` | Manuelles Migrations-CLI |
| `scripts/cli-seed.ts` | Manuelles Seed-CLI |
| `scripts/clean-database.js` | Datenbank-Reset-Dienstprogramm |
