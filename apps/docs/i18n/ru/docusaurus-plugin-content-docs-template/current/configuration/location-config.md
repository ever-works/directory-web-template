---
id: location-config
title: "Справочник настройки геолокации"
sidebar_label: "Геолокация"
sidebar_position: 13
---

# Справочник настройки геолокации

Эта страница документирует все настройки геолокации и карт, доступные в шаблоне. Конфигурация поступает из YAML-репозитория контента через `SettingsProvider` в React-компоненты.

## Источник конфигурации

Настройки геолокации определены в разделе `settings.location` файла `config.yml` репозитория контента:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' или 'google'
    map_style: streets        # 'streets' или 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [широта, долгота]
```

## Типы конфигурации

### LocationConfigSettings (YAML / snake_case)

Исходный формат из `config.yml`, определённый в `lib/types/location.ts`:

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
  default_center?: [number, number];   // [широта, долгота]
}
```

### LocationSettings (Runtime / camelCase)

Формат времени выполнения, используемый в приложении:

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

Функция `mapLocationConfigToRuntime()` конвертирует настройки YAML в snake_case в формат camelCase для времени выполнения.

### Описание настроек

| Настройка | Тип | По умолчанию | Описание |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Главный переключатель всех функций геолокации |
| `provider` | `MapProvider` | `'mapbox'` | Провайдер тайлов карты и геокодирования |
| `mapStyle` | `MapStyle` | `'streets'` | Стиль отображения карты |
| `distanceFilterEnabled` | `boolean` | `true` | Показывать фильтр радиуса расстояния в поиске |
| `distanceSortEnabled` | `boolean` | `true` | Разрешить сортировку результатов по расстоянию |
| `defaultRadiusKm` | `number` | `50` | Радиус поиска по умолчанию в километрах |
| `showExactAddress` | `boolean` | `false` | Показывать полные адреса публично |
| `requireLocationOnSubmit` | `boolean` | `false` | Сделать геолокацию обязательной для отправки |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Координаты центра карты по умолчанию |

## Провайдеры карт

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Провайдер | Переменная окружения | Функции |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Векторные тайлы, геокодирование, кластеризация |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Тайлы, Places API, геокодирование |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

Статус ключа API для интерфейса администратора.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Ответ от конечной точки `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Система координат

### `Coordinates`

Стандартный тип географической точки, используемый во всех компонентах карты.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Ограничивающий прямоугольник для расчётов области просмотра.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Альтернативный ограничивающий прямоугольник для запросов к базе данных.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Данные геолокации

### `LocationData`

Геолокация элемента, хранящаяся в таблице базы данных `item_location_index`.

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

Параметры для поиска элементов по близости.

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
