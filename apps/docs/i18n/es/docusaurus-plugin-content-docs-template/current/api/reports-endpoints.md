---
id: reports-endpoints
title: "Endpoints de Reportes"
sidebar_label: "Reportes"
sidebar_position: 20
---

# Endpoints de Reportes

La API de Reportes permite a los usuarios enviar reportes de contenido sobre elementos o comentarios, y proporciona puntos finales de administración completos para revisar, filtrar y resolver esos reportes —incluyendo disparar acciones de moderación automáticas.

**Archivos fuente:**
- `template/app/api/reports/route.ts`
- `template/app/api/admin/reports/route.ts`
- `template/app/api/admin/reports/stats/route.ts`
- `template/app/api/admin/reports/[id]/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| POST | `/api/reports` | Sesión (usuario) | Enviar un reporte de contenido |
| GET | `/api/admin/reports` | Sesión (admin) | Listar todos los reportes con filtros |
| GET | `/api/admin/reports/stats` | Sesión (admin) | Obtener estadísticas de resumen de reportes |
| GET | `/api/admin/reports/[id]` | Sesión (admin) | Obtener detalles de un reporte específico |
| PUT | `/api/admin/reports/[id]` | Sesión (admin) | Actualizar estado del reporte y disparar moderación |

---

## POST `/api/reports`

Envía un nuevo reporte sobre un elemento o comentario. Los usuarios no pueden reportar su propio contenido ni enviar múltiples reportes para el mismo contenido.

### Autenticación

Requiere sesión de usuario. Los usuarios con estado `suspended` o `banned` no pueden enviar reportes.

### Cuerpo de la Solicitud

```typescript
{
  contentType: "item" | "comment";  // El tipo de contenido que se está reportando
  contentId: string;                 // ID del elemento o comentario
  reason: string;                    // Razón del reporte
  description?: string;              // Descripción opcional adicional
}
```

### Respuesta

#### 201 — Creado

```json
{
  "success": true,
  "report": {
    "id": "report_123",
    "contentType": "comment",
    "contentId": "comment_456",
    "reason": "spam",
    "description": "This comment is clearly spam.",
    "status": "pending",
    "reportedBy": "user_789",
    "createdAt": "2024-01-20T10:30:00.000Z"
  }
}
```

#### 400 — Error de validación

Cuando faltan campos requeridos o son inválidos.

#### 401 — No autorizado

Cuando no hay sesión activa.

#### 403 — Prohibido

Cuando el usuario intenta reportar su propio contenido o su cuenta está suspendida/baneada.

#### 409 — Conflicto

Cuando el usuario ya reportó el mismo contenido:

```json
{
  "success": false,
  "error": "You have already reported this content"
}
```

---

## GET `/api/admin/reports`

Lista todos los reportes de contenido con soporte completo de filtrado y paginación.

### Autenticación

Requiere sesión con rol de administrador.

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por estado: `pending`, `resolved`, `dismissed` |
| `contentType` | string | Filtrar por tipo: `item` o `comment` |
| `reason` | string | Filtrar por razón del reporte |
| `page` | number | Número de página (por defecto: 1) |
| `limit` | number | Registros por página (por defecto: 20) |
| `sortBy` | string | Campo de ordenamiento (por defecto: `createdAt`) |
| `sortOrder` | string | `asc` o `desc` (por defecto: `desc`) |

### Respuesta

```json
{
  "success": true,
  "reports": [...],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

## GET `/api/admin/reports/stats`

Devuelve contadores de resumen para el panel de administración.

### Autenticación

Requiere sesión con rol de administrador.

### Respuesta

```json
{
  "success": true,
  "stats": {
    "total": 142,
    "pending": 38,
    "resolved": 89,
    "dismissed": 15,
    "byContentType": {
      "item": 62,
      "comment": 80
    },
    "byReason": {
      "spam": 45,
      "inappropriate": 55,
      "misinformation": 27,
      "other": 15
    }
  }
}
```

---

## GET `/api/admin/reports/[id]`

Devuelve los detalles completos de un reporte único, incluyendo información del reportador y el contenido reportado.

### Autenticación

Requiere sesión con rol de administrador.

### Parámetros de Ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | El ID único del reporte |

### Respuesta

```json
{
  "success": true,
  "report": {
    "id": "report_123",
    "contentType": "comment",
    "contentId": "comment_456",
    "reason": "spam",
    "description": "...",
    "status": "pending",
    "resolution": null,
    "resolvedBy": null,
    "resolvedAt": null,
    "reportedBy": "user_789",
    "reporterProfile": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "contentSnapshot": { ... },
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

---

## PUT `/api/admin/reports/[id]`

Actualiza el estado y la resolución de un reporte. Si se proporciona un valor de resolución, dispara automáticamente la acción de moderación correspondiente.

### Autenticación

Requiere sesión con rol de administrador.

### Cuerpo de la Solicitud

```typescript
{
  status: "pending" | "resolved" | "dismissed";
  resolution?: "no_action" | "content_removed" | "user_warned" | "user_suspended" | "user_banned";
  adminNote?: string;  // Nota interna del administrador (no visible para el usuario)
}
```

### Lógica de Resolución → Moderación

Cuando se establece `resolution`, la capa de servicio de moderación se invoca automáticamente:

| Valor de Resolución | Acción de Moderación |
|---|---|
| `content_removed` | Eliminar el comentario o elemento reportado |
| `user_warned` | Incrementar el conteo de advertencias del usuario |
| `user_suspended` | Establecer estado del usuario a `"suspended"` |
| `user_banned` | Establecer estado del usuario a `"banned"` |
| `no_action` | Solo actualizar el reporte; sin cambios de moderación |

### Respuesta

```json
{
  "success": true,
  "report": {
    "id": "report_123",
    "status": "resolved",
    "resolution": "user_warned",
    "resolvedBy": "admin_001",
    "resolvedAt": "2024-01-21T08:15:00.000Z"
  },
  "moderationResult": {
    "success": true,
    "message": "User warned successfully. Total warnings: 2"
  }
}
```

---

## Modelo de Datos

### Valores de Estado del Reporte

| Estado | Descripción |
|--------|-------------|
| `pending` | Reporte nuevo, aún sin revisar |
| `resolved` | El administrador tomó acción |
| `dismissed` | El administrador rechazó el reporte |

### Valores de Resolución

| Resolución | Descripción |
|---|---|
| `no_action` | El reporte se revisó pero no se encontró problema |
| `content_removed` | Se eliminó el contenido reportado |
| `user_warned` | El autor recibió una advertencia |
| `user_suspended` | La cuenta del autor fue suspendida |
| `user_banned` | La cuenta del autor fue baneada |

## Integración con Moderación

El punto final PUT actúa como interfaz principal entre el sistema de reportes y el sistema de moderación. El flujo completo es:

```
Admin resuelve reporte
  → PUT /api/admin/reports/[id] con resolution
  → moderationService.executeAction(resolution, contentType, contentId)
  → Se registra acción en moderationHistory
  → Se envía email de notificación al usuario afectado
```

Para detalles completos sobre las acciones de moderación, consulta la [documentación del Sistema de Moderación](./moderation-endpoints).
