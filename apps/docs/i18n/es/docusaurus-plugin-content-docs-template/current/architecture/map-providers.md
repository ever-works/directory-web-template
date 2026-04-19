---
id: map-providers
title: Proveedores de mapas
sidebar_label: Proveedores de mapas
sidebar_position: 34
---

# Proveedores de mapas

La plantilla implementa una capa de abstracción de proveedor para mapas interactivos, compatible con Google Maps y Mapbox GL JS a través de una interfaz unificada. Esto permite cambiar de proveedor de mapas sin cambiar el código de componente.

## Estructura de archivos

```
lib/maps/
  index.ts                              # Re-exports types and providers
  types.ts                              # All map-related TypeScript types
  providers/
    index.ts                            # Re-exports provider interface and implementations
    map-provider.interface.ts           # IMapProvider contract and related interfaces
    google-map-provider.ts              # Google Maps implementation
    mapbox-map-provider.ts              # Mapbox GL JS implementation
```

## Interfaz del proveedor (`IMapProvider`)

Cada proveedor de mapas implementa la interfaz `IMapProvider`, que define el contrato para la creación de mapas, marcadores, agrupación y autocompletado de direcciones:

```ts
export interface IMapProvider {
  readonly name: 'mapbox' | 'google';

  isLoaded(): boolean;
  loadScript(): Promise<void>;
  createMap(container: HTMLElement, options: MapCreateOptions): Promise<IMapInstance>;
  createMarker(map: IMapInstance, options: MarkerCreateOptions): IMarkerInstance;
  createClusterer(
    map: IMapInstance,
    options: ClusterOptions,
    onClusterClick?: (cluster: ClusterClickData) => void
  ): IClustererInstance;
  createAutocomplete(
    input: HTMLInputElement,
    onSelect: (suggestion: AddressSuggestion) => void
  ): IAutocompleteInstance;
  getStyleUrl(style: MapStyle): string;
  isConfigured(): boolean;
}
```

### Interfaces de instancia

Cada proveedor envuelve sus objetos nativos detrás de interfaces abstractas:

```ts
// Map instance - wraps google.maps.Map or mapboxgl.Map
interface IMapInstance {
  setCenter(coordinates: Coordinates): void;
  setZoom(zoom: number): void;
  getCenter(): Coordinates;
  getZoom(): number;
  getBounds(): MapBounds | null;
  fitBounds(bounds: MapBounds, padding?: number): void;
  resize(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler?: (...args: unknown[]) => void): void;
  destroy(): void;
}

// Marker instance
interface IMarkerInstance {
  setPosition(coordinates: Coordinates): void;
  setDraggable(draggable: boolean): void;
  getPosition(): Coordinates;
  show(): void;
  hide(): void;
  remove(): void;
  onClick(handler: () => void): void;
  onDragEnd(handler: (coordinates: Coordinates) => void): void;
}

// Clusterer instance
interface IClustererInstance {
  addMarkers(markers: MapMarkerData[]): void;
  removeMarkers(markerIds: string[]): void;
  clearMarkers(): void;
  refresh(): void;
  destroy(): void;
}

// Autocomplete instance
interface IAutocompleteInstance {
  clear(): void;
  destroy(): void;
}
```

## Proveedor de mapas de Google

La clase `GoogleMapProvider` utiliza `@googlemaps/js-api-loader` para la carga dinámica de scripts y `@googlemaps/markerclusterer` para la agrupación en clústeres.

### Características clave

- Utiliza `AdvancedMarkerElement` para marcadores (requiere una ID de mapa)
- Carga las bibliotecas `maps`, `marker` y `places`.
- Requiere `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` y opcionalmente `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- La carga de scripts es idempotente con una protección de promesa a nivel de módulo

```ts
import { GoogleMapProvider } from '@/lib/maps';

const provider = new GoogleMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 40.7128, longitude: -74.006 },
    zoom: 12,
    style: 'streets',
    controls: { showZoomControls: true },
  });

  const marker = provider.createMarker(map, {
    data: {
      id: '1',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      title: 'New York',
      slug: 'new-york',
    },
  });
}
```

### Mapeo de estilos

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Proveedor de Mapbox

La clase `MapboxMapProvider` importa dinámicamente `mapbox-gl` y utiliza su agrupación nativa basada en fuentes GeoJSON.

### Características clave

- Utiliza marcadores nativos Mapbox GL JS
- La agrupación en clústeres se implementa con fuentes GeoJSON y capas de círculos/símbolos.
- Autocompletar está construido con la API de codificación geográfica de Mapbox
- Requiere `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- La carga de scripts es idempotente con una protección de promesa a nivel de módulo

```ts
import { MapboxMapProvider } from '@/lib/maps';

const provider = new MapboxMapProvider();

if (provider.isConfigured()) {
  await provider.loadScript();
  const map = await provider.createMap(containerElement, {
    center: { latitude: 51.5074, longitude: -0.1278 },
    zoom: 10,
    style: 'streets',
    controls: {
      showZoomControls: true,
      showFullscreenControl: true,
      showScaleControl: true,
    },
  });
}
```

### Mapeo de estilos

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Tipos de núcleos

### Coordenadas y límites

```ts
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### Datos del marcador

```ts
interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  icon?: string;
  category?: string;
  slug: string;
  description?: string;
}
```

### Opciones de clúster

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Accesorios de componentes del mapa

La interfaz `MapComponentProps` es el contrato de accesorios estándar para los componentes de React del mapa:

```ts
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;
  style?: MapStyle;
  className?: string;
  height?: string | number;
  width?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string | null;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onClusterClick?: (cluster: MapClusterData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}
```

### Selector de ubicación

Los tipos `LocationPickerProps` y `LocationPickerValue` admiten el componente de formulario del selector de ubicación:

```ts
interface LocationPickerValue {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## Variables de entorno

|variable|Proveedor|Descripción|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|google|Clave API de JavaScript de Google Maps (referencia HTTP restringida)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|google|ID de mapa para marcadores avanzados|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|cuadro de mapa|Token de acceso público de Mapbox (`pk.*` únicamente)|

:::precaución Seguridad
Utilice únicamente claves API expuestas en el navegador con las restricciones de dominio adecuadas. Nunca use claves secretas/de servidor (`sk.*` para Mapbox) en el código del lado del cliente.
:::

## Selección de proveedor

La selección de proveedores generalmente se maneja en el nivel de configuración según las claves API presentes:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Archivos relacionados

- `lib/maps/providers/map-provider.interface.ts` - Contrato de interfaz de proveedor
- `lib/maps/providers/google-map-provider.ts` - Implementación de Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Implementación de Mapbox
- `lib/maps/types.ts` - Todos los tipos de TypeScript relacionados con mapas
- `lib/types/location.ts` - Tipos compartidos relacionados con la ubicación
