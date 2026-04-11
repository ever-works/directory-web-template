---
id: api-client-architecture
title: API-клиентская архитектура
sidebar_label: API-клиент
sidebar_position: 8
---

# Архитектура API-клиента

В этом руководстве рассматривается клиентская система с двойным API: клиентская `ApiClient` (одноэлементная система на основе Axios) и серверная `ServerClient` (основанная на выборке с кэшированием и повторными попытками), включая безопасность типов, обработку ошибок и перехватчики запросов/ответов.

## Обзор архитектуры

```
API Client Architecture
=========================

  Client-Side (Browser)                Server-Side (Node.js)
  +------------------------+           +------------------------+
  |  ApiClient             |           |  ServerClient          |
  |  (lib/api/api-client-  |           |  (lib/api/server-api-  |
  |   class.ts)            |           |   client.ts)           |
  +------------------------+           +------------------------+
  | - Axios-based          |           | - fetch-based          |
  | - Singleton pattern    |           | - Built-in LRU cache   |
  | - Auth interceptor     |           | - Retry logic          |
  | - 401 auto-redirect    |           | - Timeout handling     |
  | - Type-safe methods    |           | - AbortSignal support  |
  +------------------------+           +------------------------+
       |                                    |
       v                                    v
  +-------------------------------------------------+
  |           Shared Type System                     |
  |   lib/api/types.ts                               |
  |   - ApiResponse<T> (discriminated union)         |
  |   - PaginatedResponse<T>                         |
  |   - ApiError                                     |
  +-------------------------------------------------+
```

## Клиентский API-клиент

### Шаблон «Одиночка» `ApiClient` использует строгий синглтон, управляемый `ApiClientSingleton` :

```typescript
// lib/api/singleton.ts
class ApiClientSingleton {
  private static instance: ApiClient | null = null;

  public static getInstance(config?: ApiClientConfig): ApiClient {
    if (!ApiClientSingleton.instance) {
      ApiClientSingleton.instance = new ApiClient(config);
    }
    return ApiClientSingleton.instance;
  }

  public static resetInstance(): void {
    ApiClientSingleton.instance = null;
  }
}

export const getApiClient = ApiClientSingleton.getInstance;
```

### Использование

```typescript
// lib/api/api-client.ts
import { getApiClient } from './singleton';

export const apiClient = getApiClient();

// Convenient fetcher functions for React Query
export const fetcherGet = async <T>(endpoint: string, params?: QueryParams): Promise<T> => {
  return apiClient.get<T>(endpoint, params);
};

export const fetcherPaginated = async <T>(
  endpoint: string,
  params: PaginationParams & QueryParams = {}
): Promise<PaginatedResponse<T>> => {
  return apiClient.getPaginated<T>(endpoint, params);
};
```

### Перехватчики запросов

Клиент автоматически прикрепляет токен Bearer к каждому запросу:

```typescript
// lib/api/api-client-class.ts
private tokenInterceptor(): void {
  this.client.interceptors.request.use((config) => {
    if (this.accessToken) {
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return config;
  });
}
```

### Перехватчики ответов

Автоматическая обработка 401 перенаправляет на страницу входа:

```typescript
private handleResponseError = async (error) => {
  if (responseError.response?.status === API_CONSTANTS.STATUS.UNAUTHORIZED) {
    if (typeof window !== 'undefined' && env.AUTH_ENDPOINT_LOGIN) {
      window.location.href = env.AUTH_ENDPOINT_LOGIN;
    }
  }
  throw this.formatError(error);
};
```

### Ошибка форматирования

Все ошибки нормализуются до постоянной формы `ApiError` :

```typescript
private formatError(error: unknown): ApiError {
  if (error instanceof AxiosError && error.response?.data) {
    const errorData = error.response.data;
    const formattedError = new Error(errorData.message || 'An error occurred');
    Object.assign(formattedError, {
      code: errorData.code,
      details: errorData.details,
      status: error.response.status,
    });
    return formattedError;
  }
  return new Error(API_CONSTANTS.DEFAULT_ERROR_MESSAGE);
}
```

### Типобезопасные методы

```typescript
// All methods return unwrapped data (not the full response)
const items = await apiClient.get<Item[]>('/api/items');
const created = await apiClient.post<Item>('/api/items', { title: 'New Item' });
const updated = await apiClient.put<Item>('/api/items/123', { title: 'Updated' });
const patched = await apiClient.patch<Item>('/api/items/123', { status: 'published' });
const deleted = await apiClient.delete<void>('/api/items/123');

// Paginated responses
const page = await apiClient.getPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## Серверный API-клиент

### Класс СерверКлиент `ServerClient` в `lib/api/server-api-client.ts` оптимизирован для использования на стороне сервера:

```typescript
// lib/api/server-api-client.ts
export class ServerClient {
  private baseUrl: string;
  private defaultOptions: FetchOptions;
  private cacheEnabled: boolean;

  constructor(baseUrl: string = '', options: FetchOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = { ...DEFAULT_CONFIG, ...options };
    this.cacheEnabled = true;
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // 3 retry attempts
  retryDelay: 1000,  // 1 second between retries
};
```

### Встроенное кэширование

Запросы GET автоматически кэшируются с вытеснением LRU:

```typescript
// Cache configuration
const CACHE_SIZE = 100;       // Max cached responses
const DEFAULT_TTL = 300000;   // 5 minutes

// Cache is keyed by URL + body hash
const cacheKey = `${url}${options.body ? `_${JSON.stringify(options.body)}` : ''}`;

// Only GET requests without AbortSignal are cached
if (this.cacheEnabled && isGetRequest && !options.signal) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Повторить логику

```typescript
// Retry decision: only network errors trigger retries
const shouldRetry =
  attempt < retries &&
  error instanceof Error &&
  (error.name === 'TypeError' || error.message.includes('fetch'));

if (shouldRetry) {
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  return attemptFetch(attempt + 1);
}
```

### Обработка тайм-аута

Каждый запрос завершает выборку с помощью AbortController:

```typescript
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Composes with caller-provided signals
if (fetchOptions.signal) {
  fetchOptions.signal.addEventListener('abort', () => {
    timeoutController.abort(fetchOptions.signal?.reason);
  }, { once: true });
}
```

### Готовые экземпляры клиентов

```typescript
// Default client for internal API calls
export const serverClient = new ServerClient();

// Factory for custom clients
export const createApiClient = (baseUrl: string, options?: FetchOptions) => {
  return new ServerClient(baseUrl, options);
};

// External API client (longer timeout, fewer retries)
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});

// ReCAPTCHA verification client
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  },
};
```

## Система типов

### Ответы профсоюзов, подвергающихся дискриминации

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Типобезопасная обработка ответов

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

const response = await serverClient.get<Item[]>('/api/items');

if (apiUtils.isSuccess(response)) {
  // TypeScript narrows: response.data is Item[]
  console.log(response.data.length);
} else {
  // TypeScript narrows: response.error is string
  console.error(apiUtils.getErrorMessage(response));
}
```

## Интеграция запросов React

### Конфигурация запроса по умолчанию

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### Использование с запросом React

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
import { QUERY_CONFIG } from '@/lib/api/constants';

function useItems(page: number) {
  return useQuery({
    queryKey: ['items', page],
    queryFn: () => fetcherPaginated<Item>('/api/items', { page, limit: 20 }),
    ...QUERY_CONFIG,
  });
}
```

## Функции утилиты API

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

// Build URL with query parameters
const url = apiUtils.buildUrl('/api/items', { page: 1, search: 'test' });
// Result: "/api/items?page=1&search=test"

// Create query string
const qs = apiUtils.createQueryString({ status: 'published', limit: 20 });
// Result: "status=published&limit=20"

// Clear all cached responses
apiUtils.clearCache();
```

## Загрузка файла

```typescript
// Using ServerClient
const result = await serverClient.upload<{ url: string }>(
  '/api/upload',
  file,
  { timeout: 60000 }  // Longer timeout for uploads
);

// Using form-encoded data
const result = await serverClient.postForm<{ token: string }>(
  '/api/auth/token',
  { grant_type: 'client_credentials', client_id: 'xxx' }
);
```

## Вопросы производительности

1. **Singleton обеспечивает один экземпляр Axios**: позволяет избежать накладных расходов на подключение при создании нескольких клиентов.
2. **Кэширование на стороне сервера**. Уменьшает количество избыточных вызовов API. Отключите для рабочих процессов с большим количеством мутаций.
3. **React Query staleTime**: 5 минут предотвращает повторную выборку при каждом монтировании компонента.
4. **gcTime — 24 часа**: данные сохраняются в памяти для быстрой навигации между страницами.
5. **Количество повторов равно 1**: обеспечивает баланс между устойчивостью и задержкой, связанной с пользователем.

## Устранение неполадок

### Клиентские запросы завершаются с ошибкой 401

1. Убедитесь, что токен доступа установлен в экземпляре `ApiClient` .
2. Убедитесь, что перехватчик токена присоединяет заголовок `Authorization` .
3. Убедитесь, что срок действия токена не истек.

### Кэш на стороне сервера возвращает устаревшие данные

1. Вызов `serverClient.clearCache()` после мутаций.
2. Установите `setCacheEnabled(false)` для конечных точек, которым требуются свежие данные.
3. Введите `AbortSignal` , чтобы обойти кеш для определенных запросов.

### Ошибки тайм-аута во внешних API

1. Увеличьте таймаут в конфигурации клиента.
2. Используйте кнопку `externalClient` , у которой есть 15-секундный тайм-аут.
3. Проверьте сетевое подключение и разрешение DNS.

### Запрос React не обновляется

1. Убедитесь, что `queryKey` содержит все параметры, которые должны запускать повторную выборку.
2. Убедитесь, что `staleTime` не установлено слишком высоко для вашего случая использования.
3. Используйте `queryClient.invalidateQueries` после мутаций.

## Сопутствующая документация

- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
- [Подробный обзор архитектуры кэширования](./caching-deep-dive.md)
- [Архитектура ограничения скорости](./rate-limiting-architecture.md)
