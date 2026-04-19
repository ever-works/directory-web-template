---
id: api-client-layer
title: Capa de cliente API
sidebar_label: Capa de cliente API
sidebar_position: 30
---

# Capa de cliente API

La plantilla incluye una arquitectura de cliente API dual: un `ApiClient` del lado del navegador construido en Axios y un `ServerClient` del lado del servidor construido sobre la API nativa `fetch`. Ambos comparten una interfaz consistente para realizar solicitudes HTTP, pero cada uno está optimizado para su entorno de ejecución.

## Descripción general de la arquitectura

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

## Cliente del lado del navegador (`ApiClient`)

El cliente del lado del navegador incluye Axios y está diseñado para usarse dentro de los componentes y enlaces de React. Se administra como un singleton, por lo que solo existe una instancia por sesión del navegador.

### Patrón singleton

La clase `ApiClientSingleton` evita que se creen múltiples instancias de Axios:

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

### Usando el cliente del navegador

Importe el singleton preconfigurado desde `api-client.ts`:

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

### Detalles de la clase ApiClient

La clase `ApiClient` configura Axios con:

- **Encabezados predeterminados**: `Content-Type: application/json`, `Accept: application/json`
- **Credenciales**: `withCredentials: true` para autenticación basada en cookies
- **Interceptor de token**: Adjunta automáticamente el encabezado `Authorization: Bearer`
- **Interceptor de respuestas**: redirige a la página de inicio de sesión en respuestas 401 (solo navegador)
- **Error de formato**: convierte los errores de Axios en un objeto estructurado `ApiError`

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Cliente del lado del servidor (`ServerClient`)

El cliente del lado del servidor utiliza la API nativa `fetch` y está diseñado para usarse dentro de las rutas API, componentes del servidor y acciones del servidor de Next.js. Proporciona características que son críticas para la comunicación de servidor a servidor.

### Características clave

|Característica|Descripción|
|---------|-------------|
|**Reintentos automáticos**|Reintentos en caso de errores de red (configurable, predeterminado 3)|
|**Tiempo de espera**|Cancela las solicitudes después de una duración configurable (predeterminado 30 segundos)|
|**Caché LRU**|Caché en memoria para solicitudes GET (100 entradas, TTL de 5 minutos)|
|**resolución de URL**|Resuelve rutas relativas contra `PLATFORM_API_URL` para llamadas de plataforma|
|**Corrección de API interna**|Convierte automáticamente URL relativas a absolutas para llamadas SSR|
|**Soporte de datos de formulario**|Elimina el encabezado `Content-Type` para cargas `FormData`|

### Creación y uso del cliente del servidor

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

### Clientes preconfigurados

El módulo exporta varias instancias de cliente listas para usar:

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

### Utilidades API

El objeto `apiUtils` proporciona funciones auxiliares comunes:

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

## Tipos compartidos

Ambos clientes comparten un conjunto común de tipos definidos en `lib/api/types.ts`:

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

## Manejo de errores de API para rutas

El módulo `error-handler.ts` proporciona respuestas de error estandarizadas para los controladores de ruta API de Next.js:

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

La enumeración `HttpStatus` proporciona códigos de estado HTTP estándar:

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

## Constantes API

El archivo `constants.ts` define la configuración compartida utilizada por ambos clientes:

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

## Cuándo utilizar qué cliente

|Escenario|Cliente|¿Por qué?|
|----------|--------|-----|
|Reaccionar obtención de datos del componente|`apiClient` (navegador)|Singleton, gestión de tokens, redireccionamiento en 401|
|Funciones de recuperación de consultas de React|`fetcherGet` / `fetcherPaginated`|Envoltorios convenientes para funciones de consulta|
|Carga de datos de componentes del servidor|`serverClient` (servidor)|Resolución automática de URL, almacenamiento en caché, reintentos|
|Ruta API que llama a servicios externos|`externalClient`|Tiempo de espera más largo, sin suposición de URL base|
|Manejo de errores de ruta API|`handleApiError` / `withErrorHandling`|Respuestas de error estandarizadas|

## Archivos relacionados

- `lib/api/api-client.ts` - Exportaciones de conveniencia y singleton del cliente del navegador
- `lib/api/api-client-class.ts` - Implementación completa de la clase `ApiClient`
- `lib/api/server-api-client.ts` - Clase `ServerClient` del lado del servidor
- `lib/api/singleton.ts` - Administrador de patrones singleton
- `lib/api/types.ts` - Definiciones de tipos de TypeScript compartidos
- `lib/api/constants.ts` - Constantes API y valores predeterminados de React Query
- `lib/api/error-handler.ts` - Utilidades de manejo de errores de ruta API de Next.js
