---
id: client-endpoints
title: "Endpoints API de Cliente"
sidebar_label: "Endpoints Cliente"
sidebar_position: 2
---

# Endpoints API de Cliente

Los puntos finales de la API orientados al cliente sirven a usuarios finales autenticados (no administradores). Estas rutas gestionan el panel del cliente, envíos de elementos, gestión de favoritos e interacciones públicas con elementos como comentarios, votos y vistas.

## Panel de Cliente y Elementos (`/api/client`)

Todas las rutas `/api/client/*` requieren una sesión autenticada con un `clientProfileId` válido.

### Panel

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/client/dashboard/stats` | Estadísticas del panel del cliente (conteo de elementos, vistas, engagement) |

### Elementos del Cliente

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/client/items` | Listar elementos enviados por el cliente actual |
| `POST` | `/api/client/items` | Enviar un nuevo elemento para revisión |
| `GET` | `/api/client/items/stats` | Estadísticas de elementos del cliente (publicados, pendientes, rechazados) |
| `GET` | `/api/client/items/coordinates` | Obtener coordenadas de los elementos del cliente |
| `GET` | `/api/client/items/[id]` | Obtener detalles del elemento |
| `PUT` | `/api/client/items/[id]` | Actualizar elemento propio |
| `DELETE` | `/api/client/items/[id]` | Eliminar elemento propio (eliminación suave) |
| `POST` | `/api/client/items/[id]/restore` | Restaurar un elemento eliminado suavemente |

### Estadísticas Geográficas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/client/geo-stats` | Estadísticas geográficas de los elementos del cliente |

## Interacciones Públicas con Elementos (`/api/items`)

Estos puntos finales gestionan las funciones públicas de los elementos. Algunos requieren autenticación (p. ej., votación), mientras que otros son completamente públicos (p. ej., visualización).

### Comentarios

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/items/[slug]/comments` | Listar comentarios de un elemento | Pública |
| `POST` | `/api/items/[slug]/comments` | Agregar un comentario | Requerida |
| `GET` | `/api/items/[slug]/comments/[commentId]` | Obtener detalles del comentario | Pública |
| `PUT` | `/api/items/[slug]/comments/[commentId]` | Actualizar propio comentario | Requerida |
| `DELETE` | `/api/items/[slug]/comments/[commentId]` | Eliminar propio comentario | Requerida |

### Calificaciones de Comentarios

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/items/[slug]/comments/rating` | Obtener resumen de calificaciones | Pública |
| `POST` | `/api/items/[slug]/comments/rating` | Enviar una calificación | Requerida |
| `GET` | `/api/items/[slug]/comments/rating/[commentId]` | Obtener calificación de un comentario | Pública |

### Votos

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/items/[slug]/votes/count` | Obtener conteo de votos | Pública |
| `GET` | `/api/items/[slug]/votes/status` | Obtener estado de voto del usuario actual | Requerida |
| `POST` | `/api/items/[slug]/votes` | Votar en un elemento (a favor/en contra) | Requerida |

### Vistas

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `POST` | `/api/items/[slug]/views` | Registrar una vista de página | Pública |

### Engagement y Popularidad

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/items/engagement` | Obtener métricas de engagement para elementos | Pública |
| `GET` | `/api/items/popularity-scores` | Obtener puntuaciones de popularidad calculadas | Pública |

### Empresa

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/items/[slug]/company` | Obtener información de empresa de un elemento | Pública |

## Favoritos (`/api/favorites`)

Gestionar los elementos favoritos del usuario. Todos los puntos finales de favoritos requieren autenticación.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/favorites` | Listar los elementos favoritos del usuario actual |
| `POST` | `/api/favorites/[itemSlug]` | Alternar estado de favorito de un elemento |
| `DELETE` | `/api/favorites/[itemSlug]` | Eliminar elemento de favoritos |

## Perfil de Usuario (`/api/user`)

Puntos finales de perfil de usuario y gestión de suscripciones.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/user/profile/location` | Obtener ubicación detectada del usuario |
| `GET` | `/api/user/currency` | Obtener moneda detectada/preferida del usuario |
| `GET` | `/api/user/plan-status` | Obtener estado del plan de suscripción actual |
| `GET` | `/api/user/subscription` | Obtener detalles de suscripción |
| `GET` | `/api/user/payments` | Obtener historial de pagos |

## Usuario Actual (`/api/current-user`)

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/current-user` | Obtener datos de sesión del usuario autenticado |

## Anuncios Patrocinados - Usuario (`/api/sponsor-ads/user`)

Puntos finales para que los usuarios gestionen sus propios anuncios patrocinados.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/sponsor-ads/user` | Listar anuncios patrocinados del usuario |
| `GET` | `/api/sponsor-ads/user/stats` | Estadísticas de rendimiento de anuncios del usuario |
| `GET` | `/api/sponsor-ads/user/[id]` | Obtener detalles del anuncio |
| `PUT` | `/api/sponsor-ads/user/[id]` | Actualizar propio anuncio |
| `POST` | `/api/sponsor-ads/user/[id]/cancel` | Cancelar propio anuncio |
| `POST` | `/api/sponsor-ads/user/[id]/renew` | Renovar anuncio vencido |

## Encuestas (`/api/surveys`)

Gestión de encuestas y recolección de respuestas.

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `GET` | `/api/surveys` | Listar encuestas publicadas | Pública |
| `GET` | `/api/surveys/[surveyId]` | Obtener detalles de encuesta | Pública |
| `POST` | `/api/surveys/[surveyId]/responses` | Enviar una respuesta de encuesta | Pública |
| `GET` | `/api/surveys/responses/[responseId]` | Obtener detalles de respuesta | Requerida |

## Reportes (`/api/reports`)

| Método | Ruta | Descripción | Autenticación |
|--------|------|-------------|---------------|
| `POST` | `/api/reports` | Enviar un reporte de contenido | Requerida |

## Puntos Finales de Datos Públicos

Estos puntos finales no requieren autenticación:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/categories/exists` | Verificar si existe un slug de categoría |
| `GET` | `/api/collections/exists` | Verificar si existe un slug de colección |
| `GET` | `/api/featured-items` | Listar elementos destacados |
| `GET` | `/api/sponsor-ads` | Obtener anuncios patrocinados activos para mostrar |
| `POST` | `/api/sponsor-ads/checkout` | Iniciar proceso de pago de anuncio patrocinado |

## Patrones de Paginación

Los puntos finales de lista orientados al cliente admiten los parámetros de paginación estándar:

```
GET /api/client/items?page=1&limit=10&sort=createdAt&order=desc
GET /api/items/[slug]/comments?page=1&limit=20
GET /api/favorites?page=1&limit=50
```

Las respuestas incluyen metadatos de paginación:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```
