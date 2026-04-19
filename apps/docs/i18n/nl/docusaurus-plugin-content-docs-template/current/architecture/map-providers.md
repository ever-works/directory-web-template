---
id: map-providers
title: Kaartaanbieders
sidebar_label: Kaartaanbieders
sidebar_position: 34
---

# Kaartaanbieders

De sjabloon implementeert een providerabstractielaag voor interactieve kaarten, die zowel Google Maps als Mapbox GL JS ondersteunt via een uniforme interface. Hierdoor kunt u van kaartaanbieder wisselen zonder de componentcode te wijzigen.

## Bestandsstructuur

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

## Providerinterface (`IMapProvider`)

Elke kaartaanbieder implementeert de `IMapProvider`-interface, die het contract definieert voor het maken van kaarten, markeringen, clustering en automatisch aanvullen van adressen:

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

### Instantie-interfaces

Elke provider verpakt zijn eigen objecten achter abstracte interfaces:

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

## Google Maps-aanbieder

De klasse `GoogleMapProvider` gebruikt de `@googlemaps/js-api-loader` voor het dynamisch laden van scripts en `@googlemaps/markerclusterer` voor clustering.

### Belangrijkste kenmerken

- Gebruikt `AdvancedMarkerElement` voor markeringen (vereist een kaart-ID)
- Laadt de bibliotheken `maps`, `marker` en `places`
- Vereist `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en optioneel `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Het laden van scripts is idempotent met een beloftebewaking op moduleniveau

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

### Stijl in kaart brengen

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Mapbox-provider

De klasse `MapboxMapProvider` importeert dynamisch `mapbox-gl` en gebruikt de eigen GeoJSON-brongebaseerde clustering.

### Belangrijkste kenmerken

- Maakt gebruik van native Mapbox GL JS-markeringen
- Clustering wordt geïmplementeerd met GeoJSON-bronnen en cirkel-/symboollagen
- Autocomplete is gebouwd met de Mapbox Geocoding API
- Vereist `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Het laden van scripts is idempotent met een beloftebewaking op moduleniveau

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

### Stijl in kaart brengen

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Kerntypen

### Coördinaten en grenzen

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

### Markeringsgegevens

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

### Clusteropties

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Kaartcomponent rekwisieten

De `MapComponentProps`-interface is het standaard rekwisietencontract voor kaart React-componenten:

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

### Locatiekiezer

De typen `LocationPickerProps` en `LocationPickerValue` ondersteunen de formuliercomponent Locatiekiezer:

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

## Omgevingsvariabelen

|Variabel|Aanbieder|Beschrijving|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Googlen|Google Maps JavaScript API-sleutel (HTTP-referrer beperkt)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Googlen|Kaart-ID voor geavanceerde markeringen|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Kaartbox|Mapbox openbaar toegangstoken (`pk.*`)|

:::let op Beveiliging
Gebruik alleen browser-blootgestelde API-sleutels met de juiste domeinbeperkingen. Gebruik nooit server-/geheime sleutels (`sk.*` voor Mapbox) in code aan de clientzijde.
:::

## Selectie van aanbieders

Providerselectie wordt doorgaans afgehandeld op configuratieniveau op basis van welke API-sleutels aanwezig zijn:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Gerelateerde bestanden

- `lib/maps/providers/map-provider.interface.ts` - Providerinterfacecontract
- `lib/maps/providers/google-map-provider.ts` - Implementatie van Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Mapbox-implementatie
- `lib/maps/types.ts` - Alle kaartgerelateerde TypeScript-typen
- `lib/types/location.ts` - Locatiegerelateerde gedeelde typen
