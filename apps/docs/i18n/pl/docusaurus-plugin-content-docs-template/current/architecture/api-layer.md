---
id: api-layer
title: "Architektura warstwy API"
sidebar_label: "Warstwa API"
sidebar_position: 27
---

# Architektura warstwy API

Szablon zapewnia ustrukturyzowaną warstwę API z dwiema różnymi implementacjami klientów: klasą `ApiClient` po stronie przeglądarki wspieraną przez Axios oraz klasę `ServerClient` po stronie serwera korzystającą z natywnego API `fetch`. Obydwa mają spójne typy odpowiedzi, obsługę błędów i strategie buforowania.

## Architektura Klienta

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

## Typy odpowiedzi

Cała komunikacja API wykorzystuje typy odpowiedzi dyskryminowanych zdefiniowanych w `lib/api/types.ts`:

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

## Klient po stronie przeglądarki (ApiClient)

Klasa `ApiClient` w `lib/api/api-client-class.ts` otacza Axios za pomocą przechwytywaczy, zarządzania tokenami i rozpakowywania odpowiedzi:

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

### Wzór Singletona

Klient jest zarządzany jako singleton poprzez `lib/api/singleton.ts`:

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

Konsumenci importują z `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Klient po stronie serwera (ServerClient)

`ServerClient` w `lib/api/server-api-client.ts` wykorzystuje natywny `fetch` z automatycznymi ponownymi próbami, obsługą limitu czasu i pamięcią podręczną LRU w pamięci.

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

### Ponów próbę i przekroczono limit czasu

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Ponowne próby są wyzwalane tylko w przypadku błędów sieciowych (nie błędów HTTP). Każda próba wykorzystuje `AbortController` do wymuszenia przekroczenia limitu czasu.

### Wbudowane buforowanie żądań

Żądania GET są automatycznie buforowane na mapie LRU w pamięci (100 wpisów, 5 minut TTL):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Wstępnie skonfigurowane instancje

Moduł eksportuje kilku wstępnie skonfigurowanych klientów:

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

## Obsługa błędów trasy API

Procedury obsługi tras API korzystają ze standardowej obsługi błędów z `lib/api/error-handler.ts`:

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

### Organizacja tras API

Trasy API znajdują się pod `app/api/` i są zorganizowane według domen:

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

## Funkcje użytkowe

Obiekt `apiUtils` udostępnia pomoce do pracy z odpowiedziami API:

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

## Oprogramowanie pośredniczące uprawnień

Trasy API wymagające określonych uprawnień korzystają z narzędzia sprawdzania uprawnień `lib/middleware/permission-check.ts`:

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

## Stałe konfiguracyjne

Domyślne ustawienia zapytań i pamięci podręcznej są scentralizowane w `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Odniesienie do pliku

|Plik|Cel|
|------|---------|
|`lib/api/api-client-class.ts`|Klient Axios po stronie przeglądarki z przechwytywaczami|
|`lib/api/api-client.ts`|Eksport i wygodne moduły pobierające Singleton|
|`lib/api/singleton.ts`|Menedżer wzorców Singletona|
|`lib/api/server-api-client.ts`|Klient pobierania po stronie serwera z buforowaniem i ponownymi próbami|
|`lib/api/error-handler.ts`|Standaryzowane odpowiedzi na błędy API|
|`lib/api/types.ts`|Udostępnione typy żądań/odpowiedzi TypeScript|
|`lib/api/constants.ts`|Domyślne stałe konfiguracyjne|
|`lib/middleware/permission-check.ts`|Weryfikacja uprawnień dla tras API|
