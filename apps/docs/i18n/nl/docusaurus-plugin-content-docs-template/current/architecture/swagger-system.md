---
id: swagger-system
title: "Swagger-systeem"
sidebar_label: "Swagger-systeem"
sidebar_position: 23
---

# Swagger-systeem

De sjabloon biedt een compleet Swagger/OpenAPI-documentatiesysteem gebouwd op `swagger-jsdoc`. Het bevat annotatiehelpers in `lib/swagger/annotations.ts` voor het standaardiseren van API-documentatie voor alle route-handlers.

## Architectuur

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

## Annotatietypesysteem

De `lib/swagger/annotations.ts` module definieert TypeScript-interfaces die de OpenAPI 3.0-specificatie weerspiegelen:

### SwaggerRouteConfig

Het belangrijkste configuratieobject voor het documenteren van een API-route:

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

### SwaggerParameter

Definieert query-, pad- of headerparameters:

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

### SwaggerRequestBody

Definieert de structuur van de aanvraagtekst:

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

### Swagger-reactie

Definieert responsstatuscodes en hun schema's:

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

## Algemene annotaties

Het `CommonAnnotations` object biedt herbruikbare bouwstenen:

### Standaard foutreacties

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

Elke foutreactie bevat een standaardvoorbeeld:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Pagineringsparameters

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Beheerdersbeveiliging

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Annotaties maken

### createSwaggerAnnotatie()

Genereert een volledige `@swagger` JSDoc-opmerkingenreeks:

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

### createAdminRouteAnnotatie()

Afkorting voor door beheerders beveiligde routes. Voegt automatisch `sessionAuth`-beveiliging toe:

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

## Routedocumentatie schrijven

### Direct annotatiepatroon

De meest gebruikelijke aanpak is het rechtstreeks schrijven van `@swagger`-opmerkingen in routebestanden:

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

### POST-route met verzoektekst

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

## Organisatie van tags

Organiseer API-routes in logische groepen met behulp van tags:

|Label|Routes|Beschrijving|
|---|---|---|
|`Items`|`/api/items/*`|Openbare itemlijst en details|
|`Admin`|`/api/admin/*`|Bewerkingen op het beheerdersdashboard|
|`Auth`|`/api/auth/*`|Authenticatiestromen|
|`Profile`|`/api/profile/*`|Beheer van gebruikersprofielen|
|`Newsletter`|`/api/newsletter/*`|Nieuwsbriefabonnementen|
|`Comments`|`/api/comments/*`|Commentaar CRUD-bewerkingen|
|`Payments`|`/api/payments/*`|Betalingsverwerking|
|`Cron`|`/api/cron/*`|Geplande taakeindpunten|

## Beveiligingsschema's

Er zijn drie beveiligingsschema's gedefinieerd in de OpenAPI-configuratie:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Gebruik in annotaties

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

## Gegenereerde uitvoer

Het `generate-openapi.ts`-script produceert `public/openapi.json` met deze structuur:

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

## Beste praktijken

1. **Documenteer elke openbare route** -- Alle routes in `app/api/` moeten `@swagger` annotaties hebben
2. **Gebruik `$ref` voor gedeelde schema's** -- Verwijs naar componentschema's in plaats van definities te dupliceren
3. **Voeg voorbeelden toe** -- Geef altijd `example`-waarden op voor verzoek- en antwoordteksten
4. **Gebruik CommonAnnotations** -- Maak gebruik van de gedeelde foutreacties en pagineringsparameters
5. **Consequent taggen**: groepeer gerelateerde eindpunten onder dezelfde tagnaam
6. **Beschrijf parameters** -- Voeg `description` en `example` toe voor elke parameter
7. **Documenteer alle statuscodes** - Behandel gevallen van succes, validatiefout, auth-fout en serverfout
8. **Houd annotaties dicht bij handlers** -- Plaats `@swagger` opmerkingen direct boven de routehandlerfunctie
