---
id: api-client-module
title: Клиентский модуль API
sidebar_label: Клиентский модуль API
sidebar_position: 51
---

# Клиентский модуль API

Клиентский модуль API (`template/lib/api/`) предоставляет комплексный клиентский уровень HTTP для связи API как на стороне клиента, так и на стороне сервера. Он включает в себя клиент на базе Axios для использования в браузере, собственный серверный клиент на базе `fetch` с кэшированием и повторными попытками, специализированные клиенты домена и стандартизированную обработку ошибок.

## Обзор архитектуры

```mermaid
graph TD
    subgraph Client Side
        A[ApiClient Class] -->|Axios| B[Browser HTTP]
        C[apiClient singleton] --> A
        D[fetcherGet / fetcherPaginated] --> C
    end

    subgraph Server Side
        E[ServerClient Class] -->|fetch| F[Node HTTP]
        G[serverClient singleton] --> E
        H[externalClient] --> E
        I[recaptchaClient] --> G
    end

    subgraph Domain Clients
        J[LemonSqueezyClient] --> G
        K[SurveyApiClient] --> C
    end

    subgraph Error Handling
        L[handleApiError] --> M[createApiErrorResponse]
        N[withErrorHandling] --> L
    end

    O[API_CONSTANTS / QUERY_CONFIG] -->|Config| A
    O -->|Config| E
```

## Исходные файлы

|Файл|Описание|
|------|-------------|
|`lib/api/types.ts`|Определения общих типов для уровня API|
|`lib/api/constants.ts`|Константы API и конфигурация запросов|
|`lib/api/api-client-class.ts`|`ApiClient` -- клиент для браузера на базе Axios.|
|`lib/api/singleton.ts`|`ApiClientSingleton` менеджер|
|`lib/api/api-client.ts`|Предварительно созданный экземпляр клиента и помощники по выборке|
|`lib/api/server-api-client.ts`|`ServerClient` -- серверный клиент на основе выборки|
|`lib/api/error-handler.ts`|Стандартизированная обработка ошибок API|
|`lib/api/lemonsqueezy-client.ts`|Платежный клиент LemonSqueezy|
|`lib/api/survey-api.client.ts`|Опрос CRUD-клиента|

## Определения типов

### Основные типы

```typescript
type ApiEndpoint = string;
type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Типы ответов (Дискриминированные союзы)

```typescript
type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Конфигурация клиента

```typescript
interface ApiClientConfig extends Partial<AxiosRequestConfig> {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  accessToken?: string;
  frontendUrl?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Клиентская сторона: `ApiClient`

Класс `ApiClient` объединяет Axios с автоматическим внедрением токенов, обработкой ошибок ответа и типизированными ответами.

### Конструктор

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  accessToken: 'bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

### HTTP-методы

Все методы разворачивают конверт `ApiResponse` и возвращают поле `data` напрямую:

```typescript
// GET with query params
const items = await client.get<Item[]>('/items', { category: 'tools', limit: 10 });

// POST with body
const created = await client.post<Item>('/items', { name: 'New Tool', url: 'https://...' });

// PUT
const updated = await client.put<Item>('/items/123', { name: 'Updated' });

// PATCH
const patched = await client.patch<Item>('/items/123', { status: 'approved' });

// DELETE
await client.delete<void>('/items/123');

// Paginated GET
const page = await client.getPaginated<Item>('/items', { page: 1, limit: 20, search: 'react' });
```

### Синглтон-доступ

```typescript
import { getApiClient } from '@/lib/api/singleton';

const client = getApiClient();                    // Default instance
ApiClientSingleton.resetInstance();                // Reset (for tests)
```

### Удобный экспорт

```typescript
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Use with React Query / SWR
const data = await fetcherGet<Item[]>('/api/items', { status: 'published' });
const page = await fetcherPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## Серверная сторона: `ServerClient`

Класс `ServerClient` использует собственный `fetch` с обработкой тайм-аута, автоматическими повторными попытками, кэшированием LRU и разрешением URL-адресов для конкретного сервера.

### Ключевые особенности

- **Обработка таймаута** с помощью `AbortController` (по умолчанию: 30 секунд)
- **Автоматические повторы** при сетевых ошибках (по умолчанию: 3 попытки с задержкой в 1 секунду).
- **Кэш LRU в памяти** для запросов GET (100 записей, срок жизни 5 минут)
- **Разрешение URL-адреса сервера** для внутренних маршрутов API во время SSR
- **Поддержка FormData** с автоматической обработкой типов контента

### Готовые экземпляры

```typescript
import { serverClient, externalClient, createApiClient, recaptchaClient } from '@/lib/api/server-api-client';

// Default server client
const result = await serverClient.get<UserData>('/api/users/me');

// External API client (15s timeout, 2 retries)
const external = await externalClient.get<any>('https://api.third-party.com/data');

// Custom client
const customClient = createApiClient('https://api.service.com', { timeout: 10000 });

// ReCAPTCHA verification
const captcha = await recaptchaClient.verify(token);
```

### HTTP-методы

```typescript
// All methods return ApiResponse<T>
const result = await serverClient.get<T>(endpoint, options?);
const result = await serverClient.post<T>(endpoint, data?, options?);
const result = await serverClient.put<T>(endpoint, data?, options?);
const result = await serverClient.patch<T>(endpoint, data?, options?);
const result = await serverClient.delete<T>(endpoint, options?);

// File upload
const result = await serverClient.upload<T>(endpoint, fileOrFormData, options?);

// URL-encoded form data
const result = await serverClient.postForm<T>(endpoint, { key: 'value' }, options?);
```

### Управление кэшем

```typescript
serverClient.setCacheEnabled(false);   // Disable caching
serverClient.clearCache();             // Clear all cached responses
apiUtils.clearCache();                 // Same via utility
```

### Служебные функции

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

apiUtils.isSuccess(response);                              // Type guard
apiUtils.getErrorMessage(response);                        // Extract error
apiUtils.createQueryString({ page: 1, limit: 20 });       // 'page=1&limit=20'
apiUtils.buildUrl('/api/items', { page: 1, limit: 20 });  // '/api/items?page=1&limit=20'
```

## Обработка ошибок

### `HttpStatus` Перечисление

```typescript
enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}
```

### `handleApiError(error, context?): NextResponse`

Обрабатывает ошибки маршрута API с автоматическим определением кода состояния из сообщений об ошибках:

```typescript
import { handleApiError } from '@/lib/api/error-handler';

export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}
```

### `withErrorHandling(handler, context?): Promise`

Функция высшего порядка, которая оборачивает асинхронный обработчик обработкой ошибок:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}
```

## Константы API

```typescript
const API_CONSTANTS = {
  HEADERS: { CONTENT_TYPE: 'application/json', ACCEPT: 'application/json' },
  STATUS: { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500 },
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
};

const QUERY_CONFIG = {
  staleTime: 300_000,    // 5 minutes
  gcTime: 86_400_000,    // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Клиенты домена

### ЛимонСжимаемыйКлиент

```typescript
import { lemonsqueezyClient } from '@/lib/api/lemonsqueezy-client';

const checkout = await lemonsqueezyClient.createCheckout({
  variantId: 12345,
  email: 'user@example.com',
  customPrice: 4900,
});
// Returns: { checkoutUrl, email, customPrice, variantId, metadata }

const health = await lemonsqueezyClient.healthCheck();
const validation = lemonsqueezyClient.validateCheckoutParams(params);
```

### SurveyApiClient

```typescript
import { surveyApiClient } from '@/lib/api/survey-api.client';

const surveys = await surveyApiClient.getMany({ type: 'nps', status: 'active' });
const survey = await surveyApiClient.getOne('survey-id');
const created = await surveyApiClient.create({ title: 'Feedback', type: 'nps' });
await surveyApiClient.submitResponse({ surveyId: 'id', answers: [...] });
const responses = await surveyApiClient.getResponses('survey-id', { page: 1 });
```
