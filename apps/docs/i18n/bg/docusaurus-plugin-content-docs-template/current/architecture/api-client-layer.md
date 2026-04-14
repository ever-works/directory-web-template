---
id: api-client-layer
title: API клиентски слой
sidebar_label: API клиентски слой
sidebar_position: 30
---

# API клиентски слой

Шаблонът включва двойна клиентска архитектура на API: `ApiClient` от страна на браузъра, изградена на Axios, и `ServerClient` от страна на сървъра, изградена на собствения `fetch` API. И двата споделят последователен интерфейс за правене на HTTP заявки, но всеки е оптимизиран за своята среда за изпълнение.

## Преглед на архитектурата

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

## Клиент от страна на браузъра (`ApiClient`)

Клиентът от страна на браузъра обгръща Axios и е предназначен за използване в React компоненти и кукички. Той се управлява като сингълтон, така че съществува само един екземпляр на сесия на браузъра.

### Единичен модел

Класът `ApiClientSingleton` предотвратява създаването на множество екземпляри на Axios:

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

### Използване на клиента на браузъра

Импортирайте предварително конфигурирания сингълтон от `api-client.ts`:

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

### Подробности за класа на ApiClient

Класът `ApiClient` конфигурира Axios с:

- **Заглавки по подразбиране**: `Content-Type: application/json`, `Accept: application/json`
- **Идентификационни данни**: `withCredentials: true` за удостоверяване, базирано на бисквитки
- **Token Interceptor**: Автоматично прикачва заглавката `Authorization: Bearer`
- **Прихващач на отговори**: Пренасочва към страницата за вход при отговор 401 (само за браузър)
- **Форматиране на грешка**: Преобразува грешките на Axios в структуриран `ApiError` обект

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Клиент от страната на сървъра (`ServerClient`)

Клиентът от страна на сървъра използва собствения `fetch` API и е предназначен за използване в маршрути на API на Next.js, сървърни компоненти и сървърни действия. Той предоставя функции, които са критични за комуникацията между сървъри.

### Ключови характеристики

|Характеристика|Описание|
|---------|-------------|
|**Автоматични повторни опити**|Повторни опити при мрежови грешки (конфигурируеми, по подразбиране 3)|
|**Изчакване**|Прекратява заявките след конфигурируема продължителност (по подразбиране 30 секунди)|
|**LRU кеш**|Кеш в паметта за GET заявки (100 записа, 5-минутен TTL)|
|**URL резолюция**|Разрешава относителни пътища срещу `PLATFORM_API_URL` за извиквания на платформа|
|**Вътрешна корекция на API**|Автоматично преобразува относителните URL адреси в абсолютни за SSR повиквания|
|**Поддръжка на FormData**|Премахва заглавката `Content-Type` за `FormData` качвания|

### Създаване и използване на сървърния клиент

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

### Предварително конфигурирани клиенти

Модулът експортира няколко готови за използване клиентски инстанции:

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

### API помощни програми

Обектът `apiUtils` предоставя общи помощни функции:

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

## Споделени типове

И двата клиента споделят общ набор от типове, дефинирани в `lib/api/types.ts`:

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

## API обработка на грешки за маршрути

Модулът `error-handler.ts` предоставя стандартизирани отговори за грешки за манипулатори на маршрути на API Next.js:

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

`HttpStatus` enum предоставя стандартни HTTP кодове за състояние:

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

## API константи

Файлът `constants.ts` дефинира споделена конфигурация, използвана от двата клиента:

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

## Кога да използвате кой клиент

|Сценарий|Клиент|защо|
|----------|--------|-----|
|Реагиране на извличане на данни за компонент|`apiClient` (браузър)|Singleton, управление на токени, пренасочване към 401|
|Функции за извличане на React Query|`fetcherGet` / `fetcherPaginated`|Удобни обвивки за функции за заявки|
|Зареждане на данни на сървърния компонент|`serverClient` (сървър)|Автоматично разрешаване на URL адреси, кеширане, повторни опити|
|API маршрут, извикващ външни услуги|`externalClient`|По-дълъг период на изчакване, без предположение за основен URL адрес|
|Обработка на грешки в маршрута на API|`handleApiError` / `withErrorHandling`|Стандартизирани отговори за грешка|

## Свързани файлове

- `lib/api/api-client.ts` - Браузър клиент сингълтон и експортиране на удобства
- `lib/api/api-client-class.ts` - Пълна реализация на клас `ApiClient`
- `lib/api/server-api-client.ts` - `ServerClient` клас от страна на сървъра
- `lib/api/singleton.ts` - Мениджър на единични модели
- `lib/api/types.ts` - Споделени дефиниции на типове TypeScript
- `lib/api/constants.ts` - API константи и настройки по подразбиране на React Query
- `lib/api/error-handler.ts` - Помощни програми за обработка на грешки в маршрута на Next.js API
