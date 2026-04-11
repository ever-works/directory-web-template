---
id: error-recovery-patterns
title: Padrões de recuperação de erros
sidebar_label: Recuperação de erros
sidebar_position: 2
---

# Padrões de recuperação de erros

Este guia aborda a arquitetura de tratamento de erros usada em todo o modelo, incluindo limites de erros, lógica de novas tentativas, padrões de UI de fallback e relatórios de erros centralizados.

## Visão geral da arquitetura

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

## Tipos de erros centralizados

O módulo `lib/utils/error-handler.ts` define um sistema de erro digitado:

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

### Criando erros digitados

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Registro de erros estruturado

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

## Tratamento de erros de API

### Respostas de erro de API padronizadas

O módulo `lib/api/error-handler.ts` fornece formatação de erro HTTP consistente:

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

### Usando `handleApiError` em manipuladores de rota

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

### Classificação automática de erros

A função `handleApiError` mapeia automaticamente mensagens de erro para códigos de status HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Sanitização de erros de produção

Na produção, os detalhes dos erros internos são retirados de 500 respostas:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Tratamento de erros da API do lado do cliente

A classe `ApiClient` em `lib/api/api-client-class.ts` fornece tratamento automático de erros:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Erros de cliente formatados

Todos os erros da API são normalizados para a interface `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Lógica de nova tentativa do cliente da API do servidor

O `ServerClient` em `lib/api/server-api-client.ts` inclui lógica de repetição integrada:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Tentar novamente a lógica de decisão

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

Somente falhas no nível da rede acionam novas tentativas. Erros HTTP (4xx, 5xx) não tente novamente.

### Tratamento de tempo limite

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Validação de variável de ambiente

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

## Recuperação de erros de trabalho em segundo plano

Os trabalhos em segundo plano usam o padrão de tratamento de erros `LocalJobManager` :

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

Os trabalhos que falham continuam a ser agendados em intervalos regulares, proporcionando comportamento de repetição automática.

## Recuperação de erro de invalidação de cache

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

## Considerações de desempenho

1. **Atrasos nas novas tentativas**: O atraso nas novas tentativas de 1 segundo evita efeitos de rebanho estrondosos, mas adiciona latência. Para solicitações voltadas ao usuário, considere reduzir para 500 ms.
2. **Valores de tempo limite**: o padrão de 30 segundos é generoso. Para chamadas internas de API, 10 segundos geralmente são suficientes.
3. **Registro de erros**: Na produção, evite registrar rastreamentos de pilha completos para erros esperados (404, 422) para reduzir o ruído do log.

## Solução de problemas

### API retorna 500 com mensagem genérica em produção

Isso ocorre intencionalmente. Verifique os logs do servidor para obter os detalhes reais do erro. A função `handleApiError` limpa 500 erros na produção.

### Novas tentativas não funcionam para chamadas de API

As novas tentativas aplicam-se apenas a falhas no nível da rede (conexão recusada, erros de DNS). As respostas HTTP 500 não acionam novas tentativas. Se você precisar de novas tentativas no nível HTTP, estenda a lógica `shouldRetry` .

### Trabalho em segundo plano preso no status "em execução"

O `LocalJobManager` pula a execução se um trabalho já estiver em execução. Se um trabalho travar, ele bloqueará execuções futuras. Considere adicionar um wrapper de tempo limite em torno de trabalhos de longa duração.

## Documentação Relacionada

- [Arquitetura de cliente API](./api-client-architecture.md)
- [Arquitetura Webhook](./webhook-architecture.md)
- [Arquitetura de limitação de taxa](./rate-limiting-architecture.md)
