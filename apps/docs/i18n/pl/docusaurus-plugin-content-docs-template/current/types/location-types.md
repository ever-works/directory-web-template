---
id: location-types
title: Definicje typów lokalizacji
sidebar_label: Typy lokalizacji
sidebar_position: 7
---

# Definicje typów lokalizacji

**Źródło:** `lib/types/location.ts`

Moduł lokalizacji zapewnia kompleksowe definicje typów funkcji geolokalizacji, w tym konfigurację dostawcy map, ustawienia lokalizacji, zapytania geograficzne i przechowywanie danych o lokalizacji. Obsługuje dostawców Mapbox i Google Maps.

## Typy wyliczeniowe

### `MapProvider`

Obsługiwane opcje dostawców map:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Opcje stylu renderowania mapy:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Typy ustawień

### `LocationConfigSettings`

Ustawienia konfiguracyjne zapisane w `config.yml` przy użyciu nazewnictwa `snake_case`. Używane podczas analizowania sekcji `settings.location` pliku konfiguracyjnego.

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

Ustawienia lokalizacji środowiska wykonawczego przy użyciu nazewnictwa `camelCase`. Używane w całej aplikacji w celu zapewnienia dostępu bezpiecznego dla typu.

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

**Kluczowe różnice w stosunku do `LocationConfigSettings`:**
- Wszystkie pola są wymagane (nieopcjonalne), ponieważ stosowane są wartości domyślne
- Używa nazewnictwa `camelCase` zamiast `snake_case`
- Krotka `default_center` jest konwertowana na nazwany obiekt `{ latitude, longitude }`

## Wartości domyślne

### `DEFAULT_LOCATION_SETTINGS`

Wartości domyślne stosowane, gdy ustawienia nie są skonfigurowane:

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

## Typy danych

### `LocationData`

Dane lokalizacyjne dla elementów przechowywanych w tabeli `item_location_index`. Jest to struktura zawierająca wyłącznie indeks; źródło prawdy pozostaje w plikach YAML.

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

## Typy statusu API

### `MapProviderStatus`

Informacje o statusie pojedynczego dostawcy mapy używane w interfejsie administratora do pokazywania stanu skonfigurowanego/nieskonfigurowanego bez ujawniania kluczy API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Odpowiedź z punktu końcowego API `map-status`, raportująca stan konfiguracji dla obu dostawców.

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

## Typy zapytań geograficznych

### `GeoBoundingBox`

Ramka ograniczająca dla zapytań geoprzestrzennych, definiująca prostokątny region na mapie.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Opcje zapytań o elementy na podstawie lokalizacji. Obsługuje wyszukiwanie według promienia, filtrowanie miast/krajów i zdalne uwzględnianie elementów.

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

Wynik zapytania o element na podstawie lokalizacji, łącznie z obliczeniem odległości.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Funkcje

### `mapLocationConfigToRuntime`

Mapuje ustawienia konfiguracyjne `snake_case` z YAML na ustawienia środowiska wykonawczego `camelCase`. Stosuje wartości domyślne dla wszystkich brakujących pól.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Przykład:**

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

## Przykłady użycia

### Zapytanie o elementy według lokalizacji

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Sprawdzanie statusu dostawcy map

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

### Używanie ramki ograniczającej do zapytań o rzutnię

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

## Uwagi do projektu

### Konfiguracja a wzorzec środowiska wykonawczego

Moduł lokalizacji wykorzystuje dwuwarstwowy system typów:

1. **Typy konfiguracji** (`LocationConfigSettings`) użyj `snake_case`, aby dopasować konwencje plików YAML
2. **Typy wykonawcze** (`LocationSettings`) użyj `camelCase` dla idiomatycznego TypeScriptu
3. Funkcja `mapLocationConfigToRuntime()` łączy te dwa elementy, stosując wartości domyślne

Ten wzorzec zapewnia, że pliki YAML pozostają czytelne dla człowieka, podczas gdy kod aplikacji jest zgodny z konwencjami TypeScript.

### Dane lokalizacyjne wyłącznie indeksowane

`LocationData` jest przechowywany w tabeli bazy danych `item_location_index` na potrzeby szybkich zapytań geograficznych, ale źródło prawdy o lokalizacjach elementów pozostaje w plikach zawartości YAML. Indeks jest odbudowywany po aktualizacji elementów.

### Względy prywatności

Ustawienie `showExactAddress` (domyślnie: `false`) kontroluje, czy wyświetlane są dokładne adresy. Jeśli opcja jest wyłączona, użytkownikom będą wyświetlane tylko informacje na poziomie miasta/kraju.

## Powiązane typy

- [`ItemLocationData`](./item-types.md) — dane o lokalizacji osadzone w plikach YAML przedmiotu
- [`ItemListOptions`](./item-types.md) - Filtrowanie elementów obsługuje pola `city`, `country` i `includeRemote`
