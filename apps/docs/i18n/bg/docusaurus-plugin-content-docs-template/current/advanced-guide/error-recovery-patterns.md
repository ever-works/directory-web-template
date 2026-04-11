---
id: error-recovery-patterns
title: Модели за възстановяване на грешки
sidebar_label: Възстановяване на грешки
sidebar_position: 2
---

# Модели за възстановяване на грешки

Това ръководство обхваща архитектурата за обработка на грешки, използвана в целия шаблон, включително граници на грешки, логика за повторен опит, шаблони за резервен потребителски интерфейс и централизирано отчитане на грешки.

## Преглед на архитектурата

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

## Централизирани типове грешки

Модулът `lib/utils/error-handler.ts` дефинира система за въведена грешка:

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

### Създаване на въведени грешки

```typescript
import { createAppError, ErrorType } from '@/lib/utils/error-handler';

const error = createAppError(
  'Missing required environment variables: DATABASE_URL',
  ErrorType.CONFIG,
  'ENV_MISSING'
);
```

### Структурирано регистриране на грешки

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

## API обработка на грешки

### Стандартизирани отговори за грешка на API

Модулът `lib/api/error-handler.ts` осигурява последователно форматиране на HTTP грешки:

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

### Използване на `handleApiError` в манипулатори на маршрути

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

### Автоматична класификация на грешките

Функцията `handleApiError` автоматично съпоставя съобщенията за грешка към HTTP кодове за състояние:

```
Error Message Contains     ->  HTTP Status
"authentication"           ->  401 Unauthorized
"unauthorized"             ->  401 Unauthorized
"validation" / "invalid"   ->  422 Unprocessable Entity
"not found" / "missing"    ->  404 Not Found
(default)                  ->  500 Internal Server Error
```

### Производствена грешка Дезинфекция

В производството детайлите за вътрешна грешка се премахват от 500 отговора:

```typescript
if (process.env.NODE_ENV === 'production' && status === HttpStatus.INTERNAL_SERVER_ERROR) {
  message = 'An unexpected error occurred';
}
```

## Обработка на грешки в API от страна на клиента

Класът `ApiClient` в `lib/api/api-client-class.ts` осигурява автоматично обработване на грешки:

```typescript
// Automatic 401 redirect
private handleResponseError = async (error) => {
  if (responseError.response?.status === 401) {
    window.location.href = env.AUTH_ENDPOINT_LOGIN;
  }
  throw this.formatError(error);
};
```

### Форматирани грешки на клиента

Всички API грешки се нормализират към интерфейса `ApiError` :

```typescript
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Логика за повторен опит на клиента на API на сървъра `ServerClient` в `lib/api/server-api-client.ts` включва вградена логика за повторен опит:

```typescript
// Default retry configuration
const DEFAULT_CONFIG = {
  timeout: 30000,     // 30 second timeout
  retries: 3,         // 3 retry attempts
  retryDelay: 1000,   // 1 second between retries
};
```

### Опитайте отново логиката на решението

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

Само повреди на мрежово ниво задействат повторни опити. HTTP грешки (4xx, 5xx) не опитвайте отново.

### Обработка на изчакване

```typescript
// AbortController-based timeout
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Timeout produces a specific error type
const err = new Error(`Request timeout after ${timeout}ms`);
err.name = 'TimeoutError';
err.code = 'ETIMEDOUT';
```

## Валидиране на променливата на средата

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

## Възстановяване на грешка при фоново задание

Фоновите задания използват модела за обработка на грешки `LocalJobManager` :

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

Задачи, които са неуспешни, продължават да се планират на техния редовен интервал, осигурявайки автоматично поведение при повторен опит.

## Възстановяване на грешка при невалидност на кеша

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

## Съображения за производителност

1. **Закъснения при повторен опит**: Забавянето от 1 секунда при повторен опит предотвратява гръмотевичните ефекти на стадото, но добавя латентност. За заявки, обърнати към потребителите, помислете за намаляване на 500 ms.
2. **Стойности за изчакване**: 30-секундното по подразбиране е щедро. За вътрешни извиквания на API обикновено са достатъчни 10 секунди.
3. **Регистриране на грешки**: В производството избягвайте регистриране на пълни трасирания на стека за очаквани грешки (404, 422), за да намалите шума в регистрационния файл.

## Отстраняване на неизправности

### API връща 500 с общо съобщение в производството

Това е по проект. Проверете регистрационните файлове на сървъра за действителните подробности за грешката. Функцията `handleApiError` дезинфекцира 500 грешки в производството.

### Повторните опити не работят за извиквания на API

Повторните опити се отнасят само за грешки на ниво мрежа (отказана връзка, DNS грешки). Отговорите HTTP 500 не задействат повторни опити. Ако имате нужда от повторни опити на ниво HTTP, разширете логиката `shouldRetry` .

### Задачата на заден план е блокирана в състояние "работи". `LocalJobManager` пропуска изпълнението, ако задание вече се изпълнява. Ако дадена задача увисне, тя блокира бъдещи изпълнения. Помислете за добавяне на обвивка за изчакване около дълго изпълнявани задачи.

## Свързана документация

- [API клиентска архитектура](./api-client-architecture.md)
- [Архитектура на Webhook](./webhook-architecture.md)
- [Архитектура с ограничаване на скоростта](./rate-limiting-architecture.md)
