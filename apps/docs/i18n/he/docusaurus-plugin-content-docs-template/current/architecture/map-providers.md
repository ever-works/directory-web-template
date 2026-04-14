---
id: map-providers
title: ספקי מפות
sidebar_label: ספקי מפות
sidebar_position: 34
---

# ספקי מפות

התבנית מיישמת שכבת הפשטה של ספק עבור מפות אינטראקטיביות, התומכת גם ב-Google Maps וגם ב-Mapbox GL JS באמצעות ממשק אחיד. זה מאפשר להחליף ספקי מפות מבלי לשנות את קוד הרכיב.

## מבנה הקובץ

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

## ממשק ספק (`IMapProvider`)

כל ספק מפות מיישם את הממשק `IMapProvider`, המגדיר את החוזה ליצירת מפה, סמנים, אשכולות והשלמה אוטומטית של כתובות:

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

### ממשקי מופע

כל ספק עוטף את האובייקטים המקוריים שלו מאחורי ממשקים מופשטים:

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

## ספק מפות גוגל

הכיתה `GoogleMapProvider` משתמשת ב-`@googlemaps/js-api-loader` לטעינת סקריפט דינמית וב-`@googlemaps/markerclusterer` לאשכולות.

### מאפיינים מרכזיים

- משתמש ב-`AdvancedMarkerElement` לסמנים (דורש מזהה מפה)
- טוען את הספריות `maps`, `marker`, ו-`places`
- דורש `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ובאופן אופציונלי `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- טעינת הסקריפט היא אימפוטנטית עם מגן הבטחה ברמת המודול

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

### מיפוי סגנון

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite' ? 'satellite' : 'roadmap';
}
```

## ספק Mapbox

המחלקה `MapboxMapProvider` מייבאת באופן דינמי את `mapbox-gl` ומשתמשת באשכולות מבוססת מקור GeoJSON המקורית שלה.

### מאפיינים מרכזיים

- משתמש בסמני Mapbox GL JS מקוריים
- Clustering מיושם עם מקורות GeoJSON ושכבות עיגול/סמל
- השלמה אוטומטית בנויה עם ה-API של Mapbox Geocoding
- דורש `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- טעינת הסקריפט היא אימפוטנטית עם מגן הבטחה ברמת המודול

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

### מיפוי סגנון

```ts
getStyleUrl(style: MapStyle): string {
  return style === 'satellite'
    ? 'mapbox://styles/mapbox/satellite-streets-v12'
    : 'mapbox://styles/mapbox/streets-v12';
}
```

## סוגי ליבה

### קואורדינטות וגבולות

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

### נתוני סמן

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

### אפשרויות אשכול

```ts
interface ClusterOptions {
  radius?: number;     // Cluster radius in pixels (default: 60)
  maxZoom?: number;    // Maximum zoom for clustering (default: 16)
  minZoom?: number;    // Minimum zoom for clustering (default: 0)
  minPoints?: number;  // Minimum points per cluster (default: 2)
}
```

### אבזרי רכיב מפה

הממשק `MapComponentProps` הוא חוזה האביזרים הסטנדרטי עבור רכיבי React של המפה:

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

### בוחר מיקום

הסוגים `LocationPickerProps` ו-`LocationPickerValue` תומכים ברכיב טופס בוחר המיקום:

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

## משתני סביבה

|משתנה|ספק|תיאור|
|----------|----------|-------------|
|`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`|גוגל|מפתח API של JavaScript של מפות Google (מוגבל ל-HTTP מפנה)|
|`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`|גוגל|מזהה מפה עבור סמנים מתקדמים|
|`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`|Mapbox|אסימון גישה ציבורי של Mapbox (`pk.*` בלבד)|

:::זהירות אבטחה
השתמש רק במפתחות API חשופים לדפדפן עם הגבלות תחום מתאימות. לעולם אל תשתמש במפתחות שרת/סודיים (`sk.*` עבור Mapbox) בקוד בצד הלקוח.
:::

## בחירת ספק

בחירת הספק מטופלת בדרך כלל ברמת התצורה בהתבסס על מפתחות ה-API:

```ts
interface MapProviderConfig {
  provider: MapProvider;    // 'mapbox' | 'google'
  accessToken?: string;
  mapId?: string;
}
```

## קבצים קשורים

- `lib/maps/providers/map-provider.interface.ts` - חוזה ממשק ספק
- `lib/maps/providers/google-map-provider.ts` - הטמעת מפות Google
- `lib/maps/providers/mapbox-map-provider.ts` - יישום Mapbox
- `lib/maps/types.ts` - כל סוגי TypeScript הקשורים למפה
- `lib/types/location.ts` - סוגים משותפים הקשורים למיקום
