---
id: location-types
title: Definiciones de tipos de ubicación
sidebar_label: Tipos de ubicación
sidebar_position: 7
---

# Definiciones de tipos de ubicación

**Fuente:** `lib/types/location.ts`

El módulo de ubicación proporciona definiciones de tipos completas para funciones de geolocalización, incluida la configuración del proveedor de mapas, la configuración de ubicación, las consultas geográficas y el almacenamiento de datos de ubicación. Es compatible con los proveedores de Mapbox y Google Maps.

## Tipos de enumeración

### `MapProvider`

Opciones de proveedores de mapas admitidos:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Opciones de estilo de representación del mapa:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Tipos de configuración

### `LocationConfigSettings`

Los ajustes de configuración se almacenan en `config.yml` usando el nombre `snake_case`. Se utiliza al analizar la sección `settings.location` del archivo de configuración.

```typescript
interface LocationConfigSettings {
  enabled?: boolean;
  provider?: MapProvider;
  map_style?: MapStyle;
  distance_filter_enabled?: boolean;
  distance_sort_enabled?: boolean;
  default_radius_km?: number;
  show_exact_address?: boolean;
  require_location_on_submit?: boolean;
  default_center?: [number, number]; // [latitude, longitude]
}
```

### `LocationSettings`

Configuración de ubicación en tiempo de ejecución usando nombres `camelCase`. Se utiliza en toda la aplicación para acceso con seguridad de tipos.

```typescript
interface LocationSettings {
  enabled: boolean;
  provider: MapProvider;
  mapStyle: MapStyle;
  distanceFilterEnabled: boolean;
  distanceSortEnabled: boolean;
  defaultRadiusKm: number;
  showExactAddress: boolean;
  requireLocationOnSubmit: boolean;
  defaultCenter: {
    latitude: number;
    longitude: number;
  };
}
```

**Diferencias clave con `LocationConfigSettings`:**
- Todos los campos son obligatorios (no opcionales) porque se aplican los valores predeterminados
- Utiliza nombres `camelCase` en lugar de `snake_case`
- La tupla `default_center` se convierte en un objeto `{ latitude, longitude }` con nombre

## Valores predeterminados

### `DEFAULT_LOCATION_SETTINGS`

Valores predeterminados que se aplican cuando los ajustes no están configurados:

```typescript
const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  enabled: false,
  provider: 'mapbox',
  mapStyle: 'streets',
  distanceFilterEnabled: true,
  distanceSortEnabled: true,
  defaultRadiusKm: 50,
  showExactAddress: false,
  requireLocationOnSubmit: false,
  defaultCenter: { latitude: 0, longitude: 0 },
};
```

## Tipos de datos

### `LocationData`

Datos de ubicación de elementos almacenados en la tabla `item_location_index`. Esta es una estructura de sólo índice; la fuente de la verdad permanece en los archivos YAML.

```typescript
interface LocationData {
  item_slug: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  service_area: string | null;
  is_remote: boolean;
  indexed_at: Date;
}
```

## Tipos de estado de API

### `MapProviderStatus`

Información de estado para un único proveedor de mapas, utilizada en la interfaz de usuario del administrador para mostrar el estado configurado/desconfigurado sin exponer las claves API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Respuesta del punto final API `map-status`, informando el estado de configuración para ambos proveedores.

```typescript
interface MapStatusResponse {
  mapbox: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
  google: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
}
```

## Tipos de consultas geográficas

### `GeoBoundingBox`

Cuadro delimitador para consultas geoespaciales, que define una región rectangular en el mapa.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Opciones para consultas de artículos basadas en la ubicación. Admite búsqueda por radio, filtrado de ciudad/país e inclusión remota de elementos.

```typescript
interface LocationQueryOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  city?: string;
  country?: string;
  includeRemote?: boolean;
}
```

### `LocationQueryResult`

Resultado de una consulta de artículo basada en la ubicación, incluido el cálculo de distancia.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Funciones

### `mapLocationConfigToRuntime`

Asigna la configuración de configuración de `snake_case` desde YAML a la configuración de tiempo de ejecución de `camelCase`. Aplica los valores predeterminados para los campos faltantes.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Ejemplo:**

```typescript
import { mapLocationConfigToRuntime } from '@/lib/types/location';

// From config.yml
const yamlConfig = {
  enabled: true,
  provider: 'mapbox' as const,
  default_radius_km: 25,
  default_center: [40.7128, -74.006] as [number, number],
};

const settings = mapLocationConfigToRuntime(yamlConfig);
// Result:
// {
//   enabled: true,
//   provider: 'mapbox',
//   mapStyle: 'streets',           // default applied
//   distanceFilterEnabled: true,   // default applied
//   distanceSortEnabled: true,     // default applied
//   defaultRadiusKm: 25,
//   showExactAddress: false,       // default applied
//   requireLocationOnSubmit: false, // default applied
//   defaultCenter: { latitude: 40.7128, longitude: -74.006 },
// }
```

## Ejemplos de uso

### Consultar artículos por ubicación

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Comprobar el estado del proveedor de mapas

```typescript
import type { MapStatusResponse } from '@/lib/types/location';

async function checkMapStatus(): Promise<MapStatusResponse> {
  const res = await fetch('/api/admin/map-status');
  return res.json();
}

// Usage
const status = await checkMapStatus();
if (status.mapbox.isConfigured) {
  console.log('Mapbox is ready');
}
```

### Uso del cuadro delimitador para consultas de ventana gráfica

```typescript
import type { GeoBoundingBox } from '@/lib/types/location';

function getViewportBounds(
  center: { lat: number; lng: number },
  radiusKm: number
): GeoBoundingBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(center.lat * (Math.PI / 180)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
```

## Notas de diseño

### Configuración versus patrón de tiempo de ejecución

El módulo de ubicación utiliza un sistema de tipo de dos capas:

1. **Tipos de configuración** (`LocationConfigSettings`) use `snake_case` para coincidir con las convenciones de archivos YAML
2. **Tipos de tiempo de ejecución** (`LocationSettings`) usan `camelCase` para TypeScript idiomático
3. La función `mapLocationConfigToRuntime()` une las dos, aplicando valores predeterminados

Este patrón garantiza que los archivos YAML sigan siendo legibles para los humanos mientras el código de la aplicación sigue las convenciones de TypeScript.

### Datos de ubicación solo de índice

`LocationData` se almacena en la tabla de base de datos `item_location_index` para consultas geográficas rápidas, pero la fuente de verdad para las ubicaciones de los elementos permanece en los archivos de contenido YAML. El índice se reconstruye cuando se actualizan los elementos.

### Consideraciones de privacidad

La configuración `showExactAddress` (predeterminada: `false`) controla si se muestran direcciones precisas. Cuando está deshabilitado, solo se muestra a los usuarios información a nivel de ciudad/país.

## Tipos relacionados

- [`ItemLocationData`](./item-types.md): datos de ubicación incrustados en archivos YAML de elementos
- [`ItemListOptions`](./item-types.md): el filtrado de elementos admite los campos `city`, `country` y `includeRemote`.
