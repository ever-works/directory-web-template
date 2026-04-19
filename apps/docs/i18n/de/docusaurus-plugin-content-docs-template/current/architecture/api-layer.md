---
id: api-layer
title: "API-Layer-Architektur"
sidebar_label: "API-Schicht"
sidebar_position: 27
---

# API-Layer-Architektur

Die Vorlage stellt eine strukturierte API-Schicht mit zwei unterschiedlichen Client-Implementierungen bereit: eine browserseitige `ApiClient`-Klasse, die von Axios unterstützt wird, und eine serverseitige `ServerClient`-Klasse, die die native `fetch`-API verwendet. Beide teilen einheitliche Antworttypen, Fehlerbehandlung und Caching-Strategien.

## Client-Architektur

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

## Antworttypen

Die gesamte API-Kommunikation verwendet diskriminierte Union-Antworttypen, die in `lib/api/types.ts` definiert sind:

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

## Browserseitiger Client (ApiClient)

Die Klasse `ApiClient` unter `lib/api/api-client-class.ts` umhüllt Axios mit Interceptoren, Token-Verwaltung und Antwort-Auspacken:

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

### Singleton-Muster

Der Client wird als Singleton über `lib/api/singleton.ts` verwaltet:

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

Verbraucher importieren aus `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Serverseitiger Client (ServerClient)

Der `ServerClient` bei `lib/api/server-api-client.ts` verwendet natives `fetch` mit automatischen Wiederholungsversuchen, Timeout-Behandlung und einem speicherinternen LRU-Cache.

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

### Wiederholen und Zeitüberschreitung

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Wiederholungsversuche werden nur bei Netzwerkfehlern ausgelöst (nicht bei HTTP-Fehlern). Bei jedem Versuch wird `AbortController` zur Durchsetzung des Zeitlimits verwendet.

### Integriertes Anforderungs-Caching

GET-Anfragen werden automatisch in einer In-Memory-LRU-Map zwischengespeichert (100 Einträge, 5 Minuten TTL):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Vorkonfigurierte Instanzen

Das Modul exportiert mehrere vorkonfigurierte Clients:

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

## Behandlung von API-Routenfehlern

API-Routenhandler verwenden den standardisierten Fehlerhandler von `lib/api/error-handler.ts`:

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

### API-Routenorganisation

API-Routen leben unter `app/api/` und sind nach Domäne organisiert:

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

## Utility-Funktionen

Das `apiUtils`-Objekt stellt Helfer für die Arbeit mit API-Antworten bereit:

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

## Berechtigungs-Middleware

API-Routen, die bestimmte Berechtigungen erfordern, verwenden das Dienstprogramm zur Berechtigungsprüfung von `lib/middleware/permission-check.ts`:

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

## Konfigurationskonstanten

Die Standardabfrage- und Cacheeinstellungen sind in `lib/api/constants.ts` zentralisiert:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Dateireferenz

|Datei|Zweck|
|------|---------|
|`lib/api/api-client-class.ts`|Browserseitiger Axios-Client mit Interceptoren|
|`lib/api/api-client.ts`|Singleton-Export und Convenience-Fetcher|
|`lib/api/singleton.ts`|Singleton-Mustermanager|
|`lib/api/server-api-client.ts`|Serverseitiger Abrufclient mit Caching und Wiederholungsversuchen|
|`lib/api/error-handler.ts`|Standardisierte API-Fehlerreaktionen|
|`lib/api/types.ts`|Gemeinsame Anforderungs-/Antwort-TypeScript-Typen|
|`lib/api/constants.ts`|Standardkonfigurationskonstanten|
|`lib/middleware/permission-check.ts`|Berechtigungsüberprüfung für API-Routen|
