---
id: openapi-generation
title: 'Geração de OpenAPI'
sidebar_label: 'Geração OpenAPI'
sidebar_position: 9
---

# Geração de OpenAPI

O template inclui um sistema automatizado de geração de documentação OpenAPI que escaneia anotações JSDoc `@swagger` nos arquivos de rota da API, mescla-as com a documentação existente e produz uma especificação completa `openapi.json`.

## Visão Geral

```mermaid
graph LR
    A["Route Files\napp/api/**/route.ts"] -->|"Swagger annotations"| B["generate-openapi.ts"]
    C[Existing<br/>openapi.json] -->|Read| B
    D[Type Definitions<br/>lib/types/**/*.ts] -->|Schema refs| B
    B -->|Merge| E[public/openapi.json]
    B -->|Backup| F[public/openapi.backup.json]
    E -->|Serve| G[Swagger UI]
```

## Executando o Gerador

```bash
# Geração padrão com saída
tsx scripts/generate-openapi.ts

# Modo silencioso (para CI/CD)
tsx scripts/generate-openapi.ts --silent
```

O script é executado automaticamente no modo silencioso quando variáveis de ambiente CI são detectadas (`CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `VERCEL`, etc.).

## Configuração

O gerador usa `swagger-jsdoc` com a seguinte configuração base:

```typescript
const swaggerOptions = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Ever Works API',
			version: '1.0.0',
			description: 'Comprehensive API documentation for Directory Web Template',
			contact: {
				name: 'Ever Works Team',
				url: 'https://ever.works'
			}
		},
		servers: [{ url: '/', description: 'Current Environment' }],
		components: {
			securitySchemes: {
				sessionAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
				session: { type: 'apiKey', in: 'cookie', name: 'session_token' },
				cronSecret: { type: 'http', scheme: 'bearer', bearerFormat: 'Secret' }
			}
		}
	},
	apis: ['./app/api/**/route.ts', './app/api/**/*.ts', './lib/types/**/*.ts']
};
```

## Esquemas de Segurança

| Esquema       | Tipo                     | Uso                               |
| ------------- | ------------------------ | --------------------------------- |
| `sessionAuth` | Bearer JWT               | Endpoints de usuário autenticado  |
| `session`     | Cookie (`session_token`) | Autenticação de sessão do browser |
| `cronSecret`  | Bearer Secret            | Endpoints de tarefas cron         |

## Schemas de Componentes Integrados

O gerador fornece estes schemas reutilizáveis:

### ErrorResponse

```json
{
	"type": "object",
	"properties": {
		"success": { "type": "boolean", "example": false },
		"error": { "type": "string", "example": "Error message" }
	},
	"required": ["success", "error"]
}
```

### PaginationMeta

```json
{
	"type": "object",
	"properties": {
		"page": { "type": "integer", "example": 1 },
		"pageSize": { "type": "integer", "example": 20 },
		"total": { "type": "integer", "example": 150 },
		"totalPages": { "type": "integer", "example": 8 }
	}
}
```

## Escrevendo Anotações Swagger

### Anotação Básica de Rota

Adicione comentários JSDoc `@swagger` diretamente acima ou dentro dos seus arquivos de rota:

```typescript
/**
 * @swagger
 * /api/items:
 *   get:
 *     tags: ["Items"]
 *     summary: "List all items"
 *     description: "Returns a paginated list of items with optional filtering"
 *     parameters:
 *       - name: "page"
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: "limit"
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: "Successful response"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Pagination"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 */
export async function GET(request: Request) {
	// handler implementation
}
```
