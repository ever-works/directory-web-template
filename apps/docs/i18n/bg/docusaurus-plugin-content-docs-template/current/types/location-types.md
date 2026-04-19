---
id: location-types
title: Дефиниции на типа местоположение
sidebar_label: Типове местоположение
sidebar_position: 7
---

# Дефиниции на типа местоположение

**Източник:** `lib/types/location.ts`

Модулът за местоположение предоставя изчерпателни дефиниции на типове за функции за геолокация, включително конфигурация на доставчик на карта, настройки за местоположение, гео заявки и съхранение на данни за местоположение. Той поддържа доставчици както на Mapbox, така и на Google Maps.

## Типове енуми

### `MapProvider`

Поддържани опции за доставчик на карти:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Опции за стил на изобразяване на картата:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Типове настройки

### `LocationConfigSettings`

Конфигурационните настройки, съхранени в `config.yml` с помощта на `snake_case` именуване. Използва се при анализиране на секцията `settings.location` на конфигурационния файл.

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

Настройки за местоположение по време на изпълнение, използвайки `camelCase` именуване. Използва се в цялото приложение за безопасен тип достъп.

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

**Ключови разлики от `LocationConfigSettings`:**
- Всички полета са задължителни (незадължителни), тъй като се прилагат стойностите по подразбиране
- Използва `camelCase` именуване вместо `snake_case`
- Кортежът `default_center` се преобразува в обект с име `{ latitude, longitude }`

## Стойности по подразбиране

### `DEFAULT_LOCATION_SETTINGS`

Стойности по подразбиране, прилагани, когато настройките не са конфигурирани:

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

## Типове данни

### `LocationData`

Данни за местоположение за елементи, съхранени в таблицата `item_location_index`. Това е структура само за индекс; източникът на истината остава в YAML файловете.

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

## Типове статуси на API

### `MapProviderStatus`

Информация за състоянието за един доставчик на карта, използвана в потребителския интерфейс на администратора за показване на конфигурирано/неконфигурирано състояние, без да се излагат API ключове.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Отговор от крайната точка на `map-status` API, отчитащ статус на конфигурация и за двата доставчика.

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

## Типове географски заявки

### `GeoBoundingBox`

Ограничаваща кутия за геопространствени заявки, дефинираща правоъгълен регион на картата.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Опции за заявки за елементи, базирани на местоположение. Поддържа търсене в радиус, филтриране по град/държава и отдалечено включване на елементи.

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

Резултат от заявка за елемент, базирана на местоположение, включително изчисляване на разстоянието.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Функции

### `mapLocationConfigToRuntime`

Картографира `snake_case` конфигурационните настройки от YAML към `camelCase` настройките за изпълнение. Прилага настройките по подразбиране за всички липсващи полета.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Пример:**

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

## Примери за използване

### Запитване за елементи по местоположение

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Проверка на състоянието на доставчика на карта

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

### Използване на ограничително поле за заявки за прозорци

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

## Бележки по дизайна

### Config срещу Runtime Pattern

Модулът за местоположение използва система от двуслоен тип:

1. **Типове конфигурации** (`LocationConfigSettings`) използват `snake_case`, за да съответстват на YAML файловите конвенции
2. **Типове по време на изпълнение** (`LocationSettings`) използват `camelCase` за идиоматичен TypeScript
3. Функцията `mapLocationConfigToRuntime()` свързва двете, като прилага настройките по подразбиране

Този модел гарантира, че YAML файловете остават четими от хора, докато кодът на приложението следва конвенциите на TypeScript.

### Данни за местоположение само за индекс

`LocationData` се съхранява в таблицата на базата данни `item_location_index` за бързи географски заявки, но източникът на истината за местоположенията на елементите остава във файловете със съдържание на YAML. Индексът се изгражда отново, когато елементите се актуализират.

### Съображения за поверителност

Настройката `showExactAddress` (по подразбиране: `false`) контролира дали да се показват точни адреси. Когато е деактивирано, на потребителите се показва само информация на ниво град/държава.

## Свързани типове

- [`ItemLocationData`](./item-types.md) - Данни за местоположение, вградени в YAML файлове на артикул
- [`ItemListOptions`](./item-types.md) - Филтрирането на елементи поддържа полета `city`, `country` и `includeRemote`
