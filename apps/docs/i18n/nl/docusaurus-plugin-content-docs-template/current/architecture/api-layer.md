---
id: api-layer
title: "API-laagarchitectuur"
sidebar_label: "API-laag"
sidebar_position: 27
---

# API-laagarchitectuur

De sjabloon biedt een gestructureerde API-laag met twee verschillende clientimplementaties: een `ApiClient`-klasse aan de browserzijde, ondersteund door Axios, en een `ServerClient`-klasse aan de serverzijde die de native `fetch` API gebruikt. Beide delen consistente reactietypen, foutafhandeling en cachingstrategieën.

## Klantarchitectuur

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

## Reactietypen

Alle API-communicatie maakt gebruik van gediscrimineerde typen vakbondsreacties die zijn gedefinieerd in `lib/api/types.ts`:

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

## Browser-side client (ApiClient)

De `ApiClient` klasse op `lib/api/api-client-class.ts` omhult Axios met interceptors, tokenbeheer en het uitpakken van antwoorden:

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

### Singleton-patroon

De klant wordt beheerd als singleton via `lib/api/singleton.ts`:

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

Consumenten importeren vanuit `lib/api/api-client.ts`:

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Server-side client (ServerClient)

De `ServerClient` op `lib/api/server-api-client.ts` gebruikt native `fetch` met automatische nieuwe pogingen, time-outafhandeling en een LRU-cache in het geheugen.

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

### Opnieuw proberen en time-out

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Nieuwe pogingen worden alleen geactiveerd bij netwerkfouten (geen HTTP-fouten). Bij elke poging wordt `AbortController` gebruikt voor het afdwingen van een time-out.

### Ingebouwde verzoekcaching

GET-verzoeken worden automatisch in de cache opgeslagen in een LRU-kaart in het geheugen (100 vermeldingen, 5 minuten TTL):

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Vooraf geconfigureerde instanties

De module exporteert verschillende vooraf geconfigureerde clients:

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

## Foutafhandeling van API-routes

API-routehandlers gebruiken de gestandaardiseerde fouthandler van `lib/api/error-handler.ts`:

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

### API-routeorganisatie

API-routes staan onder `app/api/` en zijn georganiseerd per domein:

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

## Nuttige functies

Het `apiUtils`-object biedt hulp bij het werken met API-antwoorden:

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

## Toestemming middleware

API-routes waarvoor specifieke machtigingen vereist zijn, gebruiken het hulpprogramma voor toestemmingscontrole van `lib/middleware/permission-check.ts`:

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

## Configuratieconstanten

Standaard query- en cache-instellingen zijn gecentraliseerd in `lib/api/constants.ts`:

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Bestandsreferentie

|Bestand|Doel|
|------|---------|
|`lib/api/api-client-class.ts`|Axios-client aan browserzijde met interceptors|
|`lib/api/api-client.ts`|Singleton export- en gemaksophaalprogramma's|
|`lib/api/singleton.ts`|Singleton-patroonmanager|
|`lib/api/server-api-client.ts`|Ophaalclient aan de serverzijde met caching en nieuwe pogingen|
|`lib/api/error-handler.ts`|Gestandaardiseerde API-foutreacties|
|`lib/api/types.ts`|Gedeelde verzoek/antwoord TypeScript-typen|
|`lib/api/constants.ts`|Standaardconfiguratieconstanten|
|`lib/middleware/permission-check.ts`|Toestemmingsverificatie voor API-routes|
