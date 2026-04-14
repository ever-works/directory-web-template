---
id: swagger-annotations
title: التعليقات التوضيحية التباهي
sidebar_label: التعليقات التوضيحية التباهي
sidebar_position: 36
---

# التعليقات التوضيحية التباهي

يتضمن القالب وحدة مساعدة لإنشاء تعليقات توضيحية موحدة لـ OpenAPI/Swagger JSDoc لمسارات Next.js App Router API. يتجنب هذا النظام تكرار مخططات الاستجابة والمعلمات المشتركة.

## هيكل الملف

```
lib/swagger/
  annotations.ts    # Annotation types, generator functions, common templates
```

## الأنواع الأساسية

### تكوين الطريق

```ts
export interface SwaggerRouteConfig {
  tags: string[];
  summary: string;
  description: string;
  security?: Array<Record<string, string[]>>;
  parameters?: SwaggerParameter[];
  requestBody?: SwaggerRequestBody;
  responses: Record<string, SwaggerResponse>;
}
```

### المعلمات

```ts
export interface SwaggerParameter {
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

### هيئة الطلب

```ts
export interface SwaggerRequestBody {
  required: boolean;
  content: {
    'application/json': {
      schema: {
        $ref?: string;
        type?: string;
        properties?: Record<string, any>;
      };
      example?: any;
    };
  };
}
```

### الاستجابة

```ts
export interface SwaggerResponse {
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

## توليد التعليقات التوضيحية

### `createSwaggerAnnotation`

يُنشئ سلسلة تعليقات JSDoc Swagger كاملة من كائن التكوين:

```ts
import { createSwaggerAnnotation } from '@/lib/swagger/annotations';

const annotation = createSwaggerAnnotation('/api/items', 'get', {
  tags: ['Items'],
  summary: 'List all items',
  description: 'Returns a paginated list of items',
  parameters: [
    {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
      description: 'Page number',
    },
    {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
      description: 'Items per page',
    },
  ],
  responses: {
    '200': {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: { success: true, data: [], meta: { page: 1, total: 100 } },
        },
      },
    },
    '500': {
      description: 'Server error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});
```

### `createAdminRouteAnnotation`

اختصار للمسارات المخصصة للمسؤول فقط والتي تضيف الأمان `sessionAuth` تلقائيًا:

```ts
import { createAdminRouteAnnotation } from '@/lib/swagger/annotations';

const annotation = createAdminRouteAnnotation('/api/admin/users', 'get', {
  tags: ['Admin', 'Users'],
  summary: 'List all users',
  description: 'Admin endpoint to list all registered users',
  parameters: CommonAnnotations.paginationParameters,
  responses: {
    '200': { description: 'List of users' },
    '401': CommonAnnotations.responses.unauthorized,
    '403': CommonAnnotations.responses.forbidden,
  },
});
```

## التعليقات التوضيحية المشتركة

يوفر الكائن `CommonAnnotations` قوالب استجابة ومعلمات قابلة لإعادة الاستخدام:

### استجابات الخطأ القياسية

```ts
CommonAnnotations.responses.unauthorized
// => { description: 'Authentication required', content: { ... } }

CommonAnnotations.responses.forbidden
// => { description: 'Forbidden - Admin access required', content: { ... } }

CommonAnnotations.responses.notFound
// => { description: 'Resource not found', content: { ... } }

CommonAnnotations.responses.serverError
// => { description: 'Internal server error', content: { ... } }
```

تتضمن كل إجابة نصًا نموذجيًا:

```json
{ "success": false, "error": "Unauthorized" }
```

### معلمات ترقيم الصفحات

```ts
CommonAnnotations.paginationParameters
// => [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, ... },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, ... },
// ]
```

### أمن المسؤول

```ts
CommonAnnotations.adminSecurity
// => [{ sessionAuth: [] }]
```

## الاستخدام في مسارات API

يتم وضع التعليقات التوضيحية كتعليقات JSDoc أعلى عمليات تصدير معالج المسار. يقوم منشئ Swagger بمعالجة هذه الأمور أثناء الإنشاء لإنتاج مواصفات OpenAPI:

```ts
// app/api/items/route.ts

/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]
 *     summary: "List all items"
 *     description: "Returns a paginated list of items"
 *     parameters:
 *       - name: "page"
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: "Page number for pagination"
 *     responses:
 *       200:
 *         description: "Successful response"
 *       500:
 *         description: "Internal server error"
 */
export async function GET(request: Request) {
  // handler implementation
}
```

## بناء التعليقات التوضيحية المخصصة

دمج القوالب الشائعة مع التكوين الخاص بالمسار:

```ts
import { createSwaggerAnnotation, CommonAnnotations } from '@/lib/swagger/annotations';

const itemCreateAnnotation = createSwaggerAnnotation('/api/items', 'post', {
  tags: ['Items'],
  summary: 'Create a new item',
  description: 'Creates a new item submission',
  security: CommonAnnotations.adminSecurity,
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/CreateItemInput' },
        example: {
          name: 'My Tool',
          description: 'A great tool for developers',
          source_url: 'https://example.com',
        },
      },
    },
  },
  responses: {
    '201': {
      description: 'Item created successfully',
      content: {
        'application/json': {
          schema: { type: 'object' },
          example: { success: true, data: { id: '...', slug: 'my-tool' } },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
          example: { success: false, error: 'Name is required' },
        },
      },
    },
    '401': CommonAnnotations.responses.unauthorized,
    '500': CommonAnnotations.responses.serverError,
  },
});
```

## الملفات ذات الصلة

- `lib/swagger/annotations.ts` - أنواع التعليقات التوضيحية والمولدات والقوالب الشائعة
- `app/api/` - معالجات مسار API التي تستخدم التعليقات التوضيحية
