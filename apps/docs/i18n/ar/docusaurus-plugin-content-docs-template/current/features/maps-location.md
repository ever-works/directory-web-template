---
id: maps-location
title: الخرائط وميزات الموقع
sidebar_label: الخرائط والموقع
sidebar_position: 6
---

# الخرائط وميزات الموقع

يدعم قالب Ever Works الخرائط التفاعلية مع طبقة تجريد الموفر لكل من **خرائط Google** و**Mapbox**. يتضمن النظام الترميز الجغرافي واختيار الموقع وتجميع العلامات وتحديد الموقع الجغرافي.

## بنيان

```mermaid
flowchart TD
    A["React Components\nMapComponent | LocationPicker | MapItemPopup"] --> B["Map Provider Abstraction\nGoogle Maps | Mapbox"]
    B --> C["Hooks Layer\nuseMapProvider | useMapCoordinates | useGeolocation"]
```

تقوم الوحدة `lib/maps/` بإعادة تصدير جميع الأنواع والموفرين:

```typescript
// lib/maps/index.ts
export * from './types';
export * from './providers';
```

## الأنواع الأساسية

### الإحداثيات

```typescript
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

### علامات

```typescript
interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  icon?: string;
  category?: string;
  slug: string;              // Item slug for linking
  description?: string;
}

interface MapMarkerWithDistance extends MapMarkerData {
  distanceKm?: number;       // Distance from reference point
}
```

### التجميع

```typescript
interface MapClusterData {
  id: string;
  coordinates: Coordinates;
  count: number;
  markerIds: string[];
  expansionZoom: number;
}

interface ClusterOptions {
  radius?: number;           // Cluster radius in pixels (default: 60)
  maxZoom?: number;          // Max zoom for clustering (default: 16)
  minZoom?: number;          // Min zoom for clustering (default: 0)
  minPoints?: number;        // Min points per cluster (default: 2)
}
```

### منفذ العرض

```typescript
interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: MapBounds;
}
```

## دعائم مكون الخريطة

يقبل مكون الخريطة الرئيسي مجموعة شاملة من الدعائم:

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                  // 1-20
  style?: MapStyle;               // 'streets' | 'satellite'
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

### عناصر التحكم في الخريطة

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## مكون منتقي الموقع

مكون نموذج لتحديد المواقع من خلال الإكمال التلقائي للعنوان ومعاينة الخريطة واختيار منطقة الخدمة:

```typescript
interface LocationPickerProps {
  value?: LocationPickerValue;
  onChange?: (location: LocationPickerValue) => void;
  errors?: { address?: string; coordinates?: string; serviceArea?: string };
  showMap?: boolean;
  showServiceArea?: boolean;
  showRemoteOption?: boolean;
  mapHeight?: string | number;
  isDisabled?: boolean;
  isLoading?: boolean;
}

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

## خطافات

### استخدامMapProvider

يحدد موفر الخريطة النشط وحالة التكوين الخاصة به:

```typescript
import { useMapProvider } from '@/hooks/use-map-provider';

const {
  provider,        // 'google' | 'mapbox'
  isConfigured,    // boolean -- API keys present
  isLoading,
  error,
  mapStyle,        // 'streets' | 'satellite'
} = useMapProvider();
```

### استخدامإحداثيات الخريطة

يدير مركز الخريطة وحالة التكبير/التصغير:

```typescript
import { useMapCoordinates } from '@/hooks/use-map-coordinates';

const {
  center, zoom, bounds,
  setCenter, setZoom, setBounds,
  fitToBounds,
} = useMapCoordinates(initialCenter, initialZoom);
```

### استخدام تحديد الموقع الجغرافي

تحديد الموقع الجغرافي للمتصفح مع معالجة الأذونات:

```typescript
import { useGeolocation } from '@/hooks/use-geolocation';

const {
  coordinates,     // Coordinates | null
  error,           // 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED'
  isLoading,
  permission,      // PermissionState | null
} = useGeolocation();
```

### استخدامLocationItems

جلب العناصر التي تمت تصفيتها حسب القرب الجغرافي:

```typescript
import { useLocationItems } from '@/hooks/use-location-items';
const { items, isLoading } = useLocationItems(coordinates, radius);
```

### استخدام موقع المستخدم

إدارة تفضيلات الموقع المخزن للمستخدم:

```typescript
import { useUserLocation } from '@/hooks/use-user-location';
const { location, setLocation, clearLocation } = useUserLocation();
```

## الترميز الجغرافي

يوفر القالب ترميزًا جغرافيًا من خلال نقطة النهاية `/api/geocode` ، ويدعم كلاً من الترميز الجغرافي الأمامي (العنوان إلى الإحداثيات) والترميز الجغرافي العكسي (الإحداثيات إلى العنوان). تقع خدمة الترميز الجغرافي في `lib/services/geocoding/` .

## الإكمال التلقائي للعنوان

```typescript
interface AddressSuggestion {
  id: string;
  mainText: string;          // Street address
  secondaryText: string;     // City, state
  fullAddress: string;
  coordinates?: Coordinates;
}
```

## إعدادات

```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id

# Mapbox (alternative)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
```

يتم تحديد الموفر تلقائيًا بناءً على مفتاح API الذي تم تكوينه.
