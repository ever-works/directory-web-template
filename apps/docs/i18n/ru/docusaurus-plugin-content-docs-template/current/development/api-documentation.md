---
id: api-documentation
title: Система Документации API
sidebar_label: Документация API
sidebar_position: 5
---

# Автоматизированная Система Документации API

Ever Works включает автоматизированную систему документации OpenAPI, которая генерирует исчерпывающую документацию API из кода.

## Обзор

Система предоставляет:
- 📝 **Автоматическая генерация** - От аннотаций кода до спецификации OpenAPI
- 🔄 **Гибридный подход** - Сохраняет ручную документацию, добавляет автоматическую
- 🎯 **Типобезопасность** - Интеграция с TypeScript
- 📊 **Swagger UI** - Интерактивный проводник API
- 🔧 **Hot reload** - Автоматическая регенерация во время разработки

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

### Гибридный Подход

- ✅ **Сохраняет** существующий файл `public/openapi.json`
- ✅ **Добавляет** аннотации `@swagger` в код маршрутов
- ✅ **Объединяет** оба источника автоматически
- ✅ **Генерирует** полный и согласованный файл OpenAPI

## Установка

### 1. Установка Зависимостей

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. Доступные Скрипты

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## Использование

### Добавление Аннотаций к Маршрутам

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

### Использование Утилит Аннотаций

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

### Общие Аннотации

Система предоставляет повторно используемые компоненты аннотаций:

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

## Структура Файлов

```
scripts/
├── generate-openapi.ts     # Основной скрипт генерации
├── tsconfig.json          # Конфигурация TypeScript для скриптов
└── install-swagger-deps.sh # Установщик зависимостей

lib/swagger/
└── annotations.ts         # Повторно используемые утилиты аннотаций

templates/
└── route-template.ts      # Шаблон для новых маршрутов

public/
└── openapi.json          # Сгенерированная спецификация OpenAPI
```

## Конфигурация

### Базовая Конфигурация OpenAPI

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

### Конфигурация Swagger UI

Доступ к интерактивной документации API:
- Разработка: `http://localhost:3000/api-docs`
- Продакшн: `https://yourdomain.com/api-docs`

## Лучшие Практики

### 1. Согласованное Тегирование

Группируйте связанные конечные точки с помощью тегов:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. Подробные Описания

Предоставляйте чёткие описания и примеры:

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

### 3. Определения Схем

Определяйте повторно используемые схемы в компонентах:

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

### 4. Ответы об Ошибках

Документируйте все возможные ответы об ошибках:

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

## Устранение Неполадок

### Документация Не Генерируется

**Проблема**: Файл OpenAPI не обновляется

**Решение**: Проверьте скрипт генерации

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI Не Загружается

**Проблема**: Страница документации API показывает ошибку

**Решение**: Проверьте корректность файла OpenAPI

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### Аннотации Не Обнаруживаются

**Проблема**: Аннотации маршрутов не отображаются в документации

**Решение**: Убедитесь в правильном формате

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

## Расширенные Возможности

### Схемы Тела Запроса

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

### Аутентификация

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
```
