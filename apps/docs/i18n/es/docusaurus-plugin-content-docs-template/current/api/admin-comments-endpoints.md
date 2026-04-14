---
id: admin-comments-endpoints
title: "Endpoints Admin Comentarios"
sidebar_label: "Admin Comentarios"
sidebar_position: 31
---

# Endpoints Admin Comentarios

La API Admin de Comentarios proporciona capacidades de moderación para gestionar comentarios de usuarios. Los administradores pueden listar, ver, actualizar y eliminar de forma suave los comentarios. Todos los puntos finales usan el runtime de Node.js y requieren disponibilidad de la base de datos. Las verificaciones de autenticación retornan `403 Forbidden` para usuarios sin permisos de administrador.

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/comments` | Admin | Listar comentarios (paginado, con búsqueda) |
| `GET` | `/api/admin/comments/{id}` | Admin | Obtener un comentario con información del usuario |
| `PUT` | `/api/admin/comments/{id}` | Admin | Actualizar contenido del comentario |
| `DELETE` | `/api/admin/comments/{id}` | Admin | Eliminación suave de un comentario |

## Autenticación

Los puntos finales de moderación de comentarios verifican el estado de administrador y retornan `403 Forbidden` (no `401`) para usuarios sin permisos:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}
```

## Requisito de Base de Datos

Los puntos finales de comentarios verifican la disponibilidad de la base de datos antes de procesar solicitudes:

```typescript
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

Si la base de datos no está configurada, se retorna una respuesta de error apropiada antes de cualquier verificación de autenticación.

## Puntos Finales

### GET `/api/admin/comments`

Devuelve una lista paginada de comentarios con información del usuario asociado. Admite búsqueda de texto completo en el contenido del comentario, nombres de usuario y correos electrónicos. Solo se devuelven los comentarios no eliminados.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página para paginación |
| `limit` | entero | `10` | Comentarios por página (1--100) |
| `search` | string | `""` | Buscar en contenido, nombre de usuario o correo |

**Comportamiento de Búsqueda:**

La consulta de búsqueda se compara de forma insensible a mayúsculas (usando `ILIKE`) contra:
- Contenido del comentario
- Nombre para mostrar del usuario
- Dirección de correo electrónico del usuario

Los caracteres especiales `%`, `_` y `\` se escapan para prevenir inyección en patrones SQL.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "This is a great product! Highly recommended.",
        "rating": 5,
        "userId": "user_456def",
        "itemId": "item_789ghi",
        "createdAt": "2024-01-20T10:30:00.000Z",
        "updatedAt": "2024-01-20T10:30:00.000Z",
        "user": {
          "id": "user_456def",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "image": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "total": 156,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

### GET `/api/admin/comments/{id}`

Recupera un comentario específico por su ID con información completa del perfil de usuario. Incluye un `LEFT JOIN` a la tabla `clientProfiles` para datos del usuario.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único del comentario |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is a great product! Highly recommended.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "image": "https://example.com/avatar.jpg"
    }
  }
}
```

**Alternativa de Usuario:** Si no se encuentra el perfil del usuario (usuario eliminado), se devuelve un objeto de marcador de posición:

```json
{
  "user": {
    "id": "",
    "name": "Unknown User",
    "email": "",
    "image": null
  }
}
```

### PUT `/api/admin/comments/{id}`

Actualiza el contenido de un comentario específico. Solo se puede modificar el campo `content`. El comentario debe existir y no estar eliminado de forma suave.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único del comentario |

**Cuerpo de la Solicitud:**

```json
{
  "content": "This is an updated comment with more details."
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `content` | string | Sí | Nuevo texto del comentario (no debe estar vacío tras recortar) |

**Reglas de Validación:**
- `content` es requerido y no debe estar vacío ni contener solo espacios en blanco
- El comentario objetivo debe existir y no tener una marca de tiempo `deletedAt`

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "comment_123abc",
    "content": "This is an updated comment with more details.",
    "rating": 5,
    "userId": "user_456def",
    "itemId": "item_789ghi",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T16:15:00.000Z",
    "user": { "id": "user_456def", "name": "John Doe", "email": "john.doe@example.com", "image": null }
  },
  "message": "Comment updated successfully"
}
```

### DELETE `/api/admin/comments/{id}`

Realiza una eliminación suave de un comentario estableciendo la marca de tiempo `deletedAt`. El comentario debe existir y no estar ya eliminado. Los comentarios con eliminación suave se excluyen de todas las consultas de listado.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único del comentario |

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

## Modelo de Datos del Comentario

| Campo | Tipo | Nulable | Descripción |
|-------|------|---------|-------------|
| `id` | string | No | Identificador único del comentario |
| `content` | string | No | Contenido de texto del comentario |
| `rating` | entero | Sí | Valor de calificación (1--5) |
| `userId` | string | No | ID del usuario autor |
| `itemId` | string | No | ID del elemento asociado |
| `createdAt` | datetime | Sí | Marca de tiempo de creación |
| `updatedAt` | datetime | Sí | Marca de tiempo de última actualización |
| `deletedAt` | datetime | Sí | Marca de tiempo de eliminación suave (null si está activo) |

## Códigos de Error

| Estado | Error | Causa |
|--------|-------|-------|
| `400` | Se requiere contenido | Contenido vacío o faltante al actualizar |
| `403` | Prohibido | Usuario sin permisos de administrador intentando acceder |
| `404` | Comentario no encontrado | ID inválido o ya eliminado de forma suave |
| `500` | Error Interno del Servidor | Fallo de base de datos o servidor |

## Notas de Implementación

- Los comentarios usan **eliminación suave** — se establece el campo `deletedAt` en lugar de eliminar la fila. Esto preserva la integridad de los datos y permite una posible recuperación.
- Todas las consultas de listado filtran con `isNull(comments.deletedAt)` para excluir comentarios eliminados.
- Los datos del usuario se obtienen mediante un `LEFT JOIN` en `clientProfiles`, asegurando que los comentarios de usuarios eliminados sean recuperables.
- El `runtime` está establecido en `"nodejs"` para estas rutas (no Edge).

## Documentación Relacionada

- [Descripción General de Endpoints Admin](./admin-endpoints.md)
- [Endpoints Públicos de Comentarios](./comment-endpoints.md)
- [Patrones de Respuesta](./response-patterns.md)
- [Validación de Solicitudes](./request-validation.md)
