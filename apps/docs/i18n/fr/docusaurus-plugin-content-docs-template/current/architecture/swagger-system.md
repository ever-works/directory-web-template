---
id: swagger-system
title: "Système Swagger"
sidebar_label: "Système Swagger"
sidebar_position: 23
---

# Système Swagger

Le modèle fournit un système de documentation Swagger/OpenAPI complet basé sur `swagger-jsdoc`. Il inclut des assistants d'annotation dans `lib/swagger/annotations.ts` pour standardiser la documentation de l'API sur tous les gestionnaires de routes.

## Architecture

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

## Système de types d'annotations

Le module `lib/swagger/annotations.ts` définit des interfaces TypeScript qui reflètent la spécification OpenAPI 3.0 :

### SwaggerRouteConfig

L'objet de configuration principal pour documenter une route API :

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

### Paramètre Swagger

Définit les paramètres de requête, de chemin ou d'en-tête :

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

### SwaggerRequestCorps

Définit la structure du corps de la requête :

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

### SwaggerRéponse

Définit les codes d'état de réponse et leurs schémas :

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

## Annotations courantes

L'objet `CommonAnnotations` fournit des blocs de construction réutilisables :

### Réponses aux erreurs standard

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

Chaque réponse d'erreur comprend un exemple standard :

```json
{
  "success": false,
  "error": "Error message"
}
```

### Paramètres de pagination

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Sécurité de l'administrateur

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Création d'annotations

### créerSwaggerAnnotation()

Génère une chaîne de commentaire JSDoc `@swagger` complète :

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

Raccourci pour les routes protégées par l'administrateur. Ajoute automatiquement la sécurité `sessionAuth` :

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

## Rédaction de la documentation des itinéraires

### Modèle d'annotation directe

L'approche la plus courante consiste à écrire des commentaires `@swagger` directement dans les fichiers de route :

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

### Route POST avec corps de requête

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

## Organisation des balises

Organisez les routes API en groupes logiques à l'aide de balises :

|Étiquette|Itinéraires|Descriptif|
|---|---|---|
|`Items`|`/api/items/*`|Liste et détails des articles publics|
|`Admin`|`/api/admin/*`|Opérations du tableau de bord d'administration|
|`Auth`|`/api/auth/*`|Flux d'authentification|
|`Profile`|`/api/profile/*`|Gestion du profil utilisateur|
|`Newsletter`|`/api/newsletter/*`|Abonnements à la newsletter|
|`Comments`|`/api/comments/*`|Commentaire sur les opérations CRUD|
|`Payments`|`/api/payments/*`|Traitement des paiements|
|`Cron`|`/api/cron/*`|Points de terminaison de tâches planifiées|

## Schémas de sécurité

Trois schémas de sécurité sont définis dans la configuration OpenAPI :

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Utilisation dans les annotations

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

## Sortie générée

Le script `generate-openapi.ts` produit `public/openapi.json` avec cette structure :

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

## Meilleures pratiques

1. **Documentez chaque itinéraire public** -- Tous les itinéraires dans `app/api/` doivent avoir des annotations `@swagger`
2. **Utilisez `$ref` pour les schémas partagés** – Référencez les schémas de composants au lieu de dupliquer les définitions.
3. **Inclure des exemples** -- Fournissez toujours les valeurs `example` pour les corps de requête et de réponse.
4. **Utilisez CommonAnnotations** – Exploitez les réponses aux erreurs partagées et les paramètres de pagination.
5. **Étiqueter de manière cohérente** : regrouper les points de terminaison associés sous le même nom de balise
6. **Décrire les paramètres** -- Inclure `description` et `example` pour chaque paramètre
7. **Documentez tous les codes d'état** - Couvrez les cas de réussite, d'erreur de validation, d'erreur d'authentification et d'erreur de serveur.
8. **Gardez les annotations à proximité des gestionnaires** -- Placez les commentaires `@swagger` directement au-dessus de la fonction du gestionnaire de route.
