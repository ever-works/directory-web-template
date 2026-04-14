---
id: swagger-annotations
title: Swagger-annotaties
sidebar_label: Swagger-annotaties
sidebar_position: 36
---

# Swagger-annotaties

De sjabloon bevat een hulpprogrammamodule voor het genereren van gestandaardiseerde OpenAPI/Swagger JSDoc-annotaties voor Next.js App Router API-routes. Dit systeem vermijdt duplicatie van algemene responsschema's en parameters.

## Bestandsstructuur

```
lib/swagger/
  annotations.ts    # Annotation types, generator functions, common templates
```

## Kerntypen

### Routeconfiguratie

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

### Parameters

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

### Verzoek lichaam

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

### Reactie

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

## Annotaties genereren

### `createSwaggerAnnotation`

Genereert een volledige JSDoc Swagger-annotatiereeks op basis van een configuratieobject:

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

Een afkorting voor routes die alleen voor beheerders toegankelijk zijn en die automatisch `sessionAuth`-beveiliging toevoegen:

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

## Algemene annotaties

Het `CommonAnnotations`-object biedt herbruikbare antwoordsjablonen en parameters:

### Standaard foutreacties

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

Elk antwoord bevat een voorbeeldtekst:

```json
{ "success": false, "error": "Unauthorized" }
```

### Pagineringsparameters

```ts
CommonAnnotations.paginationParameters
// => [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, ... },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, ... },
// ]
```

### Beheerdersbeveiliging

```ts
CommonAnnotations.adminSecurity
// => [{ sessionAuth: [] }]
```

## Gebruik in API-routes

Annotaties worden als JSDoc-opmerkingen boven de export van de routehandler geplaatst. De Swagger-generator verwerkt deze tijdens het bouwen om de OpenAPI-specificatie te produceren:

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

## Aangepaste annotaties maken

Combineer algemene sjablonen met routespecifieke configuratie:

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

## Gerelateerde bestanden

- `lib/swagger/annotations.ts` - Annotatietypen, generatoren en algemene sjablonen
- `app/api/` - API-routehandlers die de annotaties gebruiken
