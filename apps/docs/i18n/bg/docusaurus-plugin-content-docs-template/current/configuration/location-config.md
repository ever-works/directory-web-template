---
id: location-config
title: "Справочник за конфигурация на местоположение"
sidebar_label: "Местоположение"
sidebar_position: 13
---

# Справочник за конфигурация на местоположение

Тази страница документира всяка настройка за местоположение и карта в шаблона. Конфигурацията минава от YAML хранилището за съдържание чрез `SettingsProvider` към React компонентите.

## Източник на конфигурацията

Настройките за местоположение се дефинират в раздела `settings.location` на `config.yml` в хранилището за съдържание:

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
    default_center: [40.7128, -74.0060]  # [ширина, дължина]
```

## Типове конфигурация

### LocationConfigSettings (YAML / snake_case)

Суровата форма, прочетена от `config.yml`, дефинирана в `lib/types/location.ts`:

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
  default_center?: [number, number];
}
```

### LocationSettings (Runtime / camelCase)

Форматът за изпълнение, използван в приложението:

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

### Описания на настройките

| Настройка | Тип | По подразбиране | Описание |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Главен превключвател за всички функции за местоположение |
| `provider` | `MapProvider` | `'mapbox'` | Доставчик на тайлове за карта и геокодиране |
| `mapStyle` | `MapStyle` | `'streets'` | Стил на рендиране на картата |
| `distanceFilterEnabled` | `boolean` | `true` | Показване на филтър за радиус в търсенето |
| `distanceSortEnabled` | `boolean` | `true` | Разрешаване на сортиране на резултатите по разстояние |
| `defaultRadiusKm` | `number` | `50` | Радиус на търсене по подразбиране в километри |
| `showExactAddress` | `boolean` | `false` | Показване на пълни адреси публично |
| `requireLocationOnSubmit` | `boolean` | `false` | Изискване на местоположение за изпращане |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Координати на центъра на картата по подразбиране |

## Доставчици на карти

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Доставчик | Променлива на средата | Функции |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Векторни тайлове, геокодиране, клъстеризация |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Тайлове, Places API, геокодиране |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Координатна система

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

## Данни за местоположение

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
