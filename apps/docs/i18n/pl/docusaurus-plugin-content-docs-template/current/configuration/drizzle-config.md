---
id: drizzle-config
title: Konfiguracja Drizzle ORM
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Konfiguracja Drizzle ORM

Ta strona dokumentuje konfigurację Drizzle ORM używaną przez szablon do zarządzania schematem bazy danych, migracjami i budowaniem zapytań z bezpieczeństwem typów. Konfiguracja znajduje się w `drizzle.config.ts` w katalogu głównym projektu.

## Przegląd

Szablon używa [Drizzle ORM](https://orm.drizzle.team/) z PostgreSQL jako dialektem bazy danych. Drizzle zapewnia dostęp do bazy danych z bezpieczeństwem typów, automatyczne generowanie migracji i wizualne studio do inspekcji bazy danych.

## Plik konfiguracyjny

Pełna konfiguracja jest zdefiniowana w `drizzle.config.ts`:

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

## Właściwości konfiguracji

### `schema`

- **Wartość:** `"./lib/db/schema.ts"`
- **Cel:** Wskazuje plik zawierający wszystkie definicje tabel Drizzle. Tu znajdują się Twoje deklaracje `pgTable`.

Plik schematu w `lib/db/schema.ts` definiuje tabele używając builderów kolumn PostgreSQL Drizzle:

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
  // ...dodatkowe kolumny
});
```

### `out`

- **Wartość:** `"./lib/db/migrations"`
- **Cel:** Katalog, w którym przechowywane są wygenerowane pliki migracji SQL. Za każdym razem gdy uruchamiasz `drizzle-kit generate`, pojawiają się tu nowe pliki migracji.

### `dialect`

- **Wartość:** `"postgresql"`
- **Cel:** Określa silnik bazy danych. Szablon celuje w PostgreSQL dla wdrożeń produkcyjnych.

### `dbCredentials`

- **Wartość:** `{ url: databaseUrl }`
- **Cel:** Ciąg połączenia do bazy danych. Odczytywany ze zmiennej środowiskowej `DATABASE_URL`.

## Ładowanie zmiennych środowiskowych

Konfiguracja ładuje zmienne środowiskowe z dwóch plików, w kolejności:

1. `.env` -- Podstawowe zmienne środowiskowe
2. `.env.local` -- Lokalne nadpisania (mają pierwszeństwo)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

To podejście podwójnego ładowania pozwala zachować wspólne wartości domyślne w `.env`, jednocześnie nadpisując URL-e baz danych i sekrety lokalnie.

## Zapasowy URL bazy danych

Konfiguracja zawiera zapasowy fikcyjny URL:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

Ten zapasowy URL istnieje, ponieważ baza danych jest opcjonalna dla tego projektu. Pozwala poleceniom Drizzle Kit, takim jak `generate`, działać nawet gdy nie ma dostępnej prawdziwej bazy danych — przydatne podczas CI/CD lub początkowej konfiguracji projektu.

## Popularne polecenia

Szablon definiuje kilka skryptów związanych z bazą danych w `package.json`:

| Polecenie | Opis |
|-----------|------|
| `pnpm db:generate` | Generuj pliki migracji ze zmian schematu |
| `pnpm db:migrate` | Zastosuj oczekujące migracje do bazy danych |
| `pnpm db:seed` | Wypełnij bazę danych danymi początkowymi |
| `pnpm db:studio` | Otwórz Drizzle Studio do wizualnego zarządzania bazą danych |

### Generowanie migracji

Po zmodyfikowaniu schematu w `lib/db/schema.ts`, wygeneruj nową migrację:

```bash
pnpm db:generate
```

To tworzy nowy plik migracji SQL w `lib/db/migrations/` zawierający instrukcje DDL potrzebne do synchronizacji bazy danych ze schematem.

### Uruchamianie migracji

Zastosuj wszystkie oczekujące migracje:

```bash
pnpm db:migrate
```

### Automatyczna migracja przy starcie

Szablon obsługuje również automatyczne migracje podczas uruchamiania aplikacji za pomocą pliku instrumentacji. Służy to jako zapasowe rozwiązanie dla wdrożeń podglądu:

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

Dla kompilacji produkcyjnych na Vercel, migracje w czasie budowania za pomocą `scripts/build-migrate.ts` są preferowanym podejściem.

## Konfiguracja DATABASE_URL

### Lokalne środowisko programistyczne (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Produkcja

Ustaw `DATABASE_URL` w zmiennych środowiskowych projektu Vercel, zazwyczaj wskazując na zarządzaną instancję PostgreSQL (Neon, Supabase, Railway itp.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Bezpieczeństwo typów

Ponieważ Drizzle generuje typy TypeScript bezpośrednio z Twojego schematu, wszystkie zapytania są w pełni sprawdzane typowo w czasie kompilacji. Nie jest wymagany żaden oddzielny krok generowania kodu -- sam plik schematu jest jedynym źródłem prawdy zarówno dla struktury bazy danych, jak i typów TypeScript.

## Powiązane zasoby

- [Dokumentacja zmiennych środowiskowych](/template/configuration/environment-reference) -- Pełna lista zmiennych środowiskowych, w tym `DATABASE_URL`
- [Sprawdzanie stanu bazy danych](/template/guides/database-health-check) -- Monitorowanie połączenia z bazą danych
- [Przewodnik po instrumentacji](/template/guides/instrumentation) -- Automatyczna inicjalizacja bazy danych przy starcie
