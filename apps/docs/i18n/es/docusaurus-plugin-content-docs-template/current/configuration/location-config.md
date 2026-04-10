---
id: location-config
title: "Referencia de Configuración de Ubicación"
sidebar_label: "Ubicación"
sidebar_position: 13
---

# Referencia de Configuración de Ubicación

Esta página documenta cada configuración de ubicación y mapa disponible en la plantilla. La configuración fluye desde el repositorio de contenido YAML a través del `SettingsProvider` hacia los componentes React.

## Fuente de Configuración

Las configuraciones de ubicación se definen en la sección `settings.location` del archivo `config.yml` del repositorio de contenido:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' or 'google'
    map_style: streets        # 'streets' or 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [latitude, longitude]
```

## Tipos de Configuración

### LocationConfigSettings (YAML / snake_case)

La estructura bruta leída de `config.yml`, definida en `lib/types/location.ts`:

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
  default_center?: [number, number];   // [latitude, longitude]
}
```

### LocationSettings (Runtime / camelCase)

La estructura de tiempo de ejecución utilizada en toda la aplicación:

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
  defaultCenter: { latitude: number; longitude: number };
}
```

La función `mapLocationConfigToRuntime()` convierte las configuraciones YAML en snake_case al formato de tiempo de ejecución camelCase.

### Descripciones de Configuración

| Configuración | Tipo | Predeterminado | Descripción |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Interruptor principal para todas las funciones de ubicación |
| `provider` | `MapProvider` | `'mapbox'` | Proveedor de teselas de mapa y geocodificación |
| `mapStyle` | `MapStyle` | `'streets'` | Estilo de renderización del mapa |
| `distanceFilterEnabled` | `boolean` | `true` | Mostrar filtro de radio de distancia en la búsqueda |
| `distanceSortEnabled` | `boolean` | `true` | Permitir ordenar resultados por distancia |
| `defaultRadiusKm` | `number` | `50` | Radio de búsqueda predeterminado en kilómetros |
| `showExactAddress` | `boolean` | `false` | Mostrar direcciones completas públicamente |
| `requireLocationOnSubmit` | `boolean` | `false` | Requerir ubicación al enviar |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Coordenadas del centro del mapa de respaldo |

## Proveedores de Mapa

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Proveedor | Variable de Entorno | Características |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Teselas vectoriales, geocodificación, clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Teselas, API de Places, geocodificación |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

Estado de la clave de API para la interfaz de administración.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Respuesta del endpoint `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Sistema de Coordenadas

### `Coordinates`

El tipo de punto geográfico estándar utilizado en todos los componentes de mapa.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Caja delimitadora para cálculos de viewport.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Caja delimitadora alternativa para consultas de base de datos.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Datos de Ubicación

### `LocationData`

Ubicación del elemento almacenada en la tabla de base de datos `item_location_index`.

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

### `LocationQueryOptions`

Parámetros para búsquedas de elementos basadas en proximidad.

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

Resultado de una búsqueda basada en ubicación.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Configuración del Componente de Mapa

### `MapComponentProps`

Props para el componente principal `Map`.

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                    // 1-20
  style?: MapStyle;
  className?: string;
  height?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}
```

### `ClusterOptions`

Configuración de agrupación de marcadores.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Alternar controles de interfaz del mapa.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Preferencias de Ubicación del Usuario

Los usuarios pueden establecer preferencias de ubicación predeterminadas en su perfil de cliente (almacenado en la tabla `client_profiles`):

| Columna | Tipo | Descripción |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | Latitud predeterminada del usuario |
| `default_longitude` | `doublePrecision` | Longitud predeterminada del usuario |
| `default_city` | `text` | Ciudad predeterminada del usuario |
| `default_country` | `text` | País predeterminado del usuario |
| `location_privacy` | `text` | `'private'` (predeterminado) o `'public'` |

## Variables de Entorno

| Variable de Entorno | Requerida | Descripción |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Para Mapbox | Token de acceso Mapbox GL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Para Google | Clave de API de Google Maps |

## Páginas Relacionadas

- [Tipos de Ubicación](../types/location-types.md) -- definiciones completas de tipos para funciones de ubicación
- [Configuración de Mapa](./map-config.md) -- configuración adicional de la interfaz de mapa
- [Configuración de Funcionalidades](./feature-config.md) -- configuraciones de indicadores de funcionalidades
