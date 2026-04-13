---
id: survey-endpoints-deep-dive
title: "Referencia API Encuestas (Análisis Detallado)"
sidebar_label: "Encuestas (Detallado)"
sidebar_position: 56
---

# Referencia API Encuestas (Análisis Detallado)

Esta página cubre la implementación de los endpoints de encuestas con ejemplos de tipos TypeScript, lógica de control de acceso y comportamientos detallados de solicitud/respuesta.

## Descripción General

El sistema de encuestas admite operaciones CRUD completas para encuestas y sus respuestas. Las encuestas se pueden definir para el directorio global o para ítems específicos. El ciclo de vida va de `draft` (borrador) a `published` (publicado) a `closed` (cerrado). Los endpoints de creación, actualización y eliminación requieren autenticación de administrador; las encuestas publicadas son de acceso público.

## Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/surveys` | Listar todas las encuestas con filtros |
| `POST` | `/api/surveys` | Crear una nueva encuesta |
| `GET` | `/api/surveys/[surveyId]` | Obtener una encuesta específica por ID o slug |
| `PUT` | `/api/surveys/[surveyId]` | Actualizar una encuesta existente |
| `DELETE` | `/api/surveys/[surveyId]` | Eliminar una encuesta y todas sus respuestas |
| `GET` | `/api/surveys/[surveyId]/responses` | Listar respuestas de una encuesta |
| `POST` | `/api/surveys/[surveyId]/responses` | Enviar una respuesta a una encuesta |
| `GET` | `/api/surveys/responses/[responseId]` | Obtener una respuesta específica |

## Autenticación

| Endpoint | Nivel de Acceso |
|----------|----------------|
| `GET /api/surveys` | Público (la base de datos debe estar disponible) |
| `POST /api/surveys` | Solo administrador |
| `GET /api/surveys/[id]` | Condicional: publicada = pública; no publicada = administrador |
| `PUT /api/surveys/[id]` | Solo administrador |
| `DELETE /api/surveys/[id]` | Solo administrador |
| `GET /api/surveys/[id]/responses` | Solo administrador |
| `POST /api/surveys/[id]/responses` | Opcional (se permite anónimo) |
| `GET /api/surveys/responses/[id]` | Solo administrador |

## Listar Encuestas (GET /api/surveys)

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | `number` | Número de página (predeterminado: 1) |
| `limit` | `number` | Resultados por página (predeterminado: 10) |
| `status` | `string` | Filtrar por estado: `draft`, `published`, `closed` |
| `type` | `string` | Filtrar por tipo: `global`, `item` |
| `itemId` | `string` | Filtrar encuestas para un ítem específico |
| `search` | `string` | Búsqueda de texto en el título de la encuesta |

### Tipos de Respuesta

```typescript
interface SurveyListResponse {
  success: boolean;
  data: Survey[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Survey {
  id: string;
  title: string;
  description: string | null;
  type: 'global' | 'item';
  itemId: string | null;
  status: 'draft' | 'published' | 'closed';
  surveyJson: object | null;
  createdAt: Date;
  updatedAt: Date;
  responseCount?: number;
}
```

## Crear Encuesta (POST /api/surveys)

### Cuerpo de la Solicitud

```typescript
interface CreateSurveyRequest {
  title: string;                              // Requerido
  description?: string;                       // Opcional
  type: 'global' | 'item';                   // Requerido
  itemId?: string;                            // Requerido si type === 'item'
  status?: 'draft' | 'published' | 'closed'; // Predeterminado: 'draft'
  surveyJson?: object;                        // Estructura JSON de SurveyJS
}
```

### Respuesta Exitosa (201)

```json
{
  "success": true,
  "data": {
    "id": "survey_1234567890abcdef",
    "title": "Encuesta sobre Calidad del Producto",
    "description": "Ayúdanos a mejorar nuestros productos",
    "type": "item",
    "itemId": "item_1234567890abcdef",
    "status": "draft",
    "surveyJson": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Obtener Encuesta (GET /api/surveys/[surveyId])

### Control de Acceso

El parámetro `surveyId` puede ser un UUID o un slug de cadena. La lógica de acceso es:

```typescript
// Buscar por ID primero, luego por slug
const survey = await SurveyRepository.findByIdOrSlug(surveyId);

if (!survey) {
  return NextResponse.json({ success: false, error: 'Survey not found' }, { status: 404 });
}

// Las encuestas no publicadas solo son accesibles por administradores
if (survey.status !== 'published') {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
}
```

## Actualizar Encuesta (PUT /api/surveys/[surveyId])

### Cuerpo de la Solicitud

```typescript
interface UpdateSurveyRequest {
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'closed';
  surveyJson?: object;
}
```

### Respuesta Exitosa (200)

Devuelve el objeto de encuesta actualizado con la misma forma que la respuesta de creación.

## Eliminar Encuesta (DELETE /api/surveys/[surveyId])

Elimina la encuesta junto con todas sus respuestas (eliminación en cascada). Requiere autenticación de administrador.

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Survey deleted successfully"
}
```

## Listar Respuestas (GET /api/surveys/[surveyId]/responses)

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | `number` | Número de página (predeterminado: 1) |
| `limit` | `number` | Resultados por página (predeterminado: 10) |
| `itemId` | `string` | Filtrar respuestas por ítem específico |
| `userId` | `string` | Filtrar respuestas por usuario específico |
| `startDate` | `string` | Filtrar respuestas desde esta fecha (ISO 8601) |
| `endDate` | `string` | Filtrar respuestas hasta esta fecha (ISO 8601) |

### Tipos de Respuesta

```typescript
interface SurveyResponsesListResponse {
  success: boolean;
  data: SurveyResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string | null;
  itemId: string | null;
  data: Record<string, unknown>;  // Datos de respuesta enviados por el usuario
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## Enviar Respuesta (POST /api/surveys/[surveyId]/responses)

### Cuerpo de la Solicitud

```typescript
interface SubmitSurveyResponseRequest {
  surveyId: string;                         // Requerido: debe coincidir con el parámetro de ruta
  data: Record<string, unknown>;            // Requerido: datos de respuesta de la encuesta
}
```

### Captura de Metadatos

El endpoint captura automáticamente los metadatos de la solicitud:

```typescript
const ipAddress = request.headers.get('x-forwarded-for') 
  || request.headers.get('x-real-ip') 
  || 'unknown';
const userAgent = request.headers.get('user-agent') || 'unknown';
```

Se puede enviar de forma anónima (sin autenticación). Si el usuario está autenticado, el `userId` se asocia con la respuesta.

### Respuesta Exitosa (201)

```json
{
  "success": true,
  "data": {
    "id": "response_1234567890abcdef",
    "surveyId": "survey_1234567890abcdef",
    "userId": null,
    "data": { "q1": "Excelente", "q2": 5 },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### Respuesta de Error (400)

```json
{
  "success": false,
  "error": "Survey is not accepting responses"
}
```

Este error se devuelve cuando la encuesta tiene estado `draft` o `closed`.

## Obtener Respuesta (GET /api/surveys/responses/[responseId])

Recupera una respuesta específica por su ID. Requiere autenticación de administrador.

### Respuesta Exitosa (200)

Devuelve un único objeto `SurveyResponse` con todos los campos incluyendo `ipAddress`, `userAgent` y `data`.

## Respuestas de Error

| Estado | Error | Descripción |
|--------|-------|-------------|
| 401 | `Unauthorized` | Se requiere autenticación de administrador |
| 404 | `Survey not found` | ID de encuesta inválido |
| 400 | `Survey is not accepting responses` | La encuesta no está publicada |
| 503 | `Database error` | La base de datos no está disponible |

## Páginas Relacionadas

- [Endpoints de Encuestas](./survey-endpoints.md)
- [Endpoints de Ítems](./admin-items-endpoints.md)
