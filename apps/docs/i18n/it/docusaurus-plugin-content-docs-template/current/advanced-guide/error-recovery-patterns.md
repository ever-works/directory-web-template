---
id: error-recovery-patterns
title: Modelli di ripristino degli errori
sidebar_label: Recupero errori
sidebar_position: 2
---

# Modelli di ripristino degli errori

Questa guida illustra l'architettura di gestione degli errori utilizzata in tutto il modello, inclusi i limiti di errore, la logica dei nuovi tentativi, i modelli di interfaccia utente di fallback e la segnalazione centralizzata degli errori.

## Panoramica dell'architettura

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

## Tipi di errore centralizzati

Il modulo `lib/utils/error-handler.ts` definisce un sistema di errori tipizzati:

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

### Creazione di errori digitati

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Registrazione degli errori strutturata

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

## Gestione degli errori API

### Risposte agli errori API standardizzate

Il modulo `lib/api/error-handler.ts` fornisce una formattazione coerente degli errori HTTP:

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

### Utilizzo di `handleApiError` nei gestori di percorso

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

### Classificazione automatica degli errori

La funzione `handleApiError` mappa automaticamente i messaggi di errore sui codici di stato HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Sanificazione errori di produzione

Nella produzione, i dettagli dell'errore interno vengono rimossi da 500 risposte:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Gestione degli errori API lato client

La classe `ApiClient` in `lib/api/api-client-class.ts` fornisce la gestione automatica degli errori:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Errori formattati del client

Tutti gli errori API sono normalizzati sull'interfaccia `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Logica di nuovo tentativo del client API server

Il `ServerClient` in `lib/api/server-api-client.ts` include la logica di ripetizione incorporata:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Riprova la logica decisionale

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

Solo gli errori a livello di rete attivano nuovi tentativi. Errori HTTP (4xx, 5xx) non riprovare.

### Gestione del timeout

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Convalida delle variabili d'ambiente

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

## Ripristino degli errori del processo in background

I processi in background utilizzano il modello di gestione degli errori `LocalJobManager` :

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

I processi che non riescono continuano a essere pianificati a intervalli regolari, fornendo un comportamento di riprovazione automatico.

## Ripristino errore di invalidamento della cache

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

## Considerazioni sulle prestazioni

1. **Ritardi tra i nuovi tentativi**: il ritardo tra i nuovi tentativi di 1 secondo previene gli effetti di stormo fragorosi ma aggiunge latenza. Per le richieste rivolte agli utenti, valuta la possibilità di ridurre a 500 ms.
2. **Valori di timeout**: il valore predefinito di 30 secondi è generoso. Per le chiamate API interne, in genere sono sufficienti 10 secondi.
3. **Registrazione degli errori**: in produzione, evitare di registrare le tracce dello stack completo per gli errori previsti (404, 422) per ridurre il rumore del registro.

## Risoluzione dei problemi

### L'API restituisce 500 con messaggio generico in produzione

Questo è previsto dalla progettazione. Controllare i log del server per i dettagli effettivi dell'errore. La funzione `handleApiError` elimina 500 errori nella produzione.

### I tentativi non funzionano per le chiamate API

I tentativi si applicano solo agli errori a livello di rete (connessione rifiutata, errori DNS). Le risposte HTTP 500 non attivano nuovi tentativi. Se sono necessari tentativi a livello HTTP, estendere la logica `shouldRetry` .

### Lavoro in background bloccato nello stato "in esecuzione".

Il `LocalJobManager` salta l'esecuzione se un lavoro è già in esecuzione. Se un lavoro si blocca, blocca le esecuzioni future. Prendi in considerazione l'aggiunta di un wrapper di timeout attorno ai processi di lunga esecuzione.

## Documentazione correlata

- [Architettura client API](./api-client-architecture.md)
- [Architettura webhook](./webhook-architecture.md)
- [Architettura di limitazione della velocità](./rate-limiting-architecture.md)
