---
id: swagger-annotations
title: Swagger 注释
sidebar_label: Swagger 注释
sidebar_position: 36
---

# Swagger 注释

该模板包括一个实用程序模块，用于为 Next.js App Router API 路由生成标准化 OpenAPI/Swagger JSDoc 注释。该系统避免了公共响应模式和参数的重复。

## 文件结构

```
lib/swagger/
  annotations.ts    # Annotation types, generator functions, common templates
```

## 核心类型

### 路由配置

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

### 参数

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

### 请求正文

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

### 回应

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

## 生成注释

### `createSwaggerAnnotation`

从配置对象生成完整的 JSDoc Swagger 注释字符串：

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

自动添加 `sessionAuth` 安全性的仅限管理员路由的简写：

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

## 常用注解

`CommonAnnotations` 对象提供可重用的响应模板和参数：

### 标准错误响应

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

每个响应都包含一个示例正文：

```json
{ "success": false, "error": "Unauthorized" }
```

### 分页参数

```ts
CommonAnnotations.paginationParameters
// => [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, ... },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, ... },
// ]
```

### 管理安全

```ts
CommonAnnotations.adminSecurity
// => [{ sessionAuth: [] }]
```

## API 路由中的用法

注释作为 JSDoc 注释放置在路由处理程序导出上方。 Swagger 生成器在构建过程中处理这些内容以生成 OpenAPI 规范：

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

## 构建自定义注释

将通用模板与特定于路由的配置相结合：

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

## 相关文件

- `lib/swagger/annotations.ts` - 注释类型、生成器和通用模板
- `app/api/` - 使用注释的 API 路由处理程序
