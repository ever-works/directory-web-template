---
id: error-recovery-patterns
title: Wzorce odzyskiwania po błędach
sidebar_label: Odzyskiwanie błędów
sidebar_position: 2
---

# Wzorce odzyskiwania błędów

W tym przewodniku opisano architekturę obsługi błędów używaną w całym szablonie, w tym granice błędów, logikę ponawiania, wzorce interfejsu użytkownika i scentralizowane raportowanie błędów.

## Przegląd architektury

```
Error Handling Layers
======================

  Component Layer        Service Layer         API Layer
  +--------------+       +--------------+      +--------------+
  | Error        |       | Try/Catch    |      | handleApi    |
  | Boundaries   |       | + Retry      |      | Error()      |
  | (React)      |       | + Fallback   |      | + Logging    |
  +--------------+       +--------------+      +--------------+
       |                      |                      |
       v                      v                      v
  +---------------------------------------------------+
  |           Centralized Error Handler                |
  |   lib/utils/error-handler.ts                       |
  |   - ErrorType enum                                 |
  |   - createAppError()                               |
  |   - logError()                                     |
  +---------------------------------------------------+
```

## Scentralizowane typy błędów

Moduł `lib/utils/error-handler.ts` definiuje typowany system błędów:

```typescript
// lib/utils/error-handler.ts
export enum ErrorType {
  AUTH = 'auth',
  CONFIG = 'config',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface AppError {
  message: string;
  type: ErrorType;
  code?: string;
  originalError?: unknown;
}
```

### Tworzenie błędów pisarskich

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Strukturalne rejestrowanie błędów

```typescript
import { logError } from '@/lib/utils/error-handler';

// AppError - logs type, code, and original error
logError(appError, 'PaymentService');
// Output: [CONFIG] [PaymentService]: Missing required environment variables

// Standard Error - logs message and stack trace
logError(new Error('Connection refused'), 'Database');
// Output: [ERROR] [Database]: Connection refused

// Unknown error - logs raw value
logError('something went wrong', 'Unknown');
// Output: [UNKNOWN ERROR] [Unknown]: something went wrong
```

## Obsługa błędów API

### Standaryzowane odpowiedzi na błędy interfejsu API

Moduł `lib/api/error-handler.ts` zapewnia spójne formatowanie błędów HTTP:

```typescript
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### Używanie `handleApiError` w modułach obsługi tras

```typescript
import { handleApiError, withErrorHandling } from '@/lib/api/error-handler';

// Pattern 1: Manual try/catch
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}

// Pattern 2: Wrapped handler (recommended)
export async function POST(request: Request) {
  return withErrorHandling(async () => {
    const body = await request.json();
    const result = await createItem(body);
    return NextResponse.json({ success: true, data: result });
  }, 'POST /api/items');
}
```

### Automatyczna klasyfikacja błędów

Funkcja `handleApiError` automatycznie mapuje komunikaty o błędach na kody stanu HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Odkażanie błędów produkcyjnych

W środowisku produkcyjnym szczegóły błędów wewnętrznych są usuwane z 500 odpowiedzi:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Obsługa błędów interfejsu API po stronie klienta

Klasa `ApiClient` w `lib/api/api-client-class.ts` zapewnia automatyczną obsługę błędów:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Sformatowane błędy klienta

Wszystkie błędy API są normalizowane do interfejsu `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Logika ponawiania prób klienta interfejsu API serwera `ServerClient` w `lib/api/server-api-client.ts` zawiera wbudowaną logikę ponawiania:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Ponów logikę decyzji

```
Retry Decision Tree
====================

  Fetch fails
       |
       v
  Is it a network error?
  (TypeError or "fetch" in message)
       |
  +----+----+
  YES       NO
  |         |
  v         v
  attempt   Throw
  < retries?  immediately
  |
  YES -> Wait retryDelay -> Retry
  NO  -> Throw error
```

Tylko awarie na poziomie sieci wyzwalają ponowne próby. Błędy HTTP (4xx, 5xx) nie wymagają ponawiania.

### Obsługa przekroczenia limitu czasu

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Walidacja zmiennej środowiskowej

```typescript
import { validateEnvVariables, getEnvVariable } from '@/lib/utils/error-handler';

// Validate multiple variables at once
const error = validateEnvVariables(['DATABASE_URL', 'AUTH_SECRET']);
if (error) {
  logError(error, 'Startup');
  process.exit(1);
}

// Get single variable with automatic validation
const dbUrl = getEnvVariable('DATABASE_URL', true); // throws if missing
const optional = getEnvVariable('OPTIONAL_VAR', false); // returns undefined
```

## Odzyskiwanie błędów zadań w tle

Zadania w tle korzystają ze wzorca obsługi błędów `LocalJobManager` :

```typescript
// lib/background-jobs/local-job-manager.ts
private async executeJob(id: string): Promise<void> {
  // Skip if already running (prevents overlap)
  if (jobStatus.status === 'running') return;

  try {
    await jobFunction();
    jobStatus.status = 'completed';
    this.metrics.successfulJobs++;
  } catch (error) {
    jobStatus.status = 'failed';
    jobStatus.error = error instanceof Error ? error.message : 'Unknown error';
    this.metrics.failedJobs++;
    // Job remains scheduled - will retry on next interval
  }
}
```

Zadania, które zakończyły się niepowodzeniem, są nadal planowane w regularnych odstępach czasu, co zapewnia automatyczne ponawianie prób.

## Odzyskiwanie po błędzie unieważnienia pamięci podręcznej

```typescript
// lib/cache-invalidation.ts
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      // Expected during render - skip silently
      console.warn(`Skipping invalidation during render (tag: ${tag})`);
    } else {
      throw error; // Unexpected errors propagate
    }
  }
}
```

## Względy wydajności

1. **Opóźnienia ponownych prób**: 1-sekundowe opóźnienie ponownych prób zapobiega efektom grzmiącego stada, ale zwiększa opóźnienie. W przypadku żądań skierowanych do użytkownika rozważ zmniejszenie do 500 ms.
2. **Wartości limitu czasu**: Domyślne 30 sekund jest wystarczające. W przypadku wewnętrznych wywołań API zwykle wystarcza 10 sekund.
3. **Rejestrowanie błędów**: W środowisku produkcyjnym unikaj rejestrowania śladów pełnego stosu dla oczekiwanych błędów (404, 422), aby zmniejszyć szum dziennika.

## Rozwiązywanie problemów

### API zwraca 500 z komunikatem ogólnym w produkcji

To jest zgodne z projektem. Sprawdź dzienniki serwera, aby uzyskać szczegółowe informacje o błędzie. Funkcja `handleApiError` oczyszcza 500 błędów w produkcji.

### Ponowne próby nie działają w przypadku wywołań API

Ponowne próby dotyczą tylko błędów na poziomie sieci (odmowa połączenia, błędy DNS). Odpowiedzi HTTP 500 nie powodują ponownych prób. Jeśli potrzebujesz ponownych prób na poziomie HTTP, rozszerz logikę `shouldRetry` .

### Zadanie w tle utknęło w stanie „uruchomione”. `LocalJobManager` pomija wykonanie, jeśli zadanie jest już uruchomione. Jeśli zadanie się zawiesza, blokuje przyszłe wykonania. Rozważ dodanie opakowania limitu czasu dla długotrwałych zadań.

## Powiązana dokumentacja

- [Architektura klienta API](./api-client-architecture.md)
- [Architektura webhooka](./webhook-architecture.md)
- [Architektura ograniczająca szybkość](./rate-limiting-architecture.md)
