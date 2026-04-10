---
id: database-management
title: Gestione del Database
sidebar_label: Gestione Database
sidebar_position: 4
---

# Gestione del Database

Il template Ever Works utilizza PostgreSQL con Drizzle ORM per tutte le operazioni sul database. Questa guida tratta la gestione del database in produzione, le migrazioni, il connection pooling, il monitoraggio e il sistema di seeding.

## Architettura

| Livello | File | Responsabilità |
|---------|------|----------------|
| **Configurazione** | `drizzle.config.ts` | Percorso schema, output migrazioni, dialetto |
| **Connessione** | `lib/db/drizzle.ts` | Connection pooling, istanza singleton, lazy init |
| **Config** | `lib/db/config.ts` | URL database sicuro per script e helper ambiente |
| **Schema** | `lib/db/schema.ts` | Definizioni tabelle, indici, vincoli |
| **Migrazioni** | `lib/db/migrate.ts` | Runner migrazioni idempotente |
| **Inizializzazione** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory lock |
| **Seeding** | `lib/db/seed.ts` | Dati iniziali: ruoli, permessi, utente admin |

## Gestione delle Connessioni

### Singleton con Lazy Initialization

La connessione al database viene creata al primo utilizzo e memorizzata nella cache tramite `globalThis` per sopravvivere a HMR in sviluppo. Da `lib/db/drizzle.ts`:

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

L'oggetto `db` esportato utilizza un Proxy JavaScript per una lazy initialization trasparente:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Ciò significa che nessuna connessione al database viene stabilita fino alla prima query effettiva. Le route che non utilizzano il database non hanno overhead di connessione.

### Configurazione del Connection Pool

| Impostazione | Predefinito Produzione | Predefinito Sviluppo | Descrizione |
|-------------|----------------------|---------------------|-------------|
| `max` | 20 | 10 | Massimo connessioni nel pool |
| `idle_timeout` | 20 s | 20 s | Chiudi connessioni inattive dopo questo tempo |
| `connect_timeout` | 30 s | 30 s | Timeout per nuovi tentativi di connessione |
| `prepare` | false | false | Disabilita prepared statement (compatibilità Vercel) |

Configurare la dimensione del pool tramite variabile d'ambiente:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Schema del Database

Lo schema in `lib/db/schema.ts` definisce queste tabelle principali:

### Utenti e Autenticazione

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

### Controllo degli Accessi Basato sui Ruoli

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

### Elenco Completo delle Tabelle

| Tabella | Scopo |
|---------|-------|
| `users` | Account utente |
| `accounts` | Link a provider OAuth (adattatore NextAuth) |
| `sessions` | Sessioni utente attive |
| `roles` | Definizioni ruoli con flag admin |
| `permissions` | Definizioni permessi (risorsa:azione) |
| `userRoles` | Assegnazioni utente-ruolo |
| `rolePermissions` | Assegnazioni ruolo-permesso |
| `clientProfiles` | Profili utente estesi per listing directory |
| `subscriptions` | Record abbonamenti di pagamento |
| `subscriptionHistory` | Audit trail modifiche abbonamento |
| `paymentProviders` | Configurazione pagamento multi-provider |
| `paymentAccounts` | Dettagli account specifici per provider |
| `activityLogs` | Audit trail azioni utente |
| `comments` | Commenti utente sugli elementi |
| `votes` | Voti/valutazioni utente |
| `favorites` | Preferiti/segnalibri utente |
| `notifications` | Notifiche in-app |
| `seedStatus` | Tracciamento seed (record singleton) |

## Sistema di Migrazione

### Comandi di Migrazione

| Comando | Script | Descrizione |
|---------|--------|-------------|
| `pnpm db:generate` | `drizzle-kit generate` | Genera SQL dalle modifiche allo schema |
| `pnpm db:migrate` | `drizzle-kit migrate` | Applica migrazioni in sospeso (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Applica migrazioni con logging dettagliato |
| `pnpm db:studio` | `drizzle-kit studio` | Apre la GUI di Drizzle Studio |

### File di Migrazione

Le migrazioni sono memorizzate come file SQL in `lib/db/migrations/`:

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

### Runner di Migrazione Idempotente

Il runner di migrazione in `lib/db/migrate.ts` è sicuro da chiamare ad ogni avvio dell'applicazione:

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

### Migrazioni al Momento del Build

Lo script `scripts/build-migrate.ts` viene eseguito durante `pnpm build` per garantire che lo schema sia aggiornato prima del deployment:

```bash
# Skip build-time migrations for environments without DB
SKIP_BUILD_MIGRATIONS=true pnpm build
```

## Inizializzazione del Database

### Inizializzazione Automatica all'Avvio

Il file `instrumentation.ts` attiva `initializeDatabase()` ad ogni avvio dell'applicazione:

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

### Sequenza di Inizializzazione

`lib/db/initialize.ts` esegue questi passaggi:

1. **Salta se non c'è DATABASE_URL** – il database è opzionale per la modalità solo-contenuto
2. **Esegue le migrazioni** – Drizzle gestisce l'idempotenza
3. **Controlla lo stato del seed** – interroga la tabella `seed_status`
4. **Acquisisce l'advisory lock** – previene race condition in deployment multi-istanza
5. **Esegue il seed** – popola ruoli, permessi, utente admin
6. **Rilascia il lock** – sempre rilasciato, anche in caso di errore

```typescript
// Advisory lock prevents concurrent seeding
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

## Seeding

### Seeding Manuale

```bash
# Seed the database with initial data
pnpm db:seed
```

### Credenziali Admin

In produzione, impostare credenziali admin esplicite:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Monitoraggio

### Drizzle Studio

Naviga nel database con un'interfaccia grafica:

```bash
pnpm db:studio
```

### Verifica dello Stato del Database

L'endpoint `/api/health` può verificare la connettività al database:

```bash
curl -s https://yourdomain.com/api/health
```

## File Correlati

| File | Scopo |
|------|-------|
| `drizzle.config.ts` | Configurazione Drizzle Kit |
| `lib/db/config.ts` | Helper ambiente sicuri per script |
| `lib/db/drizzle.ts` | Connection pool e singleton |
| `lib/db/schema.ts` | Definizioni complete dello schema |
| `lib/db/migrate.ts` | Runner migrazioni idempotente |
| `lib/db/initialize.ts` | Auto-migrate, seeding, gestione lock |
| `lib/db/seed.ts` | Logica di seeding del database |
| `scripts/build-migrate.ts` | Runner migrazioni al momento del build |
| `scripts/cli-migrate.ts` | CLI migrazioni manuale |
| `scripts/cli-seed.ts` | CLI seed manuale |
| `scripts/clean-database.js` | Utilità di reset database |
