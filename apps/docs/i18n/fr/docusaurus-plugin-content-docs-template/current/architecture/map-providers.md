---
id: map-providers
title: Fournisseurs de cartes
sidebar_label: Fournisseurs de cartes
sidebar_position: 34
---

# Fournisseurs de cartes

Le modèle implémente une couche d'abstraction de fournisseur pour les cartes interactives, prenant en charge à la fois Google Maps et Mapbox GL JS via une interface unifiée. Cela permet de changer de fournisseur de carte sans changer le code du composant.

## Structure du fichier

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

## Interface du fournisseur (`IMapProvider`)

Chaque fournisseur de cartes implémente l'interface `IMapProvider`, qui définit le contrat pour la création de cartes, les marqueurs, le regroupement et la saisie semi-automatique des adresses :

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

### Interfaces d'instances

Chaque fournisseur enveloppe ses objets natifs derrière des interfaces abstraites :

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

## Fournisseur Google Maps

La classe `GoogleMapProvider` utilise `@googlemaps/js-api-loader` pour le chargement de script dynamique et `@googlemaps/markerclusterer` pour le clustering.

### Caractéristiques clés

- Utilise `AdvancedMarkerElement` pour les marqueurs (nécessite un ID de carte)
- Charge les bibliothèques `maps`, `marker` et `places`
- Nécessite `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` et éventuellement `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Le chargement du script est idempotent avec un garde de promesse au niveau du module

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

### Mappage de styles

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Fournisseur Mapbox

La classe `MapboxMapProvider` importe dynamiquement `mapbox-gl` et utilise son clustering natif basé sur la source GeoJSON.

### Caractéristiques clés

- Utilise les marqueurs natifs Mapbox GL JS
- Le clustering est implémenté avec des sources GeoJSON et des couches de cercles/symboles
- La saisie semi-automatique est construite avec l'API Mapbox Geocoding
- Nécessite `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Le chargement du script est idempotent avec un garde de promesse au niveau du module

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

### Mappage de styles

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Types de base

### Coordonnées et limites

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

### Données de marqueur

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

### Options de cluster

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Accessoires de composant de carte

L'interface `MapComponentProps` est le contrat d'accessoires standard pour les composants map React :

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

### Sélecteur d'emplacement

Les types `LocationPickerProps` et `LocationPickerValue` prennent en charge le composant de formulaire de sélection d'emplacement :

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

## Variables d'environnement

|Variable|Fournisseur|Descriptif|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Clé API JavaScript de Google Maps (référence HTTP restreinte)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|ID de carte pour les marqueurs avancés|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Boîte à cartes|Jeton d'accès public Mapbox (`pk.*` uniquement)|

:::Attention Sécurité
Utilisez uniquement des clés API exposées au navigateur avec des restrictions de domaine appropriées. N'utilisez jamais de clés serveur/secrètes (`sk.*` pour Mapbox) dans le code côté client.
:::

## Sélection du fournisseur

La sélection du fournisseur est généralement gérée au niveau de la configuration en fonction des clés API présentes :

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Fichiers associés

- `lib/maps/providers/map-provider.interface.ts` - Contrat interface fournisseur
- `lib/maps/providers/google-map-provider.ts` - Implémentation de Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Implémentation de Mapbox
- `lib/maps/types.ts` - Tous les types TypeScript liés à la carte
- `lib/types/location.ts` - Types partagés liés à l'emplacement
