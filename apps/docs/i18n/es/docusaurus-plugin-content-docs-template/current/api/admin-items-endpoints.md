---
id: admin-items-endpoints
title: "Endpoints Admin Elementos"
sidebar_label: "Admin Elementos"
sidebar_position: 37
---

# Endpoints Admin Elementos

La API de Elementos proporciona puntos finales para gestionar listados del directorio incluyendo creación, actualizaciones, flujos de revisión (aprobar/rechazar), historial de auditoría, operaciones masivas y estadísticas. Los elementos progresan a través de un ciclo de vida con estados `draft`, `pending`, `approved` y `rejected`. Todos los puntos finales requieren autenticación de administrador.

## Ruta Base

```
/api/admin/items
```

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/items` | Admin | Obtener lista paginada de elementos |
| `POST` | `/api/admin/items` | Admin | Crear un nuevo elemento |
| `GET` | `/api/admin/items/stats` | Admin | Obtener estadísticas de elementos |
| `POST` | `/api/admin/items/bulk` | Admin | Aprobar, rechazar o eliminar en masa |
| `GET` | `/api/admin/items/{id}` | Admin | Obtener elemento por ID |
| `PUT` | `/api/admin/items/{id}` | Admin | Actualizar elemento |
| `DELETE` | `/api/admin/items/{id}` | Admin | Eliminar elemento permanentemente |
| `POST` | `/api/admin/items/{id}/review` | Admin | Aprobar o rechazar un elemento |
| `GET` | `/api/admin/items/{id}/history` | Admin | Obtener historial de auditoría del elemento |

---

## Listar Elementos

```
GET /api/admin/items
```

Devuelve una lista paginada de elementos con búsqueda, filtrado por estado/categoría/etiquetas y ordenamiento.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (mínimo: 1) |
| `limit` | entero | `10` | Resultados por página (1--100) |
| `search` | string | -- | Buscar elementos por nombre o descripción |
| `status` | string | -- | Filtro: `draft`, `pending`, `approved`, `rejected` |
| `categories` | string | -- | Slugs de categorías separados por comas |
| `tags` | string | -- | Slugs de etiquetas separados por comas |
| `sortBy` | string | `updated_at` | Campo de ordenamiento: `name`, `updated_at`, `status`, `submitted_at` |
| `sortOrder` | string | `desc` | Dirección: `asc` o `desc` |

**Respuesta (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "item_123abc",
      "name": "Awesome Productivity Tool",
      "slug": "awesome-productivity-tool",
      "description": "A powerful tool to boost your productivity",
      "source_url": "https://example.com/tool",
      "category": ["productivity", "business"],
      "tags": ["saas", "productivity"],
      "featured": true,
      "icon_url": "https://example.com/icon.png",
      "status": "approved",
      "created_at": "2024-01-20T10:30:00.000Z",
      "updated_at": "2024-01-20T14:45:00.000Z"
    }
  ],
  "total": 156,
  "page": 1,
  "limit": 10,
  "totalPages": 16
}
```

---

## Crear Elemento

```
POST /api/admin/items
```

Crea un nuevo elemento con verificaciones de duplicados tanto en ID como en slug. Activa la sincronización con CRM (si está habilitado) e indexación de ubicación (si está habilitado).

**Cuerpo de la Solicitud:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | string | Sí | Identificador único del elemento |
| `name` | string | Sí | Nombre del elemento |
| `slug` | string | Sí | Slug amigable con URL (debe ser único) |
| `description` | string | Sí | Descripción del elemento |
| `source_url` | string | Sí | URL fuente del elemento |
| `category` | string[] | No | Array de slugs de categorías |
| `tags` | string[] | No | Array de slugs de etiquetas |
| `brand` | string | No | Nombre de marca (usado para sincronización de empresa con CRM) |
| `featured` | booleano | No | Indicador de destacado (predeterminado: `false`) |
| `icon_url` | string | No | URL del icono |
| `status` | string | No | Estado inicial (predeterminado: `draft`) |
| `location` | objeto | No | Datos de ubicación para geo-indexación |

**Respuesta (201):**

```json
{
  "success": true,
  "item": {
    "id": "item_123abc",
    "name": "Awesome Productivity Tool",
    "slug": "awesome-productivity-tool",
    "status": "draft",
    "created_at": "2024-01-20T10:30:00.000Z"
  },
  "message": "Item created successfully"
}
```

---

## Obtener Estadísticas de Elementos

```
GET /api/admin/items/stats
```

Devuelve conteos por estado. Admite filtros opcionales para acotar las estadísticas.

**Parámetros de Consulta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Filtrar estadísticas por término de búsqueda |
| `categories` | string | Slugs de categorías separados por comas |
| `tags` | string | Slugs de etiquetas separados por comas |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "total": 1247,
    "draft": 45,
    "pending": 23,
    "approved": 1156,
    "rejected": 23
  }
}
```

---

## Acciones Masivas

```
POST /api/admin/items/bulk
```

Realiza aprobaciones, rechazos o eliminaciones masivas de hasta 100 elementos. Cada elemento se procesa individualmente; los fallos parciales no cancelan la operación completa. Envía notificaciones por correo a los remitentes al aprobar/rechazar.

**Cuerpo de la Solicitud:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `action` | string | Sí | `approve`, `reject` o `delete` |
| `ids` | string[] | Sí | IDs de elementos a procesar (1--100, sin duplicados) |
| `reason` | string | Sí (para `reject`) | Motivo del rechazo (mínimo 10 caracteres) |

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Bulk approve completed: 3 approved, 0 failed",
  "results": [
    { "id": "item_1", "success": true },
    { "id": "item_2", "success": true },
    { "id": "item_3", "success": false, "error": "Item not found" }
  ],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Obtener / Actualizar / Eliminar Elemento

### Obtener Elemento

```
GET /api/admin/items/{id}
```

Devuelve los detalles completos del elemento incluyendo metadatos, categorías, etiquetas, notas de revisión y métricas de engagement.

### Actualizar Elemento

```
PUT /api/admin/items/{id}
```

Actualización parcial — solo se modifican los campos proporcionados. Activa la sincronización con CRM cuando se proporciona `brand` y la re-indexación de ubicación cuando cambian los datos de ubicación.

**Cuerpo de la Solicitud (todos los campos son opcionales):**

```json
{
  "name": "Updated Tool Name",
  "slug": "updated-tool-name",
  "description": "Updated description",
  "source_url": "https://example.com/updated",
  "category": ["productivity", "automation"],
  "tags": ["saas", "ai"],
  "brand": "Acme Corp",
  "featured": true,
  "icon_url": "https://example.com/new-icon.png",
  "status": "approved"
}
```

### Eliminar Elemento

```
DELETE /api/admin/items/{id}
```

Elimina permanentemente un elemento y lo quita del índice de ubicación (si está habilitado). Esta acción no se puede deshacer.

**Respuesta (200):**

```json
{ "success": true, "message": "Item deleted successfully" }
```

---

## Revisar Elemento

```
POST /api/admin/items/{id}/review
```

Aprueba o rechaza un elemento. Registra la decisión de revisión con notas opcionales. Envía una notificación por correo al remitente original (si es un usuario registrado).

**Cuerpo de la Solicitud:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `status` | string | Sí | `approved` o `rejected` |
| `review_notes` | string | No | Explicación de la decisión de revisión |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "item_123abc",
    "status": "approved",
    "review_notes": "Great tool, approved for listing.",
    "reviewed_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Item approved successfully"
}
```

---

## Obtener Historial de Auditoría del Elemento

```
GET /api/admin/items/{id}/history
```

Devuelve el historial de auditoría completo de un elemento, incluyendo creación, actualizaciones, cambios de estado, revisiones, eliminaciones y restauraciones.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página |
| `limit` | entero | `20` | Resultados por página (máx. 100) |
| `action` | string | -- | Filtro separado por comas: `created`, `updated`, `status_changed`, `reviewed`, `deleted`, `restored` |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_abc123",
        "itemId": "awesome-tool",
        "action": "reviewed",
        "previousStatus": "pending",
        "newStatus": "approved",
        "performedByName": "Admin User",
        "notes": "Approved for listing",
        "createdAt": "2024-01-20T16:45:00.000Z"
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## Reglas de Validación

| Campo | Regla |
|-------|-------|
| `id` | Requerido; debe ser único entre todos los elementos |
| `name` | Requerido para creación |
| `slug` | Requerido; debe ser único entre todos los elementos |
| `description` | Requerido para creación |
| `source_url` | Requerido para creación; formato de URL válido |
| `status` | Debe ser `draft`, `pending`, `approved` o `rejected` |
| `reason` | Requerido para rechazo masivo; mínimo 10 caracteres |
| `ids` | Masivo: 1--100 strings únicos no vacíos |
| `action` | Filtro de historial: solo tipos de acción de auditoría válidos |

## Códigos de Error

| Estado | Significado |
|--------|-------------|
| `400` | Error de validación, parámetros inválidos, campos faltantes |
| `401` | Se requiere autenticación |
| `403` | Se requieren privilegios de administrador |
| `404` | Elemento no encontrado |
| `409` | ID o slug de elemento duplicado |
| `500` | Error interno del servidor |

## Documentación Relacionada

- [API Admin Roles](./admin-roles-endpoints.md) — gestión de roles asignados a usuarios
- [API Admin Usuarios](./admin-users-endpoints.md) — gestión de cuentas de usuario
- [Autenticación](../architecture/nextauth-configuration.md) — gestión de sesiones y guardias
