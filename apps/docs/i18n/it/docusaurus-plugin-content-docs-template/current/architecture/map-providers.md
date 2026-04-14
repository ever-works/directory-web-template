---
id: map-providers
title: Fornitori di mappe
sidebar_label: Fornitori di mappe
sidebar_position: 34
---

# Fornitori di mappe

Il modello implementa un livello di astrazione del provider per mappe interattive, supportando sia Google Maps che Mapbox GL JS attraverso un'interfaccia unificata. Ciò consente di cambiare fornitore di mappe senza modificare il codice del componente.

## Struttura dei file

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

## Interfaccia fornitore (`IMapProvider`)

Ogni fornitore di mappe implementa l'interfaccia `IMapProvider`, che definisce il contratto per la creazione della mappa, i marcatori, il clustering e il completamento automatico degli indirizzi:

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

### Interfacce di istanza

Ogni provider racchiude i suoi oggetti nativi dietro interfacce astratte:

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

## Fornitore di Google Maps

La classe `GoogleMapProvider` utilizza `@googlemaps/js-api-loader` per il caricamento dinamico degli script e `@googlemaps/markerclusterer` per il clustering.

### Caratteristiche chiave

- Utilizza `AdvancedMarkerElement` per gli indicatori (richiede un ID mappa)
- Carica le librerie `maps`, `marker` e `places`
- Richiede `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` e facoltativamente `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Il caricamento degli script è idempotente con una protezione delle promesse a livello di modulo

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

### Mappatura degli stili

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Fornitore di Mapbox

La classe `MapboxMapProvider` importa dinamicamente `mapbox-gl` e utilizza il clustering nativo GeoJSON basato sull'origine.

### Caratteristiche chiave

- Utilizza marcatori nativi Mapbox GL JS
- Il clustering è implementato con origini GeoJSON e livelli cerchio/simbolo
- Il completamento automatico è realizzato con l'API Mapbox Geocoding
- Richiede `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Il caricamento degli script è idempotente con una protezione delle promesse a livello di modulo

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

### Mappatura degli stili

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Tipi di nucleo

### Coordinate e limiti

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

### Dati marcatore

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

### Opzioni del cluster

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Oggetti di scena dei componenti della mappa

L'interfaccia `MapComponentProps` è il contratto standard per i componenti React della mappa:

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

### Selettore di posizione

I tipi `LocationPickerProps` e `LocationPickerValue` supportano il componente del modulo di selezione della posizione:

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

## Variabili d'ambiente

|Variabile|Fornitore|Descrizione|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Chiave API JavaScript di Google Maps (referrer HTTP limitato)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|ID mappa per indicatori avanzati|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Mapbox|Token di accesso pubblico Mapbox (`pk.*` solo)|

:::attenzione Sicurezza
Utilizza solo chiavi API esposte nel browser con adeguate restrizioni di dominio. Non utilizzare mai chiavi server/segrete (`sk.*` per Mapbox) nel codice lato client.
:::

## Selezione del fornitore

La selezione del provider viene generalmente gestita a livello di configurazione in base alle chiavi API presenti:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## File correlati

- `lib/maps/providers/map-provider.interface.ts` - Contratto di interfaccia con il fornitore
- `lib/maps/providers/google-map-provider.ts` - Implementazione di Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Implementazione di Mapbox
- `lib/maps/types.ts` - Tutti i tipi TypeScript correlati alla mappa
- `lib/types/location.ts` - Tipi condivisi correlati alla posizione
