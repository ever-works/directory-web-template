---
id: map-providers
title: Доставчици на карти
sidebar_label: Доставчици на карти
sidebar_position: 34
---

# Доставчици на карти

Шаблонът имплементира слой за абстракция на доставчика за интерактивни карти, като поддържа както Google Maps, така и Mapbox GL JS чрез унифициран интерфейс. Това позволява превключване на доставчици на карта без промяна на кода на компонента.

## Файлова структура

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

## Интерфейс на доставчика (`IMapProvider`)

Всеки доставчик на карти внедрява интерфейса `IMapProvider`, който определя договора за създаване на карта, маркери, групиране и автоматично попълване на адреси:

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

### Интерфейси на екземпляри

Всеки доставчик обвива собствените си обекти зад абстрактни интерфейси:

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

## Доставчик на Google Карти

Класът `GoogleMapProvider` използва `@googlemaps/js-api-loader` за динамично зареждане на скрипт и `@googlemaps/markerclusterer` за клъстериране.

### Ключови характеристики

- Използва `AdvancedMarkerElement` за маркери (изисква идентификатор на карта)
- Зарежда библиотеките `maps`, `marker` и `places`
- Изисква `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` и по избор `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Зареждането на скрипт е идемпотентно с обещание на ниво модул

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

### Стилово картографиране

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Доставчик на Mapbox

Класът `MapboxMapProvider` динамично импортира `mapbox-gl` и използва собственото си клъстериране, базирано на източник GeoJSON.

### Ключови характеристики

- Използва нативни Mapbox GL JS маркери
- Клъстерирането е реализирано с източници на GeoJSON и кръгови/символни слоеве
- Автоматичното довършване е изградено с Mapbox Geocoding API
- Изисква `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Зареждането на скрипт е идемпотентно с обещание на ниво модул

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

### Стилово картографиране

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Типове ядра

### Координати и граници

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

### Маркерни данни

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

### Опции на клъстера

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Реквизити за компонент на картата

Интерфейсът `MapComponentProps` е стандартният договор за подпори за компонентите на map React:

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

### Location Picker

Типовете `LocationPickerProps` и `LocationPickerValue` поддържат компонента на формуляра за избор на местоположение:

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

## Променливи на средата

|Променлива|Доставчик|Описание|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Google|Google Maps JavaScript API ключ (ограничен за HTTP референт)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Google|ID на картата за разширени маркери|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Mapbox|Токен за публичен достъп на Mapbox (само за `pk.*`)|

:::caution Security
Използвайте само открити в браузъра API ключове с подходящи ограничения на домейна. Никога не използвайте сървърни/секретни ключове (`sk.*` за Mapbox) в кода от страна на клиента.
:::

## Provider Selection

Изборът на доставчик обикновено се обработва на ниво конфигурация въз основа на това кои API ключове присъстват:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Свързани файлове

- `lib/maps/providers/map-provider.interface.ts` - Договор за интерфейс на доставчика
- `lib/maps/providers/google-map-provider.ts` - внедряване на Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - Реализация на Mapbox
- `lib/maps/types.ts` - Всички типове TypeScript, свързани с картата
- `lib/types/location.ts` - Споделени типове, свързани с местоположението
