---
id: api-client-layer
title: Клиентский уровень API
sidebar_label: Клиентский уровень API
sidebar_position: 30
---

# Клиентский уровень API

Шаблон включает двойную клиентскую архитектуру API: `ApiClient` на стороне браузера, построенную на Axios, и `ServerClient` на стороне сервера, построенную на собственном `fetch` API. Оба имеют единый интерфейс для выполнения HTTP-запросов, но каждый из них оптимизирован для своей среды выполнения.

## Обзор архитектуры

```
lib/api/
  api-client.ts          # Browser-side convenience exports and singleton access
  api-client-class.ts    # ApiClient class (Axios-based, for React components)
  server-api-client.ts   # ServerClient class (fetch-based, for SSR / API routes)
  singleton.ts           # Singleton manager for the browser ApiClient
  types.ts               # Shared TypeScript types for both clients
  constants.ts           # API constants (headers, status codes, query config)
  error-handler.ts       # Standardized API error responses for Next.js routes
```

## Браузерный клиент (`ApiClient`)

Клиент на стороне браузера является оболочкой Axios и предназначен для использования внутри компонентов и перехватчиков React. Он управляется как синглтон, поэтому для каждого сеанса браузера существует только один экземпляр.

### Шаблон Синглтон

Класс `ApiClientSingleton` предотвращает создание нескольких экземпляров Axios:

```ts
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

### Использование браузерного клиента

Импортируйте предварительно настроенный синглтон из `api-client.ts`:

```ts
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Simple GET request
const user = await fetcherGet<User>('/api/users/me');

// Paginated GET request
const items = await fetcherPaginated<Item>('/api/items', {
  page: 1,
  limit: 10,
  search: 'react',
  sortBy: 'name',
  sortOrder: 'asc',
});

// Direct client usage for POST/PUT/PATCH/DELETE
const created = await apiClient.post<Item>('/api/items', { name: 'New Item' });
const updated = await apiClient.put<Item>('/api/items/123', { name: 'Updated' });
const patched = await apiClient.patch<Item>('/api/items/123', { status: 'active' });
await apiClient.delete('/api/items/123');
```

### Подробности класса ApiClient

Класс `ApiClient` настраивает Axios с помощью:

- **Заголовки по умолчанию**: `Content-Type: application/json`, `Accept: application/json`
- **Учетные данные**: `withCredentials: true` для аутентификации на основе файлов cookie.
- **Перехватчик токенов**: автоматически присоединяет заголовок `Authorization: Bearer`.
- **Перехватчик ответов**: перенаправляет на страницу входа при ответе 401 (только в браузере).
- **Форматирование ошибок**: преобразует ошибки Axios в структурированный объект `ApiError`.

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Серверный клиент (`ServerClient`)

Клиент на стороне сервера использует собственный API `fetch` и предназначен для использования внутри маршрутов API Next.js, серверных компонентов и действий сервера. Он предоставляет функции, которые имеют решающее значение для связи между серверами.

### Ключевые особенности

|Особенность|Описание|
|---------|-------------|
|**Автоматические повторы**|Повторные попытки при сетевых ошибках (настраиваемые, по умолчанию 3)|
|**Тайм-аут**|Прерывает запросы по истечении настраиваемого периода времени (по умолчанию 30 секунд).|
|**Кэш LRU**|Кэш в памяти для запросов GET (100 записей, TTL 5 минут)|
|**Разрешение URL**|Разрешает относительные пути к `PLATFORM_API_URL` для вызовов платформы.|
|**Внутреннее исправление API**|Автоматически преобразует относительные URL-адреса в абсолютные для вызовов SSR.|
|**Поддержка FormData**|Удаляет заголовок `Content-Type` для загрузок `FormData`|

### Создание и использование серверного клиента

```ts
import { serverClient, createApiClient, externalClient } from '@/lib/api/server-api-client';

// Default server client
const result = await serverClient.get<User>('/api/users/me');
if (result.success) {
  console.log(result.data);
}

// Custom client for a specific service
const paymentClient = createApiClient('https://api.stripe.com/v1', {
  timeout: 15000,
  token: process.env.STRIPE_SECRET_KEY,
});

// File upload
const uploadResult = await serverClient.upload<UploadResponse>(
  '/api/upload',
  myFile
);

// URL-encoded form data
const formResult = await serverClient.postForm<TokenResponse>(
  '/oauth/token',
  { grant_type: 'client_credentials', client_id: '...' }
);
```

### Предварительно настроенные клиенты

Модуль экспортирует несколько готовых к использованию экземпляров клиента:

```ts
// Default client - general purpose
export const serverClient = new ServerClient();

// External API client - longer timeout, fewer retries
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});

// ReCAPTCHA verification helper
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  }
};
```

### API-утилиты

Объект `apiUtils` предоставляет общие вспомогательные функции:

```ts
import { apiUtils } from '@/lib/api/server-api-client';

// Type-safe success check
const response = await serverClient.get<Item>('/api/items/1');
if (apiUtils.isSuccess(response)) {
  console.log(response.data); // TypeScript knows data exists
}

// Build URL with query parameters
const url = apiUtils.buildUrl('/api/items', { page: 1, limit: 10 });
// => "/api/items?page=1&limit=10"

// Clear the response cache
apiUtils.clearCache();
```

## Общие типы

Оба клиента используют общий набор типов, определенный в `lib/api/types.ts`:

```ts
// Request types
type ApiEndpoint = string;
type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

// Pagination
interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Response types (discriminated union)
type ApiResponse<T> =
  | { success: true; data: T; total?: number; page?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };

// Error type
interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Обработка ошибок API для маршрутов

Модуль `error-handler.ts` предоставляет стандартизированные ответы об ошибках для обработчиков маршрутов API Next.js:

```ts
import { handleApiError, withErrorHandling, HttpStatus } from '@/lib/api/error-handler';

// Wrap an entire handler
export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}

// Or catch errors manually
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // ... process
  } catch (error) {
    return handleApiError(error, 'POST /api/items');
  }
}
```

Перечисление `HttpStatus` предоставляет стандартные коды состояния HTTP:

```ts
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

## Константы API

Файл `constants.ts` определяет общую конфигурацию, используемую обоими клиентами:

```ts
export const API_CONSTANTS = {
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    AUTHORIZATION: 'Authorization',
  },
  STATUS: {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
} as const;

export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

## Когда использовать какой клиент

|Сценарий|Клиент|Почему|
|----------|--------|-----|
|Получение данных компонента React|`apiClient` (браузер)|Синглтон, управление токенами, перенаправление на 401|
|Функции выборки запросов React|`fetcherGet` / `fetcherPaginated`|Удобные оболочки для функций запроса|
|Загрузка данных компонентов сервера|`serverClient` (сервер)|Автоматическое разрешение URL-адресов, кеширование, повторные попытки|
|API-маршрут для вызова внешних служб|`externalClient`|Более длительный тайм-аут, без предположения о базовом URL-адресе|
|Обработка ошибок маршрута API|`handleApiError` / `withErrorHandling`|Стандартизированные ответы на ошибки|

## Связанные файлы

- `lib/api/api-client.ts` - одноэлементный клиент браузера и удобный экспорт
- `lib/api/api-client-class.ts` - Полная реализация класса `ApiClient`
- `lib/api/server-api-client.ts` - Класс `ServerClient` на стороне сервера
- `lib/api/singleton.ts` - Менеджер шаблонов Singleton
- `lib/api/types.ts` — общие определения типов TypeScript.
- `lib/api/constants.ts` — константы API и значения по умолчанию для запросов React.
- `lib/api/error-handler.ts` — утилиты обработки ошибок маршрута API Next.js
