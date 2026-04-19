---
id: api-layer
title: "Arquitectura de capa API"
sidebar_label: "Capa API"
sidebar_position: 27
---

# Arquitectura de capa API

La plantilla proporciona una capa API estructurada con dos implementaciones de cliente distintas: una clase `ApiClient` del lado del navegador respaldada por Axios y una clase `ServerClient` del lado del servidor que utiliza la API `fetch` nativa. Ambos comparten tipos de respuesta, manejo de errores y estrategias de almacenamiento en caché consistentes.

## Arquitectura del cliente

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

## Tipos de respuesta

Toda la comunicación API utiliza tipos de respuesta de unión discriminados definidos en `lib/api/types.ts`:

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

## Cliente del lado del navegador (ApiClient)

La clase `ApiClient` en `lib/api/api-client-class.ts` envuelve Axios con interceptores, administración de tokens y desenvolvimiento de respuestas:

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

### Patrón singleton

El cliente se gestiona como singleton a través de `lib/api/singleton.ts`:

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

Los consumidores importan desde `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Cliente del lado del servidor (ServerClient)

El `ServerClient` en `lib/api/server-api-client.ts` utiliza `fetch` nativo con reintentos automáticos, manejo de tiempo de espera y un caché LRU en memoria.

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

### Reintento y tiempo de espera

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Los reintentos solo se activan ante errores de red (no errores HTTP). Cada intento utiliza `AbortController` para aplicar el tiempo de espera.

### Almacenamiento en caché de solicitudes integrado

Las solicitudes GET se almacenan automáticamente en caché en un mapa LRU en memoria (100 entradas, TTL de 5 minutos):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Instancias preconfiguradas

El módulo exporta varios clientes preconfigurados:

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

## Manejo de errores de ruta API

Los controladores de ruta API utilizan el controlador de errores estandarizado de `lib/api/error-handler.ts`:

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

### Organización de rutas API

Las rutas API se encuentran en `app/api/` y están organizadas por dominio:

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

## Funciones de utilidad

El objeto `apiUtils` proporciona ayudas para trabajar con respuestas API:

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

## Middleware de permisos

Las rutas API que requieren permisos específicos utilizan la utilidad de verificación de permisos de `lib/middleware/permission-check.ts`:

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

## Constantes de configuración

La configuración predeterminada de consulta y caché está centralizada en `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Referencia de archivo

|Archivo|Propósito|
|------|---------|
|`lib/api/api-client-class.ts`|Cliente Axios del lado del navegador con interceptores|
|`lib/api/api-client.ts`|Exportadores de conveniencia y exportación Singleton|
|`lib/api/singleton.ts`|Administrador de patrones singleton|
|`lib/api/server-api-client.ts`|Cliente de recuperación del lado del servidor con almacenamiento en caché y reintentos|
|`lib/api/error-handler.ts`|Respuestas de error de API estandarizadas|
|`lib/api/types.ts`|Tipos de TypeScript de solicitud/respuesta compartida|
|`lib/api/constants.ts`|Constantes de configuración predeterminadas|
|`lib/middleware/permission-check.ts`|Verificación de permisos para rutas API|
