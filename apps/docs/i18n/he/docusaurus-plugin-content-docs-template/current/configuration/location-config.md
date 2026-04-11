---
id: location-config
title: "עיון בהגדרת מיקום"
sidebar_label: "מיקום"
sidebar_position: 13
---

# עיון בהגדרת מיקום

דף זה מתעד כל הגדרת מיקום ומפה הזמינה בתבנית. ההגדרה זורמת ממאגר תוכן YAML דרך `SettingsProvider` לרכיבי React.

## מקור ההגדרה

הגדרות מיקום מוגדרות בסעיף `settings.location` של `config.yml` במאגר התוכן:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' או 'google'
    map_style: streets        # 'streets' או 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [קו רוחב, קו אורך]
```

## סוגי הגדרות

### LocationConfigSettings (YAML / snake_case)

הצורה הגולמית הנקראת מ-`config.yml`, מוגדרת ב-`lib/types/location.ts`:

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
  default_center?: [number, number];   // [קו רוחב, קו אורך]
}
```

### LocationSettings (זמן ריצה / camelCase)

פורמט זמן הריצה בשימוש בכל היישום:

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

הפונקציה `mapLocationConfigToRuntime()` ממירה הגדרות YAML ב-snake_case לפורמט camelCase של זמן הריצה.

### תיאורי ההגדרות

| הגדרה | סוג | ברירת מחדל | תיאור |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | מתג ראשי לכל תכונות המיקום |
| `provider` | `MapProvider` | `'mapbox'` | ספק אריחי מפה וקידוד גיאוגרפי |
| `mapStyle` | `MapStyle` | `'streets'` | סגנון עיבוד מפה |
| `distanceFilterEnabled` | `boolean` | `true` | הצג מסנן רדיוס מרחק בחיפוש |
| `distanceSortEnabled` | `boolean` | `true` | אפשר מיון תוצאות לפי מרחק |
| `defaultRadiusKm` | `number` | `50` | רדיוס חיפוש ברירת מחדל בקילומטרים |
| `showExactAddress` | `boolean` | `false` | הצג כתובות מלאות באופן ציבורי |
| `requireLocationOnSubmit` | `boolean` | `false` | דרוש מיקום בעת הגשה |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | קואורדינטות מרכז מפה גיבוי |

## ספקי מפות

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| ספק | משתנה סביבה | תכונות |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | אריחים וקטוריים, קידוד גיאוגרפי, אשכולות |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | אריחים, Places API, קידוד גיאוגרפי |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

## מערכת קואורדינטות

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

## נתוני מיקום

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
