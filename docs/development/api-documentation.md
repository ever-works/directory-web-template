---
id: api-documentation
title: API Documentation System
sidebar_label: API Documentation
sidebar_position: 5
---

# Automated API Documentation System

Ever Works includes an automated OpenAPI documentation system that generates comprehensive API docs from your code.

## Overview

The system provides:
- 📝 **Automated generation** - From code annotations to OpenAPI spec
- 🔄 **Hybrid approach** - Preserves manual docs, adds automated ones
- 🎯 **Type-safe** - TypeScript integration
- 📊 **Swagger UI** - Interactive API explorer
- 🔧 **Hot reload** - Auto-regenerates during development

## Architecture

```mermaid
graph TB
    Routes[API Routes] --> Annotations[@swagger annotations]
    Manual[public/openapi.json] --> Merge[Merge Process]
    Annotations --> Extract[Extract Docs]
    Extract --> Merge
    Merge --> OpenAPI[Complete OpenAPI Spec]
    OpenAPI --> SwaggerUI[Swagger UI]
```

### Hybrid Approach

- ✅ **Preserves** existing `public/openapi.json` file
- ✅ **Adds** `@swagger` annotations in route code
- ✅ **Merges** both sources automatically
- ✅ **Generates** complete and consistent OpenAPI file

## Installation

### 1. Install Dependencies

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. Available Scripts

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## Usage

### Adding Annotations to Routes

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

### Using Annotation Utilities

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

### Common Annotations

The system provides reusable annotation components:

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

## File Structure

```
scripts/
├── generate-openapi.ts     # Main generation script
├── tsconfig.json          # TypeScript config for scripts
└── install-swagger-deps.sh # Dependencies installer

lib/swagger/
└── annotations.ts         # Reusable annotation utilities

templates/
└── route-template.ts      # Template for new routes

public/
└── openapi.json          # Generated OpenAPI specification
```

## Configuration

### OpenAPI Base Configuration

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

### Swagger UI Configuration

Access the interactive API documentation at:
- Development: `http://localhost:3000/api-docs`
- Production: `https://yourdomain.com/api-docs`

## Best Practices

### 1. Consistent Tagging

Group related endpoints with tags:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. Detailed Descriptions

Provide clear descriptions and examples:

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

### 3. Schema Definitions

Define reusable schemas in components:

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

### 4. Error Responses

Document all possible error responses:

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

## Troubleshooting

### Documentation Not Generating

**Issue**: OpenAPI file not updating

**Solution**: Check the generation script

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI Not Loading

**Issue**: API docs page shows error

**Solution**: Verify OpenAPI file is valid

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### Annotations Not Detected

**Issue**: Route annotations not appearing in docs

**Solution**: Ensure correct format

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

## Advanced Features

### Request Body Schemas

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

### Authentication

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       401:
 *         description: "Unauthorized"
 */
```

### Query Parameters

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 10
 */
```

## Next Steps

- [Testing](./testing) - Test your API endpoints
- [Local Setup](./local-setup) - Set up development environment
- [Deployment](/template/deployment) - Deploy your API

## Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [API Design Best Practices](https://swagger.io/resources/articles/best-practices-in-api-design/)

