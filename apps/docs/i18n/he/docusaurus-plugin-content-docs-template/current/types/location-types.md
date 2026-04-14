---
id: location-types
title: הגדרות סוג מיקום
sidebar_label: סוגי מיקום
sidebar_position: 7
---

# הגדרות סוג מיקום

**מקור:** `lib/types/location.ts`

מודול המיקום מספק הגדרות סוגים מקיפות עבור תכונות מיקום גיאוגרפי, כולל תצורת ספק מפה, הגדרות מיקום, שאילתות גיאוגרפיות ואחסון נתוני מיקום. זה תומך גם בספקי Mapbox וגם ב-Google Maps.

## סוגי Enum

### `MapProvider`

אפשרויות נתמכות של ספק מפות:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

אפשרויות סגנון עיבוד המפה:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## סוגי הגדרות

### `LocationConfigSettings`

הגדרות התצורה המאוחסנות ב-`config.yml` באמצעות מתן שמות של `snake_case`. משמש בעת ניתוח הקטע `settings.location` של קובץ התצורה.

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
  default_center?: [number, number]; // [latitude, longitude]
}
```

### `LocationSettings`

הגדרות מיקום זמן ריצה באמצעות `camelCase` מתן שמות. משמש בכל האפליקציה לגישה בטוחה לפי סוג.

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
  defaultCenter: {
    latitude: number;
    longitude: number;
  };
}
```

**הבדלים עיקריים מ-`LocationConfigSettings`:**
- כל השדות נדרשים (לא אופציונליים) מכיוון שברירות המחדל מוחלות
- משתמש ב-`camelCase` בשמות במקום ב-`snake_case`
- tuple `default_center` מומר לאובייקט בשם `{ latitude, longitude }`

## ערכי ברירת מחדל

### `DEFAULT_LOCATION_SETTINGS`

ערכי ברירת מחדל שהוחלו כאשר הגדרות אינן מוגדרות:

```typescript
const DEFAULT_LOCATION_SETTINGS: LocationSettings = {
  enabled: false,
  provider: 'mapbox',
  mapStyle: 'streets',
  distanceFilterEnabled: true,
  distanceSortEnabled: true,
  defaultRadiusKm: 50,
  showExactAddress: false,
  requireLocationOnSubmit: false,
  defaultCenter: { latitude: 0, longitude: 0 },
};
```

## סוגי נתונים

### `LocationData`

נתוני מיקום של פריטים המאוחסנים בטבלה `item_location_index`. זהו מבנה אינדקס בלבד; מקור האמת נשאר בקבצי YAML.

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

## סוגי סטטוס API

### `MapProviderStatus`

מידע סטטוס עבור ספק מפה בודד, המשמש בממשק המשתמש לניהול כדי להציג מצב מוגדר/לא מוגדר מבלי לחשוף מפתחות API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

תגובה מנקודת הקצה `map-status` API, דיווח על סטטוס תצורה עבור שני הספקים.

```typescript
interface MapStatusResponse {
  mapbox: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
  google: {
    isConfigured: boolean;
    isPreviewAvailable: boolean;
    name: string;
  };
}
```

## סוגי שאילתות גיאוגרפיות

### `GeoBoundingBox`

תיבה תוחמת לשאילתות גיאו-מרחביות, הגדרת אזור מלבני במפה.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

אפשרויות עבור שאילתות פריטים מבוססות מיקום. תומך בחיפוש רדיוס, סינון עיר/ארץ והכללת פריטים מרחוק.

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

### `LocationQueryResult`

תוצאה של שאילתת פריט מבוססת מיקום, כולל חישוב מרחק.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## פונקציות

### `mapLocationConfigToRuntime`

מפה את הגדרות התצורה של `snake_case` מ-YAML ל-`camelCase` הגדרות זמן ריצה. מחיל ברירת מחדל עבור כל שדות חסרים.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**דוגמה:**

```typescript
import { mapLocationConfigToRuntime } from '@/lib/types/location';

// From config.yml
const yamlConfig = {
  enabled: true,
  provider: 'mapbox' as const,
  default_radius_km: 25,
  default_center: [40.7128, -74.006] as [number, number],
};

const settings = mapLocationConfigToRuntime(yamlConfig);
// Result:
// {
//   enabled: true,
//   provider: 'mapbox',
//   mapStyle: 'streets',           // default applied
//   distanceFilterEnabled: true,   // default applied
//   distanceSortEnabled: true,     // default applied
//   defaultRadiusKm: 25,
//   showExactAddress: false,       // default applied
//   requireLocationOnSubmit: false, // default applied
//   defaultCenter: { latitude: 40.7128, longitude: -74.006 },
// }
```

## דוגמאות לשימוש

### שאילתת פריטים לפי מיקום

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### בודק סטטוס ספק המפה

```typescript
import type { MapStatusResponse } from '@/lib/types/location';

async function checkMapStatus(): Promise<MapStatusResponse> {
  const res = await fetch('/api/admin/map-status');
  return res.json();
}

// Usage
const status = await checkMapStatus();
if (status.mapbox.isConfigured) {
  console.log('Mapbox is ready');
}
```

### שימוש בתיבה תוחמת עבור שאילתות נקודת מבט

```typescript
import type { GeoBoundingBox } from '@/lib/types/location';

function getViewportBounds(
  center: { lat: number; lng: number },
  radiusKm: number
): GeoBoundingBox {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(center.lat * (Math.PI / 180)));

  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
```

## הערות עיצוב

### תצורה לעומת דפוס זמן ריצה

מודול המיקום משתמש במערכת דו-שכבתית:

1. **סוגי תצורה** (`LocationConfigSettings`) השתמשו ב-`snake_case` כדי להתאים למוסכמות קבצי YAML
2. **סוגי זמן ריצה** (`LocationSettings`) השתמשו ב-`camelCase` עבור TypeScript אידיומטי
3. הפונקציה `mapLocationConfigToRuntime()` מגשרת בין השניים, תוך החלת ברירות מחדל

דפוס זה מבטיח שקובצי YAML יישארו קריאים לאדם בעוד שקוד היישום עוקב אחר מוסכמות TypeScript.

### נתוני מיקום לאינדקס בלבד

`LocationData` מאוחסן בטבלת מסד הנתונים `item_location_index` עבור שאילתות גיאוגרפיות מהירות, אך מקור האמת עבור מיקומי הפריטים נשאר בקבצי התוכן של YAML. האינדקס נבנה מחדש כאשר פריטים מתעדכנים.

### שיקולי פרטיות

ההגדרה `showExactAddress` (ברירת מחדל: `false`) שולטת אם יוצגו כתובות מדויקות. כאשר מושבת, רק מידע ברמת עיר/מדינה מוצג למשתמשים.

## סוגים קשורים

- [`ItemLocationData`](./item-types.md) - נתוני מיקום מוטמעים בקובצי YAML של פריט
- [`ItemListOptions`](./item-types.md) - סינון פריטים תומך בשדות `city`, `country` ו-`includeRemote`
