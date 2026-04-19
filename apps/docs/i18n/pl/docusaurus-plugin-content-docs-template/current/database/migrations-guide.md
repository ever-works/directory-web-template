---
id: migrations-guide
title: Przewodnik po migracji
sidebar_label: Migracje
sidebar_position: 4
---

# Przewodnik po migracji

Szablon Ever Works wykorzystuje **Drizzle Kit** do migracji baz danych. Migracje to pliki SQL śledzące zmiany schematu w czasie, zapewniające spójny stan bazy danych pomiędzy środowiskami i członkami zespołu.

## Jak działają migracje

Drizzle Kit porównuje bieżącą definicję schematu (`lib/db/schema.ts`) z wcześniej wygenerowanymi migracjami i tworzy pliki migracji SQL pod kątem wszelkich różnic.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## Struktura katalogów migracji

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

Katalog `meta/` zawiera wewnętrzne metadane śledzenia Drizzle Kit. Pliki `relations.ts` i `schema.ts` w katalogu migracji są migawkami referencyjnymi i nie należy ich edytować ręcznie.

## Polecenia

### Wygeneruj migrację

Po modyfikacji `lib/db/schema.ts` wygeneruj migrację:

```bash
pnpm db:generate
```

To działa `drizzle-kit generate`, który:
1. Odczytuje bieżący schemat z `lib/db/schema.ts`
2. Porównuje go z najnowszą migawką migracji
3. Generuje nowy plik SQL w `lib/db/migrations/`
4. Aktualizuje metadane migracji w `meta/`

### Uruchom oczekujące migracje

Zastosuj wszelkie niezastosowane migracje do swojej bazy danych:

```bash
pnpm db:migrate
```

To wywołuje `lib/db/migrate.ts`, które:
1. Łączy się z bazą danych za pomocą `DATABASE_URL`
2. Sprawdza tabelę `drizzle.__drizzle_migrations` pod kątem zastosowanych migracji
3. Uruchamia wszelkie migracje, które nie zostały zastosowane
4. Aktualizuje tabelę śledzenia

### Otwórz Studio Drizzle

Uruchom wizualny edytor bazy danych:

```bash
pnpm db:studio
```

## Biegacz migracji (`lib/db/migrate.ts`)

Menedżer migracji (`runMigrations()`) jest idempotentny i można go bezpiecznie wywołać przy każdym startupie:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

Kluczowe zachowania:
- **Idempotent**: Drizzle śledzi zastosowane migracje w `drizzle.__drizzle_migrations`; już zastosowane migracje są pomijane
- **Logowanie**: raportuje ostatnio zastosowane migracje przed i po wykonaniu
- **Obsługa błędów**: Zwraca `false` w przypadku niepowodzenia ze szczegółowymi komunikatami o błędach
- **Automatyczne uruchamianie**: Wywoływane podczas uruchamiania aplikacji poprzez `lib/db/initialize.ts`

## Automatyczna migracja przy uruchomieniu

Szablon automatycznie uruchamia migrację po uruchomieniu aplikacji. Jest to wyzwalane przez `instrumentation.ts`, który wywołuje `initializeDatabase()` z `lib/db/initialize.ts`.

Przebieg uruchamiania:
1. Sprawdź, czy `DATABASE_URL` jest skonfigurowany (pomiń, jeśli nie)
2. Uruchom wszystkie oczekujące migracje
3. Sprawdź, czy baza danych została zaszczepiona
4. Jeśli nie został rozstawiony, zdobądź blokadę doradczą i uruchom rozsiew

W środowisku produkcyjnym niepowodzenia migracji powodują błąd sygnalizujący systemy monitorowania. W środowiskach programistycznych i podglądowych aplikacja kontynuuje działanie z ostrzeżeniem.

## Tworzenie nowych migracji

### Krok 1: Zmodyfikuj schemat

Edytuj `lib/db/schema.ts`, aby dodać, zmodyfikować lub usunąć definicje tabel:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### Krok 2: Wygeneruj migrację

```bash
pnpm db:generate
```

Spowoduje to utworzenie nowego pliku SQL, takiego jak `0029_some_name.sql`.

### Krok 3: Przejrzyj wygenerowany kod SQL

Zawsze przeglądaj wygenerowaną migrację przed jej zastosowaniem. Sprawdź:
- Popraw nazwy tabel i kolumn
- Właściwe typy danych i ograniczenia
- Definicje indeksów
- Relacje klucza obcego
- Wszelkie operacje destrukcyjne (DROP TABLE, DROP COLUMN)

### Krok 4: Zastosuj migrację

```bash
pnpm db:migrate
```

### Krok 5: Zaangażuj się

Zatwierdź zarówno zmianę schematu, jak i wygenerowany plik migracji:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (zaktualizowane metadane)

## Przepływ pracy zespołu

### Obsługa współbieżnych zmian schematu

Gdy wielu członków zespołu jednocześnie modyfikuje schemat:

1. Każdy programista generuje lokalnie własną migrację
2. Podczas scalania pliki migracji mogą wymagać zmiany numeracji, jeśli numery kolejne powodują konflikt
3. Drizzle Kit śledzi migracje według skrótu, a nie liczby, więc obsługiwane jest wykonywanie poza kolejnością
4. Po połączeniu uruchom `pnpm db:migrate`, aby zastosować wszystkie nowe migracje

### Względy środowiskowe

|Środowisko|Strategia migracji|
|-------------|-------------------|
|Rozwój|Automatyczne uruchamianie przy uruchomieniu; generuj i testuj lokalnie|
|Podgląd/Inscenizacja|Automatyczne uruchamianie podczas wdrażania poprzez `instrumentation.ts`|
|Produkcja|Automatyczne uruchamianie podczas wdrażania; monitorować awarie|

### Najlepsze praktyki

1. **Jeden problem na migrację**: Koncentruj migracje na pojedynczej funkcji lub zmianie
2. **Nigdy nie edytuj istniejących migracji**: Po zastosowaniu migracji w dowolnym miejscu traktuj ją jako niezmienną
3. **Przejrzyj wygenerowany kod SQL**: Zawsze sprawdzaj, co generuje Drizzle Kit przed zastosowaniem
4. **Migracje testowe**: przed wdrożeniem w środowisku produkcyjnym przeprowadzaj migracje w oparciu o testową bazę danych
5. **Uwzględnij pliki migracji podczas przeglądu kodu**: SQL migracji należy przeglądać tak samo, jak kod aplikacji
6. **Twórz kopie zapasowe przed destrukcyjnymi migracjami**: zawsze twórz kopie zapasowe przed uruchomieniem migracji, które powodują usunięcie tabel lub kolumn
