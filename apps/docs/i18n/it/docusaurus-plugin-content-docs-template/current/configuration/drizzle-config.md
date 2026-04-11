---
id: drizzle-config
title: Configurazione Drizzle ORM
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Configurazione Drizzle ORM

Questa pagina documenta la configurazione Drizzle ORM utilizzata dal template per la gestione degli schemi del database, le migrazioni e la creazione di query type-safe. La configurazione si trova in `drizzle.config.ts` nella radice del progetto.

## Panoramica

Il template utilizza [Drizzle ORM](https://orm.drizzle.team/) con PostgreSQL come dialetto del database. Drizzle fornisce accesso al database type-safe, generazione automatica delle migrazioni e uno studio visuale per ispezionare il database.

## File di configurazione

La configurazione completa è definita in `drizzle.config.ts`:

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

## Proprietà di configurazione

### `schema`

- **Valore:** `"./lib/db/schema.ts"`
- **Scopo:** Punta al file contenente tutte le definizioni delle tabelle Drizzle. Qui si trovano le dichiarazioni `pgTable`.

Il file di schema in `lib/db/schema.ts` definisce le tabelle usando i builder di colonne PostgreSQL di Drizzle:

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
  // ...colonne aggiuntive
});
```

### `out`

- **Valore:** `"./lib/db/migrations"`
- **Scopo:** Directory dove vengono archiviati i file di migrazione SQL generati. Ogni volta che si esegue `drizzle-kit generate`, qui appaiono nuovi file di migrazione.

### `dialect`

- **Valore:** `"postgresql"`
- **Scopo:** Specifica il motore di database. Il template punta a PostgreSQL per i deployment in produzione.

### `dbCredentials`

- **Valore:** `{ url: databaseUrl }`
- **Scopo:** Stringa di connessione per il database. Letta dalla variabile d'ambiente `DATABASE_URL`.

## Caricamento delle variabili d'ambiente

La configurazione carica le variabili d'ambiente da due file, in ordine:

1. `.env` -- Variabili d'ambiente di base
2. `.env.local` -- Override locali (hanno la priorità)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

Questo approccio a doppio caricamento permette di mantenere i valori predefiniti condivisi in `.env` mentre si sovrascrivono URL del database e segreti localmente.

## URL del database di fallback

La configurazione include un URL dummy di fallback:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Questo fallback esiste perché il database è opzionale per questo progetto. Permette ai comandi Drizzle Kit come `generate` di funzionare anche quando non è disponibile un database reale — utile durante CI/CD o la configurazione iniziale del progetto.

## Comandi comuni

Il template definisce diversi script relativi al database in `package.json`:

| Comando | Descrizione |
|---------|-------------|
| `pnpm db:generate` | Genera file di migrazione dalle modifiche allo schema |
| `pnpm db:migrate` | Applica le migrazioni in sospeso al database |
| `pnpm db:seed` | Popola il database con dati iniziali |
| `pnpm db:studio` | Apre Drizzle Studio per la gestione visuale del database |

### Generare migrazioni

Dopo aver modificato lo schema in `lib/db/schema.ts`, genera una nuova migrazione:

```bash
pnpm db:generate
```

Questo crea un nuovo file di migrazione SQL in `lib/db/migrations/` contenente le istruzioni DDL necessarie per sincronizzare il database con il tuo schema.

### Eseguire le migrazioni

Applica tutte le migrazioni in sospeso:

```bash
pnpm db:migrate
```

### Migrazione automatica all'avvio

Il template supporta anche la migrazione automatica durante l'avvio dell'applicazione tramite il file di strumentazione. Questo funge da fallback per i deployment di anteprima:

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

Per le build di produzione su Vercel, le migrazioni al momento della build tramite `scripts/build-migrate.ts` sono l'approccio preferito.

## Configurazione di DATABASE_URL

### Sviluppo locale (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Produzione

Imposta `DATABASE_URL` nelle variabili d'ambiente del tuo progetto Vercel, puntando tipicamente a un'istanza PostgreSQL gestita (Neon, Supabase, Railway, ecc.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Sicurezza dei tipi

Poiché Drizzle genera i tipi TypeScript direttamente dallo schema, tutte le query sono completamente controllate dal tipo al momento della compilazione. Non è richiesto alcun passaggio separato di generazione del codice -- il file di schema stesso è l'unica fonte di verità sia per la struttura del database che per i tipi TypeScript.

## Risorse correlate

- [Riferimento ambiente](/template/configuration/environment-reference) -- Elenco completo delle variabili d'ambiente incluso `DATABASE_URL`
- [Controllo integrità database](/template/guides/database-health-check) -- Monitoraggio della connettività del database
- [Guida alla strumentazione](/template/guides/instrumentation) -- Inizializzazione automatica del database all'avvio
