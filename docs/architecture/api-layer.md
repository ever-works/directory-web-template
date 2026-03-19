---
id: api-layer
title: "API Layer Architecture"
sidebar_label: "API Layer"
sidebar_position: 27
---

# API Layer Architecture

The template provides a structured API layer with two distinct client implementations: a browser-side `ApiClient` class backed by Axios, and a server-side `ServerClient` class using the native `fetch` API. Both share consistent response types, error handling, and caching strategies.

## Client Architecture

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

## Response Types

All API communication uses discriminated union response types defined in `lib/api/types.ts`:

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

## Browser-Side Client (ApiClient)

The `ApiClient` class at `lib/api/api-client-class.ts` wraps Axios with interceptors, token management, and response unwrapping:

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

### Singleton Pattern

The client is managed as a singleton via `lib/api/singleton.ts`:

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

Consumers import from `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Server-Side Client (ServerClient)

The `ServerClient` at `lib/api/server-api-client.ts` uses native `fetch` with automatic retries, timeout handling, and an in-memory LRU cache.

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

### Retry and Timeout

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Retries only trigger on network errors (not HTTP errors). Each attempt uses `AbortController` for timeout enforcement.

### Built-in Request Caching

GET requests are automatically cached in an in-memory LRU map (100 entries, 5-minute TTL):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Pre-configured Instances

The module exports several pre-configured clients:

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

## API Route Error Handling

API route handlers use the standardized error handler from `lib/api/error-handler.ts`:

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

### API Route Organization

API routes live under `app/api/` and are organized by domain:

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

## Utility Functions

The `apiUtils` object provides helpers for working with API responses:

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

## Permission Middleware

API routes that require specific permissions use the permission check utility from `lib/middleware/permission-check.ts`:

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

## Configuration Constants

Default query and cache settings are centralized in `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## File Reference

| File | Purpose |
|------|---------|
| `lib/api/api-client-class.ts` | Browser-side Axios client with interceptors |
| `lib/api/api-client.ts` | Singleton export and convenience fetchers |
| `lib/api/singleton.ts` | Singleton pattern manager |
| `lib/api/server-api-client.ts` | Server-side fetch client with caching and retries |
| `lib/api/error-handler.ts` | Standardized API error responses |
| `lib/api/types.ts` | Shared request/response TypeScript types |
| `lib/api/constants.ts` | Default configuration constants |
| `lib/middleware/permission-check.ts` | Permission verification for API routes |
