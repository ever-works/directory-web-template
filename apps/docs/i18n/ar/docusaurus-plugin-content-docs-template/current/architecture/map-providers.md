---
id: map-providers
title: مقدمو الخرائط
sidebar_label: مقدمو الخرائط
sidebar_position: 34
---

# مقدمو الخرائط

يطبق القالب طبقة تجريد موفر للخرائط التفاعلية، ويدعم كلاً من خرائط Google وMapbox GL JS من خلال واجهة موحدة. يتيح ذلك تبديل موفري الخرائط دون تغيير رمز المكون.

## هيكل الملف

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

## واجهة الموفر (`IMapProvider`)

يقوم كل موفر خرائط بتنفيذ واجهة `IMapProvider`، والتي تحدد عقد إنشاء الخريطة والعلامات والتجميع والإكمال التلقائي للعناوين:

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

### واجهات المثيل

يقوم كل مزود بتغليف كائناته الأصلية خلف واجهات مجردة:

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

## مزود خرائط جوجل

تستخدم فئة `GoogleMapProvider` `@googlemaps/js-api-loader` لتحميل البرنامج النصي الديناميكي و`@googlemaps/markerclusterer` للتجميع.

### الخصائص الرئيسية

- يستخدم `AdvancedMarkerElement` للعلامات (يتطلب معرف الخريطة)
- يقوم بتحميل المكتبات `maps` و`marker` و`places`
- يتطلب `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` واختياريًا `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- تحميل البرنامج النصي غير فعال مع وجود حارس الوعد على مستوى الوحدة النمطية

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

### رسم الخرائط النمط

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## موفر Mapbox

تقوم فئة `MapboxMapProvider` باستيراد `mapbox-gl` ديناميكيًا وتستخدم مجموعاتها الأصلية المستندة إلى مصدر GeoJSON.

### الخصائص الرئيسية

- يستخدم علامات Mapbox GL JS الأصلية
- يتم تنفيذ التجميع باستخدام مصادر GeoJSON وطبقات الدائرة/الرمز
- تم إنشاء الإكمال التلقائي باستخدام Mapbox Geocoding API
- يتطلب `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- تحميل البرنامج النصي غير فعال مع وجود حارس الوعد على مستوى الوحدة النمطية

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

### رسم الخرائط النمط

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## الأنواع الأساسية

### الإحداثيات والحدود

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

### بيانات العلامة

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

### خيارات الكتلة

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### الدعائم مكون الخريطة

الواجهة `MapComponentProps` هي عقد الدعائم القياسي لمكونات Map React:

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

### منتقي الموقع

يدعم النوعان `LocationPickerProps` و`LocationPickerValue` مكون نموذج منتقي الموقع:

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

## متغيرات البيئة

|متغير|مزود|الوصف|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|جوجل|مفتاح JavaScript API لخرائط Google (مقيد بمُحيل HTTP)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|جوجل|معرف الخريطة للعلامات المتقدمة|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Mapbox|رمز الوصول العام لـ Mapbox (`pk.*` فقط)|

:::الحذر الأمن
استخدم فقط مفاتيح API المكشوفة في المتصفح مع قيود المجال المناسبة. لا تستخدم مطلقًا مفاتيح الخادم/السرية (`sk.*` لـ Mapbox) في التعليمات البرمجية من جانب العميل.
:::

## اختيار المزود

تتم معالجة اختيار الموفر عادةً على مستوى التكوين بناءً على مفاتيح واجهة برمجة التطبيقات الموجودة:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## الملفات ذات الصلة

- `lib/maps/providers/map-provider.interface.ts` - عقد واجهة الموفر
- `lib/maps/providers/google-map-provider.ts` - تنفيذ خرائط جوجل
- `lib/maps/providers/mapbox-map-provider.ts` - تنفيذ Mapbox
- `lib/maps/types.ts` - جميع أنواع TypeScript ذات الصلة بالخريطة
- `lib/types/location.ts` - الأنواع المشتركة المتعلقة بالموقع
