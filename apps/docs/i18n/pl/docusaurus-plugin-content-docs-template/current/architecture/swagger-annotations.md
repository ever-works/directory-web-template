---
id: swagger-annotations
title: Adnotacje swaggerowe
sidebar_label: Adnotacje swaggerowe
sidebar_position: 36
---

# Adnotacje swaggerowe

Szablon zawiera moduł narzędziowy do generowania standardowych adnotacji OpenAPI/Swagger JSDoc dla tras API Next.js App Router. System ten pozwala uniknąć powielania wspólnych schematów odpowiedzi i parametrów.

## Struktura pliku

```
lib/swagger/
  annotations.ts    # Annotation types, generator functions, common templates
```

## Typy rdzeni

### Konfiguracja trasy

```ts
export interface SwaggerRouteConfig {
  tags: string[];
  summary: string;
  description: string;
  security?: Array<Record<string, string[]>>;
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses: Record<string, SwaggerResponse>;
}
```

### Parametry

```ts
export interface SwaggerParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema: {
    type: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    default?: any;
    enum?: string[];
  };
  description?: string;
  example?: any;
}
```

### Treść żądania

```ts
export interface SwaggerRequestBody {
  required: boolean;
  content: {
    'application/json': {
      schema: {
        $ref?: string;
        type?: string;
        properties?: Record<string, any>;
      };
      example?: any;
    };
  };
}
```

### Odpowiedź

```ts
export interface SwaggerResponse {
  description: string;
  content?: {
    'application/json': {
      schema: {
        $ref?: string;
        type?: string;
        properties?: Record<string, any>;
      };
      example?: any;
      examples?: Record<string, any>;
    };
  };
}
```

## Generowanie adnotacji

### `createSwaggerAnnotation`

Generuje pełny ciąg adnotacji JSDoc Swagger z obiektu konfiguracyjnego:

```ts
import { createSwaggerAnnotation } from '@/lib/swagger/annotations';

const annotation = createSwaggerAnnotation('/api/items', 'get', {
  tags: ['Items'],
  summary: 'List all items',
  description: 'Returns a paginated list of items',
  parameters: [
    {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      description: 'Items per page',
    },
  ],
  responses: {
    '200': {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: { success: true, data: [], meta: { page: 1, total: 100 } },
        },
      },
    },
    '500': {
      description: 'Server error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});
```

### `createAdminRouteAnnotation`

Skrót tras przeznaczonych tylko dla administratorów, który automatycznie dodaje zabezpieczenia `sessionAuth`:

```ts
import { createAdminRouteAnnotation } from '@/lib/swagger/annotations';

const annotation = createAdminRouteAnnotation('/api/admin/users', 'get', {
  tags: ['Admin', 'Users'],
  summary: 'List all users',
  description: 'Admin endpoint to list all registered users',
  parameters: CommonAnnotations.paginationParameters,
  responses: {
    '200': { description: 'List of users' },
    '401': CommonAnnotations.responses.unauthorized,
    '403': CommonAnnotations.responses.forbidden,
  },
});
```

## Wspólne adnotacje

Obiekt `CommonAnnotations` udostępnia szablony i parametry odpowiedzi wielokrotnego użytku:

### Standardowe odpowiedzi na błędy

```ts
CommonAnnotations.responses.unauthorized
// => { description: 'Authentication required', content: { ... } }

CommonAnnotations.responses.forbidden
// => { description: 'Forbidden - Admin access required', content: { ... } }

CommonAnnotations.responses.notFound
// => { description: 'Resource not found', content: { ... } }

CommonAnnotations.responses.serverError
// => { description: 'Internal server error', content: { ... } }
```

Każda odpowiedź zawiera przykładową treść:

```json
{ "success": false, "error": "Unauthorized" }
```

### Parametry paginacji

```ts
CommonAnnotations.paginationParameters
// => [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, ... },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, ... },
// ]
```

### Bezpieczeństwo administratora

```ts
CommonAnnotations.adminSecurity
// => [{ sessionAuth: [] }]
```

## Użycie w trasach API

Adnotacje są umieszczane jako komentarze JSDoc nad eksportami procedur obsługi tras. Generator Swagger przetwarza je podczas kompilacji, aby wygenerować specyfikację OpenAPI:

```ts
// app/api/items/route.ts

/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]
 *     summary: "List all items"
 *     description: "Returns a paginated list of items"
 *     parameters:
 *       - name: "page"
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for pagination"
 *     responses:
 *       200:
 *         description: "Successful response"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: Request) {
  // handler implementation
}
```

## Tworzenie niestandardowych adnotacji

Połącz typowe szablony z konfiguracją specyficzną dla trasy:

```ts
import { createSwaggerAnnotation, CommonAnnotations } from '@/lib/swagger/annotations';

const itemCreateAnnotation = createSwaggerAnnotation('/api/items', 'post', {
  tags: ['Items'],
  summary: 'Create a new item',
  description: 'Creates a new item submission',
  security: CommonAnnotations.adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateItemInput' },
        example: {
          name: 'My Tool',
          description: 'A great tool for developers',
          source_url: 'https://example.com',
        },
      },
    },
  },
  responses: {
    '201': {
      description: 'Item created successfully',
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: { success: true, data: { id: '...', slug: 'my-tool' } },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Name is required' },
        },
      },
    },
    '401': CommonAnnotations.responses.unauthorized,
    '500': CommonAnnotations.responses.serverError,
  },
});
```

## Powiązane pliki

- `lib/swagger/annotations.ts` - Typy adnotacji, generatory i popularne szablony
- `app/api/` - procedury obsługi tras API korzystające z adnotacji
