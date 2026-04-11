---
id: error-recovery-patterns
title: Patrones de recuperación de errores
sidebar_label: Recuperación de errores
sidebar_position: 2
---

# Patrones de recuperación de errores

Esta guía cubre la arquitectura de manejo de errores utilizada en toda la plantilla, incluidos los límites de error, la lógica de reintento, los patrones de interfaz de usuario alternativos y el informe de errores centralizado.

## Descripción general de la arquitectura

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

## Tipos de errores centralizados

El módulo `lib/utils/error-handler.ts` define un sistema de error escrito:

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

### Creando errores escritos

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Registro de errores estructurado

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

## Manejo de errores de API

### Respuestas de error de API estandarizadas

El módulo `lib/api/error-handler.ts` proporciona un formato de error HTTP consistente:

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

### Usando `handleApiError` en controladores de ruta

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

### Clasificación automática de errores

La función `handleApiError` asigna automáticamente mensajes de error a códigos de estado HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Error de producción Sanitización

En producción, los detalles del error interno se eliminan de 500 respuestas:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Manejo de errores de API del lado del cliente

La clase `ApiClient` en `lib/api/api-client-class.ts` proporciona manejo automático de errores:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Errores de cliente formateado

Todos los errores de API están normalizados en la interfaz `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Lógica de reintento del cliente API del servidor

El `ServerClient` en `lib/api/server-api-client.ts` incluye lógica de reintento incorporada:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Reintentar la lógica de decisión

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

Sólo los errores a nivel de red desencadenan reintentos. Los errores HTTP (4xx, 5xx) no se vuelven a intentar.

### Manejo del tiempo de espera

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Validación de variables de entorno

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

## Recuperación de errores de trabajos en segundo plano

Los trabajos en segundo plano utilizan el patrón de manejo de errores `LocalJobManager` :

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

Los trabajos que fallan se siguen programando en sus intervalos regulares, lo que proporciona un comportamiento de reintento automático.

## Recuperación de errores de invalidación de caché

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

## Consideraciones de rendimiento

1. **Retrasos de reintento**: el retraso de reintento de 1 segundo evita los efectos atronadores de la manada pero agrega latencia. Para solicitudes de cara al usuario, considere reducir a 500 ms.
2. **Valores de tiempo de espera**: el valor predeterminado de 30 segundos es generoso. Para llamadas API internas, 10 segundos suelen ser suficientes.
3. **Registro de errores**: en producción, evite registrar seguimientos de pila completa para errores esperados (404, 422) para reducir el ruido del registro.

## Solución de problemas

### API devuelve 500 con mensaje genérico en producción

Esto es por diseño. Consulte los registros del servidor para conocer los detalles reales del error. La función `handleApiError` desinfecta 500 errores en producción.

### Los reintentos no funcionan para llamadas API

Los reintentos solo se aplican a fallas a nivel de red (conexión rechazada, errores de DNS). Las respuestas HTTP 500 no activan reintentos. Si necesita reintentos a nivel HTTP, amplíe la lógica `shouldRetry` .

### Trabajo en segundo plano atascado en estado "en ejecución"

El `LocalJobManager` omite la ejecución si ya se está ejecutando un trabajo. Si un trabajo se bloquea, bloquea ejecuciones futuras. Considere agregar un contenedor de tiempo de espera para trabajos de larga duración.

## Documentación relacionada

- [Arquitectura de cliente API] (./api-client-architecture.md)
- [Arquitectura de Webhook] (./webhook-architecture.md)
- [Arquitectura de limitación de velocidad] (./rate-limiting-architecture.md)
