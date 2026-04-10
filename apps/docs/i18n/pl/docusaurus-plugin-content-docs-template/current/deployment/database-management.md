---
id: database-management
title: Zarządzanie Bazą Danych
sidebar_label: Zarządzanie Bazą Danych
sidebar_position: 4
---

# Zarządzanie Bazą Danych

Szablon Ever Works używa PostgreSQL z Drizzle ORM do wszystkich operacji bazodanowych. Ten przewodnik obejmuje zarządzanie bazą danych w produkcji, migracje, pulę połączeń, monitorowanie i system seedingu.

## Architektura

| Warstwa | Plik | Odpowiedzialność |
|---------|------|-----------------|
| **Konfiguracja** | `drizzle.config.ts` | Ścieżka schematu, wyjście migracji, dialekt |
| **Połączenie** | `lib/db/drizzle.ts` | Pula połączeń, instancja singleton, lazy init |
| **Konfiguracja** | `lib/db/config.ts` | Bezpieczny URL bazy danych dla skryptów i pomocniki środowiskowe |
| **Schemat** | `lib/db/schema.ts` | Definicje tabel, indeksy, ograniczenia |
| **Migracje** | `lib/db/migrate.ts` | Idempotentny runner migracji |
| **Inicjalizacja** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Seeding** | `lib/db/seed.ts` | Dane inicjalne: role, uprawnienia, użytkownik admin |

## Zarządzanie Połączeniami

### Singleton z Lazy Initialization

Połączenie z bazą danych jest tworzone przy pierwszym użyciu i buforowane przez `globalThis`, aby przeżyć HMR w trybie deweloperskim. Z `lib/db/drizzle.ts`:

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

Eksportowany obiekt `db` używa JavaScript Proxy do transparentnej lazy initialization:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

Oznacza to, że żadne połączenie z bazą danych nie jest nawiązywane do czasu pierwszego zapytania. Trasy które nie używają bazy danych nie mają narzutu połączenia.

### Konfiguracja Puli Połączeń

| Ustawienie | Domyślne Produkcja | Domyślne Rozwój | Opis |
|-----------|-------------------|----------------|------|
| `max` | 20 | 10 | Maksymalna liczba połączeń w puli |
| `idle_timeout` | 20 s | 20 s | Zamknij bezczynne połączenia po tym czasie |
| `connect_timeout` | 30 s | 30 s | Limit czasu dla nowych prób połączenia |
| `prepare` | false | false | Wyłącz prepared statements (kompatybilność z Vercel) |

Skonfiguruj rozmiar puli przez zmienną środowiskową:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

## Przegląd Schematu

Schemat w `lib/db/schema.ts` definiuje te główne tabele:

### Użytkownicy i Uwierzytelnianie

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

### Kontrola Dostępu Oparta na Rolach

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

### Pełna Lista Tabel

| Tabela | Cel |
|--------|-----|
| `users` | Konta użytkowników |
| `accounts` | Powiązania z dostawcami OAuth (adapter NextAuth) |
| `sessions` | Aktywne sesje użytkowników |
| `roles` | Definicje ról z flagą admina |
| `permissions` | Definicje uprawnień (zasób:akcja) |
| `userRoles` | Przypisania użytkownik-rola |
| `rolePermissions` | Przypisania rola-uprawnienie |
| `clientProfiles` | Rozszerzone profile użytkowników dla katalogów |
| `subscriptions` | Rekordy subskrypcji płatności |
| `subscriptionHistory` | Ścieżka audytu zmian subskrypcji |
| `paymentProviders` | Konfiguracja płatności wielu dostawców |
| `paymentAccounts` | Szczegóły konta specyficzne dla dostawcy |
| `activityLogs` | Ścieżka audytu działań użytkownika |
| `comments` | Komentarze użytkowników do elementów |
| `votes` | Głosy/oceny użytkowników |
| `favorites` | Ulubione/zakładki użytkownika |
| `notifications` | Powiadomienia w aplikacji |
| `seedStatus` | Śledzenie seedingu (rekord singleton) |

## System Migracji

### Komendy Migracji

| Komenda | Skrypt | Opis |
|---------|--------|------|
| `pnpm db:generate` | `drizzle-kit generate` | Generuje SQL ze zmian schematu |
| `pnpm db:migrate` | `drizzle-kit migrate` | Stosuje oczekujące migracje (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Stosuje migracje ze szczegółowym logowaniem |
| `pnpm db:studio` | `drizzle-kit studio` | Otwiera GUI Drizzle Studio |

### Idempotentny Runner Migracji

Runner migracji w `lib/db/migrate.ts` jest bezpieczny do wywołania przy każdym uruchomieniu aplikacji:

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

## Inicjalizacja Bazy Danych

### Automatyczna Inicjalizacja przy Starcie

Plik `instrumentation.ts` wyzwala `initializeDatabase()` przy każdym uruchomieniu aplikacji:

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

## Seeding

### Ręczny Seeding

```bash
# Seed the database with initial data
pnpm db:seed
```

### Dane Logowania Administratora

W produkcji ustaw explicite dane logowania administratora:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

## Monitorowanie

### Drizzle Studio

Przeglądaj bazę danych za pomocą interfejsu graficznego:

```bash
pnpm db:studio
```

### Sprawdzanie Stanu Bazy Danych

Endpoint `/api/health` może sprawdzić połączenie z bazą danych:

```bash
curl -s https://yourdomain.com/api/health
```

## Powiązane Pliki

| Plik | Cel |
|------|-----|
| `drizzle.config.ts` | Konfiguracja Drizzle Kit |
| `lib/db/config.ts` | Bezpieczne pomocniki środowiskowe dla skryptów |
| `lib/db/drizzle.ts` | Pula połączeń i singleton |
| `lib/db/schema.ts` | Pełne definicje schematu |
| `lib/db/migrate.ts` | Idempotentny runner migracji |
| `lib/db/initialize.ts` | Auto-migrate, seeding, zarządzanie lockami |
| `lib/db/seed.ts` | Logika seedingu bazy danych |
| `scripts/build-migrate.ts` | Runner migracji podczas budowania |
| `scripts/cli-migrate.ts` | Ręczne CLI migracji |
| `scripts/cli-seed.ts` | Ręczne CLI seedingu |
| `scripts/clean-database.js` | Narzędzie do resetowania bazy danych |
