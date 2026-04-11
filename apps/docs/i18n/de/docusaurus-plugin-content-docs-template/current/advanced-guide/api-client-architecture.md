---
id: api-client-architecture
title: API-Client-Architektur
sidebar_label: API-Client
sidebar_position: 8
---

# API-Client-Architektur

Dieses Handbuch behandelt das duale API-Clientsystem: das clientseitige `ApiClient` (Axios-basierter Singleton) und das serverseitige `ServerClient` (abrufbasiert mit Caching und Wiederholungsversuchen), einschließlich Typsicherheit, Fehlerbehandlung und Anforderungs-/Antwort-Interceptoren.

## Architekturübersicht

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

## Clientseitiger API-Client

### Singleton-Muster

Der `ApiClient` verwendet einen strikten Singleton, der von `ApiClientSingleton` verwaltet wird:

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

### Nutzung

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

### Abfangjäger anfordern

Der Client hängt das Bearer-Token automatisch an jede Anfrage an:

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

### Antwortabfangjäger

Automatische 401-Verarbeitung von Weiterleitungen zur Anmeldeseite:

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

### Fehler bei der Formatierung

Alle Fehler werden auf eine konsistente `ApiError` -Form normalisiert:

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

### Typsichere Methoden

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

## Serverseitiger API-Client

### ServerClient-Klasse

Das `ServerClient` in `lib/api/server-api-client.ts` ist für die serverseitige Nutzung optimiert:

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

### Integriertes Caching

GET-Anfragen werden mit der LRU-Eviction automatisch zwischengespeichert:

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

### Wiederholungslogik

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

### Timeout-Behandlung

Jede Anfrage umschließt fetch mit einem AbortController:

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

### Vorgefertigte Client-Instanzen

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

## Typsystem

### Diskriminierte Gewerkschaftsantworten

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Typsichere Antwortverarbeitung

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

## Abfrageintegration reagieren

### Standardabfragekonfiguration

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### Verwendung mit React Query

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

## API-Dienstprogrammfunktionen

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

## Datei-Upload

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

## Leistungsüberlegungen

1. **Singleton stellt eine Axios-Instanz sicher**: Vermeidet Verbindungsaufwand durch die Erstellung mehrerer Clients.
2. **Serverseitiges Caching**: Reduziert redundante API-Aufrufe. Für mutationsintensive Workflows deaktivieren.
3. **React Query staleTime**: 5 Minuten verhindern das erneute Abrufen bei jedem Komponenten-Mount.
4. **gcTime von 24 Stunden**: Behält Daten im Speicher für eine schnelle Navigation zwischen Seiten.
5. **Wiederholungsanzahl von 1**: Gleicht die Ausfallsicherheit mit der benutzerseitigen Latenz aus.

## Fehlerbehebung

### Clientseitige Anfragen schlagen mit 401 fehl

1. Überprüfen Sie, ob das Zugriffstoken auf der `ApiClient` -Instanz festgelegt ist.
2. Stellen Sie sicher, dass der Token-Interceptor den `Authorization` -Header anbringt.
3. Stellen Sie sicher, dass das Token nicht abgelaufen ist.

### Serverseitiger Cache gibt veraltete Daten zurück

1. Rufen Sie `serverClient.clearCache()` nach Mutationen auf.
2. Stellen Sie `setCacheEnabled(false)` für Endpunkte ein, die neue Daten benötigen.
3. Übergeben Sie ein `AbortSignal` , um den Cache für bestimmte Anfragen zu umgehen.

### Timeout-Fehler bei externen APIs

1. Erhöhen Sie den Timeout in der Client-Konfiguration.
2. Verwenden Sie den `externalClient` , der eine Zeitüberschreitung von 15 Sekunden hat.
3. Überprüfen Sie die Netzwerkkonnektivität und die DNS-Auflösung.

### React Query wird nicht erneut abgerufen

1. Stellen Sie sicher, dass `queryKey` alle Parameter enthält, die erneute Abrufe auslösen sollen.
2. Stellen Sie sicher, dass `staleTime` für Ihren Anwendungsfall nicht zu hoch eingestellt ist.
3. Verwenden Sie `queryClient.invalidateQueries` nach Mutationen.

## Verwandte Dokumentation

- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
- [Deep Dive zur Caching-Architektur](./caching-deep-dive.md)
- [Rate-Limiting-Architektur](./rate-limiting-architecture.md)
