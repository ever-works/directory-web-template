---
id: location-endpoints
title: "Referencia API Ubicación"
sidebar_label: "Ubicación"
sidebar_position: 51
---

# Referencia API Ubicación

## Descripción General

Los puntos finales de Ubicación proporcionan acceso al índice de ubicación espacial para los elementos del directorio. Admiten la consulta de elementos por ciudad, país, búsqueda de proximidad basada en radio y la recuperación de datos de coordenadas para la renderización de mapas. Todos los puntos finales de ubicación requieren que la característica de ubicación esté habilitada en la configuración del sistema.

## Puntos Finales

### GET /api/location/cities

Devuelve una lista de nombres de ciudades distintos del índice de ubicación.

**Solicitud**

No se requieren parámetros.

**Respuesta**
```typescript
{
  success: true;
  data: string[];   // Arreglo de nombres de ciudades, ej. ["San Francisco", "London", "Tokyo"]
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Devuelve una lista de nombres de países distintos del índice de ubicación.

**Solicitud**

No se requieren parámetros.

**Respuesta**
```typescript
{
  success: true;
  data: string[];   // Arreglo de nombres de países, ej. ["United States", "United Kingdom"]
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Devuelve coordenadas para todos los elementos indexados, con filtrado opcional por ciudad o país. Se usa para renderizar marcadores de mapa. Los elementos remotos se excluyen automáticamente.

**Solicitud**

| Parámetro | Tipo | En | Descripción |
|-----------|------|----|-------------|
| city | string | query | Filtrar por nombre de ciudad (insensible a mayúsculas) |
| country | string | query | Filtrar por nombre de país (insensible a mayúsculas) |

**Respuesta**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Identificador slug del elemento
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Busca elementos por ubicación geográfica usando proximidad basada en radio, nombre de ciudad o nombre de país. Devuelve slugs de elementos coincidentes e información opcional de distancia.

**Solicitud**

| Parámetro | Tipo | En | Descripción |
|-----------|------|----|-------------|
| near_lat | number | query | Latitud para búsqueda por radio |
| near_lng | number | query | Longitud para búsqueda por radio |
| radius | number | query | Radio en km (por defecto: 50) |
| city | string | query | Filtrar por nombre de ciudad |
| country | string | query | Filtrar por nombre de país |

Se requiere al menos un parámetro de búsqueda: `near_lat` + `near_lng`, `city` o `country`.

**Respuesta**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Arreglo de slugs de elementos coincidentes
    distances: Record<string, number>;  // Mapa de slug a distancia en km (solo búsqueda por radio)
  };
}
```

**Ejemplo**
```typescript
// Búsqueda por radio: elementos a menos de 25 km de San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Búsqueda por ciudad
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Autenticación

Todos los puntos finales de ubicación son **públicos** -- no se requiere autenticación. Sin embargo, la característica de ubicación debe estar habilitada en la configuración del sistema. Si las características de ubicación están deshabilitadas, todos los puntos finales devuelven un `404` con `"Location features are disabled"`.

## Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | Coordenadas inválidas, radio inválido o parámetros de búsqueda requeridos faltantes |
| 404 | Las características de ubicación están deshabilitadas en la configuración del sistema |
| 500 | Error interno del servidor -- fallo en la consulta a la base de datos |

## Limitación de Velocidad

No se aplica limitación de velocidad explícita a estos puntos finales. Los elementos remotos/virtuales se excluyen automáticamente de los resultados de coordenadas.

## Puntos Finales Relacionados

- [Puntos Finales de Geocodificación](./geocode-endpoints) -- Geocodificación directa e inversa (solo administrador)
