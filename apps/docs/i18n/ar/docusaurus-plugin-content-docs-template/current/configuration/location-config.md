---
id: location-config
title: "مرجع تكوين الموقع"
sidebar_label: "الموقع"
sidebar_position: 13
---

# مرجع تكوين الموقع

توثّق هذه الصفحة كل إعداد للموقع والخريطة المتاح في القالب. ينتقل التكوين من مستودع محتوى YAML عبر `SettingsProvider` إلى مكوّنات React.

## مصدر التكوين

تُعرَّف إعدادات الموقع في القسم `settings.location` من `config.yml` في مستودع المحتوى:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' أو 'google'
    map_style: streets        # 'streets' أو 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [خط العرض، خط الطول]
```

## أنواع التكوين

### LocationConfigSettings (YAML / snake_case)

الشكل الخام المقروء من `config.yml`، مُعرَّف في `lib/types/location.ts`:

```typescript
interface LocationConfigSettings {
  enabled?: boolean;
  provider?: MapProvider;
  map_style?: MapStyle;
  distance_filter_enabled?: boolean;
  distance_sort_enabled?: boolean;
  default_radius_km?: number;
  show_exact_address?: boolean;
  require_location_on_submit?: boolean;
  default_center?: [number, number];   // [خط العرض، خط الطول]
}
```

### LocationSettings (Runtime / camelCase)

شكل وقت التشغيل المستخدم في التطبيق:

```typescript
interface LocationSettings {
  enabled: boolean;
  provider: MapProvider;
  mapStyle: MapStyle;
  distanceFilterEnabled: boolean;
  distanceSortEnabled: boolean;
  defaultRadiusKm: number;
  showExactAddress: boolean;
  requireLocationOnSubmit: boolean;
  defaultCenter: { latitude: number; longitude: number };
}
```

### أوصاف الإعدادات

| الإعداد | النوع | الافتراضي | الوصف |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | المفتاح الرئيسي لجميع ميزات الموقع |
| `provider` | `MapProvider` | `'mapbox'` | موفر تايلات الخريطة والترميز الجغرافي |
| `mapStyle` | `MapStyle` | `'streets'` | أسلوب عرض الخريطة |
| `distanceFilterEnabled` | `boolean` | `true` | عرض مرشح نصف قطر المسافة في البحث |
| `distanceSortEnabled` | `boolean` | `true` | السماح بفرز النتائج حسب المسافة |
| `defaultRadiusKm` | `number` | `50` | نصف قطر البحث الافتراضي بالكيلومترات |
| `showExactAddress` | `boolean` | `false` | عرض العناوين الكاملة علنًا |
| `requireLocationOnSubmit` | `boolean` | `false` | جعل الموقع مطلوبًا للإرسال |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | إحداثيات مركز الخريطة الاحتياطية |

## موفرو الخرائط

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| الموفر | متغير البيئة | الميزات |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | تايلات متجهة، ترميز جغرافي، تجميع |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | تايلات، Places API، ترميز جغرافي |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

## نظام الإحداثيات

### `Coordinates`

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## بيانات الموقع

### `LocationData`

```typescript
interface LocationData {
  item_slug: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  service_area: string | null;
  is_remote: boolean;
  indexed_at: Date;
}
```

### `LocationQueryOptions`

```typescript
interface LocationQueryOptions {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  city?: string;
  country?: string;
  includeRemote?: boolean;
}
```
