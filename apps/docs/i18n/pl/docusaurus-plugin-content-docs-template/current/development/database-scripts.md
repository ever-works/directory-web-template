---
id: database-scripts
title: "Skrypty Bazy Danych"
sidebar_label: "Skrypty BD"
sidebar_position: 10
---

# Skrypty Bazy Danych

Szablon zawiera zestaw skryptów do zarządzania bazą danych dla migracji, seedowania i konserwacji. Skrypty te używają Drizzle ORM i są zaprojektowane do pracy w lokalnym środowisku deweloperskim, potokach CI/CD i wdrożeniach produkcyjnych na Vercel.

## Inwentarz Skryptów

| Skrypt | Polecenie | Cel |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Uruchamiacz migracji podczas budowania |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Ręczna interaktywna migracja |
| `cli-seed.ts` | `pnpm db:seed` | Punkt wejścia CLI do seedowania |
| `seed.ts` | Bezpośrednie wykonanie | Pełny seeder bazy danych |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Konfiguracja katalogu produktów Stripe |
| `clean-database.js` | `node scripts/clean-database.js` | Reset nuklearny (usuwa wszystko) |

## Skrypty Migracji

### Migracja podczas Budowania (build-migrate.ts)

Uruchamia się automatycznie podczas `pnpm build` na wdrożeniach Vercel. Zaprojektowany do aktualizacji schematu bez przestojów.

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

**Zachowanie w zależności od Środowiska:**

| Środowisko | Błąd migracji | Błąd połączenia | Błąd uwierzytelniania |
|---|---|---|---|
| Produkcja (`VERCEL_ENV=production`) | Build się nie powiedzie | Build się nie powiedzie | Build się nie powiedzie |
| Preview (`VERCEL_ENV=preview`) | Build się nie powiedzie | Build przechodzi (ostrzeżenie) | Build się nie powiedzie |
| CI (GitHub Actions) | Pominięte całkowicie | Pominięte całkowicie | Pominięte całkowicie |
| Lokalne środowisko deweloperskie | Build się nie powiedzie | Build się nie powiedzie | Build się nie powiedzie |

**Weryfikacja Schematu:**

Po udanej migracji skrypt weryfikuje istnienie krytycznych kolumn:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### Ręczne CLI Migracji (cli-migrate.ts)

Interaktywne narzędzie do migracji do ręcznego wykonywania przeciwko dowolnej bazie danych.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Proces Trzystopniowy:**

1. **Sprawdź Aktualny Stan** -- Odpytuje tabelę `drizzle.__drizzle_migrations` dla historii zastosowanych migracji
2. **Uruchom Migracje** -- Wywołuje `runMigrations()` z `lib/db/migrate.ts`
3. **Zweryfikuj Schemat** -- Potwierdza istnienie wymaganych kolumn

## Skrypty Seedowania

### Seeder Bazy Danych (seed.ts)

Wypełnia bazę danych realistycznymi danymi testowymi. Seeduje tylko jeśli tabele są puste.

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Kolejność Seedowania i Zależności:**

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

**Generowane Dane:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

### Punkt Wejścia CLI Seed (cli-seed.ts)

Skrypt-wrapper, który ładuje zmienne środowiskowe i deleguje do `lib/db/seed.ts`.

Skrypt szuka plików środowiskowych w tej kolejności:
1. `.env.local` (preferowany)
2. `.env` (zapasowy)
3. Tylko systemowe zmienne środowiskowe (jeśli żaden plik nie istnieje)

### Seeder Produktów Stripe (seed-stripe-products.ts)

Tworzy kompletny katalog produktów Stripe z planami subskrypcji i pozycjami jednorazowego zakupu.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Wymagane:** `STRIPE_SECRET_KEY` w `.env.local`

**Produkty i Ceny:**

| Produkt | Klucz planu | Typ ceny | Metadane |
|---|---|---|---|
| Free | `free` | Subskrypcja ($0/mies.) | `type: subscription` |
| Standard | `standard` | $10/mies., $96/rok | `annualDiscount: 20` |
| Premium | `premium` | $20/mies., $180/rok | `annualDiscount: 25` |
| Reklama sponsorowana - tygodniowa | `sponsor_weekly` | $100 jednorazowo | `type: sponsor_ad` |
| Reklama sponsorowana - miesięczna | `sponsor_monthly` | $300 jednorazowo | `type: sponsor_ad` |

## Czyszczenie Bazy Danych

### clean-database.js

Usuwa wszystkie tabele i schemat śledzenia migracji Drizzle. Zapewnia całkowity reset bazy danych.

```bash
node scripts/clean-database.js
```

**Wykonywane operacje:**

1. Usuwa wszystkie tabele w schemacie `public` używając `CASCADE`
2. Usuwa schemat `drizzle` (historia migracji)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**Ostrzeżenie:** Ta operacja jest nieodwracalna. Zawsze twórz kopię zapasową przed uruchomieniem w środowisku z prawdziwymi danymi.

## Typowe Przepływy Pracy

### Świeże Konfigurowanie Deweloperskie

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### Reset i Ponowne Seedowanie

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

## Zmienne Środowiskowe

| Zmienna | Wymagana przez | Cel |
|---|---|---|
| `DATABASE_URL` | Wszystkie skrypty | Ciąg połączenia PostgreSQL |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Ustaw `true`, aby pominąć migracje budowania |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Klucz API Stripe do tworzenia produktów |
| `SEED_ADMIN_EMAIL` | seed.ts (via lib) | Email konta administratora |
| `SEED_ADMIN_PASSWORD` | seed.ts (via lib) | Hasło konta administratora |

## Obsługa Błędów

Wszystkie skrypty bazy danych przestrzegają tych konwencji:

- Kod wyjścia `0` dla sukcesu lub akceptowalnych warunków pominięcia
- Kod wyjścia `1` dla błędów, które powinny zatrzymać potok
- Ciągi połączeń są maskowane w logach (`://***:***@`)
- Szczegółowe komunikaty błędów są logowane po stronie serwera
- Błędy produkcji zawsze zatrzymują build (bez cichego połykania)
