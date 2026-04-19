---
id: api-client-layer
title: Warstwa klienta API
sidebar_label: Warstwa klienta API
sidebar_position: 30
---

# Warstwa klienta API

Szablon zawiera podwójną architekturę klienta API: `ApiClient` po stronie przeglądarki zbudowaną na Axios i po stronie serwera `ServerClient` zbudowaną na natywnym API `fetch`. Obydwa mają spójny interfejs do tworzenia żądań HTTP, ale każdy jest zoptymalizowany pod kątem środowiska wykonawczego.

## Przegląd architektury

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

## Klient po stronie przeglądarki (`ApiClient`)

Klient po stronie przeglądarki otacza Axios i jest przeznaczony do użytku wewnątrz komponentów i haków React. Jest zarządzany jako singleton, więc na sesję przeglądarki istnieje tylko jedna instancja.

### Wzór Singletona

Klasa `ApiClientSingleton` zapobiega tworzeniu wielu instancji Axios:

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

### Korzystanie z klienta przeglądarki

Zaimportuj wstępnie skonfigurowany singleton z `api-client.ts`:

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

### Szczegóły klasy ApiClient

Klasa `ApiClient` konfiguruje Axios za pomocą:

- **Domyślne nagłówki**: `Content-Type: application/json`, `Accept: application/json`
- **Dane uwierzytelniające**: `withCredentials: true` do autoryzacji opartej na plikach cookie
- **Przechwytywacz tokenów**: automatycznie dołącza nagłówek `Authorization: Bearer`
- **Przechwytywacz odpowiedzi**: Przekierowuje do strony logowania w przypadku 401 odpowiedzi (tylko przeglądarka)
- **Formatowanie błędów**: Konwertuje błędy Axios na ustrukturyzowany obiekt `ApiError`

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Klient po stronie serwera (`ServerClient`)

Klient po stronie serwera korzysta z natywnego API `fetch` i jest przeznaczony do użytku w trasach API Next.js, komponentach serwera i akcjach serwera. Zapewnia funkcje krytyczne dla komunikacji serwer-serwer.

### Kluczowe funkcje

|Funkcja|Opis|
|---------|-------------|
|**Automatyczne ponowne próby**|Ponowne próby w przypadku błędów sieciowych (konfigurowalne, domyślnie 3)|
|**Przerwa**|Przerywa żądania po konfigurowalnym czasie trwania (domyślnie 30 sekund)|
|**Pamięć podręczna LRU**|Pamięć podręczna w pamięci dla żądań GET (100 wpisów, 5-minutowy TTL)|
|**Rozdzielczość adresu URL**|Rozwiązuje ścieżki względne względem `PLATFORM_API_URL` dla wywołań platformy|
|**Poprawka wewnętrznego interfejsu API**|Automatycznie konwertuje względne adresy URL na bezwzględne dla wywołań SSR|
|**Obsługa FormData**|Usuwa nagłówek `Content-Type` z przesłanych plików `FormData`|

### Tworzenie i używanie klienta serwera

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

### Wstępnie skonfigurowani klienci

Moduł eksportuje kilka gotowych instancji klienckich:

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

### Narzędzia API

Obiekt `apiUtils` udostępnia typowe funkcje pomocnicze:

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

## Typy wspólne

Obaj klienci mają wspólny zestaw typów zdefiniowanych w `lib/api/types.ts`:

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

## Obsługa błędów API dla tras

Moduł `error-handler.ts` zapewnia standardowe odpowiedzi na błędy dla procedur obsługi tras API Next.js:

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

Wyliczenie `HttpStatus` udostępnia standardowe kody stanu HTTP:

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

## Stałe API

Plik `constants.ts` definiuje współdzieloną konfigurację używaną przez obu klientów:

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

## Kiedy używać którego klienta

|Scenariusz|Klient|Dlaczego|
|----------|--------|-----|
|Reaguj na pobieranie danych komponentów|`apiClient` (przeglądarka)|Singleton, zarządzanie tokenami, przekierowanie na 401|
|Funkcje pobierania zapytań React|`fetcherGet` / `fetcherPaginated`|Wygodne opakowania dla funkcji zapytań|
|Ładowanie danych komponentów serwera|`serverClient` (serwer)|Automatyczne rozpoznawanie adresów URL, buforowanie, ponowne próby|
|Trasa API wywołująca usługi zewnętrzne|`externalClient`|Dłuższy limit czasu, brak założenia podstawowego adresu URL|
|Obsługa błędów trasy API|`handleApiError` / `withErrorHandling`|Standaryzowane reakcje na błędy|

## Powiązane pliki

- `lib/api/api-client.ts` - Eksport pojedynczego klienta przeglądarki i wygody
- `lib/api/api-client-class.ts` - Pełna implementacja klasy `ApiClient`
- `lib/api/server-api-client.ts` - Klasa `ServerClient` po stronie serwera
- `lib/api/singleton.ts` - Menedżer wzorców Singleton
- `lib/api/types.ts` — wspólne definicje typów TypeScript
- `lib/api/constants.ts` - stałe API i wartości domyślne React Query
- `lib/api/error-handler.ts` - Narzędzia do obsługi błędów tras API Next.js
