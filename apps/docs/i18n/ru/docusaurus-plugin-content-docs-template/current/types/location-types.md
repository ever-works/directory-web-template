---
id: location-types
title: Определения типов местоположений
sidebar_label: Типы местоположений
sidebar_position: 7
---

# Определения типов местоположений

**Источник:** `lib/types/location.ts`

Модуль местоположения предоставляет подробные определения типов для функций геолокации, включая конфигурацию поставщика карт, настройки местоположения, географические запросы и хранение данных о местоположении. Он поддерживает поставщиков Mapbox и Google Maps.

## Типы перечислений

### `MapProvider`

Поддерживаемые параметры поставщика карт:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Варианты стиля отрисовки карты:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Типы настроек

### `LocationConfigSettings`

Параметры конфигурации хранятся в `config.yml` с использованием имен `snake_case`. Используется при анализе раздела `settings.location` файла конфигурации.

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

Настройки местоположения во время выполнения с использованием именования `camelCase`. Используется во всем приложении для типобезопасного доступа.

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

**Ключевые отличия от `LocationConfigSettings`:**
- Все поля являются обязательными (необязательными), поскольку применяются значения по умолчанию.
- Использует имя `camelCase` вместо `snake_case`
- Кортеж `default_center` преобразуется в именованный объект `{ latitude, longitude }`.

## Значения по умолчанию

### `DEFAULT_LOCATION_SETTINGS`

Значения по умолчанию применяются, когда параметры не настроены:

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

## Типы данных

### `LocationData`

Данные о местоположении предметов, хранящихся в таблице `item_location_index`. Это структура, предназначенная только для индексов; источник истины остается в файлах YAML.

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

## Типы статусов API

### `MapProviderStatus`

Информация о состоянии одного поставщика карт, используемая в пользовательском интерфейсе администратора для отображения настроенного/ненастроенного состояния без раскрытия ключей API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Ответ от конечной точки API `map-status`, сообщающий о состоянии конфигурации для обоих поставщиков.

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

## Типы географических запросов

### `GeoBoundingBox`

Ограничительная рамка для геопространственных запросов, определяющая прямоугольную область на карте.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Опции для запросов элементов на основе местоположения. Поддерживает поиск по радиусу, фильтрацию по городу/стране и включение удаленных элементов.

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

Результат запроса элемента на основе местоположения, включая расчет расстояния.

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

Сопоставляет параметры конфигурации `snake_case` из YAML с настройками времени выполнения `camelCase`. Применяет значения по умолчанию для всех отсутствующих полей.

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

## Примеры использования

### Запрос элементов по местоположению

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Проверка статуса поставщика карт

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

### Использование ограничивающей рамки для запросов области просмотра

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

## Примечания к проектированию

### Конфигурация и шаблон времени выполнения

Модуль местоположения использует двухуровневую систему типов:

1. **Типы конфигураций** (`LocationConfigSettings`) используйте `snake_case` для соответствия соглашениям о файлах YAML.
2. **Типы времени выполнения** (`LocationSettings`) используйте `camelCase` для идиоматического TypeScript
3. Функция `mapLocationConfigToRuntime()` объединяет эти две функции, применяя значения по умолчанию.

Этот шаблон гарантирует, что файлы YAML остаются удобочитаемыми, а код приложения соответствует соглашениям TypeScript.

### Только индексные данные о местоположении

`LocationData` хранится в таблице базы данных `item_location_index` для быстрых географических запросов, но источник истины для местоположений элементов остается в файлах содержимого YAML. Индекс перестраивается при обновлении элементов.

### Вопросы конфиденциальности

Параметр `showExactAddress` (по умолчанию: `false`) управляет отображением точных адресов. Если этот параметр отключен, пользователям отображается только информация на уровне города/страны.

## Связанные типы

- [`ItemLocationData`](./item-types.md) — данные о местоположении, встроенные в YAML-файлы элементов.
- [`ItemListOptions`](./item-types.md) — фильтрация элементов поддерживает поля `city`, `country` и `includeRemote`.
