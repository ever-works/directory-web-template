---
id: openapi-generation
title: יצירת OpenAPI
sidebar_label: יצירת OpenAPI
sidebar_position: 9
---

# יצירת OpenAPI

התבנית כוללת מערכת אוטומטית לייצור תיעוד OpenAPI שמחלצת הערות JSDoc ממסלולי ה-API ויוצרת תיעוד Swagger אינטראקטיבי.

## סקירה כללית

```mermaid
graph TB
    A[API Route Files<br/>app/api/**] --> B[JSDoc Annotations<br/>@swagger]
    B --> C[next-swagger-doc<br/>Parser]
    C --> D[OpenAPI 3.0<br/>Specification]
    D --> E[Swagger UI<br/>/api/docs]
    D --> F[JSON Export<br/>/api/docs.json]
```

## הפעלה

```bash
# יצירת מפרט OpenAPI
pnpm run generate:openapi

# או ישירות מ-apps/web/
cd apps/web
pnpm run generate:openapi
```

## הגדרות

ההגדרות מוגדרות ב-`apps/web/lib/swagger/swagger-options.ts`:

```typescript
export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ever Works API',
      version: '1.0.0',
      description: 'API documentation for Ever Works Directory Template',
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session-based authentication via NextAuth',
        },
        cronSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'x-cron-secret',
          description: 'Secret key for cron job endpoints',
        },
      },
    },
  },
  apiFolder: './app/api',
};
```

## סכמות אבטחה

| סכמה          | סוג    | מיקום  | תיאור                                    |
|---------------|--------|--------|------------------------------------------|
| `sessionAuth` | apiKey | cookie | אימות מבוסס-סשן (NextAuth)              |
| `session`     | apiKey | cookie | אימות Cookie חלופי                      |
| `cronSecret`  | apiKey | header | מפתח סודי לנקודות קצה של Cron           |

## סכמות JSON

הסכמות הבאות משותפות בין נקודות הקצה:

### ErrorResponse

```json
{
  "ErrorResponse": {
    "type": "object",
    "properties": {
      "error": {
        "type": "string",
        "description": "Error message"
      }
    }
  }
}
```

### PaginationMeta

```json
{
  "PaginationMeta": {
    "type": "object",
    "properties": {
      "total": { "type": "integer" },
      "page": { "type": "integer" },
      "limit": { "type": "integer" },
      "totalPages": { "type": "integer" }
    }
  }
}
```

## הוספת הערות Swagger

### דוגמה בסיסית

```typescript
/**
 * @swagger
 * /api/admin/companies:
 *   get:
 *     summary: List all companies
 *     tags: [Admin - Companies]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of companies
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  // implementation
}
```

## גישה לתיעוד

לאחר היצירה, התיעוד זמין ב:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **מפרט JSON**: `http://localhost:3000/api/docs.json`
