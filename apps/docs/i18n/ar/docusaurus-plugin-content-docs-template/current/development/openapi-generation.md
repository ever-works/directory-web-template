---
id: openapi-generation
title: توليد OpenAPI
sidebar_label: توليد OpenAPI
sidebar_position: 9
---

# توليد OpenAPI

يتضمن القالب نظامًا آليًا لتوليد وثائق OpenAPI يستخرج تعليقات JSDoc من مسارات API ويُنشئ وثائق Swagger تفاعلية.

## نظرة عامة

```mermaid
graph TB
    A[API Route Files<br/>app/api/**] --> B[JSDoc Annotations<br/>@swagger]
    B --> C[next-swagger-doc<br/>Parser]
    C --> D[OpenAPI 3.0<br/>Specification]
    D --> E[Swagger UI<br/>/api/docs]
    D --> F[JSON Export<br/>/api/docs.json]
```

## كيفية التشغيل

```bash
# توليد مواصفة OpenAPI
pnpm run generate:openapi

# أو مباشرةً من apps/web/
cd apps/web
pnpm run generate:openapi
```

## الإعداد

يُعرَّف الإعداد في `apps/web/lib/swagger/swagger-options.ts`:

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

## مخططات الأمان

| المخطط        | النوع  | الموقع | الوصف                               |
|---------------|--------|--------|-------------------------------------|
| `sessionAuth` | apiKey | cookie | المصادقة المعتمدة على الجلسة (NextAuth) |
| `session`     | apiKey | cookie | مصادقة Cookie البديلة              |
| `cronSecret`  | apiKey | header | المفتاح السري لنقاط نهاية Cron      |

## مخططات JSON

المخططات التالية مشتركة بين نقاط النهاية:

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

## إضافة تعليقات Swagger

### مثال أساسي

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

## الوصول إلى الوثائق

بعد التوليد، تكون الوثائق متاحة على:

- **Swagger UI**: `http://localhost:3000/api/docs`
- **مواصفة JSON**: `http://localhost:3000/api/docs.json`
