---
id: error-recovery-patterns
title: Шаблоны восстановления ошибок
sidebar_label: Восстановление ошибок
sidebar_position: 2
---

# Шаблоны восстановления ошибок

В этом руководстве рассматривается архитектура обработки ошибок, используемая в шаблоне, включая границы ошибок, логику повторов, резервные шаблоны пользовательского интерфейса и централизованные отчеты об ошибках.

## Обзор архитектуры

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

## Типы централизованных ошибок

Модуль `lib/utils/error-handler.ts` определяет систему типизированных ошибок:

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

### Создание типизированных ошибок

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Структурированное журналирование ошибок

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

## Обработка ошибок API

### Стандартизированные ответы об ошибках API

Модуль `lib/api/error-handler.ts` обеспечивает согласованное форматирование ошибок HTTP:

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

### Использование `handleApiError` в обработчиках маршрутов

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

### Автоматическая классификация ошибок

Функция `handleApiError` автоматически сопоставляет сообщения об ошибках с кодами состояния HTTP:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Дезинфекция производственных ошибок

В рабочей среде сведения о внутренних ошибках удаляются из 500 ответов:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Обработка ошибок API на стороне клиента

Класс `ApiClient` в `lib/api/api-client-class.ts` обеспечивает автоматическую обработку ошибок:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Отформатированные ошибки клиента

Все ошибки API нормализуются по интерфейсу `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Логика повторных попыток клиента API сервера `ServerClient` в `lib/api/server-api-client.ts` включает встроенную логику повтора:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Логика повторного принятия решения

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

Только сбои на сетевом уровне вызывают повторные попытки. Ошибки HTTP (4xx, 5xx) не повторяются.

### Обработка тайм-аута

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Проверка переменной среды

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

## Восстановление ошибок фонового задания

Фоновые задания используют шаблон обработки ошибок `LocalJobManager` :

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

Задания, которые завершаются сбоем, по-прежнему планируются через регулярные промежутки времени, обеспечивая автоматическое повторение попыток.

## Восстановление ошибки анвалидации кэша

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

## Вопросы производительности

1. **Задержка повтора**. Задержка повтора в 1 секунду предотвращает эффект стада, но увеличивает задержку. Для запросов, ориентированных на пользователя, рассмотрите возможность сокращения до 500 мс.
2. **Значения таймаута**: 30-секундное значение по умолчанию является щедрым. Для внутренних вызовов API обычно достаточно 10 секунд.
3. **Регистрация ошибок**. В производственной среде избегайте регистрации полных трассировок стека для ожидаемых ошибок (404, 422), чтобы уменьшить шум в журнале.

## Устранение неполадок

### API возвращает 500 с общим сообщением в рабочей среде

Это сделано специально. Проверьте журналы сервера на предмет фактической информации об ошибке. Функция `handleApiError` исправляет 500 ошибок в производстве.

### Повторные попытки не работают для вызовов API

Повторные попытки применимы только к сбоям на уровне сети (отказ в соединении, ошибки DNS). Ответы HTTP 500 не вызывают повторных попыток. Если вам нужны повторные попытки на уровне HTTP, расширьте логику `shouldRetry` .

### Фоновое задание зависло в статусе «выполняется» `LocalJobManager` пропускает выполнение, если задание уже запущено. Если задание зависает, оно блокирует будущие выполнения. Рассмотрите возможность добавления оболочки тайм-аута для длительно выполняющихся заданий.

## Сопутствующая документация

- [Архитектура клиента API](./api-client-architecture.md)
- [Архитектура вебхука](./webhook-architecture.md)
- [Архитектура ограничения скорости](./rate-limiting-architecture.md)
