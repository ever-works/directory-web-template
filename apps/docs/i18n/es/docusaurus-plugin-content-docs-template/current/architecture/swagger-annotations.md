---
id: swagger-annotations
title: Anotaciones de arrogancia
sidebar_label: Anotaciones de arrogancia
sidebar_position: 36
---

# Anotaciones de arrogancia

La plantilla incluye un módulo de utilidad para generar anotaciones JSDoc OpenAPI/Swagger estandarizadas para rutas API de Next.js App Router. Este sistema evita la duplicación de esquemas y parámetros de respuesta comunes.

## Estructura de archivos

```
lib/swagger/
  annotations.ts    # Annotation types, generator functions, common templates
```

## Tipos de núcleos

### Configuración de ruta

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

### Parámetros

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

### Cuerpo de solicitud

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

### Respuesta

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

## Generando anotaciones

### `createSwaggerAnnotation`

Genera una cadena de anotación JSDoc Swagger completa a partir de un objeto de configuración:

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

Una abreviatura de rutas exclusivas para administradores que agrega automáticamente `sessionAuth` seguridad:

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

## Anotaciones comunes

El objeto `CommonAnnotations` proporciona plantillas y parámetros de respuesta reutilizables:

### Respuestas de error estándar

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

Cada respuesta incluye un cuerpo de ejemplo:

```json
{ "success": false, "error": "Unauthorized" }
```

### Parámetros de paginación

```ts
CommonAnnotations.paginationParameters
// => [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, ... },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, ... },
// ]
```

### Seguridad del administrador

```ts
CommonAnnotations.adminSecurity
// => [{ sessionAuth: [] }]
```

## Uso en rutas API

Las anotaciones se colocan como comentarios JSDoc encima de las exportaciones del controlador de ruta. El generador Swagger los procesa durante la compilación para producir la especificación OpenAPI:

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

## Creación de anotaciones personalizadas

Combine plantillas comunes con configuración específica de ruta:

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

## Archivos relacionados

- `lib/swagger/annotations.ts` - Tipos de anotaciones, generadores y plantillas comunes
- `app/api/` - Controladores de ruta API que utilizan las anotaciones
