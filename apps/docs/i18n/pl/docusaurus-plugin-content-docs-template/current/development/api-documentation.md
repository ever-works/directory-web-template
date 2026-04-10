---
id: api-documentation
title: System Dokumentacji API
sidebar_label: Dokumentacja API
sidebar_position: 5
---

# Automatyczny System Dokumentacji API

Ever Works zawiera automatyczny system dokumentacji OpenAPI, który generuje kompleksową dokumentację API z kodu.

## Przegląd

System zapewnia:
- 📝 **Automatyczne generowanie** - Od adnotacji kodu do specyfikacji OpenAPI
- 🔄 **Podejście hybrydowe** - Zachowuje ręczną dokumentację, dodaje automatyczną
- 🎯 **Bezpieczeństwo typów** - Integracja z TypeScript
- 📊 **Swagger UI** - Interaktywny eksplorator API
- 🔧 **Hot reload** - Automatyczne regenerowanie podczas rozwoju

## Architektura

```mermaid
graph TB
    Routes["API Routes"] --> Annotations["Swagger Annotations"]
    Manual["public/openapi.json"] --> Merge["Merge Process"]
    Annotations --> Extract["Extract Docs"]
    Extract --> Merge
    Merge --> OpenAPI["Complete OpenAPI Spec"]
    OpenAPI --> SwaggerUI["Swagger UI"]
```

### Podejście Hybrydowe

- ✅ **Zachowuje** istniejący plik `public/openapi.json`
- ✅ **Dodaje** adnotacje `@swagger` w kodzie tras
- ✅ **Łączy** oba źródła automatycznie
- ✅ **Generuje** kompletny i spójny plik OpenAPI

## Instalacja

### 1. Instalacja Zależności

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. Dostępne Skrypty

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## Użycie

### Dodawanie Adnotacji do Tras

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

### Korzystanie z Narzędzi Adnotacji

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

### Wspólne Adnotacje

System udostępnia komponenty adnotacji wielokrotnego użytku:

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

## Struktura Plików

```
scripts/
├── generate-openapi.ts     # Główny skrypt generowania
├── tsconfig.json          # Konfiguracja TypeScript dla skryptów
└── install-swagger-deps.sh # Instalator zależności

lib/swagger/
└── annotations.ts         # Narzędzia adnotacji wielokrotnego użytku

templates/
└── route-template.ts      # Szablon dla nowych tras

public/
└── openapi.json          # Wygenerowana specyfikacja OpenAPI
```

## Konfiguracja

### Podstawowa Konfiguracja OpenAPI

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

### Konfiguracja Swagger UI

Dostęp do interaktywnej dokumentacji API pod adresem:
- Środowisko deweloperskie: `http://localhost:3000/api-docs`
- Produkcja: `https://yourdomain.com/api-docs`

## Najlepsze Praktyki

### 1. Spójne Tagowanie

Grupuj powiązane punkty końcowe za pomocą tagów:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. Szczegółowe Opisy

Zapewniaj jasne opisy i przykłady:

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

### 3. Definicje Schematów

Definiuj schematy wielokrotnego użytku w komponentach:

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

### 4. Odpowiedzi Błędów

Dokumentuj wszystkie możliwe odpowiedzi błędów:

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

## Rozwiązywanie Problemów

### Dokumentacja Nie Generuje Się

**Problem**: Plik OpenAPI nie jest aktualizowany

**Rozwiązanie**: Sprawdź skrypt generowania

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI Nie Ładuje Się

**Problem**: Strona dokumentacji API pokazuje błąd

**Rozwiązanie**: Sprawdź poprawność pliku OpenAPI

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### Adnotacje Nie Są Wykrywane

**Problem**: Adnotacje tras nie pojawiają się w dokumentacji

**Rozwiązanie**: Upewnij się, że format jest poprawny

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

## Zaawansowane Funkcje

### Schematy Treści Żądania

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

### Uwierzytelnianie

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
```
