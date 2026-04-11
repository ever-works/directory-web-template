---
id: migration-guide
title: Przewodnik po migracji wersji
sidebar_label: Przewodnik po migracji
sidebar_position: 8
---

# Przewodnik migracji wersji

Ten przewodnik opisuje aktualizację instalacji Ever Works Template, obsługę migracji baz danych pomiędzy wersjami, zarządzanie istotnymi zmianami, pisanie i stosowanie skryptów migracji oraz procedury wycofywania zmian.

## Przegląd procesu aktualizacji

Aktualizacja szablonu przebiega według zorganizowanego procesu, który minimalizuje ryzyko:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## System migracji baz danych

### Jak działają migracje

Szablon wykorzystuje Drizzle ORM z Drizzle Kit do migracji schematów. Schemat jest zdefiniowany w `lib/db/schema.ts` , a migracje generowane są jako pliki SQL do `lib/db/migrations/` .

Konfiguracja w `drizzle.config.ts` :

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### Polecenia migracji

| Polecenie | Cel | Kiedy stosować |
|--------|---------|------------|
| `pnpm db:generate` | Generuj SQL na podstawie zmian schematu | Po modyfikacji `lib/db/schema.ts` |
| `pnpm db:migrate` | Zastosuj oczekujące migracje (Drizzle CLI) | Przed uruchomieniem aplikacji po zmianach |
| `pnpm db:migrate:cli` | Zastosuj z pełnym rejestrowaniem | Do debugowania problemów z migracją |
| `pnpm db:seed` | Wypełnij dane początkowe | Po świeżej migracji lub zmianach nasion |
| `pnpm db:studio` | Wizualna kontrola bazy danych | Do debugowania lub przeglądu danych |

### Struktura pliku migracji

Migracje są przechowywane jako ponumerowane pliki SQL:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Drizzle śledzi zastosowane migracje w `drizzle.__drizzle_migrations` :

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Generowanie nowej migracji

Po modyfikacji `lib/db/schema.ts` :

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Automatyczne migracje

Szablon automatycznie uruchamia migracje w dwóch miejscach:

**Czas kompilacji** (przez `scripts/build-migrate.ts` ):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**Czas pracy** (przez `instrumentation.ts` ):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### Bezpieczeństwo migracji przez środowisko

| Środowisko | Czas budowy | Czas wykonania | W przypadku niepowodzenia |
|------------|-----------|--------|------------|
| Produkcja | Wymagane | Powrót | Kompilacja kończy się niepowodzeniem/aplikacja rzuca |
| Podgląd | Tolerowane błędy połączenia | Aktywny | Rejestruje ostrzeżenie, aplikacja uruchamia się |
| Rozwój | Nieużywane | Aktywny | Rejestruje ostrzeżenie, aplikacja uruchamia się |
| CI (nie-Vercel) | Pominięte | Nieużywane | Nie dotyczy |

## Procedury wycofywania

### Drizzle nie obsługuje automatycznego cofania

Drizzle Kit generuje migracje tylko do przodu. Aby cofnąć migrację:

**Opcja 1: Ręczna migracja wsteczna**

1. Zidentyfikuj problematyczną migrację w `lib/db/migrations/` 2. Napisz ręcznie odwrotny kod SQL:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Aplikuj bezpośrednio do bazy:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Usuń plik migracji do przodu z `lib/db/migrations/` 5. W razie potrzeby zaktualizuj dziennik Drizzle

**Opcja 2: Przywróć z kopii zapasowej**

Najbezpieczniejsze podejście do wycofywania złożonych migracji:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Opcja 3: Przywróć schemat i wygeneruj ponownie**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Aktualizacje zależności

### Aktualizowanie zależności

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Krytyczne zależności

Pakiety te wymagają dokładnych testów podczas aktualizacji:

| Pakiet | Ryzyko | Notatki |
|--------|------|-------|
| `next` | Wysoki | Główne wersje zmieniają interfejsy API, routing, konfigurację |
| `next-auth` | Wysoki | Zmiany w API uwierzytelniania, strategia sesji |
| `drizzle-orm` / `drizzle-kit` | Wysoki | Schemat API, zmiany formatu migracji |
| `next-intl` | Średni | Zmiany w routingu i ładowaniu wiadomości |
| `@sentry/nextjs` | Średni | Kompatybilność haków do oprzyrządowania |
| `stripe` | Średni | Wersja API płatności |
| `@heroui/react` | Średni | Zmiany właściwości komponentu interfejsu użytkownika |
| `@trigger.dev/sdk` | Średni | Zmiany w API planowania zadań |

### pnpm Zastąpienia

Szablon używa przesłonięć pnpm w `package.json` , aby wymusić spójne wersje:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

Podczas aktualizacji React lub esbuild zaktualizuj te przesłonięcia, aby pasowały.

## Lista kontrolna najważniejszych zmian

Podczas aktualizacji między wersjami szablonów przejrzyj każdą kategorię:

### Zmiany schematu

- [ ] Porównaj `lib/db/schema.ts` z wcześniejszym dla nowych/zmodyfikowanych kolumn
- [ ] Generuj migracje: `pnpm db:generate` - [ ] Przejrzyj wygenerowany kod SQL pod kątem operacji destrukcyjnych (usunięcie kolumn, zmiana typu)
- [ ] Najpierw zastosuj do testowej bazy danych
- [ ] Sprawdź zgodność nasion: `pnpm db:seed` ### Zmiany tras API

- [ ] Sprawdź, czy w `app/api/` zmieniono nazwę lub usunięto trasy
- [ ] Zaktualizuj integracje zewnętrzne i adresy URL webhooków
- [ ] Sprawdź, czy ścieżki punktu końcowego cron nadal odpowiadają `vercel.json` ### Zmiany konfiguracji

- [ ] Porównaj `.env.example` dla nowych lub zmienionych nazw zmiennych
- [ ] Przejrzyj 6 zmian (nagłówki, pakiet internetowy, wtyczki)
- [ ] Sprawdź `vercel.json` , czy nie ma zmian w harmonogramie cron
- [ ] Przejrzyj `drizzle.config.ts` pod kątem zmian ścieżki

### Zmiany w uwierzytelnianiu

- [ ] Porównaj `auth.config.ts` z upstream
- [ ] Sprawdź zgodność strategii sesji
- [ ] Przetestuj adresy URL wywołania zwrotnego OAuth
- [ ] Przejrzyj definicje uprawnień w `lib/permissions/definitions.ts` ### Zmiany w interfejsie użytkownika i stylu

- [ ] Porównaj `tailwind.config.ts` , aby zobaczyć zmiany motywu
- [ ] Sprawdź wizualnie kluczowe strony
- [ ] Przetestuj układy responsywne
- [ ] Sprawdź, czy dostosowania motywu nadal obowiązują

## Proces aktualizacji krok po kroku

### 1. Przygotuj się

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Połącz upstream

Jeśli śledzisz szablon jako zdalny pilot nadrzędny:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Rozwiązuj konflikty, zwracając uwagę na:
- `lib/db/schema.ts` -- zmiany schematu
- `next.config.ts` - konfiguracja kompilacji
- `auth.config.ts` – dostawcy uwierzytelniania
- `package.json` -- wersje zależności

### 3. Zainstaluj i przeprowadź migrację

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Zweryfikuj lokalnie

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Przetestuj ścieżki krytyczne

| Powierzchnia | Co testować |
|------|------------|
| Uwierzytelnianie | Logowanie, wylogowanie, OAuth, trwałość sesji |
| Płatności | Przepływy subskrypcji, obsługa webhooka |
| Treść | Renderowanie strony, wyszukiwanie, filtrowanie |
| Administrator | Dostęp do pulpitu nawigacyjnego, egzekwowanie RBAC |
| i18n | Przełączanie ustawień regionalnych, kompletność tłumaczenia |
| Zadania w tle | Dzienniki konsoli do rejestracji zadania |

### 6. Wdróż

1. Naciśnij gałąź funkcji w celu weryfikacji CI
2. Wdróż w środowisku testowym/wersyjnym
3. Przeprowadź testy dymne na etapie testowania
4. Połącz do `main` w celu wdrożenia produkcyjnego

## Zgodność wersji

### Node.js

Wersja minimalna jest zdefiniowana w `package.json` :

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Baza danych

| Dostawca | Obsługiwane | Notatki |
|---------|-----------|-------|
| PostgreSQL 14+ | Tak | Produkcja zalecana |
| Supabaza | Tak | Z łączeniem połączeń |
| Neon | Tak | Bezserwerowy PostgreSQL |

### Platformy

| Platforma | Stan | Notatki |
|---------|--------|-------|
| Vercel | Główny cel | Pełna obsługa cron, podgląd i Edge |
| Doker | Obsługiwane | Samodzielne wyjście dla kontenerów |
| Własny hosting | Obsługiwane | Wymaga zarządzania procesami |

## Rozwiązywanie problemów z aktualizacjami

| Objaw | Prawdopodobna przyczyna | Rozwiązanie |
|--------|------------|--------|
| Budowa nie powiodła się | Niekompatybilne deps | Uruchom `pnpm outdated` , rozwiąż konflikty równorzędne |
| Błędy DB podczas uruchamiania | Niezastosowane migracje | `pnpm db:generate && pnpm db:migrate` |
| Autoryzacja zerwana | Konfiguracja dostawcy została zmieniona | Porównaj `auth.config.ts` z upstream |
| Brakujące tłumaczenia | Dodano nowe klucze | Sprawdź `messages/` pod kątem brakujących wpisów |
| Stylizacja zepsuta | Zmieniono konfigurację Tailwind | Porównaj `tailwind.config.ts` |
| Niezgodność typów | Schemat zaktualizowany | Uruchom ponownie `pnpm db:generate` |
