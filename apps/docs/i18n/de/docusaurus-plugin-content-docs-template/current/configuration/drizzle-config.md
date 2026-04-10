---
id: drizzle-config
title: Drizzle ORM Konfiguration
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Drizzle ORM Konfiguration

Diese Seite dokumentiert die Drizzle ORM Konfiguration, die das Template für Datenbankschema-Verwaltung, Migrationen und typsichere Query-Erstellung verwendet. Die Konfiguration befindet sich in `drizzle.config.ts` im Projektstammverzeichnis.

## Übersicht

Das Template verwendet [Drizzle ORM](https://orm.drizzle.team/) mit PostgreSQL als Datenbankdialekt. Drizzle bietet typsicheren Datenbankzugriff, automatische Migrationsgenerierung und ein visuelles Studio zur Inspektion Ihrer Datenbank.

## Konfigurationsdatei

Die vollständige Konfiguration ist in `drizzle.config.ts` definiert:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Use a dummy URL if DATABASE_URL is not set (DB is optional for this project)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Konfigurationseigenschaften

### `schema`

- **Wert:** `"./lib/db/schema.ts"`
- **Zweck:** Zeigt auf die Datei, die alle Drizzle-Tabellendefinitionen enthält. Hier befinden sich Ihre `pgTable`-Deklarationen.

Die Schemadatei unter `lib/db/schema.ts` definiert Tabellen mit Drizzles PostgreSQL-Spalten-Buildern:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...zusätzliche Spalten
});
```

### `out`

- **Wert:** `"./lib/db/migrations"`
- **Zweck:** Verzeichnis, in dem generierte SQL-Migrationsdateien gespeichert werden. Jedes Mal, wenn Sie `drizzle-kit generate` ausführen, erscheinen hier neue Migrationsdateien.

### `dialect`

- **Wert:** `"postgresql"`
- **Zweck:** Gibt die Datenbank-Engine an. Das Template zielt auf PostgreSQL für Produktionsdeployments ab.

### `dbCredentials`

- **Wert:** `{ url: databaseUrl }`
- **Zweck:** Verbindungsstring für die Datenbank. Wird aus der Umgebungsvariable `DATABASE_URL` gelesen.

## Laden von Umgebungsvariablen

Die Konfiguration lädt Umgebungsvariablen aus zwei Dateien, in dieser Reihenfolge:

1. `.env` -- Basis-Umgebungsvariablen
2. `.env.local` -- Lokale Überschreibungen (haben Vorrang)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Dieser doppelte Ladeansatz ermöglicht es Ihnen, gemeinsame Standardwerte in `.env` zu behalten und Datenbank-URLs und Secrets lokal zu überschreiben.

## Fallback-Datenbank-URL

Die Konfiguration enthält eine Fallback-Dummy-URL:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Dieser Fallback existiert, weil die Datenbank für dieses Projekt optional ist. Er ermöglicht es Drizzle Kit Befehlen wie `generate`, auch dann zu laufen, wenn keine echte Datenbank verfügbar ist — nützlich während CI/CD oder der anfänglichen Projekteinrichtung.

## Häufige Befehle

Das Template definiert mehrere datenbankbezogene Skripte in `package.json`:

| Befehl | Beschreibung |
|--------|--------------|
| `pnpm db:generate` | Migrationsdateien aus Schemaänderungen generieren |
| `pnpm db:migrate` | Ausstehende Migrationen auf die Datenbank anwenden |
| `pnpm db:seed` | Datenbank mit Anfangsdaten befüllen |
| `pnpm db:studio` | Drizzle Studio für visuelles Datenbankmanagement öffnen |

### Migrationen generieren

Nachdem Sie das Schema unter `lib/db/schema.ts` geändert haben, generieren Sie eine neue Migration:

```bash
pnpm db:generate
```

Dies erstellt eine neue SQL-Migrationsdatei in `lib/db/migrations/`, die die DDL-Anweisungen enthält, um die Datenbank mit Ihrem Schema zu synchronisieren.

### Migrationen ausführen

Alle ausstehenden Migrationen anwenden:

```bash
pnpm db:migrate
```

### Automatische Migration beim Start

Das Template unterstützt auch automatische Migrationen beim Anwendungsstart über die Instrumentation-Datei. Dies dient als Fallback für Preview-Deployments:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // In production, re-throw to signal critical failure
    // In development, allow app to start for debugging
  }
}
```

Für Produktions-Builds auf Vercel sind Build-Zeit-Migrationen über `scripts/build-migrate.ts` der bevorzugte Ansatz.

## DATABASE_URL einrichten

### Lokale Entwicklung (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Produktion

Setzen Sie `DATABASE_URL` in Ihren Vercel-Projekt-Umgebungsvariablen, typischerweise auf eine verwaltete PostgreSQL-Instanz zeigend (Neon, Supabase, Railway usw.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Typsicherheit

Da Drizzle TypeScript-Typen direkt aus Ihrem Schema generiert, sind alle Abfragen zur Kompilierzeit vollständig typgeprüft. Es ist kein separater Code-Generierungsschritt erforderlich -- die Schemadatei selbst ist die einzige Quelle der Wahrheit für Datenbankstruktur und TypeScript-Typen.

## Verwandte Ressourcen

- [Umgebungsreferenz](/template/configuration/environment-reference) -- Vollständige Liste der Umgebungsvariablen einschließlich `DATABASE_URL`
- [Datenbank-Health-Check](/template/guides/database-health-check) -- Überwachung der Datenbankkonnektivität
- [Instrumentation-Guide](/template/guides/instrumentation) -- Automatische Datenbankinitialisierung beim Start
