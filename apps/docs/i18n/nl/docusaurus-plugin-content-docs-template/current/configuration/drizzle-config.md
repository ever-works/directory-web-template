---
id: drizzle-config
title: Drizzle ORM Configuratie
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Drizzle ORM Configuratie

Deze pagina documenteert de Drizzle ORM configuratie die het template gebruikt voor databaseschema-beheer, migraties en type-veilige query-opbouw. De configuratie bevindt zich in `drizzle.config.ts` in de projectroot.

## Overzicht

Het template gebruikt [Drizzle ORM](https://orm.drizzle.team/) met PostgreSQL als databasedialect. Drizzle biedt type-veilige databasetoegang, automatische migratiegeneratie en een visuele studio voor het inspecteren van uw database.

## Configuratiebestand

De volledige configuratie is gedefinieerd in `drizzle.config.ts`:

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

## Configuratie-eigenschappen

### `schema`

- **Waarde:** `"./lib/db/schema.ts"`
- **Doel:** Verwijst naar het bestand dat alle Drizzle-tabeldefinities bevat. Hier bevinden uw `pgTable`-declaraties zich.

Het schemabestand op `lib/db/schema.ts` definieert tabellen met Drizzle's PostgreSQL-kolombuilders:

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
  // ...extra kolommen
});
```

### `out`

- **Waarde:** `"./lib/db/migrations"`
- **Doel:** Map waar gegenereerde SQL-migratiebestanden worden opgeslagen. Elke keer dat u `drizzle-kit generate` uitvoert, verschijnen hier nieuwe migratiebestanden.

### `dialect`

- **Waarde:** `"postgresql"`
- **Doel:** Geeft de database-engine aan. Het template richt zich op PostgreSQL voor productie-implementaties.

### `dbCredentials`

- **Waarde:** `{ url: databaseUrl }`
- **Doel:** Verbindingsstring voor de database. Gelezen van de omgevingsvariabele `DATABASE_URL`.

## Laden van omgevingsvariabelen

De configuratie laadt omgevingsvariabelen uit twee bestanden, in volgorde:

1. `.env` -- Basis-omgevingsvariabelen
2. `.env.local` -- Lokale overschrijvingen (hebben prioriteit)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Met deze dubbele laadbenadering kunt u gedeelde standaardwaarden bewaren in `.env` terwijl u database-URL's en secrets lokaal overschrijft.

## Reservedatabase-URL

De configuratie bevat een reserve dummy-URL:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Dit reserve bestaat omdat de database optioneel is voor dit project. Het maakt het mogelijk dat Drizzle Kit-commando's zoals `generate` ook werken wanneer er geen echte database beschikbaar is — handig tijdens CI/CD of de initiële projectinstallatie.

## Veelgebruikte commando's

Het template definieert verschillende databasegerelateerde scripts in `package.json`:

| Commando | Beschrijving |
|----------|--------------|
| `pnpm db:generate` | Migratiebestanden genereren uit schemawijzigingen |
| `pnpm db:migrate` | Openstaande migraties toepassen op de database |
| `pnpm db:seed` | De database vullen met begingegevens |
| `pnpm db:studio` | Drizzle Studio openen voor visueel databasebeheer |

### Migraties genereren

Na het wijzigen van het schema op `lib/db/schema.ts`, genereert u een nieuwe migratie:

```bash
pnpm db:generate
```

Dit maakt een nieuw SQL-migratiebestand aan in `lib/db/migrations/` met de DDL-instructies om de database te synchroniseren met uw schema.

### Migraties uitvoeren

Alle openstaande migraties toepassen:

```bash
pnpm db:migrate
```

### Automatische migratie bij opstarten

Het template ondersteunt ook automatische migraties bij het opstarten van de applicatie via het instrumentatiebestand. Dit dient als reserve voor preview-implementaties:

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

Voor productiebuilds op Vercel is migratie tijdens bouwtijd via `scripts/build-migrate.ts` de voorkeursbenadering.

## DATABASE_URL instellen

### Lokale ontwikkeling (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Productie

Stel `DATABASE_URL` in uw Vercel-projectomgevingsvariabelen in, doorgaans verwijzend naar een beheerde PostgreSQL-instantie (Neon, Supabase, Railway, enz.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Typeveiligheid

Omdat Drizzle TypeScript-types direct genereert vanuit uw schema, zijn alle queries volledig type-gecontroleerd tijdens het compileren. Er is geen aparte code-generatiestap vereist -- het schemabestand zelf is de enige bron van waarheid voor zowel databasestructuur als TypeScript-types.

## Verwante bronnen

- [Omgevingsreferentie](/template/configuration/environment-reference) -- Volledige lijst van omgevingsvariabelen inclusief `DATABASE_URL`
- [Database gezondheidscontrole](/template/guides/database-health-check) -- Databaseconnectiviteit bewaken
- [Instrumentatiegids](/template/guides/instrumentation) -- Automatische database-initialisatie bij opstarten
