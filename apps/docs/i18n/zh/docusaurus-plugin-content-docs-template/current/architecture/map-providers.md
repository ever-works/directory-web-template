---
id: map-providers
title: 地图提供商
sidebar_label: 地图提供商
sidebar_position: 34
---

# 地图提供商

该模板实现了交互式地图的提供者抽象层，通过统一的接口支持 Google Maps 和 Mapbox GL JS。这允许在不更改组件代码的情况下切换地图提供者。

## 文件结构

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

## 提供商接口 (`IMapProvider`)

每个地图提供者都实现 `IMapProvider` 接口，该接口定义了地图创建、标记、聚类和地址自动完成的契约：

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

### 实例接口

每个提供者都将其本机对象包装在抽象接口后面：

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

## 谷歌地图提供商

`GoogleMapProvider` 类使用`@googlemaps/js-api-loader` 进行动态脚本加载，并使用`@googlemaps/markerclusterer` 进行集群。

### 主要特点

- 使用 `AdvancedMarkerElement` 作为标记（需要地图 ID）
- 加载 `maps`、`marker` 和 `places` 库
- 需要 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 和可选 `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- 脚本加载具有模块级 Promise Guard 的幂等性

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

### 风格映射

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## Mapbox 提供商

`MapboxMapProvider` 类动态导入 `mapbox-gl` 并使用其本机 GeoJSON 基于源的集群。

### 主要特点

- 使用原生 Mapbox GL JS 标记
- 聚类是通过 GeoJSON 源和圆形/符号层实现的
- 自动完成功能是使用 Mapbox 地理编码 API 构建的
- 需要`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- 脚本加载具有模块级 Promise Guard 的幂等性

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

### 风格映射

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## 核心类型

### 坐标和边界

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

### 标记数据

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

### 集群选项

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### 地图组件道具

`MapComponentProps` 接口是 Map React 组件的标准 props 契约：

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

### 位置选择器

`LocationPickerProps` 和 `LocationPickerValue` 类型支持位置选择器表单组件：

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

## 环境变量

|变量|提供者|描述|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|谷歌|Google 地图 JavaScript API 密钥（HTTP 引用受限）|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|谷歌|高级标记的地图 ID|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|地图盒|Mapbox 公共访问令牌（仅限`pk.*`）|

:::注意安全
仅使用具有适当域限制的浏览器公开的 API 密钥。切勿在客户端代码中使用服务器/密钥（对于 Mapbox，`sk.*`）。
:::

## 供应商选择

提供商选择通常在配置级别根据存在的 API 密钥进行处理：

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## 相关文件

- `lib/maps/providers/map-provider.interface.ts` - 提供商接口合约
- `lib/maps/providers/google-map-provider.ts` - Google 地图实施
- `lib/maps/providers/mapbox-map-provider.ts` - Mapbox 实现
- `lib/maps/types.ts` - 所有与地图相关的 TypeScript 类型
- `lib/types/location.ts` - 位置相关共享类型
