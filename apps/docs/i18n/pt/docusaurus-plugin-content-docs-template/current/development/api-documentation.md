---
id: api-documentation
title: Sistema de Documentação de API
sidebar_label: Documentação API
sidebar_position: 5
---

# Sistema Automatizado de Documentação de API

O Ever Works inclui um sistema automatizado de documentação OpenAPI que gera documentação abrangente da API a partir do seu código.

## Visão Geral

O sistema fornece:
- 📝 **Geração automatizada** - De anotações de código para especificação OpenAPI
- 🔄 **Abordagem híbrida** - Preserva documentação manual, adiciona automatizadas
- 🎯 **Segurança de tipos** - Integração com TypeScript
- 📊 **Swagger UI** - Explorador de API interativo
- 🔧 **Hot reload** - Regenera automaticamente durante o desenvolvimento

## Arquitetura

```mermaid
graph TB
    Routes["API Routes"] --> Annotations["Swagger Annotations"]
    Manual["public/openapi.json"] --> Merge["Merge Process"]
    Annotations --> Extract["Extract Docs"]
    Extract --> Merge
    Merge --> OpenAPI["Complete OpenAPI Spec"]
    OpenAPI --> SwaggerUI["Swagger UI"]
```

### Abordagem Híbrida

- ✅ **Preserva** o arquivo `public/openapi.json` existente
- ✅ **Adiciona** anotações `@swagger` no código de rotas
- ✅ **Mescla** ambas as fontes automaticamente
- ✅ **Gera** arquivo OpenAPI completo e consistente

## Instalação

### 1. Instalar Dependências

```bash
# Run the installation script
./scripts/install-swagger-deps.sh

# Or manually with npm
npm install -D swagger-jsdoc @types/swagger-jsdoc tsx nodemon
```

### 2. Scripts Disponíveis

```bash
# Generate documentation once
npm run generate-docs

# Watch mode for development (auto-regenerates)
npm run docs:watch

# Development with automatic generation
npm run dev
```

## Uso

### Adicionando Anotações às Rotas

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

### Usando Utilitários de Anotação

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

### Anotações Comuns

O sistema fornece componentes de anotação reutilizáveis:

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

## Estrutura de Arquivos

```
scripts/
├── generate-openapi.ts     # Script principal de geração
├── tsconfig.json          # Configuração TypeScript para scripts
└── install-swagger-deps.sh # Instalador de dependências

lib/swagger/
└── annotations.ts         # Utilitários de anotação reutilizáveis

templates/
└── route-template.ts      # Template para novas rotas

public/
└── openapi.json          # Especificação OpenAPI gerada
```

## Configuração

### Configuração Base do OpenAPI

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

### Configuração do Swagger UI

Acesse a documentação interativa da API em:
- Desenvolvimento: `http://localhost:3000/api-docs`
- Produção: `https://yourdomain.com/api-docs`

## Melhores Práticas

### 1. Marcação Consistente

Agrupe endpoints relacionados com tags:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]  // Use consistent tag names
 */
```

### 2. Descrições Detalhadas

Forneça descrições e exemplos claros:

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

### 3. Definições de Schema

Defina schemas reutilizáveis nos componentes:

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

### 4. Respostas de Erro

Documente todas as respostas de erro possíveis:

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

## Solução de Problemas

### Documentação Não Gerando

**Problema**: Arquivo OpenAPI não está sendo atualizado

**Solução**: Verifique o script de geração

```bash
# Run manually to see errors
npm run generate-docs

# Check for syntax errors in annotations
```

### Swagger UI Não Carregando

**Problema**: A página de documentação da API mostra erro

**Solução**: Verifique se o arquivo OpenAPI é válido

```bash
# Validate OpenAPI spec
npx swagger-cli validate public/openapi.json
```

### Anotações Não Detectadas

**Problema**: Anotações de rotas não aparecem na documentação

**Solução**: Certifique-se do formato correto

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

## Recursos Avançados

### Schemas de Corpo de Requisição

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

### Autenticação

```typescript
/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     security:
 *       - bearerAuth: []
```
