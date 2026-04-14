---
id: swagger-system
title: "Swagger-System"
sidebar_label: "Swagger-System"
sidebar_position: 23
---

# Swagger-System

Die Vorlage stellt ein vollständiges Swagger/OpenAPI-Dokumentationssystem bereit, das auf `swagger-jsdoc` basiert. Es enthält Anmerkungshilfen in `lib/swagger/annotations.ts` zur Standardisierung der API-Dokumentation für alle Routenhandler.

## Architektur

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

## Anmerkungstypsystem

Das Modul `lib/swagger/annotations.ts` definiert TypeScript-Schnittstellen, die die OpenAPI 3.0-Spezifikation widerspiegeln:

### SwaggerRouteConfig

Das Hauptkonfigurationsobjekt zur Dokumentation einer API-Route:

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

Definiert Abfrage-, Pfad- oder Header-Parameter:

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

Definiert die Struktur des Anforderungstexts:

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

### SwaggerResponse

Definiert Antwortstatuscodes und ihre Schemata:

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

## Allgemeine Anmerkungen

Das Objekt `CommonAnnotations` stellt wiederverwendbare Bausteine bereit:

### Standard-Fehlerantworten

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

Jede Fehlerantwort enthält ein Standardbeispiel:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginierungsparameter

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Admin-Sicherheit

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Anmerkungen erstellen

### createSwaggerAnnotation()

Erzeugt eine vollständige `@swagger` JSDoc-Kommentarzeichenfolge:

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

### createAdminRouteAnnotation()

Abkürzung für admin-geschützte Routen. Fügt automatisch `sessionAuth` Sicherheit hinzu:

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

## Routendokumentation schreiben

### Direktes Anmerkungsmuster

Der gebräuchlichste Ansatz besteht darin, `@swagger` Kommentare direkt in Routendateien zu schreiben:

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

### POST-Route mit Anforderungstext

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

## Tag-Organisation

Organisieren Sie API-Routen mithilfe von Tags in logische Gruppen:

|Etikett|Routen|Beschreibung|
|---|---|---|
|`Items`|`/api/items/*`|Öffentliche Artikelliste und Details|
|`Admin`|`/api/admin/*`|Admin-Dashboard-Vorgänge|
|`Auth`|`/api/auth/*`|Authentifizierungsflüsse|
|`Profile`|`/api/profile/*`|Benutzerprofilverwaltung|
|`Newsletter`|`/api/newsletter/*`|Newsletter-Abonnements|
|`Comments`|`/api/comments/*`|Kommentieren Sie CRUD-Operationen|
|`Payments`|`/api/payments/*`|Zahlungsabwicklung|
|`Cron`|`/api/cron/*`|Geplante Jobendpunkte|

## Sicherheitssysteme

In der OpenAPI-Konfiguration sind drei Sicherheitsschemata definiert:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Verwendung in Anmerkungen

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

## Generierte Ausgabe

Das `generate-openapi.ts`-Skript erzeugt `public/openapi.json` mit dieser Struktur:

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

## Best Practices

1. **Jede öffentliche Route dokumentieren** – Alle Routen in `app/api/` sollten `@swagger` Anmerkungen haben
2. **Verwenden Sie `$ref` für gemeinsam genutzte Schemata** – Verweisen Sie auf Komponentenschemata, anstatt Definitionen zu duplizieren
3. **Beispiele einschließen** – Geben Sie immer `example`-Werte für Anforderungs- und Antworttexte an
4. **CommonAnnotations verwenden** – Nutzen Sie die gemeinsamen Fehlerantworten und Paginierungsparameter
5. **Konsistent markieren** – Gruppieren Sie verwandte Endpunkte unter demselben Tag-Namen
6. **Parameter beschreiben** – Geben Sie für jeden Parameter `description` und `example` an
7. **Dokumentieren Sie alle Statuscodes** – Deckt Fälle von Erfolg, Validierungsfehler, Authentifizierungsfehler und Serverfehler ab
8. **Anmerkungen in der Nähe von Handlern halten** – Platzieren Sie `@swagger`-Kommentare direkt über der Routenhandlerfunktion
