---
id: api-client-architecture
title: Architektura klienta API
sidebar_label: Klient API
sidebar_position: 8
---

# Architektura klienta API

Ten przewodnik omawia system klienta z podwójnym interfejsem API: po stronie klienta `ApiClient` (singiel oparty na Axios) i po stronie serwera `ServerClient` (oparty na pobieraniu z buforowaniem i ponownymi próbami), w tym bezpieczeństwo typów, obsługa błędów i przechwytywacze żądań/odpowiedzi.

## Przegląd architektury

```
API Client Architecture
=========================

  Client-Side (Browser)                Server-Side (Node.js)
  +------------------------+           +------------------------+
  |  ApiClient             |           |  ServerClient          |
  |  (lib/api/api-client-  |           |  (lib/api/server-api-  |
  |   class.ts)            |           |   client.ts)           |
  +------------------------+           +------------------------+
  | - Axios-based          |           | - fetch-based          |
  | - Singleton pattern    |           | - Built-in LRU cache   |
  | - Auth interceptor     |           | - Retry logic          |
  | - 401 auto-redirect    |           | - Timeout handling     |
  | - Type-safe methods    |           | - AbortSignal support  |
  +------------------------+           +------------------------+
       |                                    |
       v                                    v
  +-------------------------------------------------+
  |           Shared Type System                     |
  |   lib/api/types.ts                               |
  |   - ApiResponse<T> (discriminated union)         |
  |   - PaginatedResponse<T>                         |
  |   - ApiError                                     |
  +-------------------------------------------------+
```

## Klient API po stronie klienta

### Wzór Singletona `ApiClient` używa ścisłego singletonu zarządzanego przez `ApiClientSingleton` :

```typescript
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

### Użycie

```typescript
// lib/api/api-client.ts
import { getApiClient } from './singleton';

export const apiClient = getApiClient();

// Convenient fetcher functions for React Query
export const fetcherGet = async <T>(endpoint: string, params?: QueryParams): Promise<T> => {
  return apiClient.get<T>(endpoint, params);
};

export const fetcherPaginated = async <T>(
  endpoint: string,
  params: PaginationParams & QueryParams = {}
): Promise<PaginatedResponse<T>> => {
  return apiClient.getPaginated<T>(endpoint, params);
};
```

### Przechwytywacze żądań

Klient automatycznie dołącza token okaziciela do każdego żądania:

```typescript
// lib/api/api-client-class.ts
private tokenInterceptor(): void {
  this.client.interceptors.request.use((config) => {
    if (this.accessToken) {
      config.headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return config;
  });
}
```

### Przechwytywacze odpowiedzi

Automatyczna obsługa przekierowań 401 na stronę logowania:

```typescript
private handleResponseError = async (error) => {
  if (responseError.response?.status === API_CONSTANTS.STATUS.UNAUTHORIZED) {
    if (typeof window !== 'undefined' && env.AUTH_ENDPOINT_LOGIN) {
      window.location.href = env.AUTH_ENDPOINT_LOGIN;
    }
  }
  throw this.formatError(error);
};
```

### Błąd formatowania

Wszystkie błędy są normalizowane do spójnego kształtu `ApiError` :

```typescript
private formatError(error: unknown): ApiError {
  if (error instanceof AxiosError && error.response?.data) {
    const errorData = error.response.data;
    const formattedError = new Error(errorData.message || 'An error occurred');
    Object.assign(formattedError, {
      code: errorData.code,
      details: errorData.details,
      status: error.response.status,
    });
    return formattedError;
  }
  return new Error(API_CONSTANTS.DEFAULT_ERROR_MESSAGE);
}
```

### Metody bezpieczne dla typu

```typescript
// All methods return unwrapped data (not the full response)
const items = await apiClient.get<Item[]>('/api/items');
const created = await apiClient.post<Item>('/api/items', { title: 'New Item' });
const updated = await apiClient.put<Item>('/api/items/123', { title: 'Updated' });
const patched = await apiClient.patch<Item>('/api/items/123', { status: 'published' });
const deleted = await apiClient.delete<void>('/api/items/123');

// Paginated responses
const page = await apiClient.getPaginated<Item>('/api/items', { page: 1, limit: 20 });
```

## Klient API po stronie serwera

### Klasa ServerClient `ServerClient` w `lib/api/server-api-client.ts` jest zoptymalizowane do użytku po stronie serwera:

```typescript
// lib/api/server-api-client.ts
export class ServerClient {
  private baseUrl: string;
  private defaultOptions: FetchOptions;
  private cacheEnabled: boolean;

  constructor(baseUrl: string = '', options: FetchOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = { ...DEFAULT_CONFIG, ...options };
    this.cacheEnabled = true;
  }
}

// Default configuration
const DEFAULT_CONFIG = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // 3 retry attempts
  retryDelay: 1000,  // 1 second between retries
};
```

### Wbudowane buforowanie

Żądania GET są automatycznie buforowane z eksmisją LRU:

```typescript
// Cache configuration
const CACHE_SIZE = 100;       // Max cached responses
const DEFAULT_TTL = 300000;   // 5 minutes

// Cache is keyed by URL + body hash
const cacheKey = `${url}${options.body ? `_${JSON.stringify(options.body)}` : ''}`;

// Only GET requests without AbortSignal are cached
if (this.cacheEnabled && isGetRequest && !options.signal) {
  const cached = cacheUtils.get(cacheKey);
  if (cached) return { success: true, data: cached };
}
```

### Ponów próbę logiczną

```typescript
// Retry decision: only network errors trigger retries
const shouldRetry =
  attempt < retries &&
  error instanceof Error &&
  (error.name === 'TypeError' || error.message.includes('fetch'));

if (shouldRetry) {
  await new Promise(resolve => setTimeout(resolve, retryDelay));
  return attemptFetch(attempt + 1);
}
```

### Obsługa przekroczenia limitu czasu

Każde żądanie kończy pobieranie za pomocą AbortController:

```typescript
const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

// Composes with caller-provided signals
if (fetchOptions.signal) {
  fetchOptions.signal.addEventListener('abort', () => {
    timeoutController.abort(fetchOptions.signal?.reason);
  }, { once: true });
}
```

### Wstępnie zbudowane instancje klienta

```typescript
// Default client for internal API calls
export const serverClient = new ServerClient();

// Factory for custom clients
export const createApiClient = (baseUrl: string, options?: FetchOptions) => {
  return new ServerClient(baseUrl, options);
};

// External API client (longer timeout, fewer retries)
export const externalClient = new ServerClient('', {
  timeout: 15000,
  retries: 2,
});

// ReCAPTCHA verification client
export const recaptchaClient = {
  async verify(token: string) {
    return serverClient.post('/api/verify-recaptcha', { token });
  },
};
```

## Typ systemu

### Dyskryminowane reakcje Unii

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Obsługa odpowiedzi bezpieczna dla typu

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

const response = await serverClient.get<Item[]>('/api/items');

if (apiUtils.isSuccess(response)) {
  // TypeScript narrows: response.data is Item[]
  console.log(response.data.length);
} else {
  // TypeScript narrows: response.error is string
  console.error(apiUtils.getErrorMessage(response));
}
```

## Integracja zapytań Reaguj

### Domyślna konfiguracja zapytania

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### Użycie z zapytaniem reagującym

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetcherGet, fetcherPaginated } from '@/lib/api/api-client';
import { QUERY_CONFIG } from '@/lib/api/constants';

function useItems(page: number) {
  return useQuery({
    queryKey: ['items', page],
    queryFn: () => fetcherPaginated<Item>('/api/items', { page, limit: 20 }),
    ...QUERY_CONFIG,
  });
}
```

## Funkcje narzędziowe API

```typescript
import { apiUtils } from '@/lib/api/server-api-client';

// Build URL with query parameters
const url = apiUtils.buildUrl('/api/items', { page: 1, search: 'test' });
// Result: "/api/items?page=1&search=test"

// Create query string
const qs = apiUtils.createQueryString({ status: 'published', limit: 20 });
// Result: "status=published&limit=20"

// Clear all cached responses
apiUtils.clearCache();
```

## Przesyłanie pliku

```typescript
// Using ServerClient
const result = await serverClient.upload<{ url: string }>(
  '/api/upload',
  file,
  { timeout: 60000 }  // Longer timeout for uploads
);

// Using form-encoded data
const result = await serverClient.postForm<{ token: string }>(
  '/api/auth/token',
  { grant_type: 'client_credentials', client_id: 'xxx' }
);
```

## Względy wydajności

1. **Singleton zapewnia jedną instancję Axios**: pozwala uniknąć narzutu na połączenie związanego z tworzeniem wielu klientów.
2. **Buforowanie po stronie serwera**: Redukuje zbędne wywołania API. Wyłącz w przypadku przepływów pracy z dużą liczbą mutacji.
3. **React Query stalTime**: 5 minut zapobiega ponownemu pobraniu na każdym zamontowanym komponencie.
4. **gcCzas 24 godzin**: Przechowuje dane w pamięci w celu szybkiej nawigacji pomiędzy stronami.
5. **Liczba ponownych prób 1**: równoważy odporność z opóźnieniami skierowanymi do użytkownika.

## Rozwiązywanie problemów

### Żądania po stronie klienta kończą się niepowodzeniem z powodu błędu 401

1. Sprawdź, czy token dostępu jest ustawiony na instancji `ApiClient` .
2. Sprawdź, czy przechwytywacz tokenów dołącza nagłówek `Authorization` .
3. Sprawdź, czy token nie utracił ważności.

### Pamięć podręczna po stronie serwera zwraca nieaktualne dane

1. Po mutacjach wywołaj `serverClient.clearCache()` .
2. Ustaw `setCacheEnabled(false)` dla punktów końcowych, które wymagają świeżych danych.
3. Podaj `AbortSignal` , aby pominąć pamięć podręczną dla określonych żądań.

### Błędy przekroczenia limitu czasu w zewnętrznych interfejsach API

1. Zwiększ limit czasu w konfiguracji klienta.
2. Użyj przycisku `externalClient` , który ma 15-sekundowy limit czasu.
3. Sprawdź łączność sieciową i rozdzielczość DNS.

### Zapytanie reakcji nie jest pobierane ponownie

1. Sprawdź, czy `queryKey` zawiera wszystkie parametry, które powinny wywołać ponowne pobieranie.
2. Sprawdź, czy `staleTime` nie jest ustawione zbyt wysoko dla Twojego przypadku użycia.
3. Użyj `queryClient.invalidateQueries` po mutacjach.

## Powiązana dokumentacja

- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
- [Dogłębne zapoznanie się z architekturą buforowania](./caching-deep-dive.md)
- [Architektura ograniczająca szybkość](./rate-limiting-architecture.md)
