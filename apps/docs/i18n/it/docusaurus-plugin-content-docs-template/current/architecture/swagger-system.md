---
id: swagger-system
title: "Sistema di spavalderia"
sidebar_label: "Sistema di spavalderia"
sidebar_position: 23
---

# Sistema di spavalderia

Il modello fornisce un sistema di documentazione Swagger/OpenAPI completo basato su `swagger-jsdoc`. Include helper per le annotazioni in `lib/swagger/annotations.ts` per standardizzare la documentazione API in tutti i gestori di route.

## Architettura

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

## Sistema di tipi di annotazione

Il modulo `lib/swagger/annotations.ts` definisce le interfacce TypeScript che rispecchiano la specifica OpenAPI 3.0:

### SwaggerRouteConfig

L'oggetto di configurazione principale per documentare un percorso API:

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

### Parametro Swagger

Definisce i parametri di query, percorso o intestazione:

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

Definisce la struttura del corpo della richiesta:

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

### Risposta spavalda

Definisce i codici di stato della risposta e i relativi schemi:

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

## Annotazioni comuni

L'oggetto `CommonAnnotations` fornisce elementi costitutivi riutilizzabili:

### Risposte agli errori standard

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

Ogni risposta all'errore include un esempio standard:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Parametri di impaginazione

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Sicurezza amministrativa

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Creazione di annotazioni

### createSwaggerAnnotation()

Genera una stringa di commento JSDoc completa `@swagger`:

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

Abbreviazione di percorsi protetti dall'amministratore. Aggiunge automaticamente la sicurezza `sessionAuth`:

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

## Scrivere la documentazione del percorso

### Modello di annotazione diretta

L'approccio più comune è scrivere `@swagger` commenti direttamente nei file di percorso:

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

### Percorso POST con corpo della richiesta

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

## Organizzazione dei tag

Organizza le rotte API in gruppi logici utilizzando i tag:

|Etichetta|Percorsi|Descrizione|
|---|---|---|
|`Items`|`/api/items/*`|Elenco e dettagli degli articoli pubblici|
|`Admin`|`/api/admin/*`|Operazioni del dashboard di amministrazione|
|`Auth`|`/api/auth/*`|Flussi di autenticazione|
|`Profile`|`/api/profile/*`|Gestione del profilo utente|
|`Newsletter`|`/api/newsletter/*`|Iscrizioni alla newsletter|
|`Comments`|`/api/comments/*`|Commenta le operazioni CRUD|
|`Payments`|`/api/payments/*`|Elaborazione dei pagamenti|
|`Cron`|`/api/cron/*`|Endpoint del lavoro pianificato|

## Schemi di sicurezza

Nella configurazione OpenAPI sono definiti tre schemi di sicurezza:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Utilizzo nelle annotazioni

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

## Output generato

Lo script `generate-openapi.ts` produce `public/openapi.json` con questa struttura:

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

## Migliori pratiche

1. **Documentare ogni percorso pubblico** -- Tutti i percorsi in `app/api/` devono avere annotazioni `@swagger`
2. **Utilizza `$ref` per schemi condivisi** -- Fai riferimento agli schemi dei componenti invece di duplicare le definizioni
3. **Includi esempi** -- Fornisci sempre i valori `example` per i corpi delle richieste e delle risposte
4. **Utilizza CommonAnnotations**: sfrutta le risposte agli errori condivise e i parametri di impaginazione
5. **Tagga in modo coerente**: raggruppa gli endpoint correlati sotto lo stesso nome di tag
6. **Descrivi i parametri** -- Includi `description` e `example` per ogni parametro
7. **Documentare tutti i codici di stato**: coprire i casi di successo, errore di convalida, errore di autenticazione ed errore del server
8. **Mantieni le annotazioni vicino ai gestori** -- Inserisci i commenti `@swagger` direttamente sopra la funzione del gestore del percorso
