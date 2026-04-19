---
id: items-api-endpoints-deep-dive
title: "Análisis Detallado Endpoints API Elementos"
sidebar_label: "API Elementos (Detallado)"
sidebar_position: 65
---

# Análisis Detallado Endpoints API Elementos

La API de Elementos proporciona puntos finales públicos para interactuar con elementos, incluyendo comentarios, votos, seguimiento de vistas, asociaciones de empresas y métricas de engagement. Estos puntos finales impulsan las características principales orientadas al usuario del sitio web de directorio.

**Directorio fuente:** `template/app/api/items/`

---

## Mapa de Rutas

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| `GET` | `/api/items/{slug}/comments` | Público | Listar comentarios del elemento |
| `POST` | `/api/items/{slug}/comments` | Sesión | Crear un comentario |
| `PUT` | `/api/items/{slug}/comments/{commentId}` | Sesión (propietario) | Actualizar un comentario |
| `DELETE` | `/api/items/{slug}/comments/{commentId}` | Sesión (propietario) | Eliminar un comentario |
| `GET` | `/api/items/{slug}/comments/rating` | Público | Obtener estadísticas de calificación |
| `GET` | `/api/items/{slug}/comments/rating/{commentId}` | Público | Obtener calificación de un comentario |
| `PATCH` | `/api/items/{slug}/comments/rating/{commentId}` | Público | Actualizar calificación de un comentario |
| `GET` | `/api/items/{slug}/company` | Admin | Obtener empresa del elemento |
| `POST` | `/api/items/{slug}/company` | Admin | Asignar empresa al elemento |
| `DELETE` | `/api/items/{slug}/company` | Admin | Eliminar empresa del elemento |
| `POST` | `/api/items/{slug}/views` | Público | Registrar vista del elemento |
| `GET` | `/api/items/{slug}/votes` | Público | Obtener info de votos + estado del usuario |
| `POST` | `/api/items/{slug}/votes` | Sesión | Emitir o actualizar voto |
| `DELETE` | `/api/items/{slug}/votes` | Sesión | Eliminar voto |
| `GET` | `/api/items/{slug}/votes/count` | Público | Obtener solo el conteo de votos |
| `GET` | `/api/items/{slug}/votes/status` | Sesión | Obtener registro de voto del usuario |
| `GET` | `/api/items/engagement` | Público | Métricas de engagement en lote |
| `GET` | `/api/items/popularity-scores` | Público | Depurar puntuaciones de popularidad |

---

## Comentarios

### Listar Comentarios

Devuelve todos los comentarios para un elemento específico, incluyendo información del perfil del usuario.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/comments` |
| **Autenticación** | Ninguna (público) |
| **Fuente** | `items/[slug]/comments/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "comments": [
    {
      "id": "comment_123abc",
      "content": "This is an amazing tool! Really helped boost my productivity.",
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

#### Ejemplo con curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments
```

---

### Crear Comentario

Crea un nuevo comentario con una calificación para un elemento.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/items/{slug}/comments` |
| **Autenticación** | Sesión (usuario con perfil de cliente) |
| **Fuente** | `items/[slug]/comments/route.ts` |

#### Cuerpo de la Solicitud

```json
{
  "content": "This tool is excellent for team collaboration!",
  "rating": 5
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `content` | `string` | Sí | Texto del comentario (debe ser no vacío) |
| `rating` | `integer` | Sí | Calificación del 1 al 5 |

#### Respuestas

| Estado | Descripción |
|--------|-------------|
| 200 | Comentario creado exitosamente |
| 400 | Contenido o calificación inválidos |
| 401 | Se requiere autenticación |
| 403 | El usuario está bloqueado (suspendido o baneado) |
| 404 | Perfil de cliente no encontrado |
| 500 | Error del servidor |

**Estado 200**

```json
{
  "success": true,
  "comment": {
    "id": "comment_new123",
    "content": "This tool is excellent for team collaboration!",
    "rating": 5,
    "userId": "client_456def",
    "itemId": "awesome-productivity-tool",
    "createdAt": "2024-01-21T14:00:00.000Z",
    "updatedAt": "2024-01-21T14:00:00.000Z",
    "deletedAt": null,
    "user": {
      "id": "client_456def",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "avatar": "https://example.com/avatars/john.jpg"
    }
  }
}
```

#### Ejemplo con curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "content": "Great tool!", "rating": 5 }'
```

:::note Moderación
Los usuarios bloqueados (suspendidos o baneados) reciben una respuesta 403 con un mensaje que explica su estado de bloqueo. La verificación `isUserBlocked()` se realiza usando el campo de estado del perfil del cliente.
:::

---

### Actualizar Comentario

Actualiza el contenido y/o la calificación de un comentario. Solo el autor del comentario puede actualizarlo.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PUT` |
| **Ruta** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticación** | Sesión (propietario del comentario) |
| **Fuente** | `items/[slug]/comments/[commentId]/route.ts` |

#### Cuerpo de la Solicitud

Se debe proporcionar al menos un campo:

```json
{
  "content": "Updated review text.",
  "rating": 4
}
```

| Campo | Tipo | Requerido | Restricciones |
|-------|------|-----------|---------------|
| `content` | `string` | No | 1-1000 caracteres |
| `rating` | `integer` | No | 1-5 |

#### Respuesta

**Estado 200** -- Devuelve el comentario actualizado con información del usuario y una marca de tiempo `editedAt`.

```json
{
  "id": "comment_123abc",
  "content": "Updated review text.",
  "rating": 4,
  "userId": "client_456def",
  "itemId": "awesome-productivity-tool",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-21T15:00:00.000Z",
  "editedAt": "2024-01-21T15:00:00.000Z",
  "deletedAt": null,
  "user": {
    "id": "client_456def",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "image": "https://example.com/avatars/john.jpg"
  }
}
```

---

### Eliminar Comentario

Elimina suavemente un comentario. Solo el autor del comentario puede eliminarlo.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `DELETE` |
| **Ruta** | `/api/items/{slug}/comments/{commentId}` |
| **Autenticación** | Sesión (propietario del comentario) |
| **Fuente** | `items/[slug]/comments/[commentId]/route.ts` |

#### Respuesta

**Estado 204** -- Sin contenido (comentario eliminado exitosamente).

| Estado | Descripción |
|--------|-------------|
| 204 | Comentario eliminado |
| 401 | No autorizado |
| 404 | Comentario no encontrado o no autorizado |

#### Ejemplo con curl

```bash
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/comments/comment_123 \
  -H "Cookie: next-auth.session-token=<session_token>"
```

---

### Obtener Estadísticas de Calificación

Devuelve estadísticas de calificación agregadas para un elemento: calificación promedio y conteo total.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/comments/rating` |
| **Autenticación** | Ninguna (público) |
| **Fuente** | `items/[slug]/comments/rating/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "averageRating": 4.2,
  "totalRatings": 15
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `averageRating` | `number` | Calificación promedio (0 si no hay calificaciones, máx 5) |
| `totalRatings` | `number` | Número total de comentarios no eliminados con calificaciones |

#### Ejemplo con curl

```bash
curl -s http://localhost:3000/api/items/awesome-productivity-tool/comments/rating
```

---

### Obtener/Actualizar Calificación de Comentario Individual

#### Obtener Calificación del Comentario

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticación** | Ninguna (público) |

Devuelve el objeto de comentario completo para un ID de comentario específico.

#### Actualizar Calificación del Comentario

| Propiedad | Valor |
|-----------|-------|
| **Método** | `PATCH` |
| **Ruta** | `/api/items/{slug}/comments/rating/{commentId}` |
| **Autenticación** | Ninguna |

**Cuerpo de la Solicitud:**
```json
{
  "rating": 4
}
```

Devuelve el objeto de comentario actualizado.

---

## Asociación de Empresas

Puntos finales solo para administradores para gestionar la relación entre elementos y empresas.

### Obtener Empresa del Elemento

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/company` |
| **Autenticación** | Admin |
| **Fuente** | `items/[slug]/company/route.ts` |

#### Respuesta

**Estado 200** -- Empresa encontrada.

```json
{
  "success": true,
  "data": {
    "id": "company_123",
    "name": "Acme Corp",
    "website": "https://acme.com"
  }
}
```

**Estado 200** -- Sin empresa asignada.

```json
{
  "success": true,
  "data": null
}
```

---

### Asignar Empresa al Elemento

Asigna una empresa a un elemento. Esta operación es idempotente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/items/{slug}/company` |
| **Autenticación** | Admin |
| **Fuente** | `items/[slug]/company/route.ts` |

#### Cuerpo de la Solicitud

```json
{
  "companyId": "company_123"
}
```

#### Respuestas

**Estado 201** -- Nueva asociación creada.

```json
{
  "success": true,
  "data": { /* objeto de asociación */ },
  "created": true,
  "updated": false
}
```

**Estado 200** -- Asociación existente actualizada.

```json
{
  "success": true,
  "data": { /* objeto de asociación */ },
  "created": false,
  "updated": true
}
```

**Estado 409** -- El elemento ya está vinculado a una empresa diferente.

```json
{
  "error": "Item is already linked to another company"
}
```

---

### Eliminar Empresa del Elemento

Elimina la asociación de empresa de un elemento. Esta operación es idempotente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `DELETE` |
| **Ruta** | `/api/items/{slug}/company` |
| **Autenticación** | Admin |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "deleted": true
}
```

#### Ejemplo con curl

```bash
# Asignar empresa
curl -s -X POST http://localhost:3000/api/items/awesome-tool/company \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<admin_session>" \
  -d '{ "companyId": "company_123" }'

# Eliminar empresa
curl -s -X DELETE http://localhost:3000/api/items/awesome-tool/company \
  -H "Cookie: next-auth.session-token=<admin_session>"
```

---

## Vistas

### Registrar Vista del Elemento

Registra una vista diaria única para un elemento con deduplicación integrada, detección de bots y exclusión del propietario.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/items/{slug}/views` |
| **Autenticación** | Ninguna (público) |
| **Fuente** | `items/[slug]/views/route.ts` |

#### Flujo de Procesamiento

1. **Verificación de base de datos** -- verifica la disponibilidad de la base de datos.
2. **Detección de bots** -- rechaza agentes de usuario de bots conocidos.
3. **Validación del elemento** -- confirma que el elemento existe (devuelve 404 si no se encuentra).
4. **Exclusión del propietario** -- si está autenticado, omite el conteo si el espectador es el propietario del elemento.
5. **ID del espectador** -- lee o crea una cookie de espectador (`VIEWER_COOKIE_NAME`) para el seguimiento anónimo.
6. **Deduplicación diaria** -- registra la vista solo una vez por espectador por día.

#### Respuesta

**Estado 200** -- Vista procesada.

```json
{ "success": true, "counted": true }
```

| Escenario | `counted` | `reason` |
|-----------|-----------|----------|
| Nueva vista registrada | `true` | -- |
| Vista duplicada (mismo día) | `false` | -- |
| Bot detectado | `false` | `"bot"` |
| Propietario viendo su propio elemento | `false` | `"owner"` |

**Estado 404** -- Elemento no encontrado.

```json
{ "success": false, "error": "Item not found" }
```

#### Ejemplo con curl

```bash
curl -s -X POST http://localhost:3000/api/items/awesome-productivity-tool/views \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
```

### Notas de Implementación

- La cookie del espectador es `HttpOnly`, `Secure` en producción, y tiene `SameSite: lax`.
- La deduplicación de vistas se basa en `(itemId, viewerId, viewedDateUtc)` donde la fecha es `YYYY-MM-DD` en UTC.
- La utilidad `isBot()` verifica el agente de usuario contra patrones de bots conocidos.

---

## Votos

### Obtener Información de Votos

Devuelve el conteo total de votos y el estado del voto del usuario actual (si está autenticado).

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/votes` |
| **Autenticación** | Ninguna (público; el estado del usuario requiere sesión) |
| **Fuente** | `items/[slug]/votes/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "count": 15,
  "userVote": "up"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `count` | `number` | Conteo neto de votos (votos positivos - votos negativos) |
| `userVote` | `"up" \| "down" \| null` | Voto del usuario (`null` si no está autenticado o sin voto) |

---

### Emitir o Actualizar Voto

Emite un nuevo voto o reemplaza uno existente.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/items/{slug}/votes` |
| **Autenticación** | Sesión (usuario con perfil de cliente) |
| **Fuente** | `items/[slug]/votes/route.ts` |

#### Cuerpo de la Solicitud

```json
{
  "type": "up"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `type` | `string` | Sí | Tipo de voto: `"up"` o `"down"` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "count": 16,
  "userVote": "up"
}
```

| Estado | Descripción |
|--------|-------------|
| 200 | Voto emitido exitosamente |
| 400 | Tipo de voto inválido |
| 401 | No autorizado |
| 403 | El usuario está bloqueado (suspendido/baneado) |
| 404 | Perfil de cliente no encontrado |

#### Ejemplo con curl

```bash
# Voto positivo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "up" }'

# Voto negativo
curl -s -X POST http://localhost:3000/api/items/awesome-tool/votes \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<session_token>" \
  -d '{ "type": "down" }'
```

---

### Eliminar Voto

Elimina el voto del usuario actual de un elemento.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `DELETE` |
| **Ruta** | `/api/items/{slug}/votes` |
| **Autenticación** | Sesión (usuario con perfil de cliente) |
| **Fuente** | `items/[slug]/votes/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "count": 14,
  "userVote": null
}
```

---

### Obtener Conteo de Votos

Un punto final ligero que devuelve solo el conteo de votos (sin estado del usuario).

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/votes/count` |
| **Autenticación** | Ninguna (público) |
| **Fuente** | `items/[slug]/votes/count/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "count": 15
}
```

---

### Obtener Estado de Voto del Usuario

Devuelve el registro completo del voto del usuario autenticado para un elemento específico.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/{slug}/votes/status` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `items/[slug]/votes/status/route.ts` |

#### Respuesta

**Estado 200** -- El usuario ha votado.

```json
{
  "id": "vote_123abc",
  "userId": "client_456def",
  "itemId": "item_123abc",
  "voteType": "UPVOTE",
  "createdAt": "2024-01-20T10:30:00.000Z",
  "updatedAt": "2024-01-20T10:30:00.000Z"
}
```

**Estado 200** -- El usuario no ha votado.

```json
null
```

---

## Métricas de Engagement

### Métricas de Engagement en Lote

Obtiene métricas de engagement (vistas, votos, calificaciones, favoritos, comentarios) para múltiples elementos en una sola solicitud.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/engagement` |
| **Autenticación** | Ninguna (público) |
| **Caché** | `force-dynamic` |
| **Fuente** | `items/engagement/route.ts` |

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `slugs` | `string` | Sí | Lista separada por comas de slugs de elementos (máx 200) |

#### Respuesta

**Estado 200**

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1500,
      "votes": 25,
      "avgRating": 4.2,
      "favorites": 12,
      "comments": 8
    },
    "another-tool": {
      "views": 800,
      "votes": 10,
      "avgRating": 3.8,
      "favorites": 5,
      "comments": 3
    }
  }
}
```

#### Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | Parámetro `slugs` faltante o más de 200 slugs |

#### Ejemplo con curl

```bash
curl -s "http://localhost:3000/api/items/engagement?slugs=awesome-tool,another-tool,third-tool"
```

---

### Puntuaciones de Popularidad (Depuración)

Un punto final de depuración que devuelve elementos ordenados por su puntuación de popularidad calculada con un desglose detallado de los factores de puntuación.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/items/popularity-scores` |
| **Autenticación** | Ninguna (público) |
| **Caché** | `force-dynamic` |
| **Fuente** | `items/popularity-scores/route.ts` |

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Valor por defecto | Descripción |
|-----------|------|-----------|-------------------|-------------|
| `limit` | `integer` | No | `20` | Número de elementos a devolver (máx 100) |
| `locale` | `string` | No | `"en"` | Idioma para los elementos |

#### Respuesta

**Estado 200**

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Tool",
      "slug": "top-tool",
      "featured": true,
      "score": 15234,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 2500,
        "votes": 1200,
        "rating": 2100,
        "favorites": 900,
        "comments": 234,
        "recency": 300
      },
      "engagement": {
        "views": 5000,
        "votes": 50,
        "avgRating": 4.2,
        "favorites": 30,
        "comments": 15
      },
      "ageInDays": 15
    }
  ]
}
```

#### Algoritmo de Puntuación

La puntuación de popularidad usa escala logarítmica para evitar que los valores atípicos dominen:

| Factor | Peso | Fórmula |
|--------|------|---------|
| Impulso destacado | 10000 | Bonificación fija para elementos destacados |
| Vistas | 1000 | `log10(views + 1) * 1000` |
| Votos | 1200 | `log10(max(votes, 0) + 1) * 1200` |
| Calificación promedio | 500 | `avgRating * 500` |
| Favoritos | 1100 | `log10(favorites + 1) * 1100` |
| Comentarios | 1000 | `log10(comments + 1) * 1000` |
| Recencia | hasta 1000 | Bonificación decayente para elementos de menos de 180 días |

Los elementos sin datos de engagement reciben una pequeña puntuación heurística basada en la calidad de los metadatos (cantidad de etiquetas, longitud del nombre, presencia de icono, código promocional).

#### Ejemplo con curl

```bash
curl -s "http://localhost:3000/api/items/popularity-scores?limit=10&locale=en"
```

---

## Uso en TypeScript

```typescript
// Obtener comentarios para un elemento
const commentsRes = await fetch(`/api/items/${slug}/comments`);
const { comments } = await commentsRes.json();

// Publicar un comentario
const newComment = await fetch(`/api/items/${slug}/comments`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Great tool!', rating: 5 }),
}).then(r => r.json());

// Votar positivamente un elemento
const voteRes = await fetch(`/api/items/${slug}/votes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'up' }),
}).then(r => r.json());
console.log(`New vote count: ${voteRes.count}`);

// Registrar una vista
await fetch(`/api/items/${slug}/views`, { method: 'POST' });

// Obtener engagement en lote para múltiples elementos
const slugList = ['tool-a', 'tool-b', 'tool-c'].join(',');
const { metrics } = await fetch(`/api/items/engagement?slugs=${slugList}`).then(r => r.json());

// Obtener estadísticas de calificación
const { averageRating, totalRatings } = await fetch(
  `/api/items/${slug}/comments/rating`
).then(r => r.json());
```
