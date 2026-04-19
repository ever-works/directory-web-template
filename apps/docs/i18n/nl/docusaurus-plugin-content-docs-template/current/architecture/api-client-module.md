---
id: api-client-module
title: API-clientmodule
sidebar_label: API-clientmodule
sidebar_position: 51
---

# API-clientmodule

De API-clientmodule (`template/lib/api/`) biedt een uitgebreide HTTP-clientlaag voor zowel client- als server-side API-communicatie. Het omvat een Axios-gebaseerde client voor browsergebruik, een native `fetch`-gebaseerde serverclient met caching en nieuwe pogingen, gespecialiseerde domeinclients en gestandaardiseerde foutafhandeling.

## Architectuuroverzicht

```mermaid
graph TD
    subgraph Client Side
        A[ApiClient Class] -->|Axios| B[Browser HTTP]
        C[apiClient singleton] --> A
        D[fetcherGet / fetcherPaginated] --> C
    end

    subgraph Server Side
        E[ServerClient Class] -->|fetch| F[Node HTTP]
        G[serverClient singleton] --> E
        H[externalClient] --> E
        I[recaptchaClient] --> G
    end

    subgraph Domain Clients
        J[LemonSqueezyClient] --> G
        K[SurveyApiClient] --> C
    end

    subgraph Error Handling
        L[handleApiError] --> M[createApiErrorResponse]
        N[withErrorHandling] --> L
    end

    O[API_CONSTANTS / QUERY_CONFIG] -->|Config| A
    O -->|Config| E
```

## Bronbestanden

|Bestand|Beschrijving|
|------|-------------|
|`lib/api/types.ts`|Gedeelde typedefinities voor API-laag|
|`lib/api/constants.ts`|API-constanten en queryconfiguratie|
|`lib/api/api-client-class.ts`|`ApiClient` -- Axios-gebaseerde client voor browser|
|`lib/api/singleton.ts`|`ApiClientSingleton` beheerder|
|`lib/api/api-client.ts`|Vooraf gebouwde clientinstantie en ophaalhelpers|
|`lib/api/server-api-client.ts`|`ServerClient` -- op fetch gebaseerde serverclient|
|`lib/api/error-handler.ts`|Gestandaardiseerde API-foutafhandeling|
|`lib/api/lemonsqueezy-client.ts`|LemonSqueezy-betalingsclient|
|`lib/api/survey-api.client.ts`|Enquête CRUD-klant|

## Typedefinities

### Kerntypen

```typescript
type ApiEndpoint = string;
type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### Reactietypen (gediscrimineerde vakbonden)

```typescript
type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Clientconfiguratie

```typescript
interface ApiClientConfig extends Partial<AxiosRequestConfig> {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  accessToken?: string;
  frontendUrl?: string;
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
```

## Klantzijde: `ApiClient`

De klasse `ApiClient` omhult Axios met automatische tokeninjectie, afhandeling van reactiefouten en getypte reacties.

### Constructeur

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  accessToken: 'bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

### HTTP-methoden

Alle methoden pakken de `ApiResponse`-envelop uit en sturen het veld `data` rechtstreeks terug:

```typescript
// GET with query params
const items = await client.get<Item[]>('/items', { category: 'tools', limit: 10 });

// POST with body
const created = await client.post<Item>('/items', { name: 'New Tool', url: 'https://...' });

// PUT
const updated = await client.put<Item>('/items/123', { name: 'Updated' });

// PATCH
const patched = await client.patch<Item>('/items/123', { status: 'approved' });

// DELETE
await client.delete<void>('/items/123');

// Paginated GET
const page = await client.getPaginated<Item>('/items', { page: 1, limit: 20, search: 'react' });
```

### Singleton-toegang

```typescript
import { getApiClient } from '@/lib/api/singleton';

const client = getApiClient();                    // Default instance
ApiClientSingleton.resetInstance();                // Reset (for tests)
```

### Gemaksexport

```typescript
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Use with React Query / SWR
const data = await fetcherGet<Item[]>('/api/items', { status: 'published' });
const page = await fetcherPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## Serverzijde: `ServerClient`

De klasse `ServerClient` gebruikt native `fetch` met time-outafhandeling, automatische nieuwe pogingen, LRU-caching en serverspecifieke URL-resolutie.

### Belangrijkste kenmerken

- **Time-outafhandeling** met `AbortController` (standaard: 30 seconden)
- **Automatische nieuwe pogingen** bij netwerkfouten (standaard: 3 nieuwe pogingen met een vertraging van 1 seconde)
- **LRU-cache in het geheugen** voor GET-verzoeken (100 vermeldingen, TTL van 5 minuten)
- **Server-URL-resolutie** voor interne API-routes tijdens SSR
- **FormData-ondersteuning** met automatische verwerking van inhoudstypen

### Vooraf gebouwde instanties

```typescript
import { serverClient, externalClient, createApiClient, recaptchaClient } from '@/lib/api/server-api-client';

// Default server client
const result = await serverClient.get<UserData>('/api/users/me');

// External API client (15s timeout, 2 retries)
const external = await externalClient.get<any>('https://api.third-party.com/data');

// Custom client
const customClient = createApiClient('https://api.service.com', { timeout: 10000 });

// ReCAPTCHA verification
const captcha = await recaptchaClient.verify(token);
```

### HTTP-methoden

```typescript
// All methods return ApiResponse<T>
const result = await serverClient.get<T>(endpoint, options?);
const result = await serverClient.post<T>(endpoint, data?, options?);
const result = await serverClient.put<T>(endpoint, data?, options?);
const result = await serverClient.patch<T>(endpoint, data?, options?);
const result = await serverClient.delete<T>(endpoint, options?);

// File upload
const result = await serverClient.upload<T>(endpoint, fileOrFormData, options?);

// URL-encoded form data
const result = await serverClient.postForm<T>(endpoint, { key: 'value' }, options?);
```

### Cachecontrole

```typescript
serverClient.setCacheEnabled(false);   // Disable caching
serverClient.clearCache();             // Clear all cached responses
apiUtils.clearCache();                 // Same via utility
```

### Nuttige functies

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

apiUtils.isSuccess(response);                              // Type guard
apiUtils.getErrorMessage(response);                        // Extract error
apiUtils.createQueryString({ page: 1, limit: 20 });       // 'page=1&limit=20'
apiUtils.buildUrl('/api/items', { page: 1, limit: 20 });  // '/api/items?page=1&limit=20'
```

## Foutafhandeling

### `HttpStatus` Enum

```typescript
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

### `handleApiError(error, context?): NextResponse`

Verwerkt API-routefouten met automatische detectie van statuscodes op basis van foutmeldingen:

```typescript
import { handleApiError } from '@/lib/api/error-handler';

export async function GET() {
  try {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error, 'GET /api/items');
  }
}
```

### `withErrorHandling(handler, context?): Promise`

Functie van hogere orde die een asynchrone handler omhult met foutafhandeling:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}
```

## API-constanten

```typescript
const API_CONSTANTS = {
  HEADERS: { CONTENT_TYPE: 'application/json', ACCEPT: 'application/json' },
  STATUS: { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500 },
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
};

const QUERY_CONFIG = {
  staleTime: 300_000,    // 5 minutes
  gcTime: 86_400_000,    // 1 day
  retry: 1,
  refetchOnWindowFocus: false,
};
```

## Domeinklanten

### LemonSqueezyClient

```typescript
import { lemonsqueezyClient } from '@/lib/api/lemonsqueezy-client';

const checkout = await lemonsqueezyClient.createCheckout({
  variantId: 12345,
  email: 'user@example.com',
  customPrice: 4900,
});
// Returns: { checkoutUrl, email, customPrice, variantId, metadata }

const health = await lemonsqueezyClient.healthCheck();
const validation = lemonsqueezyClient.validateCheckoutParams(params);
```

### EnquêteApiClient

```typescript
import { surveyApiClient } from '@/lib/api/survey-api.client';

const surveys = await surveyApiClient.getMany({ type: 'nps', status: 'active' });
const survey = await surveyApiClient.getOne('survey-id');
const created = await surveyApiClient.create({ title: 'Feedback', type: 'nps' });
await surveyApiClient.submitResponse({ surveyId: 'id', answers: [...] });
const responses = await surveyApiClient.getResponses('survey-id', { page: 1 });
```
