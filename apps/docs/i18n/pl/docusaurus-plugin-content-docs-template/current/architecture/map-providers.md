---
id: map-providers
title: Dostawcy map
sidebar_label: Dostawcy map
sidebar_position: 34
---

# Dostawcy map

Szablon implementuje warstwę abstrakcji dostawcy dla interaktywnych map, obsługującą zarówno Mapy Google, jak i Mapbox GL JS poprzez ujednolicony interfejs. Umożliwia to zmianę dostawców map bez zmiany kodu komponentu.

## Struktura pliku

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

## Interfejs dostawcy (`IMapProvider`)

Każdy dostawca map wdraża interfejs `IMapProvider`, który definiuje kontrakt na tworzenie map, znaczniki, grupowanie i autouzupełnianie adresów:

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

### Interfejsy instancji

Każdy dostawca otacza swoje natywne obiekty abstrakcyjnymi interfejsami:

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

## Dostawca Map Google

Klasa `GoogleMapProvider` używa `@googlemaps/js-api-loader` do dynamicznego ładowania skryptów i `@googlemaps/markerclusterer` do klastrowania.

### Kluczowa charakterystyka

- Używa `AdvancedMarkerElement` jako znaczników (wymaga identyfikatora mapy)
- Ładuje biblioteki `maps`, `marker` i `places`
- Wymaga `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` i opcjonalnie `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Ładowanie skryptu jest idempotentne w przypadku zabezpieczenia obietnicy na poziomie modułu

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

### Mapowanie stylu

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Dostawca Mapboxa

Klasa `MapboxMapProvider` dynamicznie importuje `mapbox-gl` i korzysta z natywnego klastrowania opartego na źródłach GeoJSON.

### Kluczowa charakterystyka

- Wykorzystuje natywne znaczniki Mapbox GL JS
- Klastrowanie jest realizowane za pomocą źródeł GeoJSON i warstw okręgów/symbolów
- Autouzupełnianie jest zbudowane przy użyciu interfejsu API Geokodowania Mapbox
- Wymaga `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Ładowanie skryptu jest idempotentne w przypadku zabezpieczenia obietnicy na poziomie modułu

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

### Mapowanie stylu

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Typy rdzeni

### Współrzędne i granice

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

### Dane znacznika

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

### Opcje klastra

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Rekwizyty komponentów mapy

Interfejs `MapComponentProps` to standardowy kontrakt na rekwizyty dla komponentów React mapy:

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

### Wybór lokalizacji

Typy `LocationPickerProps` i `LocationPickerValue` obsługują komponent formularza wyboru lokalizacji:

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

## Zmienne środowiskowe

|Zmienna|Dostawca|Opis|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Klucz API JavaScript Map Google (ograniczone strony odsyłające HTTP)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|Identyfikator mapy dla zaawansowanych znaczników|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Mapbox|Token dostępu publicznego Mapbox (`pk.*`)|

:::uwaga Bezpieczeństwo
Używaj wyłącznie kluczy API dostępnych w przeglądarce z odpowiednimi ograniczeniami domeny. Nigdy nie używaj kluczy serwera/tajnych (`sk.*` dla Mapbox) w kodzie po stronie klienta.
:::

## Wybór dostawcy

Wybór dostawcy jest zwykle dokonywany na poziomie konfiguracji w oparciu o obecne klucze API:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Powiązane pliki

- `lib/maps/providers/map-provider.interface.ts` - Umowa dotycząca interfejsu dostawcy
- `lib/maps/providers/google-map-provider.ts` - Implementacja Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Implementacja Mapboxa
- `lib/maps/types.ts` - Wszystkie typy TypeScriptu związane z mapami
- `lib/types/location.ts` — Typy współdzielone związane z lokalizacją
