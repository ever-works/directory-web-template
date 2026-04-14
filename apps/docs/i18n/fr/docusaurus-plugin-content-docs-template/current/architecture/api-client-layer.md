---
id: api-client-layer
title: Couche client API
sidebar_label: Couche client API
sidebar_position: 30
---

# Couche client API

Le modèle comprend une architecture client à double API : un `ApiClient` côté navigateur construit sur Axios et un `ServerClient` côté serveur construit sur l'API native `fetch`. Les deux partagent une interface cohérente pour effectuer des requêtes HTTP, mais chacun est optimisé pour son environnement d'exécution.

## Présentation de l'architecture

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

## Client côté navigateur (`ApiClient`)

Le client côté navigateur enveloppe Axios et est conçu pour être utilisé dans les composants et les hooks React. Il est géré comme un singleton, donc une seule instance existe par session de navigateur.

### Modèle Singleton

La classe `ApiClientSingleton` empêche la création de plusieurs instances Axios :

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

### Utilisation du client navigateur

Importez le singleton préconfiguré depuis `api-client.ts` :

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

### Détails de la classe ApiClient

La classe `ApiClient` configure Axios avec :

- **En-têtes par défaut** : `Content-Type: application/json`, `Accept: application/json`
- **Identifiants** : `withCredentials: true` pour l'authentification basée sur les cookies
- **Intercepteur de jeton** : attache automatiquement l'en-tête `Authorization: Bearer`
- **Intercepteur de réponse** : redirige vers la page de connexion sur les réponses 401 (navigateur uniquement)
- **Formatage des erreurs** : convertit les erreurs Axios en un objet structuré `ApiError`

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Client côté serveur (`ServerClient`)

Le client côté serveur utilise l'API native `fetch` et est destiné à être utilisé dans les routes de l'API Next.js, les composants du serveur et les actions du serveur. Il fournit des fonctionnalités essentielles à la communication de serveur à serveur.

### Principales fonctionnalités

|Caractéristique|Descriptif|
|---------|-------------|
|**Nouvelles tentatives automatiques**|Nouvelles tentatives sur erreurs réseau (configurable, par défaut 3)|
|**Délai d'attente**|Abandonne les requêtes après une durée configurable (30 secondes par défaut)|
|**Cache LRU**|Cache en mémoire pour les requêtes GET (100 entrées, durée de vie de 5 minutes)|
|**Résolution d'URL**|Résout les chemins relatifs par rapport à `PLATFORM_API_URL` pour les appels de plateforme|
|**Correction de l'API interne**|Convertit automatiquement les URL relatives en URL absolues pour les appels SSR|
|**Prise en charge des données de formulaire**|Supprime l'en-tête `Content-Type` pour les téléchargements `FormData`|

### Création et utilisation du client serveur

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

### Clients préconfigurés

Le module exporte plusieurs instances client prêtes à l'emploi :

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

### Utilitaires API

L'objet `apiUtils` fournit des fonctions d'assistance courantes :

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

## Types partagés

Les deux clients partagent un ensemble commun de types définis dans `lib/api/types.ts` :

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

## Gestion des erreurs API pour les routes

Le module `error-handler.ts` fournit des réponses d'erreur standardisées pour les gestionnaires de routes de l'API Next.js :

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

L'énumération `HttpStatus` fournit des codes d'état HTTP standard :

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

## Constantes de l'API

Le fichier `constants.ts` définit la configuration partagée utilisée par les deux clients :

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

## Quand utiliser quel client

|Scénario|Client|Pourquoi|
|----------|--------|-----|
|Récupération des données des composants React|`apiClient` (navigateur)|Singleton, gestion des tokens, redirection sur 401|
|Fonctions de récupération de requête React|`fetcherGet` / `fetcherPaginated`|Wrappers pratiques pour les fonctions de requête|
|Chargement des données des composants du serveur|`serverClient` (serveur)|Résolution automatique des URL, mise en cache, tentatives|
|Route API appelant des services externes|`externalClient`|Délai d'expiration plus long, aucune hypothèse d'URL de base|
|Gestion des erreurs de route API|`handleApiError` / `withErrorHandling`|Réponses aux erreurs standardisées|

## Fichiers associés

- `lib/api/api-client.ts` - Exportations singleton et pratiques du client de navigateur
- `lib/api/api-client-class.ts` - Implémentation complète de la classe `ApiClient`
- `lib/api/server-api-client.ts` - Classe `ServerClient` côté serveur
- `lib/api/singleton.ts` - Gestionnaire de modèles Singleton
- `lib/api/types.ts` - Définitions de types TypeScript partagées
- `lib/api/constants.ts` - Constantes API et valeurs par défaut de React Query
- `lib/api/error-handler.ts` - Utilitaires de gestion des erreurs de route de l'API Next.js
