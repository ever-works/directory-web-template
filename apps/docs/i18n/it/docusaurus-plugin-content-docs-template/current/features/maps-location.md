---
id: maps-location
title: Mappe e funzionalità di localizzazione
sidebar_label: Mappe e posizione
sidebar_position: 6
---

# Mappe e funzionalità di localizzazione

Il modello Ever Works supporta mappe interattive con un livello di astrazione del provider sia per **Google Maps** che per **Mapbox**. Il sistema include la geocodificazione, la selezione della posizione, il clustering dei marcatori e la geolocalizzazione.

## Architettura

```mermaid
flowchart TD
    A["React Components\nMapComponent | LocationPicker | MapItemPopup"] --> B["Map Provider Abstraction\nGoogle Maps | Mapbox"]
    B --> C["Hooks Layer\nuseMapProvider | useMapCoordinates | useGeolocation"]
```

Il modulo `lib/maps/` riesporta tutte le tipologie e tutti i fornitori:

```typescript
// lib/maps/index.ts
export * from './types';
export * from './providers';
```

## Tipi di nucleo

### Coordinate

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

### Indicatori

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

### Raggruppamento

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

### Visualizzazione

```typescript
interface MapViewport {
  center: Coordinates;
  zoom: number;
  bounds?: MapBounds;
}
```

## Oggetti di scena del componente mappa

Il componente principale della mappa accetta un set completo di oggetti di scena:

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

### Controlli della mappa

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Componente LocationPicker

Un componente del modulo per la selezione delle posizioni con completamento automatico dell'indirizzo, anteprima della mappa e selezione dell'area coperta dal servizio:

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

## Ganci

### usaMapProvider

Determina il fornitore di mappe attivo e il suo stato di configurazione:

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

### usaCoordinateMappa

Gestisce il centro della mappa e lo stato dello zoom:

```typescript
import { useMapCoordinates } from '@/hooks/use-map-coordinates';

const {
  center, zoom, bounds,
  setCenter, setZoom, setBounds,
  fitToBounds,
} = useMapCoordinates(initialCenter, initialZoom);
```

### usa la geolocalizzazione

Geolocalizzazione del browser con gestione dei permessi:

```typescript
import { useGeolocation } from '@/hooks/use-geolocation';

const {
  coordinates,     // Coordinates | null
  error,           // 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED'
  isLoading,
  permission,      // PermissionState | null
} = useGeolocation();
```

### usaLocationItems

Recupera gli elementi filtrati per vicinanza geografica:

```typescript
import { useLocationItems } from '@/hooks/use-location-items';
const { items, isLoading } = useLocationItems(coordinates, radius);
```

### usaUserLocation

Gestisce la preferenza di posizione memorizzata dell'utente:

```typescript
import { useUserLocation } from '@/hooks/use-user-location';
const { location, setLocation, clearLocation } = useUserLocation();
```

## Geocodifica

Il modello fornisce la geocodifica attraverso l'endpoint `/api/geocode` , supportando sia la geocodifica diretta (dall'indirizzo alle coordinate) che la geocodifica inversa (dalle coordinate all'indirizzo). Il servizio di geocodificazione si trova a `lib/services/geocoding/` .

## Completamento automatico indirizzo

```typescript
interface AddressSuggestion {
  id: string;
  mainText: string;          // Street address
  secondaryText: string;     // City, state
  fullAddress: string;
  coordinates?: Coordinates;
}
```

##Configurazione

```bash
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id

# Mapbox (alternative)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_token
```

Il provider viene selezionato automaticamente in base alla chiave API configurata.
