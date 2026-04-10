---
id: api-documentation
title: نظام توثيق API
sidebar_label: توثيق API
sidebar_position: 5
---

# نظام توثيق API الآلي

يتضمن Ever Works نظام توثيق OpenAPI آلي يولّد وثائق API شاملة من الكود.

## نظرة عامة

يوفر النظام:
- 📝 **توليد آلي** - من تعليقات الكود إلى مواصفة OpenAPI
- 🔄 **نهج هجين** - يحافظ على التوثيق اليدوي ويضيف الآلي
- 🎯 **سلامة الأنواع** - تكامل مع TypeScript
- 📊 **Swagger UI** - مستكشف API تفاعلي
- 🔧 **إعادة التحميل التلقائي** - إعادة التوليد التلقائية أثناء التطوير

## البنية المعمارية

```mermaid
graph TB
    Routes["API Routes"] --> Annotations["Swagger Annotations"]
    Manual["public/openapi.json"] --> Merge["Merge Process"]
    Annotations --> Extract["Extract Docs"]
    Extract --> Merge
    Merge --> OpenAPI["Complete OpenAPI Spec"]
    OpenAPI --> SwaggerUI["Swagger UI"]
```

### النهج الهجين

- ✅ **يحافظ** على ملف `public/openapi.json` الموجود
- ✅ **يضيف** تعليقات `@swagger` في كود المسارات
- ✅ **يدمج** كلا المصدرين تلقائيًا
- ✅ **يولّد** ملف OpenAPI كاملًا ومتسقًا

## التثبيت

### 1. تثبيت التبعيات

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. السكريبتات المتاحة

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## الاستخدام

### إضافة التعليقات التوضيحية إلى المسارات

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

### استخدام أدوات التعليقات

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

### التعليقات الشائعة

يوفر النظام مكونات تعليق قابلة لإعادة الاستخدام:

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

## هيكل الملفات

```
scripts/
├── generate-openapi.ts     # سكريبت التوليد الرئيسي
├── tsconfig.json          # إعداد TypeScript للسكريبتات
└── install-swagger-deps.sh # مثبّت التبعيات

lib/swagger/
└── annotations.ts         # أدوات التعليق القابلة لإعادة الاستخدام

templates/
└── route-template.ts      # قالب للمسارات الجديدة

public/
└── openapi.json          # مواصفة OpenAPI المولّدة
```

## الإعداد

### الإعداد الأساسي لـ OpenAPI

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

### إعداد Swagger UI

الوصول إلى وثائق API التفاعلية على:
- بيئة التطوير: `http://localhost:3000/api-docs`
- الإنتاج: `https://yourdomain.com/api-docs`

## أفضل الممارسات

### 1. وضع علامات متسقة

قم بتجميع نقاط النهاية ذات الصلة بالعلامات:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. أوصاف تفصيلية

وفّر أوصافًا وأمثلة واضحة:

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

### 3. تعريفات المخططات

عرّف مخططات قابلة لإعادة الاستخدام في المكونات:

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

### 4. ردود الأخطاء

وثّق جميع ردود الأخطاء المحتملة:

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

## استكشاف الأخطاء وإصلاحها

### التوثيق لا يتولّد

**المشكلة**: ملف OpenAPI لا يتحدث

**الحل**: تحقق من سكريبت التوليد

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI لا يتحمّل

**المشكلة**: صفحة وثائق API تظهر خطأ

**الحل**: تحقق من صحة ملف OpenAPI

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### التعليقات غير مكتشفة

**المشكلة**: تعليقات المسارات لا تظهر في الوثائق

**الحل**: تأكد من الصيغة الصحيحة

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

## الميزات المتقدمة

### مخططات جسم الطلب

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

### المصادقة

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
```
