---
id: location-config
title: "Riferimento Configurazione Posizione"
sidebar_label: "Posizione"
sidebar_position: 13
---

# Riferimento Configurazione Posizione

Questa pagina documenta ogni impostazione di posizione e mappa disponibile nel template. La configurazione fluisce dal repository di contenuti YAML attraverso il `SettingsProvider` nei componenti React.

## Sorgente di Configurazione

Le impostazioni di posizione sono definite nella sezione `settings.location` del file `config.yml` del repository di contenuti:

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

## Tipi di Configurazione

### LocationConfigSettings (YAML / snake_case)

La struttura raw letta da `config.yml`, definita in `lib/types/location.ts`:

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

La struttura runtime utilizzata in tutta l'applicazione:

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

La funzione `mapLocationConfigToRuntime()` converte le impostazioni YAML snake_case nel formato runtime camelCase.

### Descrizioni delle Impostazioni

| Impostazione | Tipo | Predefinito | Descrizione |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Interruttore principale per tutte le funzioni di posizione |
| `provider` | `MapProvider` | `'mapbox'` | Provider di tile mappa e geocodifica |
| `mapStyle` | `MapStyle` | `'streets'` | Stile di rendering della mappa |
| `distanceFilterEnabled` | `boolean` | `true` | Mostra filtro raggio distanza nella ricerca |
| `distanceSortEnabled` | `boolean` | `true` | Consenti ordinamento risultati per distanza |
| `defaultRadiusKm` | `number` | `50` | Raggio di ricerca predefinito in chilometri |
| `showExactAddress` | `boolean` | `false` | Visualizza indirizzi completi pubblicamente |
| `requireLocationOnSubmit` | `boolean` | `false` | Rendi la posizione obbligatoria per gli invii |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Coordinate del centro mappa di fallback |

## Provider Mappa

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Provider | Var. d'Ambiente | Funzionalità |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Tile vettoriali, geocodifica, clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Tile, API Places, geocodifica |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

Stato della chiave API per l'interfaccia admin.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Risposta dall'endpoint `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Sistema di Coordinate

### `Coordinates`

Il tipo di punto geografico standard utilizzato in tutti i componenti mappa.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Bounding box per calcoli del viewport.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Bounding box alternativo per query del database.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Dati di Posizione

### `LocationData`

Posizione dell'elemento conservata nella tabella del database `item_location_index`.

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

Parametri per ricerche di elementi basati sulla prossimità.

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

Risultato di una ricerca basata sulla posizione.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Configurazione del Componente Mappa

### `MapComponentProps`

Props per il componente principale `Map`.

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

Configurazione del clustering dei marker.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Attiva/disattiva i controlli UI della mappa.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Preferenze di Posizione dell'Utente

Gli utenti possono impostare preferenze di posizione predefinite nel loro profilo cliente (salvato nella tabella `client_profiles`):

| Colonna | Tipo | Descrizione |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | Latitudine predefinita dell'utente |
| `default_longitude` | `doublePrecision` | Longitudine predefinita dell'utente |
| `default_city` | `text` | Città predefinita dell'utente |
| `default_country` | `text` | Paese predefinito dell'utente |
| `location_privacy` | `text` | `'private'` (predefinito) o `'public'` |

## Variabili d'Ambiente

| Var. d'Ambiente | Richiesta | Descrizione |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Per Mapbox | Token di accesso Mapbox GL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Per Google | Chiave API Google Maps |

## Pagine Correlate

- [Tipi di Posizione](../types/location-types.md) -- definizioni complete dei tipi per le funzioni di posizione
- [Configurazione Mappa](./map-config.md) -- configurazione UI mappa aggiuntiva
- [Configurazione Funzionalità](./feature-config.md) -- impostazioni dei flag delle funzionalità
