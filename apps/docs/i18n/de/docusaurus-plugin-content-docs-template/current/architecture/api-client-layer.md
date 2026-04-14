---
id: api-client-layer
title: API-Client-Schicht
sidebar_label: API-Client-Schicht
sidebar_position: 30
---

# API-Client-Schicht

Die Vorlage umfasst eine duale API-Client-Architektur: ein browserseitiges `ApiClient`, das auf Axios basiert, und ein serverseitiges `ServerClient`, das auf der nativen `fetch` API basiert. Beide teilen sich eine konsistente Schnittstelle zum Senden von HTTP-Anfragen, sind jedoch jeweils für ihre Laufzeitumgebung optimiert.

## Architekturübersicht

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

## Browserseitiger Client (`ApiClient`)

Der browserseitige Client umschließt Axios und ist für die Verwendung innerhalb von React-Komponenten und -Hooks konzipiert. Es wird als Singleton verwaltet, sodass pro Browsersitzung nur eine Instanz vorhanden ist.

### Singleton-Muster

Die Klasse `ApiClientSingleton` verhindert die Erstellung mehrerer Axios-Instanzen:

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

### Verwendung des Browser-Clients

Importieren Sie den vorkonfigurierten Singleton von `api-client.ts`:

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

### Details zur ApiClient-Klasse

Die Klasse `ApiClient` konfiguriert Axios mit:

- **Standard-Header**: `Content-Type: application/json`, `Accept: application/json`
- **Anmeldeinformationen**: `withCredentials: true` für Cookie-basierte Authentifizierung
- **Token-Interceptor**: Hängt automatisch den `Authorization: Bearer`-Header an
- **Antwort-Interceptor**: Leitet bei 401-Antworten zur Anmeldeseite weiter (nur Browser)
- **Fehlerformatierung**: Konvertiert Axios-Fehler in ein strukturiertes `ApiError`-Objekt

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Serverseitiger Client (`ServerClient`)

Der serverseitige Client verwendet die native API `fetch` und ist für die Verwendung innerhalb von Next.js-API-Routen, Serverkomponenten und Serveraktionen vorgesehen. Es bietet Funktionen, die für die Server-zu-Server-Kommunikation von entscheidender Bedeutung sind.

### Hauptmerkmale

|Funktion|Beschreibung|
|---------|-------------|
|**Automatische Wiederholungsversuche**|Wiederholungen bei Netzwerkfehlern (konfigurierbar, Standard 3)|
|**Zeitüberschreitung**|Bricht Anfragen nach einer konfigurierbaren Dauer ab (Standard 30 Sekunden)|
|**LRU-Cache**|In-Memory-Cache für GET-Anfragen (100 Einträge, 5-Minuten-TTL)|
|**URL-Auflösung**|Löst relative Pfade gegen `PLATFORM_API_URL` für Plattformaufrufe auf|
|**Interner API-Fix**|Konvertiert relative URLs für SSR-Aufrufe automatisch in absolute|
|**FormData-Unterstützung**|Entfernt den `Content-Type`-Header für `FormData`-Uploads|

### Erstellen und Verwenden des Server-Clients

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

### Vorkonfigurierte Clients

Das Modul exportiert mehrere gebrauchsfertige Client-Instanzen:

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

### API-Dienstprogramme

Das `apiUtils`-Objekt stellt allgemeine Hilfsfunktionen bereit:

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

## Gemeinsam genutzte Typen

Beide Clients nutzen einen gemeinsamen Satz von Typen, die in `lib/api/types.ts` definiert sind:

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

## API-Fehlerbehandlung für Routen

Das Modul `error-handler.ts` bietet standardisierte Fehlerantworten für Next.js-API-Routenhandler:

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

Die Enumeration `HttpStatus` stellt Standard-HTTP-Statuscodes bereit:

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

## API-Konstanten

Die Datei `constants.ts` definiert die gemeinsame Konfiguration, die von beiden Clients verwendet wird:

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

## Wann welcher Client verwendet werden soll

|Szenario|Kunde|Warum|
|----------|--------|-----|
|Abrufen von Komponentendaten reagieren|`apiClient` (Browser)|Singleton, Token-Verwaltung, Weiterleitung auf 401|
|React Query-Abruffunktionen|`fetcherGet` / `fetcherPaginated`|Praktische Wrapper für Abfragefunktionen|
|Laden der Serverkomponentendaten|`serverClient` (Server)|Automatische URL-Auflösung, Caching, Wiederholungsversuche|
|API-Route, die externe Dienste aufruft|`externalClient`|Längere Zeitüberschreitung, keine Basis-URL-Annahme|
|Behandlung von API-Routenfehlern|`handleApiError` / `withErrorHandling`|Standardisierte Fehlerreaktionen|

## Verwandte Dateien

- `lib/api/api-client.ts` – Browser-Client-Singleton und praktische Exporte
- `lib/api/api-client-class.ts` – Vollständige `ApiClient` Klassenimplementierung
- `lib/api/server-api-client.ts` – Serverseitige Klasse `ServerClient`
- `lib/api/singleton.ts` – Singleton-Mustermanager
- `lib/api/types.ts` – Gemeinsam genutzte TypeScript-Typdefinitionen
- `lib/api/constants.ts` – API-Konstanten und React Query-Standardeinstellungen
- `lib/api/error-handler.ts` – Dienstprogramme zur Behandlung von Routenfehlern der Next.js-API
