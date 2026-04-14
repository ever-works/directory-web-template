---
id: api-client-layer
title: Livello client API
sidebar_label: Livello client API
sidebar_position: 30
---

# Livello client API

Il modello include un'architettura client API doppia: un `ApiClient` lato browser basato su Axios e un `ServerClient` lato server basato sull'API nativa `fetch`. Entrambi condividono un'interfaccia coerente per effettuare richieste HTTP, ma ciascuno è ottimizzato per il proprio ambiente di runtime.

## Panoramica dell'architettura

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

## Client lato browser (`ApiClient`)

Il client lato browser racchiude Axios ed è progettato per l'uso all'interno di componenti e hook di React. È gestito come singleton, quindi esiste una sola istanza per sessione del browser.

### Modello Singleton

La classe `ApiClientSingleton` impedisce la creazione di più istanze Axios:

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

### Utilizzando il client browser

Importa il singleton preconfigurato da `api-client.ts`:

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

### Dettagli della classe ApiClient

La classe `ApiClient` configura Axios con:

- **Intestazioni predefinite**: `Content-Type: application/json`, `Accept: application/json`
- **Credenziali**: `withCredentials: true` per l'autenticazione basata su cookie
- **Token interceptor**: allega automaticamente l'intestazione `Authorization: Bearer`
- **Intercettatore di risposta**: reindirizza alla pagina di accesso sulle risposte 401 (solo browser)
- **Formattazione errore**: converte gli errori Axios in un oggetto strutturato `ApiError`

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Client lato server (`ServerClient`)

Il client lato server utilizza l'API nativa `fetch` ed è destinato all'uso all'interno di percorsi API Next.js, componenti server e azioni server. Fornisce funzionalità fondamentali per la comunicazione da server a server.

### Caratteristiche principali

|Caratteristica|Descrizione|
|---------|-------------|
|**Tentativi automatici**|Nuovi tentativi in caso di errori di rete (configurabile, predefinito 3)|
|**Timeout**|Interrompe le richieste dopo una durata configurabile (predefinita 30 secondi)|
|**Cache LRU**|Cache in memoria per richieste GET (100 voci, TTL di 5 minuti)|
|**Risoluzione URL**|Risolve i percorsi relativi rispetto a `PLATFORM_API_URL` per le chiamate alla piattaforma|
|**Correzione API interna**|Converte automaticamente gli URL relativi in assoluti per le chiamate SSR|
|**Supporto FormData**|Elimina l'intestazione `Content-Type` per i caricamenti `FormData`|

### Creazione e utilizzo del client server

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

### Client preconfigurati

Il modulo esporta diverse istanze client pronte all'uso:

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

### Utilità API

L'oggetto `apiUtils` fornisce funzioni di supporto comuni:

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

## Tipi condivisi

Entrambi i client condividono un insieme comune di tipi definiti in `lib/api/types.ts`:

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

## Gestione degli errori API per le rotte

Il modulo `error-handler.ts` fornisce risposte di errore standardizzate per i gestori di route API Next.js:

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

L'enumerazione `HttpStatus` fornisce codici di stato HTTP standard:

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

## Costanti API

Il file `constants.ts` definisce la configurazione condivisa utilizzata da entrambi i client:

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

## Quando utilizzare quale client

|Scenario|Cliente|Perché|
|----------|--------|-----|
|Reagire al recupero dei dati del componente|`apiClient` (browser)|Singleton, gestione dei token, reindirizzamento su 401|
|Funzioni di recupero delle query di React|`fetcherGet` / `fetcherPaginated`|Wrapper convenienti per le funzioni di query|
|Caricamento dei dati del componente server|`serverClient` (server)|Risoluzione automatica degli URL, memorizzazione nella cache, nuovi tentativi|
|Route API che chiama servizi esterni|`externalClient`|Timeout più lungo, nessun presupposto per l'URL di base|
|Gestione degli errori del percorso API|`handleApiError` / `withErrorHandling`|Risposte agli errori standardizzate|

## File correlati

- `lib/api/api-client.ts` - Singleton client browser ed esportazioni pratiche
- `lib/api/api-client-class.ts` - Implementazione completa della classe `ApiClient`
- `lib/api/server-api-client.ts` - Classe `ServerClient` lato server
- `lib/api/singleton.ts` - Gestore di pattern singleton
- `lib/api/types.ts` - Definizioni di tipo TypeScript condivise
- `lib/api/constants.ts` - Costanti API e impostazioni predefinite di React Query
- `lib/api/error-handler.ts` - Utilità di gestione degli errori del percorso API Next.js
