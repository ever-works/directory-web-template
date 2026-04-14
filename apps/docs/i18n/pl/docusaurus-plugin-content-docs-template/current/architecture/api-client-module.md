---
id: api-client-module
title: Moduł klienta API
sidebar_label: Moduł klienta API
sidebar_position: 51
---

# Moduł klienta API

Moduł klienta API (`template/lib/api/`) zapewnia kompleksową warstwę klienta HTTP do komunikacji API zarówno po stronie klienta, jak i serwera. Zawiera klienta opartego na Axios do użytku z przeglądarką, natywnego klienta serwerowego opartego na `fetch` z buforowaniem i ponownymi próbami, wyspecjalizowanymi klientami domeny i standardową obsługą błędów.

## Przegląd architektury

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

## Pliki źródłowe

|Plik|Opis|
|------|-------------|
|`lib/api/types.ts`|Udostępnione definicje typów dla warstwy API|
|`lib/api/constants.ts`|Stałe API i konfiguracja zapytań|
|`lib/api/api-client-class.ts`|`ApiClient` — Klient oparty na Axios dla przeglądarki|
|`lib/api/singleton.ts`|`ApiClientSingleton` menadżer|
|`lib/api/api-client.ts`|Wstępnie zbudowana instancja klienta i pomocnicy modułu pobierania|
|`lib/api/server-api-client.ts`|`ServerClient` — klient serwera oparty na pobieraniu|
|`lib/api/error-handler.ts`|Standaryzowana obsługa błędów API|
|`lib/api/lemonsqueezy-client.ts`|Klient płatności LemonSqueezy|
|`lib/api/survey-api.client.ts`|Ankieta klienta CRUD|

## Definicje typów

### Typy rdzeni

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

### Typy odpowiedzi (związki dyskryminowane)

```typescript
type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number; totalPages?: number }
  | { success: false; error: string };

type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Konfiguracja klienta

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

## Po stronie klienta: `ApiClient`

Klasa `ApiClient` otacza Axios automatycznym wstrzykiwaniem tokenów, obsługą błędów odpowiedzi i wpisywanymi odpowiedziami.

### Konstruktor

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  accessToken: 'bearer-token',
  headers: { 'X-Custom': 'value' },
});
```

### Metody HTTP

Wszystkie metody rozpakowują kopertę `ApiResponse` i bezpośrednio zwracają pole `data`:

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

### Dostęp do Singletona

```typescript
import { getApiClient } from '@/lib/api/singleton';

const client = getApiClient();                    // Default instance
ApiClientSingleton.resetInstance();                // Reset (for tests)
```

### Eksport wygody

```typescript
import { apiClient, fetcherGet, fetcherPaginated } from '@/lib/api/api-client';

// Use with React Query / SWR
const data = await fetcherGet<Item[]>('/api/items', { status: 'published' });
const page = await fetcherPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## Po stronie serwera: `ServerClient`

Klasa `ServerClient` wykorzystuje natywny `fetch` z obsługą przekroczenia limitu czasu, automatycznymi ponownymi próbami, buforowaniem LRU i rozpoznawaniem adresów URL specyficznych dla serwera.

### Kluczowe funkcje

- **Obsługa limitu czasu** przy użyciu `AbortController` (domyślnie: 30 sekund)
- **Automatyczne ponowne próby** w przypadku błędów sieciowych (domyślnie: 3 próby z opóźnieniem 1 s)
- ** Pamięć podręczna LRU w pamięci ** dla żądań GET (100 wpisów, 5 minut TTL)
- **Rozpoznawanie adresu URL serwera** dla wewnętrznych tras API podczas SSR
- **Obsługa FormData** z automatyczną obsługą typu treści

### Gotowe instancje

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

### Metody HTTP

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

### Kontrola pamięci podręcznej

```typescript
serverClient.setCacheEnabled(false);   // Disable caching
serverClient.clearCache();             // Clear all cached responses
apiUtils.clearCache();                 // Same via utility
```

### Funkcje użytkowe

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

apiUtils.isSuccess(response);                              // Type guard
apiUtils.getErrorMessage(response);                        // Extract error
apiUtils.createQueryString({ page: 1, limit: 20 });       // 'page=1&limit=20'
apiUtils.buildUrl('/api/items', { page: 1, limit: 20 });  // '/api/items?page=1&limit=20'
```

## Obsługa błędów

### `HttpStatus` Wyliczenie

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

Obsługuje błędy trasy API dzięki automatycznemu wykrywaniu kodu stanu z komunikatów o błędach:

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

Funkcja wyższego rzędu, która otacza procedurę obsługi asynchronicznej z obsługą błędów:

```typescript
import { withErrorHandling } from '@/lib/api/error-handler';

export async function GET() {
  return withErrorHandling(async () => {
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  }, 'GET /api/items');
}
```

## Stałe API

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

## Klienci domeny

### Klient LemonSqueezy

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

### AnkietaApiKlient

```typescript
import { surveyApiClient } from '@/lib/api/survey-api.client';

const surveys = await surveyApiClient.getMany({ type: 'nps', status: 'active' });
const survey = await surveyApiClient.getOne('survey-id');
const created = await surveyApiClient.create({ title: 'Feedback', type: 'nps' });
await surveyApiClient.submitResponse({ surveyId: 'id', answers: [...] });
const responses = await surveyApiClient.getResponses('survey-id', { page: 1 });
```
