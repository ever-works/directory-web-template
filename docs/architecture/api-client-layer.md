---
id: api-client-layer
title: API Client Layer
sidebar_label: API Client Layer
sidebar_position: 30
---

# API Client Layer

The template includes a dual API client architecture: a browser-side `ApiClient` built on Axios and a server-side `ServerClient` built on the native `fetch` API. Both share a consistent interface for making HTTP requests, but each is optimized for its runtime environment.

## Architecture Overview

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

## Browser-Side Client (`ApiClient`)

The browser-side client wraps Axios and is designed for use inside React components and hooks. It is managed as a singleton so only one instance exists per browser session.

### Singleton Pattern

The `ApiClientSingleton` class prevents multiple Axios instances from being created:

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

### Using the Browser Client

Import the pre-configured singleton from `api-client.ts`:

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

### ApiClient Class Details

The `ApiClient` class configures Axios with:

- **Default headers**: `Content-Type: application/json`, `Accept: application/json`
- **Credentials**: `withCredentials: true` for cookie-based auth
- **Token interceptor**: Automatically attaches the `Authorization: Bearer` header
- **Response interceptor**: Redirects to the login page on 401 responses (browser only)
- **Error formatting**: Converts Axios errors into a structured `ApiError` object

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Server-Side Client (`ServerClient`)

The server-side client uses the native `fetch` API and is intended for use inside Next.js API routes, server components, and server actions. It provides features that are critical for server-to-server communication.

### Key Features

| Feature | Description |
|---------|-------------|
| **Automatic retries** | Retries on network errors (configurable, default 3) |
| **Timeout** | Aborts requests after a configurable duration (default 30 seconds) |
| **LRU cache** | In-memory cache for GET requests (100 entries, 5-minute TTL) |
| **URL resolution** | Resolves relative paths against `PLATFORM_API_URL` for platform calls |
| **Internal API fix** | Automatically converts relative URLs to absolute for SSR calls |
| **FormData support** | Strips `Content-Type` header for `FormData` uploads |

### Creating and Using the Server Client

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

### Pre-configured Clients

The module exports several ready-to-use client instances:

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

### API Utilities

The `apiUtils` object provides common helper functions:

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

## Shared Types

Both clients share a common set of types defined in `lib/api/types.ts`:

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

## API Error Handling for Routes

The `error-handler.ts` module provides standardized error responses for Next.js API route handlers:

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

The `HttpStatus` enum provides standard HTTP status codes:

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

## API Constants

The `constants.ts` file defines shared configuration used by both clients:

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

## When to Use Which Client

| Scenario | Client | Why |
|----------|--------|-----|
| React component data fetching | `apiClient` (browser) | Singleton, token management, redirect on 401 |
| React Query fetcher functions | `fetcherGet` / `fetcherPaginated` | Convenient wrappers for query functions |
| Server component data loading | `serverClient` (server) | Automatic URL resolution, caching, retries |
| API route calling external services | `externalClient` | Longer timeout, no base URL assumption |
| API route error handling | `handleApiError` / `withErrorHandling` | Standardized error responses |

## Related Files

- `lib/api/api-client.ts` - Browser client singleton and convenience exports
- `lib/api/api-client-class.ts` - Full `ApiClient` class implementation
- `lib/api/server-api-client.ts` - Server-side `ServerClient` class
- `lib/api/singleton.ts` - Singleton pattern manager
- `lib/api/types.ts` - Shared TypeScript type definitions
- `lib/api/constants.ts` - API constants and React Query defaults
- `lib/api/error-handler.ts` - Next.js API route error handling utilities
