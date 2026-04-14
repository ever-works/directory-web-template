---
id: favorites-api-endpoints
title: "Endpoints API Favoritos"
sidebar_label: "API Favoritos"
sidebar_position: 62
---

# Endpoints API Favoritos

La API de Favoritos permite gestionar la lista de elementos favoritos de un usuario autenticado -- listar, añadir y eliminar elementos favoritos. Los favoritos se almacenan con metadatos del elemento para que la visualización no requiera uniones adicionales.

**Fuente:** `template/app/api/favorites/route.ts`, `template/app/api/favorites/[itemSlug]/route.ts`

---

## Listar Favoritos

Devuelve todos los elementos favoritos del usuario autenticado actualmente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/favorites` |
| **Autenticación** | Requerida (sesión) |

### Respuestas

**Estado 200** -- Lista devuelta correctamente.

```json
{
  "favorites": [
    {
      "id": "fav_abc123",
      "itemSlug": "my-favorite-tool",
      "itemName": "My Favorite Tool",
      "itemLogoUrl": "https://cdn.example.com/logos/tool.png",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Estado 401** -- No autenticado.

```json
{ "error": "Unauthorized" }
```

### Ejemplo con curl

```bash
curl -s http://localhost:3000/api/favorites \
  -H "Cookie: next-auth.session-token=<tu_token>"
```

### Uso en TypeScript

```typescript
interface Favorite {
  id: string;
  itemSlug: string;
  itemName: string;
  itemLogoUrl?: string | null;
  createdAt: string;
}

async function getFavorites(): Promise<Favorite[]> {
  const res = await fetch('/api/favorites');
  if (!res.ok) throw new Error('No se pudo obtener la lista de favoritos');
  const data = await res.json();
  return data.favorites;
}
```

---

## Añadir a Favoritos

Añade un elemento a la lista de favoritos del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/favorites` |
| **Autenticación** | Requerida (sesión) |

### Cuerpo de la Solicitud

```json
{
  "itemSlug": "my-favorite-tool",
  "itemName": "My Favorite Tool",
  "itemLogoUrl": "https://cdn.example.com/logos/tool.png"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `itemSlug` | `string` | Sí | El slug único del elemento del directorio |
| `itemName` | `string` | Sí | Nombre del elemento (almacenado en el favorito para acceso rápido) |
| `itemLogoUrl` | `string` | No | URL del logotipo del elemento para mostrar en listas |

### Respuestas

**Estado 201** -- Favorito creado correctamente.

```json
{
  "favorite": {
    "id": "fav_abc123",
    "itemSlug": "my-favorite-tool",
    "itemName": "My Favorite Tool",
    "itemLogoUrl": "https://cdn.example.com/logos/tool.png",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Estado 400** -- Cuerpo de la solicitud inválido.

```json
{ "error": "itemSlug is required" }
```

**Estado 401** -- No autenticado.

```json
{ "error": "Unauthorized" }
```

**Estado 409** -- El elemento ya está en favoritos.

```json
{ "error": "Item is already in favorites" }
```

### Ejemplo con curl

```bash
curl -s -X POST http://localhost:3000/api/favorites \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<tu_token>" \
  -d '{
    "itemSlug": "my-favorite-tool",
    "itemName": "My Favorite Tool"
  }'
```

### Uso en TypeScript

```typescript
async function addFavorite(
  itemSlug: string,
  itemName: string,
  itemLogoUrl?: string
): Promise<Favorite> {
  const res = await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemSlug, itemName, itemLogoUrl }),
  });

  if (res.status === 409) {
    throw new Error('El elemento ya está en favoritos');
  }
  if (!res.ok) {
    throw new Error('No se pudo añadir a favoritos');
  }

  const data = await res.json();
  return data.favorite;
}
```

---

## Eliminar de Favoritos

Elimina un elemento de la lista de favoritos del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `DELETE` |
| **Ruta** | `/api/favorites/{itemSlug}` |
| **Autenticación** | Requerida (sesión) |

### Parámetros de Ruta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `itemSlug` | `string` | Sí | El slug del elemento a eliminar de favoritos |

### Respuestas

**Estado 200** -- Favorito eliminado correctamente.

```json
{ "success": true }
```

**Estado 401** -- No autenticado.

```json
{ "error": "Unauthorized" }
```

**Estado 404** -- El elemento no está en la lista de favoritos del usuario.

```json
{ "error": "Favorite not found" }
```

### Ejemplo con curl

```bash
curl -s -X DELETE http://localhost:3000/api/favorites/my-favorite-tool \
  -H "Cookie: next-auth.session-token=<tu_token>"
```

### Uso en TypeScript

```typescript
async function removeFavorite(itemSlug: string): Promise<void> {
  const res = await fetch(`/api/favorites/${itemSlug}`, {
    method: 'DELETE',
  });

  if (res.status === 404) {
    throw new Error('El elemento no está en favoritos');
  }
  if (!res.ok) {
    throw new Error('No se pudo eliminar de favoritos');
  }
}
```

---

## Funciones de Ayuda

El módulo también exporta funciones de ayuda para uso en el cliente:

```typescript
// Alternar el estado de favorito de un elemento
async function toggleFavorite(
  itemSlug: string,
  itemName: string,
  isFavorited: boolean,
  itemLogoUrl?: string
): Promise<void> {
  if (isFavorited) {
    await removeFavorite(itemSlug);
  } else {
    await addFavorite(itemSlug, itemName, itemLogoUrl);
  }
}
```

---

## Notas de Implementación

- Los favoritos se almacenan con los metadatos del elemento (`itemName`, `itemLogoUrl`) para habilitar la visualización sin necesidad de uniones adicionales a la tabla de elementos.
- La **unicidad compuesta** `(userId, itemSlug)` garantiza que un usuario no pueda añadir el mismo elemento dos veces (índice único a nivel de base de datos).
- El punto final `DELETE` usa el `itemSlug` del parámetro de ruta junto con el `userId` de la sesión para localizar y eliminar el registro favorito.
- Los metadatos del elemento almacenados (nombre, logotipo) se actualizan cuando el elemento del directorio se actualiza para mantener la consistencia.

---

## Archivos Relacionados

| Archivo | Descripción |
|---------|-------------|
| `app/api/favorites/route.ts` | Handlers GET (listar) y POST (añadir) |
| `app/api/favorites/[itemSlug]/route.ts` | Handler DELETE (eliminar) |
| `lib/repositories/favorites.repository.ts` | Acceso a datos de la capa de repositorio |
| `lib/services/favorites.service.ts` | Lógica de negocio de favoritos |
| `hooks/useFavorites.ts` | Hook React para gestionar el estado de favoritos en el cliente |
