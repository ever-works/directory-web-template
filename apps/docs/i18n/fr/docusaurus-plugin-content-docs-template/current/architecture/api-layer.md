---
id: api-layer
title: "Architecture de la couche API"
sidebar_label: "Couche API"
sidebar_position: 27
---

# Architecture de la couche API

Le modèle fournit une couche API structurée avec deux implémentations client distinctes : une classe `ApiClient` côté navigateur soutenue par Axios et une classe `ServerClient` côté serveur utilisant l'API native `fetch`. Les deux partagent des types de réponse, une gestion des erreurs et des stratégies de mise en cache cohérentes.

## Architecture client

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

## Types de réponses

Toutes les communications API utilisent des types de réponse d'union discriminés définis dans `lib/api/types.ts` :

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

## Client côté navigateur (ApiClient)

La classe `ApiClient` à `lib/api/api-client-class.ts` enveloppe Axios avec des intercepteurs, la gestion des jetons et le déballage des réponses :

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

### Modèle Singleton

Le client est géré en singleton via `lib/api/singleton.ts` :

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

Les consommateurs importent depuis `lib/api/api-client.ts` :

```tsx
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
```

## Client côté serveur (ServerClient)

Le `ServerClient` à `lib/api/server-api-client.ts` utilise le `fetch` natif avec des tentatives automatiques, une gestion des délais d'attente et un cache LRU en mémoire.

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

### Nouvelle tentative et expiration du délai

```tsx
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // up to 3 retry attempts
  retryDelay: 1000,  // 1 second initial delay
};
```

Les nouvelles tentatives ne se déclenchent que sur les erreurs réseau (pas sur les erreurs HTTP). Chaque tentative utilise `AbortController` pour l'application du délai d'attente.

### Mise en cache des requêtes intégrée

Les requêtes GET sont automatiquement mises en cache dans une carte LRU en mémoire (100 entrées, TTL de 5 minutes) :

```tsx
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Cache is checked before every GET request
if (this.cacheEnabled && isGetRequest) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Instances préconfigurées

Le module exporte plusieurs clients préconfigurés :

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

## Gestion des erreurs de route API

Les gestionnaires de routes API utilisent le gestionnaire d'erreurs standardisé de `lib/api/error-handler.ts` :

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

### Organisation de la route API

Les routes API se trouvent sous `app/api/` et sont organisées par domaine :

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

## Fonctions utilitaires

L'objet `apiUtils` fournit des aides pour travailler avec les réponses API :

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

## Intergiciel d’autorisation

Les routes API qui nécessitent des autorisations spécifiques utilisent l'utilitaire de vérification des autorisations de `lib/middleware/permission-check.ts` :

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

## Constantes de configuration

Les paramètres de requête et de cache par défaut sont centralisés dans `lib/api/constants.ts` :

```tsx
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,   // 5 minutes
  gcTime: 24 * 60 * 60 * 1000, // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Référence du fichier

|Fichier|Objectif|
|------|---------|
|`lib/api/api-client-class.ts`|Client Axios côté navigateur avec intercepteurs|
|`lib/api/api-client.ts`|Exportation Singleton et récupérateurs de commodité|
|`lib/api/singleton.ts`|Gestionnaire de modèles Singleton|
|`lib/api/server-api-client.ts`|Client de récupération côté serveur avec mise en cache et tentatives|
|`lib/api/error-handler.ts`|Réponses aux erreurs d'API standardisées|
|`lib/api/types.ts`|Types TypeScript de requête/réponse partagée|
|`lib/api/constants.ts`|Constantes de configuration par défaut|
|`lib/middleware/permission-check.ts`|Vérification des autorisations pour les routes API|
