---
id: api-documentation
title: Система за API Документация
sidebar_label: API Документация
sidebar_position: 5
---

# Автоматизирана Система за API Документация

Ever Works включва автоматизирана система за документация OpenAPI, която генерира изчерпателна документация на API от кода.

## Преглед

Системата предоставя:
- 📝 **Автоматично генериране** - От анотации в кода до OpenAPI спецификация
- 🔄 **Хибриден подход** - Запазва ръчна документация, добавя автоматизирана
- 🎯 **Типова безопасност** - Интеграция с TypeScript
- 📊 **Swagger UI** - Интерактивен изследовател на API
- 🔧 **Hot reload** - Автоматично регенериране по време на разработка

## Архитектура

```mermaid
graph TB
    Routes["API Routes"] --> Annotations["Swagger Annotations"]
    Manual["public/openapi.json"] --> Merge["Merge Process"]
    Annotations --> Extract["Extract Docs"]
    Extract --> Merge
    Merge --> OpenAPI["Complete OpenAPI Spec"]
    OpenAPI --> SwaggerUI["Swagger UI"]
```

### Хибриден Подход

- ✅ **Запазва** съществуващия файл `public/openapi.json`
- ✅ **Добавя** анотации `@swagger` в кода на маршрутите
- ✅ **Обединява** двата източника автоматично
- ✅ **Генерира** пълен и последователен файл OpenAPI

## Инсталация

### 1. Инсталиране на Зависимости

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. Налични Скриптове

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## Употреба

### Добавяне на Анотации към Маршрути

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * @swagger
 * /api/example:
 *   get:
 *     tags: ["Example"]
 *     summary: "Get example data"
 *     description: "Returns example data from the API"
 *     responses:
 *       200:
 *         description: "Success"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
export async function GET() {
  return NextResponse.json({ success: true, data: ["example"] });
}
```

### Използване на Помощни Средства за Анотации

```typescript
import { createAdminRouteAnnotation, CommonAnnotations } from '@/lib/swagger/annotations';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: ["Admin"]
 *     summary: "Get all users"
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Success"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
export async function GET() {
  // Implementation
}
```

### Общи Анотации

Системата предоставя компоненти за повторно използване на анотации:

```typescript
// lib/swagger/annotations.ts

export const CommonAnnotations = {
  responses: {
    unauthorized: {
      description: "Unauthorized - Invalid or missing authentication",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string", example: "Unauthorized" }
            }
          }
        }
      }
    },
    serverError: {
      description: "Internal Server Error",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              error: { type: "string", example: "Internal server error" }
            }
          }
        }
      }
    }
  },
  
  security: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT"
    }
  }
};
```

## Файлова Структура

```
scripts/
├── generate-openapi.ts     # Основен скрипт за генериране
├── tsconfig.json          # TypeScript конфигурация за скриптове
└── install-swagger-deps.sh # Инсталатор на зависимости

lib/swagger/
└── annotations.ts         # Помощни средства за повторно използване на анотации

templates/
└── route-template.ts      # Шаблон за нови маршрути

public/
└── openapi.json          # Генерирана OpenAPI спецификация
```

## Конфигурация

### Основна Конфигурация на OpenAPI

```typescript
// scripts/generate-openapi.ts
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Ever Works API',
    version: '1.0.0',
    description: 'API documentation for Ever Works directory platform',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://yourdomain.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
```

### Конфигурация на Swagger UI

Достъп до интерактивната документация на API:
- Разработка: `http://localhost:3000/api-docs`
- Продукция: `https://yourdomain.com/api-docs`

## Най-добри Практики

### 1. Последователно Тагиране

Групирайте свързани крайни точки с тагове:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. Подробни Описания

Предоставяйте ясни описания и примери:

```typescript
/**
 * @swagger
 * /api/items/{id}:
 *   get:
 *     summary: "Get item by ID"
 *     description: "Retrieves a single item from the directory by its unique identifier"
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: "Unique item identifier"
 *         schema:
 *           type: string
 *           example: "item-123"
 */
```

### 3. Дефиниции на Схеми

Дефинирайте схеми за повторно използване в компонентите:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       required:
 *         - id
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           example: "item-123"
 *         name:
 *           type: string
 *           example: "Example Item"
 *         description:
 *           type: string
 *           example: "Item description"
 */
```

### 4. Отговори при Грешки

Документирайте всички възможни отговори при грешки:

```typescript
/**
 * @swagger
 * /api/items:
 *   post:
 *     responses:
 *       201:
 *         description: "Item created successfully"
 *       400:
 *         description: "Invalid request data"
 *       401:
 *         description: "Unauthorized"
 *       500:
 *         description: "Server error"
 */
```

## Отстраняване на Проблеми

### Документацията Не Се Генерира

**Проблем**: Файлът OpenAPI не се актуализира

**Решение**: Проверете скрипта за генериране

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI Не Се Зарежда

**Проблем**: Страницата с документация на API показва грешка

**Решение**: Проверете дали файлът OpenAPI е валиден

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### Анотациите Не Се Разпознават

**Проблем**: Анотациите на маршрутите не се появяват в документацията

**Решение**: Уверете се в правилния формат

```typescript
// ✅ Correct
/**
 * @swagger
 * /api/route:
 *   get:
 *     ...
 */

// ❌ Incorrect (missing @swagger tag)
/**
 * /api/route:
 *   get:
 *     ...
 */
```

## Разширени Функции

### Схеми на Тялото на Заявката

```typescript
/**
 * @swagger
 * /api/items:
 *   post:
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 */
```

### Удостоверяване

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
```
