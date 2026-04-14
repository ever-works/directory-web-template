---
id: admin-categories-endpoints
title: "Endpoints Admin Categorías"
sidebar_label: "Admin Categorías"
sidebar_position: 30
---

# Endpoints Admin Categorías

La API de Categorías Admin proporciona operaciones CRUD completas para gestionar categorías de contenido, incluyendo reordenamiento y sincronización basada en Git con un repositorio de datos remoto. Todos los puntos finales requieren autenticación de administrador mediante autenticación basada en sesión.

## Resumen de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/admin/categories` | Admin | Listar categorías (paginado) |
| `POST` | `/api/admin/categories` | Admin | Crear una nueva categoría |
| `GET` | `/api/admin/categories/all` | Admin | Obtener todas las categorías (desde caché de contenido) |
| `GET` | `/api/admin/categories/{id}` | Admin | Obtener una categoría por ID |
| `PUT` | `/api/admin/categories/{id}` | Admin | Actualizar una categoría |
| `DELETE` | `/api/admin/categories/{id}` | Admin | Eliminación suave o permanente de una categoría |
| `PUT` | `/api/admin/categories/reorder` | Admin | Reordenar categorías por array de IDs |
| `GET` | `/api/admin/categories/git` | Admin | Obtener estado del repositorio Git y categorías |
| `POST` | `/api/admin/categories/git` | Admin | Crear categoría mediante commit Git |

## Autenticación

Todos los puntos finales de gestión de categorías verifican una sesión activa con privilegios de administrador:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json(
    { success: false, error: "Unauthorized. Admin access required." },
    { status: 401 }
  );
}
```

## Puntos Finales

### GET `/api/admin/categories`

Devuelve una lista paginada de categorías con filtrado y ordenamiento opcionales.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `page` | entero | `1` | Número de página (mínimo: 1) |
| `limit` | entero | `10` | Elementos por página (1--100) |
| `includeInactive` | string | `"false"` | Incluir categorías inactivas |
| `sortBy` | string | `"name"` | Campo de ordenamiento: `"name"` o `"id"` |
| `sortOrder` | string | `"asc"` | Dirección: `"asc"` o `"desc"` |

**Respuesta (200):**

```json
{
  "success": true,
  "categories": [
    {
      "id": "productivity",
      "name": "Productivity",
      "isActive": true,
      "itemCount": 15,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### POST `/api/admin/categories`

Crea una nueva categoría. El campo `id` es opcional y se generará automáticamente desde el nombre si no se proporciona. Invalida los cachés de contenido al tener éxito.

**Cuerpo de la Solicitud:**

```json
{
  "id": "productivity",
  "name": "Productivity"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | string | No | Slug amigable con URL (`^[a-z0-9-]+$`). Se genera automáticamente si se omite. |
| `name` | string | Sí | Nombre para mostrar (2--100 caracteres) |

**Respuesta (201):**

```json
{
  "success": true,
  "category": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 0,
    "createdAt": "2024-01-20T15:30:00.000Z",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  },
  "message": "Category created successfully"
}
```

### GET `/api/admin/categories/all`

Devuelve todas las categorías desde el caché de contenido para un idioma determinado. Útil para menús desplegables y selectores del administrador.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `locale` | string | `"en"` | Código de idioma para recuperación de contenido |

**Respuesta (200):**

```json
{
  "success": true,
  "data": [
    { "id": "productivity", "name": "Productivity", "isActive": true, "itemCount": 15 }
  ]
}
```

### GET `/api/admin/categories/{id}`

Recupera una única categoría por su identificador único.

**Respuesta (200):**

```json
{
  "success": true,
  "data": {
    "id": "productivity",
    "name": "Productivity",
    "isActive": true,
    "itemCount": 15,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### PUT `/api/admin/categories/{id}`

Actualiza el nombre de una categoría existente. Invalida los cachés de contenido al tener éxito.

**Cuerpo de la Solicitud:**

```json
{ "name": "Productivity Tools" }
```

**Respuesta (200):**

```json
{
  "success": true,
  "data": { "id": "productivity", "name": "Productivity Tools", "isActive": true },
  "message": "Category updated successfully"
}
```

### DELETE `/api/admin/categories/{id}`

Elimina una categoría. Por defecto realiza una eliminación suave (desactivación). Usa el parámetro de consulta `hard=true` para eliminación permanente. Invalida los cachés de contenido al tener éxito.

**Parámetros de Consulta:**

| Parámetro | Tipo | Predeterminado | Descripción |
|-----------|------|----------------|-------------|
| `hard` | string | `"false"` | Establecer en `"true"` para eliminación permanente |

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Category deactivated successfully"
}
```

### PUT `/api/admin/categories/reorder`

Reordena las categorías basándose en un array de IDs de categorías. La posición de cada ID en el array determina su nuevo orden de visualización.

**Cuerpo de la Solicitud:**

```json
{ "categoryIds": ["productivity", "design", "development", "marketing"] }
```

**Reglas de Validación:**
- `categoryIds` debe ser un array no vacío
- Todos los valores deben ser strings

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

### GET `/api/admin/categories/git`

Obtiene el estado del repositorio Git y las categorías del repositorio de datos de GitHub configurado. Requiere las variables de entorno `DATA_REPOSITORY` y `GITHUB_TOKEN`.

**Respuesta (200):**

```json
{
  "success": true,
  "status": {
    "repository": "ever-co/awesome-time-tracking-data",
    "branch": "main",
    "lastCommit": "abc123def456",
    "lastCommitDate": "2024-01-20T10:30:00.000Z",
    "isUpToDate": true
  },
  "categories": [],
  "message": "Git repository status retrieved successfully"
}
```

### POST `/api/admin/categories/git`

Crea una nueva categoría y la registra directamente en el repositorio de datos de GitHub. Requiere las variables de entorno `DATA_REPOSITORY` y `GH_TOKEN`.

**Cuerpo de la Solicitud:**

```json
{ "id": "productivity", "name": "Productivity" }
```

Tanto `id` como `name` son requeridos para la creación basada en Git.

**Respuesta (200):**

```json
{
  "success": true,
  "category": { "id": "productivity", "name": "Productivity" },
  "message": "Category created and committed to Git repository"
}
```

## Códigos de Error

| Estado | Error | Causa |
|--------|-------|-------|
| `400` | Parámetros de paginación inválidos | Página < 1 o límite fuera de 1--100 |
| `400` | Se requiere nombre de categoría | Falta `name` en la solicitud de creación |
| `400` | categoryIds debe ser un array | Payload de reordenamiento inválido |
| `401` | No autorizado. Se requiere acceso de administrador. | Sesión ausente o sin rol admin |
| `404` | Categoría no encontrada | ID de categoría inválido |
| `409` | Ya existe una categoría con este nombre | Nombre duplicado al crear/actualizar |
| `500` | DATA_REPOSITORY no configurado | Variable de entorno faltante para puntos finales Git |
| `500` | Token de GitHub no configurado | Falta `GITHUB_TOKEN` o `GH_TOKEN` |

## Invalidación de Caché

Todas las operaciones de escritura (crear, actualizar, eliminar, reordenar) llaman a `invalidateContentCaches()` para garantizar que los cambios sean visibles de inmediato en toda la aplicación.

## Documentación Relacionada

- [Descripción General de Endpoints Admin](./admin-endpoints.md)
- [Endpoints Públicos de Categorías](./category-endpoints.md)
- [Patrones de Respuesta](./response-patterns.md)
- [Validación de Solicitudes](./request-validation.md)
