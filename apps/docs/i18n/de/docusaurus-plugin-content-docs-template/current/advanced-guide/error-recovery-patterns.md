---
id: error-recovery-patterns
title: Fehlerbehebungsmuster
sidebar_label: Fehlerbehebung
sidebar_position: 2
---

# Fehlerbehebungsmuster

Dieser Leitfaden behandelt die in der gesamten Vorlage verwendete Fehlerbehandlungsarchitektur, einschließlich Fehlergrenzen, Wiederholungslogik, Fallback-UI-Muster und zentralisierte Fehlerberichterstattung.

## Architekturübersicht

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

## Zentralisierte Fehlertypen

Das Modul `lib/utils/error-handler.ts` definiert ein typisiertes Fehlersystem:

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

### Typische Fehler erstellen

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Strukturierte Fehlerprotokollierung

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

## API-Fehlerbehandlung

### Standardisierte API-Fehlerantworten

Das `lib/api/error-handler.ts` -Modul bietet eine konsistente HTTP-Fehlerformatierung:

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

### Verwendung von `handleApiError` in Routenhandlern

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

### Automatische Fehlerklassifizierung

Die Funktion `handleApiError` ordnet Fehlermeldungen automatisch HTTP-Statuscodes zu:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Bereinigung von Produktionsfehlern

In der Produktion werden interne Fehlerdetails aus 500 Antworten entfernt:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Clientseitige API-Fehlerbehandlung

Die `ApiClient` -Klasse in `lib/api/api-client-class.ts` bietet eine automatische Fehlerbehandlung:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Formatierte Clientfehler

Alle API-Fehler werden auf die `ApiError` -Schnittstelle normalisiert:

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Server-API-Client-Wiederholungslogik

Das `ServerClient` in `lib/api/server-api-client.ts` enthält eine integrierte Wiederholungslogik:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Entscheidungslogik erneut versuchen

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

Nur Fehler auf Netzwerkebene lösen Wiederholungsversuche aus. Bei HTTP-Fehlern (4xx, 5xx) wird kein erneuter Versuch durchgeführt.

### Timeout-Behandlung

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Validierung von Umgebungsvariablen

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

## Fehlerbehebung bei Hintergrundjobfehlern

Hintergrundjobs verwenden das Fehlerbehandlungsmuster `LocalJobManager` :

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

Jobs, die fehlschlagen, werden weiterhin in ihrem regulären Intervall geplant, wodurch ein automatisches Wiederholungsverhalten gewährleistet wird.

## Wiederherstellung eines Cache-Ungültigkeitsfehlers

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

## Leistungsüberlegungen

1. **Wiederholungsverzögerungen**: Die Wiederholungsverzögerung von 1 Sekunde verhindert donnernde Herdeneffekte, erhöht jedoch die Latenz. Bei benutzerbezogenen Anfragen sollten Sie eine Reduzierung auf 500 ms in Betracht ziehen.
2. **Timeout-Werte**: Der Standardwert von 30 Sekunden ist großzügig. Für interne API-Aufrufe reichen in der Regel 10 Sekunden aus.
3. **Fehlerprotokollierung**: Vermeiden Sie in der Produktion die Protokollierung vollständiger Stack-Traces für erwartete Fehler (404, 422), um Protokollrauschen zu reduzieren.

## Fehlerbehebung

### API gibt 500 mit einer generischen Nachricht in der Produktion zurück

Das ist beabsichtigt. Überprüfen Sie die Serverprotokolle auf die tatsächlichen Fehlerdetails. Die `handleApiError` -Funktion bereinigt 500 Fehler in der Produktion.

### Wiederholungsversuche funktionieren bei API-Aufrufen nicht

Wiederholungsversuche gelten nur für Fehler auf Netzwerkebene (Verbindung abgelehnt, DNS-Fehler). HTTP 500-Antworten lösen keine Wiederholungsversuche aus. Wenn Sie Wiederholungsversuche auf HTTP-Ebene benötigen, erweitern Sie die `shouldRetry` -Logik.

### Hintergrundjob bleibt im Status „Wird ausgeführt“ hängen

Der `LocalJobManager` überspringt die Ausführung, wenn bereits ein Job ausgeführt wird. Wenn ein Job hängt, blockiert er zukünftige Ausführungen. Erwägen Sie das Hinzufügen eines Timeout-Wrappers für lang laufende Jobs.

## Verwandte Dokumentation

- [API-Client-Architektur](./api-client-architecture.md)
- [Webhook-Architektur](./webhook-architecture.md)
- [Rate-Limiting-Architektur](./rate-limiting-architecture.md)
