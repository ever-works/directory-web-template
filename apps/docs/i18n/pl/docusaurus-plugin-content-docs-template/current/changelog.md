---
id: changelog
title: Changelog & Wersjonowanie
sidebar_label: Changelog
---

# Changelog & Wersjonowanie

Ta strona wyjaśnia, jak Directory Web Template zarządza wersjonowaniem, wydaniami i ścieżkami aktualizacji.

## Wersjonowanie Semantyczne

Szablon stosuje [Semantic Versioning (SemVer)](https://semver.org/). Numery wersji używają formatu **MAJOR.MINOR.PATCH**:

| Składnik   | Kiedy inkrementować                                             |
| ---------- | --------------------------------------------------------------- |
| **MAJOR**  | Zmiany niekompatybilne wymagające kroków migracji               |
| **MINOR**  | Nowe funkcje dodane w sposób zgodny wstecznie                   |
| **PATCH**  | Zgodne wstecznie poprawki błędów i drobne ulepszenia            |

Wersje przedpremierowe mogą używać przyrostków takich jak `-alpha.1`, `-beta.2` lub `-rc.1` do wczesnych testów.

## Migracje Bazy Danych

Szablon używa **Drizzle ORM** z PostgreSQL. Zmiany schematu bazy danych są zarządzane przez Drizzle Kit:

```bash
# Generate migration files from schema changes
pnpm db:generate

# Apply migrations to the database
pnpm db:migrate

# Open Drizzle Studio for visual database management
pnpm db:studio
```

Pliki migracji są przechowywane w katalogu `lib/db/migrations/`. Każda migracja to plik SQL wygenerowany ze zmian w definicjach schematu Drizzle w `lib/db/schema/`.

## Aktualizacja Szablonu

Przy aktualizacji do nowszej wersji:

```bash
cd directory-web-template

# Pull latest changes
git pull origin main

# Install updated dependencies
pnpm install

# Apply database migrations
pnpm db:migrate

# Verify build
pnpm build
```

### Obsługa Konfliktów Podczas Aktualizacji

Jeśli dostosowałeś Szablon, podczas pobierania aktualizacji mogą wystąpić konflikty scalania. Zalecane podejście:

1. **Przechowuj dostosowania w oddzielnych plikach**, gdy to możliwe (niestandardowe komponenty, nowe trasy, dodatkowe usługi).
2. **Używaj CMS opartego na Git** do zmian treści zamiast modyfikowania plików głównych.
3. **Przeglądaj notatki wydania** przed aktualizacją, aby zrozumieć, które pliki zostały zmienione.
4. **Dokładnie testuj** po rozwiązaniu konfliktów, uruchamiając `pnpm lint`, `pnpm tsc --noEmit` i `pnpm build`.

## Śledzenie Wydań

### GitHub Releases

Wydania są publikowane na GitHub pod adresem [github.com/ever-works/directory-web-template/releases](https://github.com/ever-works/directory-web-template/releases).

Każde wydanie zawiera:

- Tag wersji (np. `v0.1.0`)
- Notatki wydania opisujące zmiany, nowe funkcje, poprawki błędów i niekompatybilne zmiany
- Linki do odpowiednich pull requestów i zgłoszeń

### Historia Commitów

Repozytorium używa [Conventional Commits](https://www.conventionalcommits.org/), dzięki czemu łatwo przeglądać historię commitów w poszukiwaniu zmian:

```bash
# View recent commits with conventional commit prefixes
git log --oneline --since="2025-01-01"

# Filter for feature commits only
git log --oneline --grep="^feat:"

# Filter for breaking changes
git log --oneline --grep="BREAKING CHANGE"
```

## Polityka Zmian Niekompatybilnych

Zmiany niekompatybilne są traktowane poważnie. Projekt przestrzega tych zasad:

1. **Wcześniejsze powiadomienie.** Zmiany niekompatybilne są ogłaszane co najmniej jedno wydanie minor wcześniej przed wejściem w życie, gdy jest to możliwe.
2. **Przewodniki migracji.** Każda niekompatybilna zmiana zawiera przewodnik migracji w notatkach wydania.
3. **Minimalizowanie zakłóceń.** Zmiany niekompatybilne są grupowane w wydaniach major zamiast rozpraszane po wielu wydaniach minor.
4. **Zgodność wsteczna bazy danych.** Migracje są zaprojektowane tak, aby były niedestrukcyjne. Dodawanie kolumn i tworzenie tabel są preferowane przed usuwaniem lub zmianą nazw.

### Przykłady Zmian Niekompatybilnych

- Usunięcie lub zmiana nazwy publicznego punktu końcowego API
- Zmiana struktury treści żądań lub odpowiedzi API
- Usunięcie lub zmiana nazwy kolumn lub tabel bazy danych
- Zmiana wymaganych zmiennych środowiskowych
- Porzucenie wsparcia dla wersji Node.js
- Zmiana zachowania uwierzytelniania lub autoryzacji
- Usunięcie lub zmiana nazwy eksportowanych typów lub interfejsów TypeScript

### Przykłady Zmian Kompatybilnych

- Dodawanie nowych punktów końcowych API
- Dodawanie nowych opcjonalnych pól do treści żądań lub odpowiedzi
- Dodawanie nowych kolumn bazy danych z wartościami domyślnymi
- Dodawanie nowych zmiennych środowiskowych z rozsądnymi wartościami domyślnymi
- Dodawanie nowych funkcji lub integracji
- Ulepszenia wydajności
- Poprawki błędów

## Format Changelogu

Notatki wydania mają następującą strukturę:

```markdown
## [0.2.0] - 2025-04-15

### Added

- Category-based directory filtering
- New Polar payment provider integration

### Changed

- Improved authentication flow with better error messages

### Fixed

- Resolved race condition in concurrent directory updates
- Fixed pagination offset calculation for search results

### Deprecated

- Legacy REST endpoints under /api/v1/ (use /api/v2/ instead)

### Breaking Changes

- Removed `LEGACY_AUTH_MODE` environment variable
- Renamed `DirectoryItem` type to `Item` across all APIs
```

Ten format jest zgodny z konwencjami [Keep a Changelog](https://keepachangelog.com/).
