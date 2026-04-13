---
id: survey-endpoints
title: "Endpoints API de Encuestas"
sidebar_label: "Encuestas"
sidebar_position: 14
---

# Endpoints API de Encuestas

Endpoints para gestionar encuestas y recopilar respuestas de usuarios. Las encuestas pueden ser globales o específicas por ítem, con un ciclo de vida de borrador → publicado → cerrado.

## Archivos Fuente

| Archivo | Descripción |
|---------|-------------|
| `app/api/surveys/route.ts` | Listar y crear encuestas |
| `app/api/surveys/[surveyId]/route.ts` | Obtener, actualizar y eliminar encuesta específica |
| `app/api/surveys/[surveyId]/responses/route.ts` | Listar y enviar respuestas |
| `app/api/surveys/responses/[responseId]/route.ts` | Obtener respuesta específica |

## Resumen de Endpoints

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/surveys` | Pública | Listar encuestas con filtros |
| `POST` | `/api/surveys` | Administrador | Crear nueva encuesta |
| `GET` | `/api/surveys/[surveyId]` | Condicional | Obtener encuesta específica |
| `PUT` | `/api/surveys/[surveyId]` | Administrador | Actualizar encuesta |
| `DELETE` | `/api/surveys/[surveyId]` | Administrador | Eliminar encuesta |
| `GET` | `/api/surveys/[surveyId]/responses` | Administrador | Listar respuestas de la encuesta |
| `POST` | `/api/surveys/[surveyId]/responses` | Opcional | Enviar respuesta |
| `GET` | `/api/surveys/responses/[responseId]` | Administrador | Obtener respuesta específica |

## GET /api/surveys

Lista todas las encuestas con filtrado opcional y paginación.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `page` | `number` | No | Número de página (predeterminado: 1) |
| `limit` | `number` | No | Por página, máx 100 (predeterminado: 10) |
| `status` | `string` | No | Filtrar: `draft`, `published`, `closed` |
| `type` | `string` | No | Filtrar: `global`, `item` |
| `itemId` | `string` | No | Encuestas para un ítem específico |
| `search` | `string` | No | Búsqueda de texto en el título |

### Respuesta 200

```json
{
  "success": true,
  "data": [
    {
      "id": "survey_abc123",
      "title": "Encuesta de Satisfacción del Usuario",
      "description": "Cuéntanos tu experiencia",
      "type": "global",
      "itemId": null,
      "status": "published",
      "surveyJson": { "pages": [] },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T00:00:00.000Z",
      "responseCount": 127
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### Manejo de Errores

Si la base de datos no está disponible, el endpoint devuelve `503`:

```json
{
  "success": false,
  "error": "Database not available"
}
```

## POST /api/surveys

Crea una nueva encuesta. Requiere autenticación de administrador.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `title` | `string` | Sí | Título de la encuesta |
| `description` | `string` | No | Descripción opcional |
| `type` | `"global"` \| `"item"` | Sí | Alcance de la encuesta |
| `itemId` | `string` | No | Requerido si type es `"item"` |
| `status` | `string` | No | Estado inicial (predeterminado: `"draft"`) |
| `surveyJson` | `object` | No | Definición JSON de SurveyJS |

### Respuesta 201

```json
{
  "success": true,
  "data": {
    "id": "survey_xyz789",
    "title": "Nueva Encuesta",
    "type": "global",
    "status": "draft",
    "createdAt": "2024-01-20T00:00:00.000Z",
    "updatedAt": "2024-01-20T00:00:00.000Z"
  }
}
```

## GET /api/surveys/[surveyId]

Obtiene una encuesta por su ID o slug.

### Control de Acceso

- Las encuestas con estado `published` son de acceso público
- Las encuestas con estado `draft` o `closed` son de acceso solo para administradores; los no administradores reciben `404`

### Respuesta 404

```json
{
  "success": false,
  "error": "Survey not found"
}
```

## PUT /api/surveys/[surveyId]

Actualiza una encuesta existente. Requiere autenticación de administrador.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|----------|-------------|
| `title` | `string` | No | Nuevo título |
| `description` | `string` | No | Nueva descripción |
| `status` | `string` | No | Nuevo estado |
| `surveyJson` | `object` | No | Definición JSON actualizada |

### Respuesta 200

Devuelve el objeto de encuesta completo con los cambios aplicados.

## DELETE /api/surveys/[surveyId]

Elimina una encuesta y todas sus respuestas. Requiere autenticación de administrador. La eliminación es permanente.

### Respuesta 200

```json
{
  "success": true,
  "message": "Survey deleted successfully"
}
```

## GET /api/surveys/[surveyId]/responses

Lista las respuestas enviadas para una encuesta. Requiere autenticación de administrador.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|----------|-------------|
| `page` | `number` | No | Número de página (predeterminado: 1) |
| `limit` | `number` | No | Por página (predeterminado: 10) |
| `itemId` | `string` | No | Filtrar por ítem |
| `userId` | `string` | No | Filtrar por usuario |
| `startDate` | `string` | No | Filtrar desde fecha (ISO 8601) |
| `endDate` | `string` | No | Filtrar hasta fecha (ISO 8601) |

### Respuesta 200

```json
{
  "success": true,
  "data": [
    {
      "id": "response_def456",
      "surveyId": "survey_abc123",
      "userId": "user_ghi789",
      "itemId": null,
      "data": { "question1": "Muy bueno", "rating": 5 },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-10T12:00:00.000Z",
      "updatedAt": "2024-01-10T12:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 127,
    "page": 1,
    "limit": 10,
    "totalPages": 13
  }
}
```

## POST /api/surveys/[surveyId]/responses

Envía una respuesta a una encuesta. No requiere autenticación (el envío anónimo está permitido).

### Información Capturada

El sistema captura automáticamente:
- `ipAddress` desde el encabezado `x-forwarded-for` o `x-real-ip`
- `userAgent` desde el encabezado `user-agent`
- `userId` si el usuario está autenticado

### Cuerpo de la Solicitud

```json
{
  "surveyId": "survey_abc123",
  "data": {
    "question1": "Muy satisfecho",
    "rating": 5,
    "comments": "Gran experiencia"
  }
}
```

### Respuesta 201

```json
{
  "success": true,
  "data": {
    "id": "response_new123",
    "surveyId": "survey_abc123",
    "userId": null,
    "data": { "question1": "Muy satisfecho", "rating": 5 },
    "createdAt": "2024-01-20T12:00:00.000Z"
  }
}
```

### Respuesta de Error 400

La encuesta debe estar en estado `published` para aceptar respuestas:

```json
{
  "success": false,
  "error": "Survey is not accepting responses"
}
```

## GET /api/surveys/responses/[responseId]

Recupera una respuesta específica por ID. Requiere autenticación de administrador.

### Respuesta 200

```json
{
  "success": true,
  "data": {
    "id": "response_def456",
    "surveyId": "survey_abc123",
    "userId": null,
    "itemId": null,
    "data": { "q1": "Excelente" },
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z"
  }
}
```

## Páginas Relacionadas

- [Análisis Detallado de Encuestas](./survey-endpoints-deep-dive.md)
- [Endpoints de Ítems Administrador](./admin-items-endpoints.md)
