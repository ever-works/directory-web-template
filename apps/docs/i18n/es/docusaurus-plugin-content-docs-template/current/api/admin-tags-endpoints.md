---
id: admin-tags-endpoints
title: "Endpoints Admin Etiquetas"
sidebar_label: "Admin Etiquetas"
sidebar_position: 34
---

# Endpoints Admin Etiquetas

La API de Etiquetas de Administrador proporciona operaciones CRUD completas para gestionar etiquetas de contenido. Las etiquetas se utilizan para clasificar y filtrar elementos en el directorio. La API admite listado paginado, creación con estados activo/inactivo, actualizaciones, eliminación y recuperación con soporte de idioma desde la caché de contenido. Todas las operaciones de escritura invalidan las cachés de contenido para visibilidad inmediata.

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/tags` | Admin | Listar etiquetas (paginado) |
| `POST` | `/api/admin/tags` | Admin | Crear una nueva etiqueta |
| `GET` | `/api/admin/tags/all` | Admin | Obtener todas las etiquetas (desde caché de contenido) |
| `GET` | `/api/admin/tags/{id}` | Admin | Obtener una sola etiqueta por ID |
| `PUT` | `/api/admin/tags/{id}` | Admin | Actualizar una etiqueta |
| `DELETE` | `/api/admin/tags/{id}` | Admin | Eliminar permanentemente una etiqueta |

## Autenticación

Todos los puntos finales de gestión de etiquetas requieren privilegios de administrador:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 }
  );
}
```

## Puntos Finales

### GET `/api/admin/tags`

Devuelve una lista paginada de todas las etiquetas del sistema. Los parámetros de paginación se validan mediante la utilidad compartida `validatePaginationParams`.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (mínimo: 1) |
| `limit` | entero | `10` | Elementos por página (1--100) |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "productivity",
        "name": "Productivity",
        "isActive": true,
        "itemCount": 156,
        "created_at": "2024-01-20T10:30:00.000Z",
        "updated_at": "2024-01-20T10:30:00.000Z"
      },
      {
        "id": "design",
        "name": "Design",
        "isActive": true,
        "itemCount": 89,
        "created_at": "2024-01-19T15:20:00.000Z",
        "updated_at": "2024-01-19T15:20:00.000Z"
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### POST `/api/admin/tags`

Crea una nueva etiqueta con el ID, nombre y estado activo opcional especificados. Invalida las cachés de contenido al tener éxito.

**Cuerpo de la Solicitud:**

```json
{
  "id": "artificial-intelligence",
  "name": "Artificial Intelligence",
  "isActive": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | string | Sí | Identificador slug amigable para URL |
| `name` | string | Sí | Nombre legible de la etiqueta (2--50 caracteres) |
| `isActive` | boolean | No | Si la etiqueta está activa (predeterminado: `true`) |

**Reglas de Validación:**
- Tanto `id` como `name` son requeridos
- El nombre de la etiqueta debe tener entre 2 y 50 caracteres
- El ID de la etiqueta debe ser único entre todas las etiquetas existentes
- El nombre de la etiqueta debe ser único entre todas las etiquetas existentes

**Respuesta (201):**

```json
{
  "success": true,
  "tag": {
    "id": "artificial-intelligence",
    "name": "Artificial Intelligence",
    "isActive": true,
    "itemCount": 0,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### GET `/api/admin/tags/all`

Devuelve todas las etiquetas desde la caché de contenido para un idioma dado. Este punto final lee desde la capa de contenido en caché en lugar de la base de datos, lo que lo hace adecuado para poblar selectores de etiquetas en la interfaz de administrador.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `locale` | string | `"en"` | Código de idioma para la recuperación de contenido |

**Respuesta (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 156
    }
  ]
}
```

### GET `/api/admin/tags/{id}`

Recupera una sola etiqueta por su identificador único con detalles completos incluyendo estadísticas de uso.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único de la etiqueta |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/tags/{id}`

Actualiza el nombre y/o estado activo de una etiqueta. El ID de la etiqueta no puede cambiarse después de la creación. Invalida las cachés de contenido al tener éxito.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único de la etiqueta |

**Cuerpo de la Solicitud:**

```json
{
  "name": "Productivity & Efficiency",
  "isActive": true
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | Sí | Nombre de visualización actualizado de la etiqueta |
| `isActive` | boolean | No | Estado activo actualizado |

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity & Efficiency",
    "isActive": true,
    "itemCount": 156,
    "created_at": "2024-01-20T10:30:00.000Z",
    "updated_at": "2024-01-20T16:45:00.000Z"
  },
  "message": "Tag updated successfully"
}
```

### DELETE `/api/admin/tags/{id}`

Elimina permanentemente una etiqueta del sistema. Esto también elimina la etiqueta de todos los elementos asociados. Invalida las cachés de contenido al tener éxito.

**Parámetros de Ruta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | string | Identificador único de la etiqueta |

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Tag deleted successfully"
}
```

:::caution
La eliminación de etiquetas es permanente y no se puede deshacer. Todas las asociaciones elemento-etiqueta para la etiqueta eliminada serán removidas. Considera desactivar la etiqueta (estableciendo `isActive` en `false` vía PUT) si deseas preservar la integridad de los datos.
:::

## Modelo de Datos de Etiqueta

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `id` | string | No | Identificador único amigable para URL |
| `name` | string | No | Nombre de visualización legible |
| `isActive` | boolean | No | Si la etiqueta puede asignarse a elementos |
| `itemCount` | entero | No | Número de elementos que usan esta etiqueta |
| `created_at` | datetime | No | Marca de tiempo de creación |
| `updated_at` | datetime | No | Marca de tiempo de última actualización |

## Códigos de Error

| Estado | Error | Causa |
|--------|-------|-------|
| `400` | Tag ID and name are required | Campos requeridos faltantes al crear |
| `400` | Tag name is required | Nombre faltante al actualizar |
| `400` | Tag name must be between 2 and 50 characters | Fallo en validación de longitud del nombre |
| `400` | Invalid page/limit parameter | Parámetro de paginación fuera de rango |
| `401` | Unauthorized | Sesión ausente o no de administrador |
| `404` | Tag not found | No existe etiqueta con el ID dado |
| `409` | Tag with ID already exists | ID duplicado al crear |
| `409` | Tag with name already exists | Nombre duplicado al crear/actualizar |
| `500` | Failed to fetch/create/update/delete tag | Error de servidor o base de datos |

## Invalidación de Caché

Todas las operaciones de escritura (crear, actualizar, eliminar) llaman a `invalidateContentCaches()` para asegurar que los cambios en las etiquetas se reflejen inmediatamente en el contenido público:

```typescript
await invalidateContentCaches();
```

Esto borra tanto la caché de contenido en memoria como cualquier caché a nivel CDN que pueda estar activa.

## Fuentes de Datos

La API de etiquetas utiliza dos fuentes de datos diferentes según el punto final:

| Punto Final | Fuente de Datos | Caso de Uso |
|-------------|----------------|-------------|
| `GET /api/admin/tags` | `tagRepository` (base de datos) | Gestión de administrador con paginación |
| `POST /api/admin/tags` | `tagRepository` (base de datos) | Crear nuevas etiquetas |
| `GET /api/admin/tags/all` | `getCachedItems()` (caché de contenido) | Selectores desplegables, búsquedas rápidas |
| `GET /api/admin/tags/{id}` | `tagRepository` (base de datos) | Vista detallada de etiqueta |
| `PUT /api/admin/tags/{id}` | `tagRepository` (base de datos) | Actualizar propiedades de etiqueta |
| `DELETE /api/admin/tags/{id}` | `tagRepository` (base de datos) | Eliminar etiquetas |

## Documentación Relacionada

- [Descripción General de Endpoints Admin](./admin-endpoints.md)
- [Endpoints Admin Categorías](./admin-categories-endpoints.md) -- Patrón similar para gestión de categorías
- [Patrones de Respuesta](./response-patterns.md)
- [Validación de Solicitudes](./request-validation.md)
