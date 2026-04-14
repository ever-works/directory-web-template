---
id: api-client-layer
title: API-clientlaag
sidebar_label: API-clientlaag
sidebar_position: 30
---

# API-clientlaag

De sjabloon bevat een dubbele API-clientarchitectuur: een `ApiClient` aan de browserzijde gebouwd op Axios en een `ServerClient` aan de serverzijde gebouwd op de native `fetch` API. Beide delen een consistente interface voor het doen van HTTP-verzoeken, maar elk is geoptimaliseerd voor zijn runtime-omgeving.

## Architectuuroverzicht

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

## Browser-side client (`ApiClient`)

De browser-side client omhult Axios en is ontworpen voor gebruik in React-componenten en hooks. Het wordt beheerd als een singleton, dus er bestaat slechts één exemplaar per browsersessie.

### Singleton-patroon

De klasse `ApiClientSingleton` voorkomt dat er meerdere Axios-instanties worden gemaakt:

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

### De browserclient gebruiken

Importeer de vooraf geconfigureerde singleton van `api-client.ts`:

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

### Details van ApiClient-klasse

De klasse `ApiClient` configureert Axios met:

- **Standaardkopteksten**: `Content-Type: application/json`, `Accept: application/json`
- **Inloggegevens**: `withCredentials: true` voor op cookies gebaseerde authenticatie
- **Token-interceptor**: voegt automatisch de `Authorization: Bearer`-header toe
- **Response interceptor**: verwijst door naar de inlogpagina op 401-reacties (alleen browser)
- **Foutformattering**: Converteert Axios-fouten naar een gestructureerd `ApiError`-object

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Server-side client (`ServerClient`)

De server-side client gebruikt de native `fetch` API en is bedoeld voor gebruik binnen Next.js API-routes, servercomponenten en serveracties. Het biedt functies die cruciaal zijn voor server-naar-server-communicatie.

### Belangrijkste kenmerken

|Functie|Beschrijving|
|---------|-------------|
|**Automatische nieuwe pogingen**|Nieuwe pogingen bij netwerkfouten (configureerbaar, standaard 3)|
|**Time-out**|Breekt verzoeken af na een configureerbare duur (standaard 30 seconden)|
|**LRU-cache**|In-memory cache voor GET-verzoeken (100 vermeldingen, 5 minuten TTL)|
|**URL-resolutie**|Lost relatieve paden op tegen `PLATFORM_API_URL` voor platformaanroepen|
|**Interne API-oplossing**|Converteert relatieve URL's automatisch naar absoluut voor SSR-aanroepen|
|**FormData-ondersteuning**|Strips `Content-Type` header voor `FormData` uploads|

### De serverclient maken en gebruiken

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

### Vooraf geconfigureerde klanten

De module exporteert verschillende kant-en-klare clientinstanties:

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

### API-hulpprogramma's

Het `apiUtils`-object biedt algemene helperfuncties:

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

## Gedeelde typen

Beide clients delen een gemeenschappelijke set typen gedefinieerd in `lib/api/types.ts`:

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

## API-foutafhandeling voor routes

De module `error-handler.ts` biedt gestandaardiseerde foutreacties voor Next.js API-routehandlers:

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

De `HttpStatus` enum biedt standaard HTTP-statuscodes:

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

## API-constanten

Het bestand `constants.ts` definieert de gedeelde configuratie die door beide clients wordt gebruikt:

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

## Wanneer moet u welke client gebruiken?

|Scenario|Klant|Waarom|
|----------|--------|-----|
|Reageer op het ophalen van componentgegevens|`apiClient` (browser)|Singleton, tokenbeheer, omleiding op 401|
|Reageer Query-ophaalfuncties|`fetcherGet` / `fetcherPaginated`|Handige wrappers voor queryfuncties|
|Gegevens laden van servercomponenten|`serverClient` (server)|Automatische URL-resolutie, caching, nieuwe pogingen|
|API-route voor het aanroepen van externe services|`externalClient`|Langere time-out, geen aanname van basis-URL|
|Foutafhandeling van API-routes|`handleApiError` / `withErrorHandling`|Gestandaardiseerde foutreacties|

## Gerelateerde bestanden

- `lib/api/api-client.ts` - Singleton- en gemaksexport via browserclient
- `lib/api/api-client-class.ts` - Volledige implementatie van de klasse `ApiClient`
- `lib/api/server-api-client.ts` - `ServerClient`-klasse aan serverzijde
- `lib/api/singleton.ts` - Singleton-patroonmanager
- `lib/api/types.ts` - Gedeelde TypeScript-typedefinities
- `lib/api/constants.ts` - API-constanten en standaardinstellingen voor React Query
- `lib/api/error-handler.ts` - Hulpprogramma's voor het afhandelen van fouten in de API-route van Next.js
