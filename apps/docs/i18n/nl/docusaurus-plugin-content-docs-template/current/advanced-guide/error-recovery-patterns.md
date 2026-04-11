---
id: error-recovery-patterns
title: Patronen voor foutherstel
sidebar_label: Foutherstel
sidebar_position: 2
---

# Foutherstelpatronen

Deze handleiding behandelt de architectuur voor foutafhandeling die in de hele sjabloon wordt gebruikt, inclusief foutgrenzen, logica voor opnieuw proberen, fallback-UI-patronen en gecentraliseerde foutrapportage.

## Architectuuroverzicht

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

## Gecentraliseerde fouttypen

De `lib/utils/error-handler.ts` -module definieert een typefoutsysteem:

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

### Typefouten maken

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Gestructureerde foutregistratie

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

## API-foutafhandeling

### Gestandaardiseerde API-foutreacties

De `lib/api/error-handler.ts` -module biedt consistente HTTP-foutformattering:

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

### Gebruik van `handleApiError` in routeafhandelingen

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

### Automatische foutclassificatie

De functie `handleApiError` wijst foutmeldingen automatisch toe aan HTTP-statuscodes:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Sanering van productiefouten

In de productie worden interne foutdetails uit 500 reacties verwijderd:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## API-foutafhandeling aan de clientzijde

De klasse `ApiClient` in `lib/api/api-client-class.ts` zorgt voor automatische foutafhandeling:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Geformatteerde clientfouten

Alle API-fouten worden genormaliseerd naar de `ApiError` -interface:

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Logica voor opnieuw proberen van Server API Client

De `ServerClient` in `lib/api/server-api-client.ts` bevat ingebouwde logica voor opnieuw proberen:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Beslissingslogica opnieuw proberen

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

Alleen fouten op netwerkniveau leiden tot nieuwe pogingen. HTTP-fouten (4xx, 5xx) proberen niet opnieuw.

### Time-outafhandeling

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Validatie van omgevingsvariabelen

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

## Herstel van achtergrondtaakfouten

Achtergrondtaken gebruiken het foutafhandelingspatroon `LocalJobManager` :

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

Taken die mislukken, worden nog steeds met regelmatige tussenpozen gepland, waardoor er automatisch opnieuw wordt geprobeerd.

## Herstel van cache-invalidatiefout

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

## Prestatieoverwegingen

1. **Vertragingen voor nieuwe pogingen**: de vertraging van 1 seconde voor nieuwe pogingen voorkomt donderende kudde-effecten, maar voegt latentie toe. Voor gebruikersgerichte verzoeken kunt u overwegen de tijd terug te brengen naar 500 ms.
2. **Time-outwaarden**: de standaardwaarde van 30 seconden is genereus. Voor interne API-aanroepen is 10 seconden doorgaans voldoende.
3. **Foutregistratie**: vermijd tijdens de productie het registreren van volledige stacktraceringen voor verwachte fouten (404, 422) om logboekruis te verminderen.

## Problemen oplossen

### API retourneert 500 met algemeen bericht in productie

Dit is zo ontworpen. Controleer de serverlogboeken voor de feitelijke foutdetails. De `handleApiError` -functie zuivert 500 productiefouten.

### Nieuwe pogingen werken niet voor API-aanroepen

Nieuwe pogingen zijn alleen van toepassing op fouten op netwerkniveau (verbinding geweigerd, DNS-fouten). HTTP 500-reacties activeren geen nieuwe pogingen. Als je nieuwe pogingen op HTTP-niveau nodig hebt, breid dan de `shouldRetry` -logica uit.

### Achtergrondtaak blijft hangen in de status 'actief'

De `LocalJobManager` slaat de uitvoering over als er al een taak actief is. Als een taak vastloopt, blokkeert deze toekomstige uitvoeringen. Overweeg het toevoegen van een time-outwrapper rond langlopende taken.

## Gerelateerde documentatie

- [API-clientarchitectuur] (./api-client-architectuur.md)
- [Webhook-architectuur](./webhook-architecture.md)
- [Rate-limiting-architectuur](./rate-limiting-architecture.md)
