---
id: admin-analytics-endpoints
title: "Endpoints Admin Analytics"
sidebar_label: "Admin Analytics"
sidebar_position: 22
---

# Endpoints Admin Analytics

La API de analytics de administración proporciona datos de analíticas geográficas para el panel de administración, incluyendo estadísticas de cobertura, desgloses de distribución y datos de visualización de mapas. Todos los puntos finales requieren autenticación de administrador.

## Descripción general

| Punto final | Método | Autenticación | Descripción |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Admin | Obtener datos de analíticas geográficas |

## Obtener Analíticas Geográficas

```
GET /api/admin/geo-analytics
```

Devuelve analíticas completas de distribución geográfica incluyendo estadísticas de cobertura, distribuciones por país/ciudad/área de servicio, coordenadas de ubicación para marcadores de mapa y datos de mapa de calor. Este punto final agrega datos tanto del índice de ubicación como del repositorio de elementos.

**Autenticación:** Se requiere administrador (mediante `checkAdminAuth()`)

**Caché:** Deshabilitado — usa `force-dynamic`, `revalidate: 0` y `force-no-store` para garantizar datos actualizados en el panel de administración.

**Respuesta exitosa (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Campos de la Respuesta

#### Objeto Stats

| Campo | Tipo | Descripción |
|---|---|---|
| `totalIndexed` | entero | Total de entradas en el índice de ubicación |
| `totalItems` | entero | Total de elementos en el repositorio |
| `itemsWithLocation` | entero | Elementos que tienen datos de ubicación o están marcados como remotos |
| `itemsRemote` | entero | Elementos marcados como remotos/distribuidos |
| `coveragePercent` | número | Porcentaje de elementos con datos de ubicación (redondeado a 1 decimal) |
| `indexHealth.synced` | booleano | Si el conteo del índice coincide con el conteo esperado |
| `indexHealth.indexCount` | entero | Entradas no remotas en el índice |
| `indexHealth.expectedCount` | entero | Entradas no remotas esperadas según los datos fuente |
| `citiesCount` | entero | Número de ciudades distintas en el índice |
| `countriesCount` | entero | Número de países distintos en el índice |
| `remoteCount` | entero | Número de entradas remotas en el índice |
| `lastIndexedAt` | string o null | Marca de tiempo ISO de la última actualización del índice |
| `lastRebuildAt` | string o null | Marca de tiempo ISO de la última reconstrucción completa |

#### Objeto Distributions

| Campo | Descripción |
|---|---|
| `byCountry` | Array de nombres de países con conteos, ordenados por conteo descendente |
| `byCity` | Top 20 ciudades con conteos, ordenados por conteo descendente |
| `byServiceArea` | Áreas de servicio con conteos, ordenados por conteo descendente |

#### Array Locations

Cada objeto de ubicación proporciona datos para los marcadores del mapa. Los elementos remotos en coordenadas `(0, 0)` se filtran para evitar visualizaciones de mapa engañosas.

#### Datos del Mapa de Calor

Array de pares de latitud/longitud para entradas no remotas únicamente, adecuados para renderizar mapas de densidad de calor.

### Fuentes de Datos

El punto final agrega datos de tres consultas paralelas:

1. **Servicio de Índice de Ubicación** (`getLocationIndexService().getIndexStats()`) — proporciona estadísticas del índice
2. **Entradas del Índice de Ubicación** (`getAllLocationEntries()`) — proporciona todas las ubicaciones indexadas para cálculos de distribución
3. **Repositorio de Elementos** (`itemRepository.findAll()`) — proporciona datos de elementos fuente para cálculos de cobertura

### Cálculo de Cobertura

El porcentaje de cobertura se calcula como:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Un elemento se cuenta como "con ubicación" si tiene coordenada de latitud o está marcado como remoto (`is_remote: true`).

### Estado del Índice

El estado del índice compara el número de entradas no remotas en el índice de ubicación contra el conteo esperado derivado de los datos fuente:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Cuando `synced` es false, los administradores deben considerar reconstruir el índice de ubicación mediante el punto final `/api/admin/location-index`.

| Estado | Condición |
|---|---|
| 401 | No autenticado como administrador |
| 500 | Error interno del servidor |

**Fuente:** `template/app/api/admin/geo-analytics/route.ts`
