---
id: api-client-layer
title: Camada de cliente API
sidebar_label: Camada de cliente API
sidebar_position: 30
---

# Camada de cliente API

O modelo inclui uma arquitetura de cliente de API dupla: uma `ApiClient` do lado do navegador construída no Axios e uma `ServerClient` do lado do servidor construída na API nativa `fetch`. Ambos compartilham uma interface consistente para fazer solicitações HTTP, mas cada um é otimizado para seu ambiente de execução.

## Visão geral da arquitetura

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

## Cliente do navegador (`ApiClient`)

O cliente do lado do navegador envolve o Axios e é projetado para uso dentro de componentes e ganchos do React. Ele é gerenciado como um singleton, portanto existe apenas uma instância por sessão do navegador.

### Padrão Singleton

A classe `ApiClientSingleton` impede a criação de múltiplas instâncias do Axios:

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

### Usando o cliente do navegador

Importe o singleton pré-configurado de `api-client.ts`:

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

### Detalhes da classe ApiClient

A classe `ApiClient` configura Axios com:

- **Cabeçalhos padrão**: `Content-Type: application/json`, `Accept: application/json`
- **Credenciais**: `withCredentials: true` para autenticação baseada em cookies
- **Interceptador de token**: anexa automaticamente o cabeçalho `Authorization: Bearer`
- **Interceptador de resposta**: Redireciona para a página de login em respostas 401 (somente navegador)
- **Formatação de erros**: converte erros do Axios em um objeto `ApiError` estruturado

```ts
// All methods unwrap the ApiResponse envelope and return data directly
public async get<T>(endpoint: string, params?: QueryParams): Promise<T>
public async post<T>(endpoint: string, data?: RequestBody): Promise<T>
public async put<T>(endpoint: string, data?: RequestBody): Promise<T>
public async patch<T>(endpoint: string, data?: RequestBody): Promise<T>
public async delete<T>(endpoint: string): Promise<T>
public async getPaginated<T>(endpoint: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
```

## Cliente do lado do servidor (`ServerClient`)

O cliente do lado do servidor usa a API nativa `fetch` e deve ser usado dentro de rotas da API Next.js, componentes do servidor e ações do servidor. Ele fornece recursos essenciais para a comunicação entre servidores.

### Principais recursos

|Recurso|Descrição|
|---------|-------------|
|**Repetições automáticas**|Novas tentativas em caso de erros de rede (configurável, padrão 3)|
|**Tempo limite**|Anula solicitações após um período configurável (padrão 30 segundos)|
|**Cache LRU**|Cache na memória para solicitações GET (100 entradas, TTL de 5 minutos)|
|**Resolução de URL**|Resolve caminhos relativos em relação a `PLATFORM_API_URL` para chamadas de plataforma|
|**Correção interna da API**|Converte automaticamente URLs relativos em absolutos para chamadas SSR|
|**Suporte para FormData**|Remove o cabeçalho `Content-Type` para uploads `FormData`|

### Criando e usando o cliente servidor

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

### Clientes pré-configurados

O módulo exporta várias instâncias de cliente prontas para uso:

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

### Utilitários de API

O objeto `apiUtils` fornece funções auxiliares comuns:

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

## Tipos Compartilhados

Ambos os clientes compartilham um conjunto comum de tipos definidos em `lib/api/types.ts`:

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

## Tratamento de erros de API para rotas

O módulo `error-handler.ts` fornece respostas de erro padronizadas para manipuladores de rota da API Next.js:

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

O enum `HttpStatus` fornece códigos de status HTTP padrão:

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

## Constantes de API

O arquivo `constants.ts` define a configuração compartilhada usada por ambos os clientes:

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

## Quando usar qual cliente

|Cenário|Cliente|Por que|
|----------|--------|-----|
|Busca de dados do componente React|`apiClient` (navegador)|Singleton, gerenciamento de token, redirecionamento em 401|
|Funções do buscador React Query|`fetcherGet` / `fetcherPaginated`|Wrappers convenientes para funções de consulta|
|Carregamento de dados de componentes do servidor|`serverClient` (servidor)|Resolução automática de URL, cache, novas tentativas|
|Rota de API chamando serviços externos|`externalClient`|Tempo limite mais longo, sem suposição de URL base|
|Tratamento de erros de rota da API|`handleApiError` / `withErrorHandling`|Respostas de erro padronizadas|

## Arquivos relacionados

- `lib/api/api-client.ts` - Singleton do cliente do navegador e exportações de conveniência
- `lib/api/api-client-class.ts` - Implementação completa da classe `ApiClient`
- `lib/api/server-api-client.ts` - Classe `ServerClient` do lado do servidor
- `lib/api/singleton.ts` - Gerenciador de padrões singleton
- `lib/api/types.ts` - Definições de tipo TypeScript compartilhadas
- `lib/api/constants.ts` - Constantes de API e padrões de consulta React
- `lib/api/error-handler.ts` - Utilitários de tratamento de erros de rota da API Next.js
