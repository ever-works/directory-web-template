---
id: swagger-system
title: "מערכת סוואגר"
sidebar_label: "מערכת סוואגר"
sidebar_position: 23
---

# מערכת סוואגר

התבנית מספקת מערכת תיעוד מלאה של Swagger/OpenAPI הבנויה על `swagger-jsdoc`. הוא כולל עוזרי הערות ב-`lib/swagger/annotations.ts` לסטנדרטיזציה של תיעוד API בכל מטפלי המסלולים.

## אדריכלות

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

## מערכת סוג הערות

המודול `lib/swagger/annotations.ts` מגדיר ממשקי TypeScript המשקפים את מפרט OpenAPI 3.0:

### SwaggerRouteConfig

אובייקט התצורה הראשי לתיעוד נתיב API:

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

מגדיר פרמטרים של שאילתה, נתיב או כותרת:

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

מגדיר את מבנה גוף הבקשה:

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

מגדיר את קודי מצב התגובה ואת הסכמות שלהם:

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

## הערות נפוצות

האובייקט `CommonAnnotations` מספק אבני בניין הניתנות לשימוש חוזר:

### תגובות שגיאה סטנדרטיות

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

כל תגובת שגיאה כוללת דוגמה סטנדרטית:

```json
{
  "success": false,
  "error": "Error message"
}
```

### פרמטרי עימוד

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### אבטחת מנהל

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## יצירת הערות

### createSwaggerAnnotation()

יוצר מחרוזת תגובה מלאה של `@swagger` JSDoc:

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

קיצור למסלולים המוגנים על ידי מנהל מערכת. מוסיף אוטומטית `sessionAuth` אבטחה:

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

## כתיבת תיעוד מסלול

### תבנית הערה ישירה

הגישה הנפוצה ביותר היא כתיבת הערות `@swagger` ישירות בקבצי מסלול:

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

### מסלול POST עם גוף הבקשה

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

## תג ארגון

ארגן מסלולי API לקבוצות לוגיות באמצעות תגים:

|תג|מסלולים|תיאור|
|---|---|---|
|`Items`|`/api/items/*`|רישום ופריטים ציבוריים|
|`Admin`|`/api/admin/*`|פעולות בלוח המחוונים של מנהל המערכת|
|`Auth`|`/api/auth/*`|האימות זורם|
|`Profile`|`/api/profile/*`|ניהול פרופיל משתמש|
|`Newsletter`|`/api/newsletter/*`|מנויים לניוזלטר|
|`Comments`|`/api/comments/*`|הערה פעולות CRUD|
|`Payments`|`/api/payments/*`|עיבוד תשלומים|
|`Cron`|`/api/cron/*`|נקודות קצה של עבודה מתוזמנות|

## תוכניות אבטחה

שלוש סכימות אבטחה מוגדרות בתצורת OpenAPI:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### שימוש בהערות

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

## פלט שנוצר

התסריט `generate-openapi.ts` מייצר `public/openapi.json` עם המבנה הזה:

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

## שיטות עבודה מומלצות

1. **תעד כל מסלול ציבורי** -- כל המסלולים ב-`app/api/` צריכים לכלול הערות `@swagger`
2. **השתמש ב-@@TOK000@@@ עבור סכימות משותפות** -- סכימות רכיבי עזר במקום לשכפל הגדרות
3. **כלול דוגמאות** -- ספק תמיד `example` ערכי בקשות ותגובה
4. **השתמש ב-CommonAnnotations** -- נצל את תגובות השגיאה המשותפות ואת פרמטרי העימוד
5. **תייג באופן עקבי** -- קבץ נקודות קצה קשורות תחת אותו שם תג
6. **תאר פרמטרים** -- כלול `description` ו-`example` עבור כל פרמטר
7. **תעד את כל קודי המצב** -- הצלחה של כיסוי, שגיאת אימות, שגיאת אימות ומקרי שגיאת שרת
8. **שמור הערות קרוב למטפלים** -- הצב את ההערות `@swagger` ישירות מעל פונקציית מטפל המסלול
