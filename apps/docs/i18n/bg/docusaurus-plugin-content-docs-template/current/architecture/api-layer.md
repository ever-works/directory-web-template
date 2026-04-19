---
id: api-layer
title: "Архитектура на API слой"
sidebar_label: "API слой"
sidebar_position: 27
---

# Архитектура на API слой

Шаблонът предоставя структуриран API слой с две отделни клиентски реализации: `ApiClient` клас от страна на браузъра, подкрепен от Axios, и `ServerClient` клас от страна на сървъра, използващ собствения `fetch` API. И двете споделят последователни типове отговори, обработка на грешки и стратегии за кеширане.

## Клиентска архитектура

```
lib/api/
  api-client-class.ts   -- Browser-side Axios client
  api-client.ts          -- Singleton export for browser client
  singleton.ts           -- Singleton manager
  server-api-client.ts   -- Server-side fetch client
  error-handler.ts       -- Standardized API route error handling
  types.ts               -- Shared TypeScript types
  constants.ts           -- Configuration constants
```

## Типове отговори

Цялата API комуникация използва дискриминирани типове отговори на съюза, дефинирани в `lib/api/types.ts`:

```tsx
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | {
      success: true;
      data: T[];
      meta: { page: number; totalPages: number; total: number; limit: number };
    }
  | { success: false; error: string };

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Клиент от страна на браузъра (ApiClient)

Класът `ApiClient` в `lib/api/api-client-class.ts` обвива Axios с прехващачи, управление на токени и разопаковане на отговор:

```tsx
// lib/api/api-client-class.ts
export class ApiClient {
  private readonly client: AxiosInstance;
  private accessToken?: string;

  constructor(config: ApiClientConfig = {}) {
    this.client = axios.create({
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.accessToken}`,
      },
      withCredentials: true,
    });
    this.setupInterceptors();
    this.tokenInterceptor();
  }

  // Automatic redirect on 401
  private handleResponseError = async (error) => {
    if (responseError.response?.status === 401) {
      window.location.href = env.AUTH_ENDPOINT_LOGIN;
    }
    throw this.formatError(error);
  };

  // All methods unwrap the ApiResponse envelope
  public async get<T>(endpoint, params?, config?): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(endpoint, {
      params, ...config
    });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Request failed');
    }
    return response.data.data;
  }

  // post, put, patch, delete follow the same pattern
  // getPaginated returns the full PaginatedResponse
}
```

### Единичен модел

Клиентът се управлява като единичен чрез `lib/api/singleton.ts`:

```tsx
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
```

Потребителите внасят от `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Клиент от страната на сървъра (ServerClient)

`ServerClient` на `lib/api/server-api-client.ts` използва естествен `fetch` с автоматични повторни опити, обработка на изчакване и LRU кеш в паметта.

```tsx
// lib/api/server-api-client.ts
export class ServerClient {
  async get<T>(endpoint, options?): Promise<ApiResponse<T>> { ... }
  async post<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async put<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async patch<T>(endpoint, data?, options?): Promise<ApiResponse<T>> { ... }
  async delete<T>(endpoint, options?): Promise<ApiResponse<T>> { ... }
  async upload<T>(endpoint, file, options?): Promise<ApiResponse<T>> { ... }
  async postForm<T>(endpoint, data, options?): Promise<ApiResponse<T>> { ... }
}
```

### Повторен опит и изчакване

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Повторните опити се задействат само при мрежови грешки (не при HTTP грешки). Всеки опит използва `AbortController` за принудително изчакване.

### Вградено кеширане на заявки

GET заявките автоматично се кешират в LRU карта в паметта (100 записа, 5-минутен TTL):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Предварително конфигурирани екземпляри

Модулът експортира няколко предварително конфигурирани клиента:

```tsx
// Default client
export const serverClient = new ServerClient();

// ReCAPTCHA verification shortcut
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  },
};

// External API client (longer timeout)
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});
```

## Обработка на грешки при API маршрут

API маршрутизаторите използват стандартизирания манипулатор на грешки от `lib/api/error-handler.ts`:

```tsx
// lib/api/error-handler.ts
export enum HttpStatus {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}

export function handleApiError(error: unknown, context = 'API') {
  // Logs error, determines status code, sanitizes in production
  return createApiErrorResponse(message, status, code);
}

// Convenience wrapper for route handlers
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  context: string = 'API'
) {
  return handler().catch((error) => handleApiError(error, context));
}
```

### Организация на маршрута на API

API маршрутите живеят под `app/api/` и са организирани по домейн:

```
app/api/
  admin/          -- Admin CRUD endpoints
  auth/           -- Authentication endpoints
  categories/     -- Category management
  favorites/      -- User favorites
  items/          -- Item CRUD and search
  payment/        -- Payment processing
  verify-recaptcha/ -- reCAPTCHA verification
  health/         -- Health check endpoint
  ...
```

## Полезни функции

Обектът `apiUtils` предоставя помощници за работа с API отговори:

```tsx
export const apiUtils = {
  isSuccess: <T>(response: ApiResponse<T>): boolean => {
    return response.success && response.data !== undefined;
  },
  getErrorMessage: (response: ApiResponse): string => {
    return response.error || response.message || 'Unknown error';
  },
  createQueryString: (params: Record<string, any>): string => { ... },
  buildUrl: (baseUrl: string, params?: Record<string, any>): string => { ... },
  clearCache: (): void => { cacheUtils.clear(); },
};
```

## Мидълуер за разрешение

API маршрутите, които изискват специфични разрешения, използват помощната програма за проверка на разрешения от `lib/middleware/permission-check.ts`:

```tsx
// lib/middleware/permission-check.ts
export function hasPermission(
  userPermissions: UserPermissions,
  permission: Permission
): boolean {
  return userPermissions.permissions.includes(permission);
}

export function hasAnyPermission(
  userPermissions: UserPermissions,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(userPermissions, p));
}
```

## Константи за конфигурация

Настройките за заявка и кеш по подразбиране са централизирани в `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Референтен файл

|Файл|Цел|
|------|---------|
|`lib/api/api-client-class.ts`|Axios клиент от страна на браузъра с прехващачи|
|`lib/api/api-client.ts`|Сингълтън експорт и удобни средства за извличане|
|`lib/api/singleton.ts`|Мениджър на шаблони Singleton|
|`lib/api/server-api-client.ts`|Клиент за извличане от страна на сървъра с кеширане и повторни опити|
|`lib/api/error-handler.ts`|Стандартизирани отговори за грешка на API|
|`lib/api/types.ts`|Споделени типове заявка/отговор TypeScript|
|`lib/api/constants.ts`|Константи за конфигурация по подразбиране|
|`lib/middleware/permission-check.ts`|Проверка на разрешение за API маршрути|
