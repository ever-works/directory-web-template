---
id: map-providers
title: Поставщики карт
sidebar_label: Поставщики карт
sidebar_position: 34
---

# Поставщики карт

Шаблон реализует уровень абстракции поставщика для интерактивных карт, поддерживая как Google Maps, так и Mapbox GL JS через единый интерфейс. Это позволяет переключать поставщиков карт без изменения кода компонента.

## Структура файла

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

## Интерфейс провайдера (`IMapProvider`)

Каждый поставщик карт реализует интерфейс `IMapProvider`, который определяет контракт для создания карты, маркеров, кластеризации и автозаполнения адресов:

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

### Интерфейсы экземпляров

Каждый провайдер оборачивает свои собственные объекты абстрактными интерфейсами:

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

## Поставщик карт Google

Класс `GoogleMapProvider` использует `@googlemaps/js-api-loader` для динамической загрузки скриптов и `@googlemaps/markerclusterer` для кластеризации.

### Ключевые характеристики

- Использует `AdvancedMarkerElement` для маркеров (требуется идентификатор карты)
- Загружает библиотеки `maps`, `marker` и `places`.
- Требуется `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` и дополнительно `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- Загрузка скрипта идемпотентна с защитой обещаний на уровне модуля.

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

### Сопоставление стилей

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Поставщик мапбоксов

Класс `MapboxMapProvider` динамически импортирует `mapbox-gl` и использует собственную кластеризацию на основе исходного кода GeoJSON.

### Ключевые характеристики

- Использует собственные маркеры Mapbox GL JS.
- Кластеризация реализована с использованием источников GeoJSON и слоев кругов/символов.
- Автозаполнение построено с помощью API геокодирования Mapbox.
- Требуется `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- Загрузка скрипта идемпотентна с защитой обещаний на уровне модуля.

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

### Сопоставление стилей

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## Основные типы

### Координаты и границы

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

### Данные маркера

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

### Параметры кластера

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### Реквизиты компонентов карты

Интерфейс `MapComponentProps` — это стандартный контракт реквизитов для компонентов карты React:

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

### Выбор местоположения

Типы `LocationPickerProps` и `LocationPickerValue` поддерживают компонент формы выбора местоположения:

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

## Переменные среды

|Переменная|Поставщик|Описание|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|Гугл|Ключ Google Maps JavaScript API (с ограничениями для HTTP-реферера)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|Гугл|Идентификатор карты для расширенных маркеров|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Картбокс|Токен публичного доступа Mapbox только (`pk.*`)|

:::Внимание Безопасность
Используйте только открытые в браузере ключи API с соответствующими ограничениями домена. Никогда не используйте серверные/секретные ключи (`sk.*` для Mapbox) в коде на стороне клиента.
:::

## Выбор поставщика

Выбор поставщика обычно осуществляется на уровне конфигурации в зависимости от наличия ключей API:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## Связанные файлы

- `lib/maps/providers/map-provider.interface.ts` - Контракт интерфейса провайдера
- `lib/maps/providers/google-map-provider.ts` - реализация Google Maps
- `lib/maps/providers/mapbox-map-provider.ts` - реализация Mapbox
- `lib/maps/types.ts` — все типы TypeScript, связанные с картами.
- `lib/types/location.ts` — общие типы, связанные с местоположением.
