---
id: maps-location
title: Mapy i funkcje lokalizacyjne
sidebar_label: Mapy i lokalizacja
sidebar_position: 6
---

# Mapy i funkcje lokalizacyjne

Szablon Ever Works obsługuje interaktywne mapy z warstwą abstrakcji dostawcy zarówno dla **Map Google**, jak i **Mapbox**. System obejmuje geokodowanie, wybieranie lokalizacji, grupowanie znaczników i geolokalizację.

## Architektura

```mermaid
flowchart TD
    A["React Components\nMapComponent | LocationPicker | MapItemPopup"] --> B["Map Provider Abstraction\nGoogle Maps | Mapbox"]
    B --> C["Hooks Layer\nuseMapProvider | useMapCoordinates | useGeolocation"]
```

Moduł `lib/maps/` reeksportuje wszystkie typy i dostawców:

```typescript
// lib/maps/index.ts
export * from './types';
export * from './providers';
```

## Typy rdzeni

### Współrzędne

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### Znaczniki

```typescript
interface MapMarkerData {
  id: string;
  coordinates: Coordinates;
  title: string;
  icon?: string;
  category?: string;
  slug: string;              // Item slug for linking
  description?: string;
}

interface MapMarkerWithDistance extends MapMarkerData {
  distanceKm?: number;       // Distance from reference point
}
```

### Klastrowanie

```typescript
interface MapClusterData {
  id: string;
  coordinates: Coordinates;
  count: number;
  markerIds: string[];
  expansionZoom: number;
}

interface ClusterOptions {
  radius?: number;           // Cluster radius in pixels (default: 60)
  maxZoom?: number;          // Max zoom for clustering (default: 16)
  minZoom?: number;          // Min zoom for clustering (default: 0)
  minPoints?: number;        // Min points per cluster (default: 2)
}
```

### Widoczność

```typescript
interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: MapBounds;
}
```

## Rekwizyty MapComponent

Główny komponent mapy akceptuje kompleksowy zestaw rekwizytów:

```typescript
interface MapComponentProps {
  markers?: MapMarkerData[];
  center?: Coordinates;
  zoom?: number;                  // 1-20
  style?: MapStyle;               // 'streets' | 'satellite'
  className?: string;
  height?: string | number;
  width?: string | number;
  controls?: MapControlsConfig;
  enableClustering?: boolean;
  clusterOptions?: ClusterOptions;
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string | null;
  onMarkerClick?: (marker: MapMarkerData) => void;
  onClusterClick?: (cluster: MapClusterData) => void;
  onViewportChange?: (viewport: MapViewport) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
  ariaLabel?: string;
}
```

### Sterowanie mapą

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Komponent LocationPicker

Element formularza umożliwiający wybór lokalizacji z autouzupełnianiem adresu, podglądem mapy i wyborem obsługiwanego obszaru:

```typescript
interface LocationPickerProps {
  value?: LocationPickerValue;
  onChange?: (location: LocationPickerValue) => void;
  errors?: { address?: string; coordinates?: string; serviceArea?: string };
  showMap?: boolean;
  showServiceArea?: boolean;
  showRemoteOption?: boolean;
  mapHeight?: string | number;
  isDisabled?: boolean;
  isLoading?: boolean;
}

interface LocationPickerValue {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  serviceArea?: 'local' | 'regional' | 'national' | 'global';
  isRemote?: boolean;
}
```

## Haki

### użyjMapProvider

Określa aktywnego dostawcę map i jego status konfiguracji:

```typescript
import { useMapProvider } from '@/hooks/use-map-provider';

const {
  provider,        // 'google' | 'mapbox'
  isConfigured,    // boolean -- API keys present
  isLoading,
  error,
  mapStyle,        // 'streets' | 'satellite'
} = useMapProvider();
```

### użyj współrzędnych mapy

Zarządza centrum mapy i stanem powiększenia:

```typescript
import { useMapCoordinates } from '@/hooks/use-map-coordinates';

const {
  center, zoom, bounds,
  setCenter, setZoom, setBounds,
  fitToBounds,
} = useMapCoordinates(initialCenter, initialZoom);
```

### użyjGeolokalizacji

Geolokalizacja przeglądarki z obsługą uprawnień:

```typescript
import { useGeolocation } from '@/hooks/use-geolocation';

const {
  coordinates,     // Coordinates | null
  error,           // 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED'
  isLoading,
  permission,      // PermissionState | null
} = useGeolocation();
```

### użyj elementów lokalizacji

Pobiera elementy filtrowane według bliskości geograficznej:

```typescript
import { useLocationItems } from '@/hooks/use-location-items';
const { items, isLoading } = useLocationItems(coordinates, radius);
```

### użyjLokalizacjiUżytkownika

Zarządza zapisanymi preferencjami lokalizacji użytkownika:

```typescript
import { useUserLocation } from '@/hooks/use-user-location';
const { location, setLocation, clearLocation } = useUserLocation();
```

## Geokodowanie

Szablon zapewnia geokodowanie do punktu końcowego `/api/geocode` , obsługując zarówno geokodowanie w przód (adres do współrzędnych), jak i geokodowanie odwrotne (współrzędne do adresu). Usługa geokodowania zlokalizowana jest pod adresem `lib/services/geocoding/` .

## Autouzupełnianie adresu

```typescript
interface AddressSuggestion {
  id: string;
  mainText: string;          // Street address
  secondaryText: string;     // City, state
  fullAddress: string;
  coordinates?: Coordinates;
}
```

## Konfiguracja

```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id

# Mapbox (alternative)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
```

Dostawca jest wybierany automatycznie na podstawie skonfigurowanego klucza API.
