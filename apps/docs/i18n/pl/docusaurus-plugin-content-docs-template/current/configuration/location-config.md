---
id: location-config
title: "Konfiguracja Lokalizacji"
sidebar_label: "Lokalizacja"
sidebar_position: 13
---

# Konfiguracja Lokalizacji

Ta strona dokumentuje każde ustawienie lokalizacji i mapy dostępne w szablonie. Konfiguracja przepływa z repozytorium treści YAML przez `SettingsProvider` do komponentów React.

## Źródło Konfiguracji

Ustawienia lokalizacji są zdefiniowane w sekcji `settings.location` pliku `config.yml` w repozytorium treści:

```yaml
settings:
  location:
    enabled: true
    provider: mapbox          # 'mapbox' or 'google'
    map_style: streets        # 'streets' or 'satellite'
    distance_filter_enabled: true
    distance_sort_enabled: true
    default_radius_km: 50
    show_exact_address: false
    require_location_on_submit: false
    default_center: [40.7128, -74.0060]  # [latitude, longitude]
```

## Typy Konfiguracji

### LocationConfigSettings (YAML / snake_case)

Surowa struktura odczytywana z `config.yml`, zdefiniowana w `lib/types/location.ts`:

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
  default_center?: [number, number];   // [latitude, longitude]
}
```

### LocationSettings (Runtime / camelCase)

Struktura runtime używana w całej aplikacji:

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

Funkcja `mapLocationConfigToRuntime()` konwertuje ustawienia YAML w formacie snake_case do formatu runtime camelCase.

### Opisy Ustawień

| Ustawienie | Typ | Domyślna | Opis |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Główny przełącznik dla wszystkich funkcji lokalizacji |
| `provider` | `MapProvider` | `'mapbox'` | Dostawca kafelków mapy i geokodowania |
| `mapStyle` | `MapStyle` | `'streets'` | Styl renderowania mapy |
| `distanceFilterEnabled` | `boolean` | `true` | Pokaż filtr promienia odległości w wyszukiwaniu |
| `distanceSortEnabled` | `boolean` | `true` | Zezwól na sortowanie wyników według odległości |
| `defaultRadiusKm` | `number` | `50` | Domyślny promień wyszukiwania w kilometrach |
| `showExactAddress` | `boolean` | `false` | Wyświetlaj pełne adresy publicznie |
| `requireLocationOnSubmit` | `boolean` | `false` | Wymagaj lokalizacji przy zgłoszeniach |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Współrzędne domyślnego centrum mapy |

## Dostawcy Map

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Dostawca | Zmienna Środowiskowa | Funkcje |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Kafelki wektorowe, geokodowanie, klastrowanie |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Kafelki, API Miejsc, geokodowanie |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

Status klucza API dla interfejsu administratora.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Odpowiedź z punktu końcowego `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## System Współrzędnych

### `Coordinates`

Standardowy typ punktu geograficznego używany we wszystkich komponentach mapy.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Obwiednia dla obliczeń widoku.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Alternatywna obwiednia dla zapytań do bazy danych.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Dane Lokalizacji

### `LocationData`

Lokalizacja elementu przechowywana w tabeli bazy danych `item_location_index`.

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

Parametry dla wyszukiwań elementów opartych na odległości.

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

Wynik wyszukiwania opartego na lokalizacji.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Konfiguracja Komponentu Mapy

### `MapComponentProps`

Właściwości głównego komponentu `Map`.

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                    // 1-20
  style?: MapStyle;
  className?: string;
  height?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
}
```

### `ClusterOptions`

Konfiguracja klastrowania znaczników.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Przełącz elementy sterujące interfejsu mapy.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Preferencje Lokalizacji Użytkownika

Użytkownicy mogą ustawić domyślne preferencje lokalizacji w swoim profilu klienta (przechowywanym w tabeli `client_profiles`):

| Kolumna | Typ | Opis |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | Domyślna szerokość geograficzna użytkownika |
| `default_longitude` | `doublePrecision` | Domyślna długość geograficzna użytkownika |
| `default_city` | `text` | Domyślne miasto użytkownika |
| `default_country` | `text` | Domyślny kraj użytkownika |
| `location_privacy` | `text` | `'private'` (domyślna) lub `'public'` |

## Zmienne Środowiskowe

| Zmienna Środowiskowa | Wymagana | Opis |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Dla Mapbox | Token dostępu Mapbox GL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Dla Google | Klucz API Google Maps |

## Powiązane Strony

- [Typy Lokalizacji](../types/location-types.md) -- pełne definicje typów dla funkcji lokalizacji
- [Konfiguracja Mapy](./map-config.md) -- dodatkowa konfiguracja interfejsu mapy
- [Konfiguracja Funkcji](./feature-config.md) -- ustawienia flag funkcji
