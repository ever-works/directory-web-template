---
id: contributing
title: Przewodnik dla Współtwórców
sidebar_label: Wkład
---

# Przewodnik dla Współtwórców

Dziękujemy za zainteresowanie wkładem w Directory Web Template. Ten przewodnik omawia wszystko, co musisz wiedzieć, aby wnosić znaczące wkłady.

## Repozytorium

Kod źródłowy Template jest hostowany pod adresem [github.com/ever-works/directory-web-template](https://github.com/ever-works/directory-web-template).

Informacje o wkładzie w Platformę Ever Works można znaleźć w [repozytorium Platformy](https://github.com/ever-works/ever-works) i jej przewodniku dla współtwórców pod adresem [docs.ever.works](https://docs.ever.works).

## Wymagania wstępne

Przed rozpoczęciem upewnij się, że masz zainstalowane:

- **Node.js** >= 20.19.0 (zalecane LTS)
- **pnpm** >= 10.x (ściśle wymuszane; nie używaj npm ani yarn)
- **Git** >= 2.30
- **PostgreSQL** (do bazy danych; Supabase oferuje opcję hostowaną)

### Instalacja pnpm

```bash
# Używając corepack (zalecane, dostarczane z Node.js 20+)
corepack enable
corepack prepare pnpm@latest --activate

# Lub przez npm (jednorazowy bootstrap)
npm install -g pnpm
```

**Ważne:** Repozytorium używa pól `packageManager` i plików blokady specyficznych dla pnpm. Uruchomienie `npm install` lub `yarn install` zakończy się niepowodzeniem lub spowoduje nieprawidłowe drzewa zależności.

## Konfiguracja środowiska deweloperskiego

```bash
git clone https://github.com/ever-works/directory-web-template.git
cd directory-web-template
pnpm install

# Skopiuj plik środowiskowy i skonfiguruj
cp .env.example .env.local
# Edytuj .env.local swoimi wartościami (szczegóły w README)

pnpm dev        # Serwer deweloperski Next.js na porcie 3000
```

## Standardy kodu

### TypeScript

Template używa TypeScript wszędzie. Nie wprowadzaj zwykłych plików `.js`. Stosuj rygorystyczne praktyki TypeScript:

- Włącz i przestrzegaj ustawień trybu `strict` w `tsconfig.json`
- Preferuj jawne typy zwracane dla eksportowanych funkcji
- Używaj `unknown` zamiast `any` tam, gdzie to możliwe
- Waliduj dane wejściowe za pomocą schematów **Zod**

### Formatowanie (Prettier)

Formatowanie jest wymuszane przez Prettier. Konfiguracja znajduje się w głównym `package.json`:

```json
{
	"printWidth": 120,
	"singleQuote": true,
	"semi": true,
	"useTabs": true,
	"tabWidth": 4,
	"arrowParens": "always",
	"trailingComma": "none",
	"quoteProps": "as-needed"
}
```

Uruchom formater przed zatwierdzeniem:

```bash
pnpm format          # Formatuj wszystkie pliki
pnpm format:check    # Sprawdź bez modyfikowania (przyjazne dla CI)
```

### Linting (ESLint)

Template używa płaskiej konfiguracji ESLint (`eslint.config.mjs`) z wtyczkami React, React Hooks i TypeScript:

```bash
pnpm lint
```

### Konwencje nazewnictwa

| Element                     | Konwencja        | Przykład                              |
| --------------------------- | ---------------- | ------------------------------------- |
| Pliki                       | kebab-case       | `auth.service.ts`, `user-profile.tsx` |
| Klasy, Interfejsy, Typy     | PascalCase       | `DirectoryService`, `UserProfile`     |
| Funkcje, Zmienne            | camelCase        | `getDirectoryById`, `itemCount`       |
| Stałe                       | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_LOCALE`   |

## Konwencje commitów

Repozytorium wymusza [Conventional Commits](https://www.conventionalcommits.org/) za pomocą **commitlint** i hooków pre-commit **husky**.

| Prefiks     | Zastosowanie                                        |
| ----------- | --------------------------------------------------- |
| `feat:`     | Nowe funkcje                                        |
| `fix:`      | Poprawki błędów                                     |
| `docs:`     | Zmiany dokumentacji                                 |
| `refactor:` | Restrukturyzacja kodu bez zmiany zachowania         |
| `test:`     | Dodawanie lub aktualizowanie testów                 |
| `chore:`    | Zadania konserwacyjne, aktualizacje zależności      |
| `style:`    | Zmiany formatowania (bez zmiany logiki)             |
| `perf:`     | Ulepszenia wydajności                               |
| `ci:`       | Zmiany konfiguracji CI/CD                           |

Przykład:

```bash
git commit -m "feat: add search filtering by category in directory listing"
git commit -m "fix: resolve authentication redirect loop on expired sessions"
```

## Nazewnictwo gałęzi

Używaj opisowych nazw gałęzi z prefiksem:

```
feat/add-category-filter
fix/auth-redirect-loop
docs/update-deployment-guide
refactor/simplify-auth-middleware
```

## Proces Pull Request

1. **Sforkuj** repozytorium (lub utwórz gałąź, jeśli masz dostęp do zapisu).
2. **Utwórz gałąź feature** z `main`.
3. **Wprowadź zmiany** zgodnie z powyższymi standardami kodu.
4. **Uruchom weryfikacje jakości** przed wypchnięciem (patrz poniżej).
5. **Wypchnij** swoją gałąź i otwórz Pull Request przeciwko `main`.
6. **Wypełnij szablon PR** z opisem, powiązanymi issues i notatkami z testowania.
7. **Poczekaj na przegląd.** Opiekun przejrzy Twój PR i może poprosić o zmiany.
8. Po zatwierdzeniu opiekun scali Twój PR.

### Weryfikacje jakości przed wysłaniem PR

```bash
pnpm lint           # ESLint
pnpm tsc --noEmit   # Sprawdzenie TypeScript
pnpm build          # Pełny build produkcyjny
```

### Testowanie

Template używa **Playwright** do testów end-to-end:

```bash
pnpm test:e2e
```

Jeśli Twoje zmiany dotykają istniejącej funkcjonalności, upewnij się, że wszystkie powiązane testy przechodzą. Jeśli dodajesz nową funkcjonalność, dołącz dla niej testy.

## Licencja

Directory Web Template jest licencjonowany na podstawie **GNU Affero General Public License v3.0 (AGPL-3.0)**. Przesyłając wkład, zgadzasz się, że Twoja praca będzie licencjonowana na tej samej licencji.

## Kodeks postępowania

Wszyscy współtwórcy są zobowiązani do przestrzegania Kodeksu postępowania projektu. Bądź szanujący, konstruktywny i współpracujący.

## Uzyskanie pomocy

Jeśli masz pytania dotyczące wkładu:

- Otwórz [GitHub Discussion](https://github.com/ever-works/directory-web-template/discussions)
- Dołącz do [społeczności Discord](https://discord.gg/ever) by uzyskać pomoc w czasie rzeczywistym
- E-mail na [ever@ever.co](mailto:ever@ever.co) w przypadku prywatnych zapytań
