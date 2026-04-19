---
id: map-providers
title: Kartenanbieter
sidebar_label: Kartenanbieter
sidebar_position: 34
---

# Kartenanbieter

Die Vorlage implementiert eine Anbieterabstraktionsschicht für interaktive Karten und unterstützt sowohl Google Maps als auch Mapbox GL JS über eine einheitliche Schnittstelle. Dies ermöglicht den Wechsel des Kartenanbieters, ohne den Komponentencode zu ändern.

## Dateistruktur

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

## Anbieterschnittstelle (`IMapProvider`)

Jeder Kartenanbieter implementiert die `IMapProvider`-Schnittstelle, die den Vertrag für Kartenerstellung, Markierungen, Clustering und automatische Adressvervollständigung definiert:

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

### Instanzschnittstellen

Jeder Anbieter verpackt seine nativen Objekte hinter abstrakte Schnittstellen:

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

## Google Maps-Anbieter

Die Klasse `GoogleMapProvider` verwendet `@googlemaps/js-api-loader` für das dynamische Skriptladen und `@googlemaps/markerclusterer` für das Clustering.

### Hauptmerkmale

- Verwendet `AdvancedMarkerElement` für Markierungen (erfordert eine Karten-ID)
- Lädt die Bibliotheken `maps`, `marker` und `places`
- Erfordert `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` und optional `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Das Laden von Skripten erfolgt idempotent mit einem Promise Guard auf Modulebene

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

### Stilzuordnung

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Mapbox-Anbieter

Die Klasse `MapboxMapProvider` importiert `mapbox-gl` dynamisch und verwendet ihr natives, auf GeoJSON-Quellen basierendes Clustering.

### Hauptmerkmale

- Verwendet native Mapbox GL JS-Marker
- Clustering wird mit GeoJSON-Quellen und Kreis-/Symbolebenen implementiert
- Autocomplete wird mit der Mapbox Geocoding API erstellt
- Erfordert `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Das Laden von Skripten erfolgt idempotent mit einem Promise Guard auf Modulebene

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

### Stilzuordnung

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Kerntypen

### Koordinaten und Grenzen

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

### Markierungsdaten

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

### Cluster-Optionen

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Kartenkomponenten-Requisiten

Die Schnittstelle `MapComponentProps` ist der Standard-Props-Vertrag für Map-React-Komponenten:

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

### Standortauswahl

Die Typen `LocationPickerProps` und `LocationPickerValue` unterstützen die Formularkomponente für die Standortauswahl:

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

## Umgebungsvariablen

|Variabel|Anbieter|Beschreibung|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Google Maps-JavaScript-API-Schlüssel (HTTP-Referrer eingeschränkt)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|Karten-ID für erweiterte Markierungen|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Kartenbox|Öffentliches Mapbox-Zugriffstoken (nur (`pk.*`))|

:::Vorsicht Sicherheit
Verwenden Sie nur im Browser verfügbar gemachte API-Schlüssel mit entsprechenden Domäneneinschränkungen. Verwenden Sie niemals Server-/geheime Schlüssel (`sk.*` für Mapbox) im clientseitigen Code.
:::

## Anbieterauswahl

Die Anbieterauswahl erfolgt normalerweise auf Konfigurationsebene basierend auf den vorhandenen API-Schlüsseln:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Verwandte Dateien

- `lib/maps/providers/map-provider.interface.ts` – Provider-Schnittstellenvertrag
- `lib/maps/providers/google-map-provider.ts` – Google Maps-Implementierung
- `lib/maps/providers/mapbox-map-provider.ts` – Mapbox-Implementierung
- `lib/maps/types.ts` – Alle kartenbezogenen TypeScript-Typen
- `lib/types/location.ts` – Standortbezogene freigegebene Typen
