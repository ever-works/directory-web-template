---
id: database-management
title: Databasebeheer
sidebar_label: Databasebeheer
sidebar_position: 4
---

# Databasebeheer

Het Ever Works-sjabloon gebruikt PostgreSQL met Drizzle ORM voor alle databasebewerkingen. Deze handleiding behandelt beheer van productiedatabases, migraties, verbindingspooling, bewaking en het seeding-systeem.

## Architectuur

| Laag | Bestand | Verantwoordelijkheid |
|------|---------|---------------------|
| **Configuratie** | `drizzle.config.ts` | Schemapad, migratie-uitvoer, dialect |
| **Verbinding** | `lib/db/drizzle.ts` | Verbindingspooling, singleton-instantie, lazy init |
| **Config** | `lib/db/config.ts` | Scriptbestendige database-URL en omgevingshulpen |
| **Schema** | `lib/db/schema.ts` | Tabeldefinities, indexen, constraints |
| **Migraties** | `lib/db/migrate.ts` | Idempotente migratierunner |
| **Initialisatie** | `lib/db/initialize.ts` | Auto-migratie, seeding, advisorylocks |
| **Seeding** | `lib/db/seed.ts` | Initiële gegevens: rollen, rechten, beheerdergebruiker |

## Verbindingsbeheer

### Singleton met Lazy Initialization

De databaseverbinding wordt aangemaakt bij eerste gebruik en gecached via `globalThis` om HMR in ontwikkeling te overleven. Uit `lib/db/drizzle.ts`:

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

Het geëxporteerde `db`-object gebruikt een JavaScript Proxy voor transparante lazy initialization:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Dit betekent dat er geen databaseverbinding wordt gemaakt totdat de eerste query plaatsvindt. Routes die geen database gebruiken, hebben geen verbindingsoverhead.

### Verbindingspoolconfiguratie

| Instelling | Productiestandaard | Ontwikkelingsstandaard | Beschrijving |
|-----------|-------------------|----------------------|--------------|
| `max` | 20 | 10 | Maximale verbindingen in de pool |
| `idle_timeout` | 20 s | 20 s | Sluit inactieve verbindingen na dit tijdstip |
| `connect_timeout` | 30 s | 30 s | Time-out voor nieuwe verbindingspogingen |
| `prepare` | false | false | Prepared statements uitschakelen (Vercel-compatibiliteit) |

Poolgrootte configureren via omgevingsvariabele:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

De poolgrootte wordt gevalideerd en begrensd:

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

## Drizzle-configuratie

De Drizzle Kit-configuratie in `drizzle.config.ts`:

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

Opmerking: Een dummy-URL als fallback wordt gebruikt zodat `drizzle-kit generate` kan worden uitgevoerd zonder een live databaseverbinding (het leest alleen het schemabestand).

## Schemaoverzicht

Het schema in `lib/db/schema.ts` definieert deze kerntabellen:

### Gebruikers en authenticatie

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

### Rolgebaseerde toegangscontrole

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

### Volledige tabellenlijst

| Tabel | Doel |
|-------|------|
| `users` | Gebruikersaccounts |
| `accounts` | OAuth-providerkoppelingen (NextAuth-adapter) |
| `sessions` | Actieve gebruikerssessies |
| `roles` | Roldefinities met beheerdersvlag |
| `permissions` | Rechtendefinities (resource:actie) |
| `userRoles` | Gebruiker-naar-rol-toewijzingen |
| `rolePermissions` | Rol-naar-rechten-toewijzingen |
| `clientProfiles` | Uitgebreide gebruikersprofielen voor directorylijsten |
| `subscriptions` | Betalingsabonnementrecords |
| `subscriptionHistory` | Audittrail voor abonnementswijzigingen |
| `paymentProviders` | Multi-provider betalingsinstellingen |
| `paymentAccounts` | Providerspecifieke accountgegevens |
| `activityLogs` | Audittrail voor gebruikersacties |
| `comments` | Gebruikerscommentaren op items |
| `votes` | Gebruikersstemmen/beoordelingen |
| `favorites` | Gebruikersfavorieten/bladwijzers |
| `notifications` | In-app-meldingen |
| `seedStatus` | Seed-tracking (singletonrecord) |

## Migratiesysteem

### Migratieopdrachten

| Opdracht | Script | Beschrijving |
|---------|--------|-------------|
| `pnpm db:generate` | `drizzle-kit generate` | SQL genereren uit schemawijzigingen |
| `pnpm db:migrate` | `drizzle-kit migrate` | Lopende migraties toepassen (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Migraties met gedetailleerde logging toepassen |
| `pnpm db:studio` | `drizzle-kit studio` | Drizzle Studio GUI openen |

### Migratiebestanden

Migraties worden opgeslagen als SQL-bestanden in `lib/db/migrations/`:

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

Elk bestand bevat de SQL-instructies voor die migratie. Drizzle houdt toegepaste migraties bij in de tabel `drizzle.__drizzle_migrations`.

### Idempotente migratierunner

De migratierunner in `lib/db/migrate.ts` is veilig om bij elke toepassingsstart aan te roepen:

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

### Build-tijdmigraties

Het script `scripts/build-migrate.ts` wordt uitgevoerd tijdens `pnpm build` om ervoor te zorgen dat het schema vóór de implementatie up-to-date is:

- **Productiebuilds**: Migratiefouten laten de build mislukken
- **Preview-implementaties**: Verbindingsfouten worden getolereerd
- **CI-builds** (niet-Vercel): Migraties worden overgeslagen
- **Schemaverificatie**: Controleert of kritieke kolommen na de migratie bestaan

```bash
# Skip build-time migrations for environments without DB
SKIP_BUILD_MIGRATIONS=true pnpm build
```

### CLI-migratietool

Het `scripts/cli-migrate.ts` biedt een uitgebreid migratietool voor handmatige bewerkingen:

```bash
# Run against DATABASE_URL from .env.local
pnpm db:migrate:cli

# Run against a specific database
DATABASE_URL=postgres://... tsx scripts/cli-migrate.ts
```

Het voert drie stappen uit:
1. Huidige migratiestatus controleren (toegepaste migraties weergeven)
2. Lopende migraties uitvoeren
3. Schema-integriteit verifiëren (controleren op vereiste kolommen)

## Database-initialisatie

### Automatische initialisatie bij start

Het bestand `instrumentation.ts` activeert `initializeDatabase()` bij elke toepassingsstart:

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

### Initialisatiereeks

`lib/db/initialize.ts` voert deze stappen uit:

1. **Overslaan als geen DATABASE_URL** – de database is optioneel voor alleen-inhoud-modus
2. **Migraties uitvoeren** – Drizzle handelt idempotentie af (alleen nieuwe migraties worden uitgevoerd)
3. **Seed-status controleren** – `seed_status`-tabel opvragen
4. **Advisory lock verkrijgen** – voorkomt race conditions in multi-instantie-implementaties
5. **Seed uitvoeren** – rollen, rechten, beheerdergebruiker invullen
6. **Lock vrijgeven** – altijd vrijgegeven, zelfs bij fouten

```typescript
// Advisory lock prevents concurrent seeding
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

### Seed-statustracking

De `seedStatus`-tabel gebruikt een singletonpatroon:

| Status | Betekenis |
|--------|-----------|
| `seeding` | Seed-bewerking is momenteel actief |
| `completed` | Database is succesvol geseed |
| `failed` | Seed-bewerking mislukt (wordt opnieuw geprobeerd) |

Mislukte seeds worden automatisch opgeschoond bij de volgende start. Verouderde `seeding`-records (ouder dan 5 minuten) worden ook opgeschoond.

## Seeding

### Handmatige seeding

```bash
# Seed the database with initial data
pnpm db:seed
```

Het seed-script in `lib/db/seed.ts`:

1. Controleert of `DATABASE_URL` is ingesteld
2. Controleert tabelbestaan vóór invoeging
3. Seeded rollen (super-admin, admin, editor, user, viewer)
4. Seeded rechten (items, categories, tags, roles, users, analytics, system)
5. Maakt rol-rechten-toewijzingen aan
6. Maakt een beheerdergebruiker aan (uit `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` of automatisch gegenereerd)

### Beheerdersreferenties

Stel in productie expliciete beheerdersreferenties in:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

Als dit niet is ingesteld, genereert het seed-script automatisch referenties en logt deze naar de console.

## Bewaking

### Drizzle Studio

Blader door de database met een grafische interface:

```bash
pnpm db:studio
```

Opent op `https://local.drizzle.studio` met tabelbrowsing, queryuitvoering en relatievisualisatie.

### Verbindingsgezondheid

| Scenario | Gedrag |
|----------|--------|
| Serverstart | Geen verbinding totdat de eerste query plaatsvindt (lazy init) |
| Verbindingsonderbreking | Automatische herverbinding bij de volgende query |
| Pool uitgeput | Verzoeken worden in de wachtrij geplaatst |
| Idle-time-out | Verbindingen vrijgegeven na 20 seconden |
| HMR-reload | Bestaande pool hergebruiken via `globalThis` |

### Database-gezondheidscontrole

Het `/api/health`-eindpunt kan de databaseconnectiviteit verifiëren. Gebruik het voor uptime-bewaking:

```bash
curl -s https://yourdomain.com/api/health
```

## Gerelateerde bestanden

| Bestand | Doel |
|---------|------|
| `drizzle.config.ts` | Drizzle Kit-configuratie |
| `lib/db/config.ts` | Scriptbestendige omgevingshulpen |
| `lib/db/drizzle.ts` | Verbindingspool en singleton |
| `lib/db/schema.ts` | Volledige schemadefinities |
| `lib/db/migrate.ts` | Idempotente migratierunner |
| `lib/db/initialize.ts` | Auto-migratie, seeding, lockbeheer |
| `lib/db/seed.ts` | Database-seedinglogica |
| `scripts/build-migrate.ts` | Build-tijdmigratierunner |
| `scripts/cli-migrate.ts` | Handmatige migratie-CLI |
| `scripts/cli-seed.ts` | Handmatige seed-CLI |
| `scripts/clean-database.js` | Database-reset-hulpprogramma |
