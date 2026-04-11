---
id: api-client-architecture
title: Architettura client API
sidebar_label: Cliente API
sidebar_position: 8
---

# Architettura client API

Questa guida copre il sistema client API doppio: il lato client `ApiClient` (singleton basato su Axios) e il lato server `ServerClient` (basato su fetch con memorizzazione nella cache e nuovi tentativi), inclusa l'indipendenza dal tipo, la gestione degli errori e gli intercettori di richiesta/risposta.

## Panoramica dell'architettura

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

## Client API lato client

### Modello singleton

Il `ApiClient` utilizza un singleton rigoroso gestito da `ApiClientSingleton` :

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

### Utilizzo

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

### Richiedi Intercettori

Il client allega automaticamente il token Bearer a ogni richiesta:

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

### Intercettori di risposta

La gestione automatica 401 reindirizza alla pagina di accesso:

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

### Errore di formattazione

Tutti gli errori sono normalizzati in una forma `ApiError` coerente:

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

### Metodi sicuri per i tipi

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

## Client API lato server

### Classe ServerClient

Il `ServerClient` in `lib/api/server-api-client.ts` è ottimizzato per l'utilizzo lato server:

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

### Cache integrata

Le richieste GET vengono automaticamente memorizzate nella cache con l'eliminazione LRU:

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

### Riprova logica

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

### Gestione del timeout

Ogni richiesta avvolge il recupero con un AbortController:

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

### Istanze client precostruite

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

## Digita Sistema

### Risposte sindacali discriminate

```typescript
// lib/api/types.ts
export type ApiResponse<T = unknown> =
  | { success: true; data: T; total?: number; page?: number; limit?: number }
  | { success: false; error: string };

export type PaginatedResponse<T> =
  | { success: true; data: T[]; meta: { page: number; totalPages: number; total: number; limit: number } }
  | { success: false; error: string };
```

### Gestione della risposta sicura per i tipi

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

## Integrazione delle query di reazione

### Configurazione query predefinita

```typescript
// lib/api/constants.ts
export const QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes
  gcTime: 24 * 60 * 60 * 1000,     // 24 hours
  retry: 1,
  refetchOnWindowFocus: false,
} as const;
```

### Utilizzo con React Query

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

## Funzioni dell'utilità API

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

## Caricamento file

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

## Considerazioni sulle prestazioni

1. **Singleton garantisce un'istanza Axios**: evita il sovraccarico della connessione derivante dalla creazione di più client.
2. **Caching lato server**: riduce le chiamate API ridondanti. Disattiva per flussi di lavoro ricchi di mutazioni.
3. **React Query staleTime**: 5 minuti impediscono il recupero su ogni montaggio del componente.
4. **gcTime di 24 ore**: mantiene i dati in memoria per una navigazione veloce tra le pagine.
5. **Conteggio tentativi pari a 1**: bilancia la resilienza con la latenza rivolta all'utente.

## Risoluzione dei problemi

### Le richieste lato client falliscono con 401

1. Verificare che il token di accesso sia impostato sull'istanza `ApiClient` .
2. Verificare che l'intercettatore di token stia collegando l'intestazione `Authorization` .
3. Controlla che il token non sia scaduto.

### La cache lato server restituisce dati non aggiornati

1. Chiama `serverClient.clearCache()` dopo le mutazioni.
2. Impostare `setCacheEnabled(false)` per gli endpoint che richiedono dati aggiornati.
3. Passa un `AbortSignal` per bypassare la cache per richieste specifiche.

### Errori di timeout sulle API esterne

1. Aumentare il timeout nella configurazione del client.
2. Utilizzare `externalClient` che ha un timeout di 15 secondi.
3. Controlla la connettività di rete e la risoluzione DNS.

### La query di reazione non viene recuperata

1. Verificare che `queryKey` includa tutti i parametri che dovrebbero attivare i recuperi.
2. Controlla che `staleTime` non sia impostato su un valore troppo alto per il tuo caso d'uso.
3. Usa `queryClient.invalidateQueries` dopo le mutazioni.

## Documentazione correlata

- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
- [Approfondimento sull'architettura della memorizzazione nella cache](./caching-deep-dive.md)
- [Architettura di limitazione della velocità](./rate-limiting-architecture.md)
