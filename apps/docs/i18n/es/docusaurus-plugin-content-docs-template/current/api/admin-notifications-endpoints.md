---
id: admin-notifications-endpoints
title: "Endpoints Admin Notificaciones"
sidebar_label: "Admin Notificaciones"
sidebar_position: 33
---

# Endpoints Admin Notificaciones

La API Admin de Notificaciones gestiona las notificaciones en la aplicación para usuarios administradores. Admite el listado de notificaciones con conteos de no leídas, la creación de nuevas notificaciones para usuarios específicos y el marcado de notificaciones como leídas (individualmente o en masa). Las notificaciones se almacenan en la base de datos y están delimitadas por usuario.

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/notifications` | Admin | Listar notificaciones del administrador actual |
| `POST` | `/api/admin/notifications` | Autenticado | Crear una nueva notificación |
| `PATCH` | `/api/admin/notifications/{id}/read` | Autenticado | Marcar una notificación como leída |
| `PATCH` | `/api/admin/notifications/mark-all-read` | Autenticado | Marcar todas las notificaciones como leídas |

## Autenticación

Los puntos finales de notificaciones usan dos niveles de autenticación:

**Solo administrador (GET lista):** Requiere tanto autenticación como rol de administrador.

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}
if (!session.user.isAdmin) {
  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}
```

**Usuario autenticado (POST, PATCH):** Requiere una sesión válida pero no el rol de administrador. Los puntos finales de marcar como leído están delimitados a las propias notificaciones del usuario autenticado.

## Puntos Finales

### GET `/api/admin/notifications`

Recupera las últimas 50 notificaciones del usuario administrador autenticado, ordenadas por fecha de creación (más recientes primero). También devuelve el conteo total de notificaciones no leídas.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_123abc",
        "userId": "user_456def",
        "type": "item_approved",
        "title": "Item Approved",
        "message": "Your item 'Awesome Tool' has been approved and is now live.",
        "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\"}",
        "isRead": false,
        "readAt": null,
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z"
      }
    ],
    "unreadCount": 3
  }
}
```

**Detalles de Comportamiento:**
- Se devuelven máximo 50 notificaciones por solicitud
- Los resultados se ordenan por `createdAt` descendente (más recientes primero)
- `unreadCount` se calcula por separado contando notificaciones donde `isRead = false`
- Las notificaciones están delimitadas al ID del usuario autenticado

### POST `/api/admin/notifications`

Crea una nueva notificación para un usuario específico. El campo `data` acepta un objeto que se convierte a JSON antes de almacenarse. Este punto final no requiere privilegios de administrador — cualquier usuario autenticado puede crear notificaciones (típicamente lo llama el sistema internamente).

**Cuerpo de la Solicitud:**

```json
{
  "type": "item_approved",
  "title": "Item Approved",
  "message": "Your item 'Awesome Tool' has been approved and is now live.",
  "userId": "user_456def",
  "data": {
    "itemId": "item_789ghi",
    "itemName": "Awesome Tool",
    "action": "approved"
  }
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `type` | string | Sí | Identificador del tipo de notificación (ej. `"item_approved"`, `"comment_received"`) |
| `title` | string | Sí | Título corto de la notificación |
| `message` | string | Sí | Mensaje completo de la notificación |
| `userId` | string | Sí | ID del usuario destino que recibirá la notificación |
| `data` | objeto | No | Metadatos adicionales (se convierte a JSON al almacenarse) |

**Respuesta (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "data": "{\"itemId\": \"item_789ghi\", \"itemName\": \"Awesome Tool\", \"action\": \"approved\"}",
    "isRead": false,
    "readAt": null,
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/{id}/read`

Marca una notificación específica como leída. Establece `isRead` en `true`, registra la marca de tiempo actual en `readAt` y actualiza `updatedAt`. Solo el propietario de la notificación puede marcar sus propias notificaciones — la consulta filtra tanto por ID de notificación como por ID del usuario autenticado.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único de la notificación |

**Respuesta (200):**

```json
{
  "success": true,
  "notification": {
    "id": "notif_123abc",
    "userId": "user_456def",
    "type": "item_approved",
    "title": "Item Approved",
    "message": "Your item 'Awesome Tool' has been approved and is now live.",
    "isRead": true,
    "readAt": "2024-01-20T16:45:00.000Z",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### PATCH `/api/admin/notifications/mark-all-read`

Marca todas las notificaciones no leídas del usuario autenticado como leídas en una sola operación masiva. Actualiza `isRead`, `readAt` y `updatedAt` para cada notificación coincidente. Devuelve el conteo de notificaciones que se actualizaron.

**Respuesta (200):**

```json
{
  "success": true,
  "updatedCount": 5
}
```

**Detalles de Comportamiento:**
- Solo actualiza notificaciones donde `isRead = false` para el usuario actual
- `updatedCount` puede ser `0` si no hay notificaciones no leídas
- Todas las notificaciones coincidentes se actualizan en una sola consulta a la base de datos

## Modelo de Datos de Notificación

| Campo | Tipo | Nulable | Descripción |
|-------|------|---------|-------------|
| `id` | string | No | Identificador único de la notificación |
| `userId` | string | No | ID del usuario que recibe la notificación |
| `type` | string | No | Tipo de notificación (ej. `"item_approved"`, `"comment_received"`) |
| `title` | string | No | Título corto para mostrar |
| `message` | string | No | Mensaje completo de la notificación |
| `data` | string | Sí | Metadatos adicionales en formato JSON |
| `isRead` | booleano | No | Si la notificación ha sido leída |
| `readAt` | datetime | Sí | Marca de tiempo de cuando se marcó como leída |
| `createdAt` | datetime | No | Marca de tiempo de creación |
| `updatedAt` | datetime | Sí | Marca de tiempo de última actualización |

## Códigos de Error

| Estado | Error | Causa |
|--------|-------|-------|
| `400` | Campos requeridos faltantes | POST sin type, title, message o userId |
| `400` | Se requiere ID de notificación | PATCH con parámetro ID vacío |
| `401` | No autorizado | Sin sesión activa |
| `403` | Prohibido | Usuario sin permisos de administrador en punto final GET lista |
| `404` | Notificación no encontrada | ID inválido o la notificación pertenece a otro usuario |
| `500` | Error interno del servidor | Fallo de base de datos o servidor |

## Tipos Comunes de Notificación

El campo `type` es un string de formato libre, pero la aplicación usa comúnmente estos valores:

| Tipo | Descripción |
|------|-------------|
| `item_approved` | Un elemento ha sido aprobado por un administrador |
| `item_rejected` | Un elemento ha sido rechazado |
| `comment_received` | Se publicó un nuevo comentario en un elemento |
| `submission_received` | Se recibió un nuevo envío de elemento |

## Documentación Relacionada

- [Descripción General de Endpoints Admin](./admin-endpoints.md)
- [Patrones de Respuesta](./response-patterns.md)
- [Validación de Solicitudes](./request-validation.md)
