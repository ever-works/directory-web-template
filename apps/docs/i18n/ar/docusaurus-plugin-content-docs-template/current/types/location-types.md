---
id: location-types
title: تعريفات نوع الموقع
sidebar_label: أنواع المواقع
sidebar_position: 7
---

# تعريفات نوع الموقع

**المصدر:** `lib/types/location.ts`

توفر وحدة الموقع تعريفات شاملة للأنواع لميزات تحديد الموقع الجغرافي، بما في ذلك تكوين موفر الخريطة، وإعدادات الموقع، والاستعلامات الجغرافية، وتخزين بيانات الموقع. وهو يدعم موفري Mapbox وخرائط Google.

## أنواع التعداد

### `MapProvider`

خيارات موفر الخرائط المدعومة:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

خيارات نمط عرض الخريطة:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## أنواع الإعدادات

### `LocationConfigSettings`

إعدادات التكوين كما تم تخزينها في `config.yml` باستخدام تسمية `snake_case`. يُستخدم عند تحليل قسم `settings.location` في ملف التكوين.

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

إعدادات موقع وقت التشغيل باستخدام تسمية `camelCase`. يستخدم في جميع أنحاء التطبيق للوصول الآمن للنوع.

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

** الاختلافات الرئيسية عن `LocationConfigSettings`:**
- جميع الحقول مطلوبة (غير اختيارية) لأنه تم تطبيق الإعدادات الافتراضية
- يستخدم تسمية `camelCase` بدلاً من `snake_case`
- `default_center` يتم تحويل tuple إلى كائن مسمى `{ latitude, longitude }`

## القيم الافتراضية

### `DEFAULT_LOCATION_SETTINGS`

يتم تطبيق القيم الافتراضية عندما لا يتم تكوين الإعدادات:

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

## أنواع البيانات

### `LocationData`

بيانات الموقع للعناصر المخزنة في الجدول `item_location_index`. هذه بنية فهرس فقط; يبقى مصدر الحقيقة في ملفات YAML.

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

## أنواع حالة واجهة برمجة التطبيقات

### `MapProviderStatus`

معلومات الحالة لموفر خريطة واحد، تُستخدم في واجهة مستخدم المسؤول لإظهار الحالة المكونة/غير المكونة دون الكشف عن مفاتيح واجهة برمجة التطبيقات.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

استجابة من نقطة نهاية `map-status` API، للإبلاغ عن حالة التكوين لكلا الموفرين.

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

## أنواع الاستعلام الجغرافي

### `GeoBoundingBox`

مربع محيط للاستعلامات الجغرافية المكانية، يحدد منطقة مستطيلة على الخريطة.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

خيارات لاستعلامات العناصر المستندة إلى الموقع. يدعم البحث في نصف القطر، وتصفية المدينة/البلد، وإدراج العناصر البعيدة.

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

نتيجة استعلام عنصر يعتمد على الموقع، بما في ذلك حساب المسافة.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## وظائف

### `mapLocationConfigToRuntime`

تعيين إعدادات التكوين `snake_case` من YAML إلى `camelCase` إعدادات وقت التشغيل. يتم تطبيق الإعدادات الافتراضية على أي حقول مفقودة.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**مثال:**

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

## أمثلة الاستخدام

### الاستعلام عن العناصر حسب الموقع

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### التحقق من حالة مزود الخريطة

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

### استخدام المربع المحيط لاستعلامات إطار العرض

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

## ملاحظات التصميم

### التكوين مقابل نمط وقت التشغيل

تستخدم وحدة الموقع نظامًا من طبقتين:

1. **أنواع التكوين** (`LocationConfigSettings`) تستخدم `snake_case` لمطابقة اصطلاحات ملفات YAML
2. **أنواع وقت التشغيل** (`LocationSettings`) تستخدم `camelCase` لـ TypeScript الاصطلاحي
3. تعمل الدالة `mapLocationConfigToRuntime()` على الربط بين الاثنين، مع تطبيق الإعدادات الافتراضية

يضمن هذا النمط أن تظل ملفات YAML قابلة للقراءة من قبل الإنسان بينما يتبع رمز التطبيق اصطلاحات TypeScript.

### بيانات الموقع للفهرس فقط

يتم تخزين `LocationData` في جدول قاعدة البيانات `item_location_index` للاستعلامات الجغرافية السريعة، لكن مصدر الحقيقة لمواقع العناصر يظل في ملفات محتوى YAML. تتم إعادة بناء الفهرس عند تحديث العناصر.

### اعتبارات الخصوصية

يتحكم الإعداد `showExactAddress` (الافتراضي: `false`) في عرض العناوين الدقيقة أم لا. عند التعطيل، يتم عرض المعلومات على مستوى المدينة/البلد فقط للمستخدمين.

## الأنواع ذات الصلة

- [`ItemLocationData`](./item-types.md) - بيانات الموقع المضمنة في ملفات العنصر YAML
- [`ItemListOptions`](./item-types.md) - تدعم تصفية العناصر `city` و`country` و`includeRemote` الحقول
