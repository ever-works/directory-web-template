---
id: swagger-system
title: "نظام التباهي"
sidebar_label: "نظام التباهي"
sidebar_position: 23
---

# نظام التباهي

يوفر القالب نظام توثيق Swagger/OpenAPI كاملًا مبنيًا على `swagger-jsdoc`. يتضمن مساعدين للتعليقات التوضيحية في `lib/swagger/annotations.ts` لتوحيد وثائق API عبر جميع معالجات المسار.

## الهندسة المعمارية

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

## نظام نوع التعليق التوضيحي

تحدد الوحدة `lib/swagger/annotations.ts` واجهات TypeScript التي تعكس مواصفات OpenAPI 3.0:

### SwaggerRouteConfig

كائن التكوين الرئيسي لتوثيق مسار API:

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

يحدد معلمات الاستعلام أو المسار أو الرأس:

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

يحدد هيكل نص الطلب:

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

### استجابة التبختر

تعريف رموز حالة الاستجابة ومخططاتها:

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

## التعليقات التوضيحية المشتركة

يوفر الكائن `CommonAnnotations` كتل بناء قابلة لإعادة الاستخدام:

### استجابات الخطأ القياسية

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

تتضمن كل استجابة للخطأ مثالاً قياسيًا:

```json
{
  "success": false,
  "error": "Error message"
}
```

### معلمات ترقيم الصفحات

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### أمن المسؤول

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## إنشاء التعليقات التوضيحية

### createSwaggerAnnotation()

يُنشئ سلسلة تعليقات JSDoc `@swagger` كاملة:

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

اختصار للمسارات المحمية من قبل المسؤول. يضيف الأمان `sessionAuth` تلقائيًا:

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

## كتابة وثائق الطريق

### نمط التعليق المباشر

الطريقة الأكثر شيوعًا هي كتابة التعليقات `@swagger` مباشرةً في ملفات المسار:

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

### مسار POST مع نص الطلب

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

## منظمة العلامة

تنظيم مسارات واجهة برمجة التطبيقات (API) في مجموعات منطقية باستخدام العلامات:

|علامة|الطرق|الوصف|
|---|---|---|
|`Items`|`/api/items/*`|قائمة العناصر العامة والتفاصيل|
|`Admin`|`/api/admin/*`|عمليات لوحة تحكم المشرف|
|`Auth`|`/api/auth/*`|تدفقات المصادقة|
|`Profile`|`/api/profile/*`|إدارة ملف تعريف المستخدم|
|`Newsletter`|`/api/newsletter/*`|اشتراكات النشرة الإخبارية|
|`Comments`|`/api/comments/*`|عمليات التعليق CRUD|
|`Payments`|`/api/payments/*`|معالجة الدفع|
|`Cron`|`/api/cron/*`|نقاط نهاية المهمة المجدولة|

## مخططات الأمن

تم تحديد ثلاثة أنظمة أمان في تكوين OpenAPI:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### الاستخدام في التعليقات التوضيحية

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

## الناتج المولد

ينتج البرنامج النصي `generate-openapi.ts` `public/openapi.json` بهذه البنية:

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

## أفضل الممارسات

1. **توثيق كل مسار عام** - يجب أن تحتوي جميع المسارات في `app/api/` على تعليقات توضيحية `@swagger`
2. **استخدم `$ref` للمخططات المشتركة** - مخططات المكونات المرجعية بدلاً من تكرار التعريفات
3. **قم بتضمين أمثلة** - قم دائمًا بتوفير `example` قيم لهيئات الطلب والاستجابة
4. **استخدام CommonAnnotations** - الاستفادة من استجابات الأخطاء المشتركة ومعلمات ترقيم الصفحات
5. **العلامة بشكل متسق** - نقاط النهاية ذات الصلة بالمجموعة تحت نفس اسم العلامة
6. **وصف المعلمات** - قم بتضمين `description` و`example` لكل معلمة
7. ** توثيق كافة رموز الحالة ** - تغطية النجاح، وخطأ التحقق من الصحة، وخطأ المصادقة، وحالات خطأ الخادم
8. **احتفظ بالتعليقات التوضيحية بالقرب من المعالجات** - ضع التعليقات `@swagger` مباشرة فوق وظيفة معالج المسار
