---
id: openapi-generation
title: 'Generowanie OpenAPI'
sidebar_label: 'Generowanie OpenAPI'
sidebar_position: 9
---

# Generowanie OpenAPI

Szablon zawiera zautomatyzowany system generowania dokumentacji OpenAPI, który skanuje adnotacje JSDoc `@swagger` w plikach tras API, scala je z istniejącą dokumentacją i produkuje kompletną specyfikację `openapi.json`.

## Przegląd

```mermaid
graph LR
    A["Route Files\napp/api/**/route.ts"] -->|"Swagger annotations"| B["generate-openapi.ts"]
    C[Existing<br/>openapi.json] -->|Read| B
    D[Type Definitions<br/>lib/types/**/*.ts] -->|Schema refs| B
    B -->|Merge| E[public/openapi.json]
    B -->|Backup| F[public/openapi.backup.json]
    E -->|Serve| G[Swagger UI]
```

## Uruchamianie Generatora

```bash
# Standardowe generowanie z wyjściem
tsx scripts/generate-openapi.ts

# Tryb cichy (dla CI/CD)
tsx scripts/generate-openapi.ts --silent
```

Skrypt automatycznie uruchamia się w trybie cichym, gdy wykryte są zmienne środowiskowe CI (`CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `VERCEL`, itp.).

## Konfiguracja

Generator używa `swagger-jsdoc` z następującą konfiguracją bazową:

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

## Schematy Bezpieczeństwa

| Schemat       | Typ                      | Użycie                                  |
| ------------- | ------------------------ | --------------------------------------- |
| `sessionAuth` | Bearer JWT               | Endpointy uwierzytelnionego użytkownika |
| `session`     | Cookie (`session_token`) | Uwierzytelnianie sesji przeglądarki     |
| `cronSecret`  | Bearer Secret            | Endpointy zadań cron                    |

## Wbudowane Schematy Komponentów

Generator udostępnia następujące schematy wielokrotnego użytku:

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

## Pisanie Adnotacji Swagger

### Podstawowa Adnotacja Trasy

Dodaj komentarze JSDoc `@swagger` bezpośrednio nad lub wewnątrz plików tras:

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
