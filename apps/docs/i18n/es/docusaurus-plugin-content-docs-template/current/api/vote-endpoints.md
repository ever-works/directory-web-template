---
id: vote-endpoints
title: "Endpoints de Votos"
sidebar_label: "Votos"
sidebar_position: 25
---

# Endpoints de Votos

Endpoints para emitir, actualizar, eliminar y consultar votos de ítems. Soporta votos positivos (upvote) y negativos (downvote) con un modelo de puntuación neta.

## Descripción General

El sistema de votos permite a los usuarios autenticados votar a favor o en contra de cualquier ítem del directorio. La puntuación visible de un ítem es la suma neta de votos positivos y negativos. Los usuarios bloqueados no pueden emitir votos. La eliminación de votos es idempotente.

## Tabla de Endpoints

| Método | Ruta | Autenticación | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/items/[slug]/votes` | Opcional | Obtener conteo de votos para un ítem |
| `POST` | `/api/items/[slug]/votes` | Requerida | Emitir o actualizar el voto del usuario |
| `DELETE` | `/api/items/[slug]/votes` | Requerida | Eliminar el voto del usuario |
| `GET` | `/api/votes/count` | Pública | Obtener conteo de votos sin autenticación |
| `GET` | `/api/votes/status` | Requerida | Obtener el registro de voto del usuario actual |

## GET /api/items/[slug]/votes

Obtiene el conteo total de votos y el estado del voto del usuario autenticado.

### Parámetros de Ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `slug` | `string` | Slug del ítem (p. ej. "my-awesome-tool") |

### Respuesta 200

```json
{
  "success": true,
  "count": 42,
  "userVote": "up"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `success` | `boolean` | Indicador de éxito |
| `count` | `number` | Puntuación neta de votos (puede ser negativa) |
| `userVote` | `"up" \| "down" \| null` | Voto del usuario actual; `null` si no está autenticado o no ha votado |

## POST /api/items/[slug]/votes

Emite un voto nuevo o actualiza el voto existente del usuario en el ítem.

### Cuerpo de la Solicitud

```typescript
interface CastVoteRequest {
  type: "up" | "down";
}
```

```bash
curl -X POST /api/items/my-awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"type": "up"}'
```

### Respuesta 200

```json
{
  "success": true,
  "count": 43,
  "userVote": "up"
}
```

### Respuestas de Error

| Estado | Error | Causa |
|--------|-------|-------|
| 400 | `Invalid vote type. Must be "up" or "down"` | Type no es "up" ni "down" |
| 401 | `Unauthorized` | Sin sesión autenticada |
| 403 | `You are blocked from voting` | El usuario está bloqueado por un administrador |
| 404 | `Item not found` | El slug no corresponde a ningún ítem |

### Comportamiento de Actualización de Voto

Si el usuario ya ha votado en este ítem, el voto existente se reemplaza por el nuevo. Internamente: la fila de voto antigua se elimina y se crea una nueva. El conteo se recalcula en consecuencia.

## DELETE /api/items/[slug]/votes

Elimina el voto del usuario del ítem. Esta operación es idempotente — si el usuario no ha votado, la solicitud tiene éxito de todos modos.

```bash
curl -X DELETE /api/items/my-awesome-tool/votes \
  -H "Cookie: session=..."
```

### Respuesta 200

```json
{
  "success": true,
  "count": 41,
  "userVote": null
}
```

## GET /api/votes/count

Endpoint ligero para obtener el conteo actual de votos de un ítem sin requerir autenticación.

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `itemId` | `string` | ID del ítem (no el slug) |

### Respuesta 200

```json
{
  "success": true,
  "count": 42
}
```

El `count` puede ser negativo si los votos negativos superan a los positivos.

## GET /api/votes/status

Obtiene el registro de voto completo del usuario autenticado para un ítem específico.

### Parámetros de Consulta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `itemId` | `string` | ID del ítem |

### Respuesta 200 — Con Voto

```json
{
  "success": true,
  "data": {
    "id": "vote_abc123",
    "userId": "user_xyz789",
    "itemId": "item_def456",
    "voteType": "UPVOTE",
    "createdAt": "2024-01-10T12:00:00.000Z",
    "updatedAt": "2024-01-10T12:00:00.000Z"
  }
}
```

### Respuesta 200 — Sin Voto

```json
{
  "success": true,
  "data": null
}
```

:::note
Los valores de la base de datos son `UPVOTE` y `DOWNVOTE` (en mayúsculas). Las respuestas de la API de votos usan `"up"` y `"down"` (en minúsculas). El endpoint `/api/votes/status` devuelve los valores del enum de la base de datos tal como están.
:::

## Detalles de Implementación Clave

| Aspecto | Comportamiento |
|---------|---------------|
| Cálculo de puntuación neta | `count = upvotes - downvotes` |
| Reemplazo de voto | Eliminar fila antigua + crear nueva fila (el conteo cambia de 2 a 0 con efecto neto de cambio de tipo) |
| Verificación de usuario bloqueado | Solo en `POST` — los usuarios bloqueados no pueden emitir nuevos votos |
| Eliminación idempotente | `DELETE` tiene éxito incluso si no existe ningún voto |
| Enum `VoteType` | `UPVOTE` \| `DOWNVOTE` en la base de datos |
| Votos negativos | El conteo puede ser negativo; se muestra tal cual en la UI |

## Páginas Relacionadas

- [Endpoints de Ítems Administrador](./admin-items-endpoints.md)
- [Endpoints de Ítems Cliente](./admin-clients-endpoints.md)
