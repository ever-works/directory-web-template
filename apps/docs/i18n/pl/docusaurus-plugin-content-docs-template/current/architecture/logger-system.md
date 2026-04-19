---
id: logger-system
title: "System rejestrujący"
sidebar_label: "System rejestrujący"
sidebar_position: 44
---

# System rejestrujący

## Przegląd

System Logger zapewnia lekkie, przyjazne dla środowiska narzędzie do rejestrowania, zapewniające spójne wyniki dziennika w całej aplikacji. Obsługuje cztery poziomy dziennika (DEBUG, INFO, WARN, ERROR), instancje rejestratorów o zasięgu kontekstowym i formatowanie specyficzne dla środowiska — stylizowane dane wyjściowe konsoli w przeglądarce podczas programowania oraz zwykłe dane wyjściowe w formacie JSON w Node.js i środowiskach produkcyjnych.

## Architektura

Moduł (`lib/logger.ts`) eksportuje dwa elementy:

- **`logger`** — Domyślna instancja singletonu bez etykiety kontekstowej, odpowiednia do rejestrowania ogólnego.
- **`Logger`** (klasa) — Sama klasa służąca do tworzenia instancji rejestratora kontekstowego w zakresie określonych modułów lub funkcji.

Rejestrator stosuje prostą strategię filtrowania: w środowisku produkcyjnym (`NODE_ENV !== 'development'`) emitowane są tylko komunikaty WARN i ERROR. W fazie rozwoju wszystkie poziomy są rejestrowane. Dzięki temu szczegółowe wyniki debugowania nie przedostaną się do środowisk produkcyjnych.

```
Logger
  |-- debug(message, data?)     -- Development only
  |-- info(message, data?)      -- Development only
  |-- warn(message, data?)      -- Always logged
  |-- error(message, error?)    -- Always logged
  |-- api(method, url, data?)   -- Development only (convenience)
  |-- performance(label, ms)    -- Development only (convenience)
```

## Dokumentacja API

### Eksport

#### `logger` (pojedynczy)

Wstępnie utworzona instancja `Logger` bez kontekstu. Służy do szybkiego rejestrowania bez zakresu.

```typescript
import { logger } from '@/lib/logger';
logger.info('Application started');
```

#### `Logger` (Klasa)

##### `static create(context: string): Logger`

Metoda fabryczna służąca do tworzenia rejestratora o zasięgu kontekstowym. Ciąg kontekstowy pojawia się jako przedrostek we wszystkich komunikatach dziennika.

```typescript
const authLogger = Logger.create('Auth');
authLogger.info('User logged in'); // [10:30:45] INFO [Auth] User logged in
```

##### `debug(message: string, data?: any): void`

Rejestruje komunikat na poziomie debugowania. Emitowane tylko w fazie rozwoju.

##### `info(message: string, data?: any): void`

Rejestruje wiadomość informacyjną. Emitowane tylko w fazie rozwoju.

##### `warn(message: string, data?: any): void`

Rejestruje komunikat ostrzegawczy. Emitowane we wszystkich środowiskach.

##### `error(message: string, error?: any): void`

Rejestruje komunikat o błędzie. Jeśli parametr `error` jest instancją `Error`, rejestrator automatycznie wyodrębnia właściwości `message`, `stack` i `name`. Emitowane we wszystkich środowiskach.

##### `api(method: string, url: string, data?: any): void`

Wygodna metoda rejestrowania żądań API. Delegaty do `debug()` z danymi strukturalnymi. Tylko rozwój.

##### `performance(label: string, duration: number): void`

Wygodna metoda rejestrowania wskaźników wydajności. Rejestruje etykietę i czas trwania w milisekundach. Tylko rozwój.

### Typy wewnętrzne

```typescript
enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;  // ISO 8601
  level: LogLevel;
  context?: string;
  message: string;
  data?: any;
}
```

## Szczegóły wdrożenia

**Wykrywanie środowiska**: Rejestrator sprawdza `process.env.NODE_ENV === 'development'` w czasie budowy i buforuje wynik. Pozwala to uniknąć wielokrotnego wyszukiwania środowiska przy każdym wywołaniu dziennika.

**Styl przeglądarki**: Podczas pracy w przeglądarce (`typeof window !== 'undefined'`) w trybie programistycznym, komunikaty dziennika są stylizowane przy użyciu dyrektyw CSS `%c`:

|Poziom|Kolor|
|-------|-------|
|DEBUGUJ|`#6366f1` (indygo)|
|INFORMACJE|`#3b82f6` (niebieski)|
|OSTRZEŻ|`#f59e0b` (bursztynowy)|
|BŁĄD|`#ef4444` (czerwony)|

**Wyjście Node.js**: W środowiskach Node.js lub w środowisku produkcyjnym wiadomości są formatowane jako zwykłe ciągi znaków z danymi serializowanymi w formacie JSON (ładnie wydrukowanymi z wcięciem z 2 spacjami).

**Ekstrakcja błędów**: Metoda `error()` wykrywa instancje `Error` i wyodrębnia `errorMessage`, `stack` i `name` do obiektu danych strukturalnych w celu łatwiejszego debugowania.

## Konfiguracja

Rejestrator nie wymaga konfiguracji. Jego zachowanie jest całkowicie zdeterminowane przez `NODE_ENV`:

|`NODE_ENV`|DEBUGUJ|INFORMACJE|OSTRZEŻ|BŁĄD|
|------------|-------|------|------|-------|
|`development`|Tak|Tak|Tak|Tak|
|`production`|Nie|Nie|Tak|Tak|
|`test`|Nie|Nie|Tak|Tak|

## Przykłady użycia

```typescript
import { logger, Logger } from '@/lib/logger';

// General logging
logger.info('Server started on port 3000');
logger.warn('Deprecated API endpoint called', { endpoint: '/api/v1/items' });
logger.error('Failed to fetch data', new Error('Network timeout'));

// Context-scoped logging
const dbLogger = Logger.create('Database');
dbLogger.info('Connection established', { host: 'localhost', port: 5432 });
dbLogger.error('Query failed', new Error('Connection refused'));

// API request logging
const apiLogger = Logger.create('API');
apiLogger.api('GET', '/api/items', { page: 1, limit: 20 });
apiLogger.api('POST', '/api/items', { title: 'New Item' });

// Performance tracking
const perfLogger = Logger.create('Performance');
const start = performance.now();
// ... expensive operation ...
const duration = performance.now() - start;
perfLogger.performance('fetchItems', duration);
// Output: [10:30:45] DEBUG [Performance] Performance: fetchItems { duration: "42ms" }
```

## Najlepsze praktyki

- Twórz rejestratory kontekstowe dla każdego modułu lub obszaru funkcji, używając `Logger.create('ModuleName')`, aby ułatwić filtrowanie dzienników.
- Użyj `debug()`, aby uzyskać szczegółowe śledzenie, które nigdy nie powinno pojawić się w produkcji; używaj `info()` w przypadku ważnych wydarzeń.
- Zawsze przekazuj obiekty `Error` (nie ciągi znaków) do metody `error()`, aby automatycznie przechwytywały ślady stosu.
- Użyj metody `api()` do rejestrowania żądań HTTP, aby zachować spójną strukturę dziennika we wszystkich wywołaniach API.
- Nie należy polegać na rejestratorze w celu monitorowania produkcji; zintegrować z odpowiednią platformą obserwowalności (PostHog, Sentry) w celu śledzenia błędów produkcyjnych.

## Powiązane moduły

- [Warstwa klienta API](/template/architecture/api-client-layer) — Używa rejestratora do rejestrowania żądań/odpowiedzi
- [Config Manager System](./config-manager-system) — ConfigService rejestruje wyniki sprawdzania poprawności przy uruchomieniu
