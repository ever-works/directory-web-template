---
id: config-manager-system
title: "System menedżera konfiguracji"
sidebar_label: "System menedżera konfiguracji"
sidebar_position: 41
---

# System menedżera konfiguracji

## Przegląd

System Config Manager zapewnia dwie uzupełniające się warstwy konfiguracyjne: klasę **ConfigManager** (`lib/config-manager.ts`) do zarządzania plikiem konfiguracyjnym zawartości opartym na YAML (`config.yml`) z trwałością opartą na Git oraz **ConfigService** (`lib/config/`) do sprawdzania poprawności i uzyskiwania dostępu do konfiguracji aplikacji opartej na zmiennych środowiskowych za pomocą schematów ZOD. Razem obejmują zarówno ustawienia edytowalne w czasie wykonywania, jak i konfigurację środowiska w czasie wdrażania.

## Architektura

System jest podzielony na dwa odrębne podsystemy:

### ConfigManager (oparty na YAML, edytowalny w czasie wykonywania)

`lib/config-manager.ts` zarządza plikiem `config.yml` w katalogu `.content/` (sklonowanym z repozytorium danych). Odczytuje i zapisuje konfigurację YAML oraz automatycznie zatwierdza i wypycha zmiany do repozytorium Git za pomocą `isomorphic-git`. Służy do ustawień, które administratorzy mogą zmieniać w czasie wykonywania (paginacja, nawigacja, nagłówek/stopka).

### ConfigService (oparta na środowisku, sprawdzona podczas uruchamiania)

`lib/config/` zapewnia singleton zatwierdzony przez Zod, który odczytuje wszystkie zmienne środowiskowe przy uruchomieniu i organizuje je w sekcje z wpisaniem: rdzeń, autoryzacja, e-mail, płatności, analityka i integracje. Obejmuje flagi funkcji, narzędzia do wykrywania środowiska i eksporty z możliwością wstrząsania drzewem.

```
config-manager.ts       --> Runtime YAML config (config.yml)
lib/config/
  index.ts              --> Barrel exports
  config-service.ts     --> Singleton ConfigService class
  types.ts              --> Type definitions
  env.ts                --> Zod-validated env variables
  feature-flags.ts      --> Database-dependent feature toggles
  schemas/              --> Zod schemas per section
  client.ts             --> Client-safe config exports
```

## Dokumentacja API

### Menedżer konfiguracji (`lib/config-manager.ts`)

#### Typy

```typescript
interface PaginationConfig {
  type: 'standard' | 'infinite';
  itemsPerPage: number;
}

interface AppConfig {
  pagination: PaginationConfig;
  [key: string]: any;
}
```

#### `configManager` (pojedynczy)

Domyślna wyeksportowana instancja singletonu `ConfigManager`.

#### `configManager.getConfig(): AppConfig`

Zwraca pełny obiekt konfiguracyjny, łącząc zawartość pliku z wartościami domyślnymi.

#### `configManager.getValue<K>(key: K): AppConfig[K]`

Zwraca wartość konfiguracji najwyższego poziomu według klucza.

#### `configManager.getNestedValue(keyPath: string): any`

Zwraca zagnieżdżoną wartość konfiguracyjną przy użyciu notacji kropkowej (np. `'pagination.type'`).

#### `configManager.updateKey<K>(key: K, value: AppConfig[K]): Promise<boolean>`

Aktualizuje klucz najwyższego poziomu i zachowuje plik + Git.

#### `configManager.updateNestedKey(keyPath: string, value: any): Promise<boolean>`

Aktualizuje klucz zagnieżdżony przy użyciu notacji kropkowej. Zawiera prototypową ochronę przed zanieczyszczeniami.

#### `configManager.updatePagination(type, itemsPerPage?): Promise<boolean>`

Wygodna metoda aktualizacji ustawień paginacji.

#### `configManager.getPaginationConfig(): PaginationConfig`

Zwraca bieżącą konfigurację stronicowania.

### Usługa konfiguracji (`lib/config/config-service.ts`)

#### `configService` (pojedynczy)

Singleton przeznaczony tylko dla serwera, który sprawdza wszystkie zmienne środowiskowe podczas uruchamiania.

|Własność|Wpisz|Opis|
|----------|------|-------------|
|`configService.core`|`CoreConfig`|Adresy URL, informacje o witrynie, baza danych|
|`configService.auth`|`AuthConfig`|Sekrety, dostawcy OAuth|
|`configService.email`|`EmailConfig`|SMTP, wyślij ponownie, listopad|
|`configService.payment`|`PaymentConfig`|Pasek, LemonSqueezy, Polar|
|`configService.analytics`|`AnalyticsConfig`|PostHog, Sentry, Recaptcha|
|`configService.integrations`|`IntegrationsConfig`|Trigger.dev, Twenty CRM|

#### Flagi funkcji (`lib/config/feature-flags.ts`)

```typescript
function getFeatureFlags(): FeatureFlags;
function isFeatureEnabled(featureName: keyof FeatureFlags): boolean;
function getDisabledFeatures(): Array<keyof FeatureFlags>;
function getEnabledFeatures(): Array<keyof FeatureFlags>;
function areAllFeaturesEnabled(): boolean;
```

Funkcje (oceny, komentarze, ulubione, polecane elementy, ankiety) są włączone, gdy skonfigurowany jest `DATABASE_URL`.

#### Narzędzia środowiskowe (`lib/config/types.ts`)

```typescript
function isDevelopment(): boolean;
function isProduction(): boolean;
function isTest(): boolean;
function getEnvironment(): Environment; // 'development' | 'production' | 'test'
```

## Szczegóły wdrożenia

**Kolejka operacji Git**: `ConfigManager` używa kolejki szeregowej ze wzorcem mutex, aby zapobiec jednoczesnym operacjom Git. Po wywołaniu `writeConfig()` plik jest natychmiast zapisywany, a zatwierdzenie/wypychanie Git umieszczane jest w kolejce. Jeśli operacje Git nie powiodą się, zapisanie pliku nadal się powiedzie.

**Leniwie ładowane zależności Git**: `isomorphic-git` i jego moduł HTTP są ładowane leniwie poprzez dynamiczny `import()` ze wzorcem singleton, aby uniknąć problemów z łączeniem i zapobiegać duplikatom importów.

**Ochrona przed zanieczyszczeniami prototypów**: Metoda `updateNestedKey()` sprawdza klucze `__proto__`, `constructor` i `prototype` na każdym poziomie ścieżki, aby zapobiec atakom polegającym na zanieczyszczeniu prototypów.

**Weryfikacja uruchomienia**: `ConfigService` sprawdza wszystkie zmienne środowiskowe przy użyciu schematów Zoda podczas pierwszego importu. Nieprawidłowa konfiguracja powoduje awarię uruchamiania i wyświetlanie opisowych komunikatów o błędach. Schematy wykorzystują procedury obsługi `.catch()` w celu płynnej degradacji opcjonalnych pól.

**Egzekwowanie tylko na serwerze**: `config-service.ts` importuje `'server-only'`, aby zapobiec przypadkowemu włączeniu do pakietów klienta. Konfiguracja bezpieczna dla klienta jest eksportowana oddzielnie od `lib/config/client.ts`.

## Konfiguracja

### Zmienne środowiskowe programu ConfigManager

|Zmienna|Wymagane|Opis|
|----------|----------|-------------|
|`DATA_REPOSITORY`|Tak|Adres URL repozytorium Git dla treści|
|`GH_TOKEN`|Dla Git Push|Token dostępu do GitHuba|
|`GITHUB_BRANCH`|Nie|Nazwa oddziału (domyślnie: `main`)|
|`GIT_NAME`|Nie|Nazwa osoby zatwierdzającej (domyślnie: `Website Bot`)|
|`GIT_EMAIL`|Nie|Adres e-mail osoby zatwierdzającej (domyślnie: `website@ever.works`)|

### Zmienne środowiskowe usługi ConfigService

Pełną listę znajdziesz w `.env.example`. Kluczowe sekcje obejmują `AUTH_SECRET`, `DATABASE_URL`, `STRIPE_*`, `POSTHOG_*`, `RESEND_*` i inne zatwierdzone przez schematy Zoda.

## Przykłady użycia

```typescript
// Runtime config (YAML)
import { configManager } from '@/lib/config-manager';

// Read pagination settings
const pagination = configManager.getPaginationConfig();
console.log(pagination.type); // 'standard' | 'infinite'

// Update pagination
await configManager.updatePagination('infinite', 24);

// Update a nested key
await configManager.updateNestedKey('custom_header', [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
]);

// Environment config (validated)
import { configService, coreConfig, paymentConfig } from '@/lib/config';

const appUrl = coreConfig.APP_URL;
const stripeEnabled = paymentConfig.stripe.enabled;

// Feature flags
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('comments')) {
  // Render comments section
}
```

## Najlepsze praktyki

- Użyj `configManager` w przypadku ustawień, które muszą zostać zmienione w czasie wykonywania przez administratorów bez konieczności ponownego wdrażania.
- Użyj `configService` do konfiguracji na czas wdrożenia, która powinna zostać sprawdzona podczas uruchamiania.
- Importuj bezpieczną dla klienta konfigurację z `@/lib/config/client` w komponentach klienta, nigdy z głównego eksportu beczki.
- Zawsze obsługuj zwrot `Promise<boolean>` z `updateKey` i `updateNestedKey`, aby wykryć błędy zapisu.
- Użyj flag funkcji, aby bezpiecznie obniżyć funkcjonalność, gdy opcjonalne zależności (takie jak baza danych) nie są skonfigurowane.

## Powiązane moduły

- [System pamięci podręcznej](./cache-system) — Używa `CACHE_TAGS.CONFIG` do buforowania konfiguracji
- [System Strażników](./guards-system-deep-dive) — Zużywa konfigurację planu/funkcji
- [Biblioteka treści](/template/architecture/content-library) — Rozpoznawanie ścieżki zawartości używane przez menedżera ConfigManager
