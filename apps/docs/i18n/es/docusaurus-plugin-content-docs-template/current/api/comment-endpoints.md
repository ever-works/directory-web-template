---
id: comment-endpoints
title: "Endpoints de Comentarios"
sidebar_label: "Comentarios"
sidebar_position: 24
---

# Endpoints de Comentarios

El sistema de comentarios proporciona puntos finales para crear, leer, actualizar y eliminar comentarios en elementos. Los comentarios incluyen una calificación de 1 a 5 estrellas y admiten tanto acceso público (lectura) como operaciones autenticadas (crear/editar/eliminar). Los puntos finales de administrador proporcionan capacidades de moderación.

## Descripción General

### Puntos Finales Públicos

| Punto Final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/items/[slug]/comments` | GET | Pública | Listar comentarios de un elemento |
| `/api/items/[slug]/comments/rating` | GET | Pública | Obtener estadísticas de calificación agregada |
| `/api/items/[slug]/comments/rating/[commentId]` | GET | Pública | Obtener calificación de un solo comentario |

### Puntos Finales Autenticados

| Punto Final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/items/[slug]/comments` | POST | Usuario | Crear un nuevo comentario |
| `/api/items/[slug]/comments/[commentId]` | PUT | Propietario | Actualizar propio comentario |
| `/api/items/[slug]/comments/[commentId]` | DELETE | Propietario | Eliminar propio comentario |
| `/api/items/[slug]/comments/rating/[commentId]` | PATCH | Usuario | Actualizar calificación de un comentario |

### Puntos Finales de Administrador

| Punto Final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/admin/comments` | GET | Admin | Listar todos los comentarios con paginación |
| `/api/admin/comments/[id]` | GET | Admin | Obtener comentario por ID |
| `/api/admin/comments/[id]` | PUT | Admin | Actualizar contenido del comentario |
| `/api/admin/comments/[id]` | DELETE | Admin | Eliminación suave de un comentario |

## Puntos Finales Públicos

### Listar Comentarios del Elemento

```
GET /api/items/[slug]/comments
```

Devuelve todos los comentarios de un elemento específico incluyendo información del perfil de usuario. No se requiere autenticación.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `slug` | string | Slug del elemento |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool!",
      "rating": 5,
      "userId": "client_456def",
      "itemId": "item_123abc",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z",
      "deletedAt": null,
      "user": {
        "id": "client_456def",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "avatar": "https://example.com/avatars/john.jpg"
      }
    }
  ]
}
```

**Fuente:** `template/app/api/items/[slug]/comments/route.ts`

### Obtener Estadísticas de Calificación

```
GET /api/items/[slug]/comments/rating
```

Devuelve la calificación promedio y el número total de calificaciones de un elemento. Solo cuenta los comentarios no eliminados.

**Respuesta Exitosa (200):**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

Devuelve `averageRating: 0` y `totalRatings: 0` cuando no existen calificaciones.

**Fuente:** `template/app/api/items/[slug]/comments/rating/route.ts`

## Puntos Finales Autenticados

### Crear Comentario

```
POST /api/items/[slug]/comments
```

Crea un nuevo comentario con calificación en un elemento. Requiere autenticación y un perfil de cliente válido. Los usuarios bloqueados no pueden comentar.

**Autenticación:** Requerida

**Cuerpo de la Solicitud:**

```json
{
  "content": "This is an amazing tool! Really helped boost my productivity.",
  "rating": 5
}
```

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `content` | string | Sí | Debe ser no vacío después de recortar |
| `rating` | entero | Sí | Debe estar entre 1 y 5 inclusive |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "comment": {
    "id": "comment_123abc",
    "content": "This is an amazing tool!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "item_123abc",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

| Estado | Condición |
|---|---|
| 400 | Contenido vacío o calificación inválida |
| 401 | No autenticado |
| 403 | Usuario suspendido o baneado |
| 404 | Perfil de cliente no encontrado |

**Fuente:** `template/app/api/items/[slug]/comments/route.ts`

### Actualizar Comentario

```
PUT /api/items/[slug]/comments/[commentId]
```

Actualiza el contenido y/o calificación de un comentario existente. Solo el autor del comentario puede actualizar su propio comentario. Se debe proporcionar al menos `content` o `rating`.

**Autenticación:** Requerida (debe ser el propietario del comentario)

**Cuerpo de la Solicitud:**

```json
{
  "content": "Updated review text",
  "rating": 4
}
```

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `content` | string | No | 1-1000 caracteres |
| `rating` | entero | No | Debe estar entre 1 y 5 |

La respuesta incluye el comentario actualizado con una marca de tiempo `editedAt`.

| Estado | Condición |
|---|---|
| 400 | Sin campos proporcionados, contenido demasiado largo o calificación inválida |
| 401 | No autenticado |
| 404 | Comentario no encontrado o el usuario no es el autor |

**Fuente:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Eliminar Comentario

```
DELETE /api/items/[slug]/comments/[commentId]
```

Elimina suavemente un comentario. Solo el autor del comentario puede eliminar su propio comentario. El comentario se marca con una marca de tiempo `deletedAt` en lugar de ser eliminado permanentemente.

**Autenticación:** Requerida (debe ser el propietario del comentario)

**Respuesta Exitosa:** 204 Sin Contenido

| Estado | Condición |
|---|---|
| 401 | No autenticado |
| 404 | Comentario no encontrado, ya eliminado o no pertenece al usuario |

**Fuente:** `template/app/api/items/[slug]/comments/[commentId]/route.ts`

### Actualizar Calificación del Comentario

```
PATCH /api/items/[slug]/comments/rating/[commentId]
```

Actualiza solo la calificación de un comentario específico.

**Cuerpo de la Solicitud:**

```json
{
  "rating": 4
}
```

**Fuente:** `template/app/api/items/[slug]/comments/rating/[commentId]/route.ts`

## Puntos Finales de Administrador

Todos los puntos finales de administrador requieren que `session.user.isAdmin` sea verdadero.

### Listar Todos los Comentarios

```
GET /api/admin/comments
```

Devuelve una lista paginada de todos los comentarios (excluyendo los eliminados suavemente) con información del usuario. Admite búsqueda en el contenido del comentario, nombre de usuario y correo electrónico.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|---|---|---|---|
| `page` | entero | 1 | Número de página |
| `limit` | entero | 10 | Resultados por página (1-100) |
| `search` | string | - | Buscar en contenido, nombre de usuario o correo |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "comment_123abc",
        "content": "Great product!",
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

**Fuente:** `template/app/api/admin/comments/route.ts`

### Obtener Comentario por ID

```
GET /api/admin/comments/[id]
```

Recupera un comentario específico con información completa del usuario.

**Fuente:** `template/app/api/admin/comments/[id]/route.ts`

### Actualizar Comentario (Admin)

```
PUT /api/admin/comments/[id]
```

Permite a los administradores actualizar el contenido de cualquier comentario, independientemente de la propiedad.

**Cuerpo de la Solicitud:**

```json
{
  "content": "This content has been moderated by an administrator."
}
```

**Fuente:** `template/app/api/admin/comments/[id]/route.ts`

### Eliminar Comentario (Admin)

```
DELETE /api/admin/comments/[id]
```

Elimina suavemente cualquier comentario. El comentario debe existir y no haber sido eliminado previamente.

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

| Estado | Condición |
|---|---|
| 403 | No es administrador |
| 404 | Comentario no encontrado o ya eliminado |

**Fuente:** `template/app/api/admin/comments/[id]/route.ts`

## Detalles Clave de Implementación

- **Eliminación Suave:** Todas las eliminaciones establecen `deletedAt` en lugar de eliminar registros. Las consultas filtran los comentarios eliminados mediante `isNull(comments.deletedAt)`.
- **Verificación de Propiedad:** Los puntos finales de usuario verifican que el ID del perfil de cliente del usuario autenticado coincida con el campo `userId` del comentario.
- **Prevención de Usuarios Bloqueados:** La verificación `isUserBlocked()` evita que los usuarios suspendidos o baneados creen comentarios.
- **Búsqueda (Admin):** Usa ILIKE para búsqueda sin distinción de mayúsculas con escape adecuado de comodines SQL (`%` y `_`).
