---
id: favorites-endpoints
title: "Endpoints API de Favoritos"
sidebar_label: "Favoritos"
sidebar_position: 13
---

# Endpoints API de Favoritos

La API de Favoritos permite a los usuarios autenticados gestionar su lista personal de elementos favoritos. Cada favorito almacena metadatos del elemento (nombre, icono, categoría) para una visualización rápida sin necesidad de realizar una unión a la capa de contenido.

**Archivos fuente:**
- `template/app/api/favorites/route.ts`
- `template/app/api/favorites/[itemSlug]/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/favorites` | Sesión | Listar todos los favoritos del usuario actual |
| POST | `/api/favorites` | Sesión | Agregar un elemento a favoritos |
| DELETE | `/api/favorites/{itemSlug}` | Sesión | Eliminar un elemento de favoritos |

Todos los puntos finales requieren una sesión de usuario autenticado y una conexión a la base de datos activa (verificada mediante `checkDatabaseAvailability`).

---

## GET `/api/favorites`

Devuelve todos los elementos marcados como favoritos por el usuario autenticado, ordenados por fecha de creación (los más antiguos primero).

### Solicitud

No se requieren parámetros de consulta ni cuerpo. La autenticación se proporciona mediante cookie de sesión.

### Forma de la Respuesta

#### 200 -- Éxito

```json
{
  "success": true,
  "favorites": [
    {
      "id": "fav_123abc",
      "userId": "user_456def",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemCategory": "productivity",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

#### 401 -- No autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 500 -- Error del servidor

```json
{
  "success": false,
  "error": "Failed to fetch favorites"
}
```

---

## POST `/api/favorites`

Agrega un elemento a los favoritos del usuario autenticado. Incluye verificación de duplicados para evitar agregar el mismo elemento dos veces.

### Cuerpo de la Solicitud

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `itemSlug` | string | **Sí** | Identificador único del elemento |
| `itemName` | string | **Sí** | Nombre para mostrar del elemento |
| `itemIconUrl` | string | No | URL del icono del elemento |
| `itemCategory` | string | No | Nombre de la categoría del elemento |

El cuerpo de la solicitud se valida con un esquema Zod:

```ts
const addFavoriteSchema = z.object({
  itemSlug: z.string().min(1),
  itemName: z.string().min(1),
  itemIconUrl: z.string().optional(),
  itemCategory: z.string().optional(),
});
```

### Ejemplo de Solicitud

```json
{
  "itemSlug": "awesome-productivity-tool",
  "itemName": "Awesome Productivity Tool",
  "itemIconUrl": "https://example.com/icons/tool.png",
  "itemCategory": "productivity"
}
```

### Forma de la Respuesta

#### 201 -- Creado

```json
{
  "success": true,
  "favorite": {
    "id": "fav_123abc",
    "userId": "user_456def",
    "itemSlug": "awesome-productivity-tool",
    "itemName": "Awesome Productivity Tool",
    "itemIconUrl": "https://example.com/icons/tool.png",
    "itemCategory": "productivity",
    "createdAt": "2024-01-20T10:30:00.000Z",
    "updatedAt": "2024-01-20T10:30:00.000Z"
  }
}
```

#### 400 -- Error de validación

```json
{
  "success": false,
  "error": "Invalid request data",
  "details": "itemSlug is required and must be a non-empty string"
}
```

#### 401 -- No autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 409 -- Conflicto (Duplicado)

```json
{
  "success": false,
  "error": "Item is already in favorites"
}
```

### Detección de Duplicados

Antes de insertar, el manejador verifica si existe un favorito con el mismo usuario y slug de elemento:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, validatedData.itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length > 0) {
  return NextResponse.json(
    { success: false, error: "Item is already in favorites" },
    { status: 409 }
  );
}
```

---

## DELETE `/api/favorites/{itemSlug}`

Elimina un elemento específico de la lista de favoritos del usuario autenticado.

### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `itemSlug` | string | **Sí** | El slug del elemento a eliminar |

### Forma de la Respuesta

#### 200 -- Eliminado exitosamente

```json
{
  "success": true,
  "message": "Favorite removed successfully"
}
```

#### 401 -- No autorizado

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### 404 -- No encontrado

Se devuelve cuando el favorito no existe o no pertenece al usuario actual:

```json
{
  "success": false,
  "error": "Favorite not found"
}
```

### Cómo Funciona

El manejador verifica la propiedad antes de eliminar. Primero consulta un favorito coincidente del usuario actual, luego elimina solo si se encuentra:

```ts
const existingFavorite = await db
  .select()
  .from(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  )
  .limit(1);

if (existingFavorite.length === 0) {
  return NextResponse.json(
    { success: false, error: "Favorite not found" },
    { status: 404 }
  );
}

await db
  .delete(favorites)
  .where(
    and(
      eq(favorites.userId, session.user.id),
      eq(favorites.itemSlug, itemSlug)
    )
  );
```

---

## Ejemplo de Uso (Flujo Completo)

```ts
// 1. Listar favoritos actuales
const listRes = await fetch('/api/favorites');
const { favorites } = await listRes.json();

// 2. Agregar un nuevo favorito
const addRes = await fetch('/api/favorites', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    itemSlug: 'new-tool',
    itemName: 'New Tool',
    itemCategory: 'utilities'
  })
});
const { favorite } = await addRes.json();

// 3. Eliminar un favorito
const deleteRes = await fetch('/api/favorites/new-tool', {
  method: 'DELETE'
});
const { message } = await deleteRes.json();
```

## Requisitos de Base de Datos

- Requiere que la tabla `favorites` exista en el esquema de la base de datos.
- `checkDatabaseAvailability()` se llama al inicio de cada manejador.
- Las respuestas de error usan `safeErrorResponse` para evitar filtrar detalles internos.

## Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|----------|
| `template/app/api/favorites/route.ts` | Manejadores GET (listar) y POST (agregar) |
| `template/app/api/favorites/[itemSlug]/route.ts` | Manejador DELETE |
| `template/lib/db/schema.ts` | Definición de la tabla `favorites` |
| `template/lib/utils/database-check.ts` | Verificación de disponibilidad de la base de datos |
| `template/lib/utils/api-error.ts` | Utilidad de respuesta de error segura |
