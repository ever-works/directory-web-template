---
id: swagger-system
title: "Sistema de arrogancia"
sidebar_label: "Sistema de arrogancia"
sidebar_position: 23
---

# Sistema de arrogancia

La plantilla proporciona un sistema de documentación Swagger/OpenAPI completo construido en `swagger-jsdoc`. Incluye ayudas de anotación en `lib/swagger/annotations.ts` para estandarizar la documentación API en todos los controladores de ruta.

## Arquitectura

```mermaid
graph TD
    A[lib/swagger/annotations.ts] --> B[Type Definitions]
    A --> C[createSwaggerAnnotation]
    A --> D[createAdminRouteAnnotation]
    A --> E[CommonAnnotations]

    F["app/api/**/route.ts"] --> G["Swagger JSDoc"]
    G --> H[generate-openapi.ts]
    C --> G
    D --> G
    E --> G

    H --> I[public/openapi.json]
    I --> J[Swagger UI]
```

## Sistema de tipo de anotación

El módulo `lib/swagger/annotations.ts` define interfaces TypeScript que reflejan la especificación OpenAPI 3.0:

### SwaggerRouteConfig

El objeto de configuración principal para documentar una ruta API:

```typescript
interface SwaggerRouteConfig {
  tags: string[];                              // API grouping tags
  summary: string;                             // Brief description
  description: string;                         // Detailed description
  security?: Array<Record<string, string[]>>;  // Security requirements
  parameters?: SwaggerParameter[];             // Query/path/header params
  requestBody?: SwaggerRequestBody;            // Request body schema
  responses: Record<string, SwaggerResponse>;  // Response definitions
}
```

### Parámetro Swagger

Define parámetros de consulta, ruta o encabezado:

```typescript
interface SwaggerParameter {
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

### SwaggerSolicitudCuerpo

Define la estructura del cuerpo de la solicitud:

```typescript
interface SwaggerRequestBody {
  required: boolean;
  content: {
    'application/json': {
      schema: {
        $ref?: string;       // Reference to a component schema
        type?: string;       // Inline type definition
        properties?: Record<string, any>;
      };
      example?: any;
    };
  };
}
```

### Respuesta arrogante

Define códigos de estado de respuesta y sus esquemas:

```typescript
interface SwaggerResponse {
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

## Anotaciones comunes

El objeto `CommonAnnotations` proporciona bloques de construcción reutilizables:

### Respuestas de error estándar

```typescript
CommonAnnotations.responses.unauthorized
// { description: 'Authentication required', ... }

CommonAnnotations.responses.forbidden
// { description: 'Forbidden - Admin access required', ... }

CommonAnnotations.responses.notFound
// { description: 'Resource not found', ... }

CommonAnnotations.responses.serverError
// { description: 'Internal server error', ... }
```

Cada respuesta de error incluye un ejemplo estándar:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Parámetros de paginación

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Seguridad del administrador

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Crear anotaciones

### crearSwaggerAnnotation()

Genera una cadena de comentarios JSDoc `@swagger` completa:

```typescript
import { createSwaggerAnnotation, CommonAnnotations } from '@/lib/swagger/annotations';

const annotation = createSwaggerAnnotation('/api/items', 'GET', {
  tags: ['Items'],
  summary: 'List all items',
  description: 'Returns a paginated list of items with filtering support',
  parameters: [
    ...CommonAnnotations.paginationParameters,
    {
      name: 'category',
      in: 'query',
      required: false,
      schema: { type: 'string' },
      description: 'Filter by category',
      example: 'Web Development'
    }
  ],
  responses: {
    '200': {
      description: 'Paginated list of items',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/Pagination' },
          example: {
            items: [{ id: '1', title: 'Sample Item' }],
            pagination: { page: 1, pageSize: 10, total: 50, totalPages: 5 }
          }
        }
      }
    },
    '500': CommonAnnotations.responses.serverError
  }
});
```

### crearAdminRouteAnnotation()

Taquigrafía de rutas protegidas por administradores. Agrega automáticamente `sessionAuth` seguridad:

```typescript
import { createAdminRouteAnnotation, CommonAnnotations } from '@/lib/swagger/annotations';

const annotation = createAdminRouteAnnotation('/api/admin/users', 'GET', {
  tags: ['Admin'],
  summary: 'List all users',
  description: 'Returns all registered users with their profiles and roles',
  parameters: CommonAnnotations.paginationParameters,
  responses: {
    '200': {
      description: 'User list with pagination',
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: {
            items: [{ id: '1', email: 'admin@example.com', role: 'admin' }],
            pagination: { page: 1, pageSize: 10, total: 100, totalPages: 10 }
          }
        }
      }
    },
    '401': CommonAnnotations.responses.unauthorized,
    '403': CommonAnnotations.responses.forbidden,
    '500': CommonAnnotations.responses.serverError
  }
});
```

## Redacción de documentación de ruta

### Patrón de anotación directa

El enfoque más común es escribir comentarios `@swagger` directamente en archivos de ruta:

```typescript
// app/api/items/route.ts

/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]
 *     summary: "Get all items"
 *     description: "Returns paginated items list with optional category filter"
 *     parameters:
 *       - name: "page"
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: "limit"
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: "Success"
 *       500:
 *         description: "Server error"
 */
export async function GET(request: Request) {
  // implementation
}
```

### Ruta POST con cuerpo de solicitud

```typescript
/**
 * @swagger
 * /api/items:
 *   post:
 *     tags: ["Items"]
 *     summary: "Create a new item"
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *           example:
 *             title: "My New Item"
 *             description: "Item description"
 *             category: "Web Development"
 *     responses:
 *       201:
 *         description: "Item created"
 *       400:
 *         description: "Validation error"
 *       401:
 *         description: "Unauthorized"
 */
export async function POST(request: Request) {
  // implementation
}
```

## Organización de etiquetas

Organice las rutas API en grupos lógicos mediante etiquetas:

|Etiqueta|Rutas|Descripción|
|---|---|---|
|`Items`|`/api/items/*`|Listado de artículos públicos y detalles.|
|`Admin`|`/api/admin/*`|Operaciones del panel de administración|
|`Auth`|`/api/auth/*`|Flujos de autenticación|
|`Profile`|`/api/profile/*`|Gestión de perfiles de usuario|
|`Newsletter`|`/api/newsletter/*`|Suscripciones a boletines|
|`Comments`|`/api/comments/*`|Comentar operaciones CRUD|
|`Payments`|`/api/payments/*`|Procesamiento de pagos|
|`Cron`|`/api/cron/*`|Puntos finales de trabajo programados|

## Esquemas de seguridad

Se definen tres esquemas de seguridad en la configuración de OpenAPI:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Uso en anotaciones

```yaml
# JWT Bearer authentication
security:
  - sessionAuth: []

# Cookie-based session
security:
  - session: []

# Cron job secret
security:
  - cronSecret: []
```

## Salida generada

El script `generate-openapi.ts` produce `public/openapi.json` con esta estructura:

```json
{
  "openapi": "3.0.0",
  "info": { "title": "Ever Works API", "version": "1.0.0" },
  "servers": [{ "url": "/" }],
  "paths": {
    "/api/items": { "get": { ... }, "post": { ... } },
    "/api/admin/users": { "get": { ... } }
  },
  "components": {
    "securitySchemes": { ... },
    "schemas": {
      "ErrorResponse": { ... },
      "PaginationMeta": { ... },
      "Pagination": { ... }
    }
  },
  "tags": [
    { "name": "Items" },
    { "name": "Admin" }
  ]
}
```

## Mejores prácticas

1. **Documente cada ruta pública** -- Todas las rutas en `app/api/` deben tener anotaciones `@swagger`
2. **Utilice `$ref` para esquemas compartidos**: haga referencia a esquemas de componentes en lugar de duplicar definiciones
3. **Incluir ejemplos**: proporcione siempre valores `example` para los cuerpos de solicitud y respuesta.
4. **Utilice CommonAnnotations**: aproveche las respuestas de error compartidas y los parámetros de paginación
5. **Etiquetar de forma consistente**: puntos finales relacionados con el grupo bajo el mismo nombre de etiqueta
6. **Describa los parámetros**: incluya `description` y `example` para cada parámetro.
7. **Documente todos los códigos de estado**: cubra los casos de éxito, error de validación, error de autenticación y error del servidor.
8. **Mantenga las anotaciones cerca de los controladores**: coloque los comentarios `@swagger` directamente encima de la función del controlador de ruta.
