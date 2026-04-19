---
id: client-api-endpoints
title: "Endpoints API Cliente"
sidebar_label: "API Cliente"
sidebar_position: 58
---

# Endpoints API Cliente

La API de Cliente proporciona puntos finales autenticados para que los usuarios registrados gestionen sus elementos enviados, vean estadísticas del panel y accedan a datos geográficos. Todos los puntos finales requieren autenticación basada en sesión a través de `requireClientAuth()`.

**Directorio fuente:** `template/app/api/client/`

---

## Autenticación

Todos los puntos finales de este grupo requieren una sesión de usuario válida. Las solicitudes no autenticadas reciben:

**Estado 401**
```json
{
  "success": false,
  "error": "Unauthorized. Please sign in to continue."
}
```

---

## Estadísticas del Panel

### Obtener Estadísticas del Panel

Devuelve estadísticas completas del panel para el usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/client/dashboard/stats` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `client/dashboard/stats/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "totalSubmissions": 23,
  "totalViews": 0,
  "totalVotesReceived": 156,
  "totalCommentsReceived": 89,
  "viewsAvailable": false,
  "recentActivity": {
    "newSubmissions": 3,
    "newViews": 0
  },
  "uniqueItemsInteracted": 45,
  "totalActivity": 237,
  "activityChartData": [
    { "date": "Mon", "submissions": 1, "views": 0, "engagement": 5 }
  ],
  "engagementChartData": [
    { "name": "Votes", "value": 156, "color": "#8884d8" }
  ],
  "submissionTimeline": [
    { "month": "Mar", "submissions": 5 }
  ],
  "engagementOverview": [
    { "week": "W1", "votes": 10, "comments": 3 }
  ],
  "statusBreakdown": [
    { "status": "Approved", "value": 15, "color": "#22c55e" },
    { "status": "Pending", "value": 5, "color": "#f59e0b" },
    { "status": "Rejected", "value": 3, "color": "#ef4444" }
  ],
  "topItems": [
    { "id": "item_1", "title": "My Tool", "views": 100, "votes": 25, "comments": 8 }
  ]
}
```

---

### Obtener Estadísticas Geográficas

Devuelve estadísticas de cobertura geográfica para los elementos del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/client/geo-stats` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `client/geo-stats/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "total_items": 10,
  "items_with_location": 7,
  "items_remote": 2,
  "service_area_breakdown": [
    { "area": "local", "count": 3 },
    { "area": "regional", "count": 2 }
  ],
  "top_cities": [
    { "city": "New York", "count": 3 }
  ],
  "top_countries": [
    { "country": "United States", "count": 5 }
  ]
}
```

---

### Obtener Coordenadas de Elementos

Devuelve coordenadas de todos los elementos del usuario que tienen datos de ubicación, adecuado para renderizado de mapas.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/client/items/coordinates` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `client/items/coordinates/route.ts` |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "coordinates": [
    {
      "slug": "my-item",
      "name": "My Item",
      "latitude": 40.7128,
      "longitude": -74.006
    }
  ]
}
```

---

## Gestión de Elementos

### Listar Elementos del Usuario

Devuelve una lista paginada de elementos enviados por el usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/client/items` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `client/items/route.ts` |

#### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|-----------|----------------|-------------|
| `page` | `entero` | No | `1` | Número de página (mín: 1) |
| `limit` | `entero` | No | `10` | Elementos por página (1-100) |
| `status` | `string` | No | -- | Filtrar: `all`, `pending`, `approved`, `rejected` |
| `search` | `string` | No | -- | Buscar por nombre o descripción |
| `sortBy` | `string` | No | -- | Campo de ordenamiento |
| `sortOrder` | `string` | No | -- | Dirección de ordenamiento |
| `deleted` | `boolean` | No | `false` | Si es `true`, devuelve elementos eliminados suavemente |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "items": [],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3,
  "stats": {
    "total": 20,
    "pending": 3,
    "approved": 15,
    "rejected": 2,
    "deleted": 1
  }
}
```

---

### Crear Elemento

Crea un nuevo envío de elemento. El elemento se establece en estado `pending` para revisión del administrador.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `POST` |
| **Ruta** | `/api/client/items` |
| **Autenticación** | Sesión (usuario) |
| **Fuente** | `client/items/route.ts` |

#### Cuerpo de la Solicitud

```json
{
  "name": "Awesome Tool",
  "description": "A great productivity tool that helps teams collaborate.",
  "source_url": "https://example.com",
  "category": "Productivity",
  "tags": ["collaboration", "remote-work"],
  "icon_url": "https://example.com/icon.png"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | Sí | Nombre del elemento (3-100 caracteres) |
| `description` | `string` | Sí | Descripción del elemento (10-500 caracteres) |
| `source_url` | `string` (URI) | Sí | URL/enlace principal del elemento |
| `category` | `string \| string[]` | No | Nombre de categoría o array de categorías |
| `tags` | `string[]` | No | Array de etiquetas |
| `icon_url` | `string` (URI) | No | URL del ícono del elemento |

#### Respuesta

**Estado 201**

```json
{
  "success": true,
  "item": {},
  "message": "Item submitted successfully. It will be reviewed by our team before being published."
}
```

---

### Obtener Elemento Individual

Devuelve detalles de un elemento específico propiedad del usuario autenticado.

| Propiedad | Valor |
|-----------|-------|
| **Método** | `GET` |
| **Ruta** | `/api/client/items/{id}` |
| **Autenticación** | Sesión (usuario, propietario) |
| **Fuente** | `client/items/[id]/route.ts` |

#### Parámetros de Ruta

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` | ID del elemento |

#### Respuesta

**Estado 200**

```json
{
  "success": true,
  "item": {},
  "engagement": {
    "views": 150,
    "likes": 23
  }
}
```

| Estado | Descripción |
|--------|-------------|
| 400 | ID de elemento inválido |
| 401 | No autorizado |
| 403 | No es el propietario del elemento |
| 404 | Elemento no encontrado |
