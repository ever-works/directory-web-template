---
id: swagger-system
title: "System wahadłowy"
sidebar_label: "System wahadłowy"
sidebar_position: 23
---

# System wahadłowy

Szablon zapewnia kompletny system dokumentacji Swagger/OpenAPI zbudowany na `swagger-jsdoc`. Zawiera pomocników adnotacji w `lib/swagger/annotations.ts` w celu ujednolicenia dokumentacji API we wszystkich procedurach obsługi tras.

## Architektura

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

## System typów adnotacji

Moduł `lib/swagger/annotations.ts` definiuje interfejsy TypeScript, które odzwierciedlają specyfikację OpenAPI 3.0:

### Konfiguracja trasy Swagger

Główny obiekt konfiguracyjny do dokumentowania trasy API:

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

### Parametr Swaggera

Definiuje parametry zapytania, ścieżki lub nagłówka:

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

### Treść żądania Swagger

Definiuje strukturę treści żądania:

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

### Odpowiedź Swaggera

Definiuje kody stanu odpowiedzi i ich schematy:

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

## Wspólne adnotacje

Obiekt `CommonAnnotations` zapewnia elementy konstrukcyjne wielokrotnego użytku:

### Standardowe odpowiedzi na błędy

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

Każda odpowiedź na błąd zawiera standardowy przykład:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Parametry paginacji

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Bezpieczeństwo administratora

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Tworzenie adnotacji

### utwórzSwaggerAnnotation()

Generuje kompletny ciąg komentarza `@swagger` JSDoc:

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

### utwórzAdminRouteAnnotation()

Skrót oznaczający trasy chronione przez administratora. Automatycznie dodaje zabezpieczenia `sessionAuth`:

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

## Pisanie dokumentacji tras

### Wzór adnotacji bezpośredniej

Najbardziej powszechnym podejściem jest pisanie komentarzy `@swagger` bezpośrednio w plikach tras:

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

### Trasa POST z treścią żądania

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

## Organizacja tagów

Organizuj trasy API w logiczne grupy za pomocą tagów:

|Oznacz|Trasy|Opis|
|---|---|---|
|`Items`|`/api/items/*`|Publiczna lista przedmiotów i szczegóły|
|`Admin`|`/api/admin/*`|Operacje na panelu administracyjnym|
|`Auth`|`/api/auth/*`|Przepływy uwierzytelniania|
|`Profile`|`/api/profile/*`|Zarządzanie profilami użytkowników|
|`Newsletter`|`/api/newsletter/*`|Subskrypcje biuletynu|
|`Comments`|`/api/comments/*`|Skomentuj operacje CRUD|
|`Payments`|`/api/payments/*`|Przetwarzanie płatności|
|`Cron`|`/api/cron/*`|Zaplanowane punkty końcowe zadania|

## Schematy bezpieczeństwa

W konfiguracji OpenAPI zdefiniowane są trzy schematy zabezpieczeń:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Użycie w adnotacjach

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

## Wygenerowane dane wyjściowe

Skrypt `generate-openapi.ts` tworzy `public/openapi.json` o następującej strukturze:

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

## Najlepsze praktyki

1. **Udokumentuj każdą trasę publiczną** -- Wszystkie trasy w `app/api/` powinny mieć adnotacje `@swagger`
2. **Użyj `$ref` dla schematów współdzielonych** -- Odwołuj się do schematów komponentów zamiast powielać definicje
3. **Dołącz przykłady** — Zawsze podawaj wartości `example` dla treści żądań i odpowiedzi
4. **Użyj CommonAnnotations** – Wykorzystaj wspólne odpowiedzi na błędy i parametry paginacji
5. **Taguj konsekwentnie** — grupuj powiązane punkty końcowe pod tą samą nazwą tagu
6. **Opisz parametry** -- Dołącz `description` i `example` dla każdego parametru
7. **Udokumentuj wszystkie kody stanu** — Uwzględnij przypadki powodzenia, błędów sprawdzania poprawności, błędów uwierzytelniania i błędów serwera
8. **Trzymaj adnotacje blisko programów obsługi** — Umieść komentarze `@swagger` bezpośrednio nad funkcją obsługi tras
