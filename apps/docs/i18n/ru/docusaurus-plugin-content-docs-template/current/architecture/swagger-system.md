---
id: swagger-system
title: "Система Swagger"
sidebar_label: "Система Swagger"
sidebar_position: 23
---

# Система Swagger

Шаблон предоставляет полную систему документации Swagger/OpenAPI, построенную на `swagger-jsdoc`. Он включает помощники по аннотациям в `lib/swagger/annotations.ts` для стандартизации документации API для всех обработчиков маршрутов.

## Архитектура

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

## Система типов аннотаций

Модуль `lib/swagger/annotations.ts` определяет интерфейсы TypeScript, которые отражают спецификацию OpenAPI 3.0:

### SwaggerRouteConfig

Основной объект конфигурации для документирования маршрута API:

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

### SwaggerПараметр

Определяет параметры запроса, пути или заголовка:

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

Определяет структуру тела запроса:

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

Определяет коды состояния ответа и их схемы:

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

## Общие аннотации

Объект `CommonAnnotations` предоставляет повторно используемые строительные блоки:

### Стандартные ответы на ошибки

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

Каждый ответ об ошибке включает стандартный пример:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Параметры пагинации

```typescript
CommonAnnotations.paginationParameters
// [
//   { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
//   { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
// ]
```

### Административная безопасность

```typescript
CommonAnnotations.adminSecurity
// [{ sessionAuth: [] }]
```

## Создание аннотаций

### создатьSwaggerAnnotation()

Генерирует полную строку комментария `@swagger` JSDoc:

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

Сокращение для маршрутов, защищенных администратором. Автоматически добавляет безопасность `sessionAuth`:

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

## Написание маршрутной документации

### Шаблон прямой аннотации

Самый распространенный подход — написание комментариев `@swagger` непосредственно в файлах маршрутов:

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

### POST-маршрут с телом запроса

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

## Организация тегов

Организуйте маршруты API в логические группы с помощью тегов:

|Тег|Маршруты|Описание|
|---|---|---|
|`Items`|`/api/items/*`|Список общедоступных объектов и подробные сведения|
|`Admin`|`/api/admin/*`|Операции с панелью администратора|
|`Auth`|`/api/auth/*`|Потоки аутентификации|
|`Profile`|`/api/profile/*`|Управление профилями пользователей|
|`Newsletter`|`/api/newsletter/*`|Подписка на рассылку|
|`Comments`|`/api/comments/*`|Комментировать операции CRUD|
|`Payments`|`/api/payments/*`|Обработка платежей|
|`Cron`|`/api/cron/*`|Запланированные конечные точки задания|

## Схемы безопасности

В конфигурации OpenAPI определены три схемы безопасности:

```mermaid
graph LR
    A[sessionAuth<br/>Bearer JWT] --> B[User endpoints]
    C[session<br/>Cookie] --> D[Browser sessions]
    E[cronSecret<br/>Bearer Secret] --> F[Cron endpoints]
```

### Использование в аннотациях

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

## Сгенерированный вывод

Скрипт `generate-openapi.ts` создает `public/openapi.json` со следующей структурой:

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

## Лучшие практики

1. **Документируйте каждый общедоступный маршрут** — Все маршруты в `app/api/` должны иметь аннотации `@swagger`.
2. **Используйте `$ref` для общих схем** – ссылайтесь на схемы компонентов вместо дублирования определений.
3. **Включить примеры** – всегда указывайте значения `example` для тел запроса и ответа.
4. **Используйте CommonAnnotations** – используйте общие ответы об ошибках и параметры нумерации страниц.
5. **Последовательно отмечать** – группировать связанные конечные точки под одним и тем же именем тега.
6. **Описать параметры** – включать `description` и `example` для каждого параметра.
7. **Задокументируйте все коды состояния** – укажите случаи успеха, ошибки проверки, ошибки аутентификации и ошибки сервера.
8. **Держите аннотации рядом с обработчиками** – размещайте комментарии `@swagger` непосредственно над функцией обработчика маршрута.
