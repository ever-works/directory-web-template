---
id: location-config
title: "Locatieconfiguratie Referentie"
sidebar_label: "Locatie"
sidebar_position: 13
---

# Locatieconfiguratie Referentie

Deze pagina documenteert elke locatie- en kaartinstelling die beschikbaar is in het template. De configuratie stroomt vanuit uw YAML-contentrepository via de `SettingsProvider` naar React-componenten.

## Configuratiebron

Locatie-instellingen worden gedefinieerd in de sectie `settings.location` van het `config.yml`-bestand van uw contentrepository:

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

## Configuratietypes

### LocationConfigSettings (YAML / snake_case)

De ruwe structuur gelezen uit `config.yml`, gedefinieerd in `lib/types/location.ts`:

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

De runtime-structuur die door de gehele applicatie wordt gebruikt:

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

De functie `mapLocationConfigToRuntime()` converteert snake_case YAML-instellingen naar het camelCase runtime-formaat.

### Instellingsbeschrijvingen

| Instelling | Type | Standaard | Beschrijving |
|---------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Hoofdschakelaar voor alle locatiefuncties |
| `provider` | `MapProvider` | `'mapbox'` | Kaarttegelreikwijdte en geocoderingsprovider |
| `mapStyle` | `MapStyle` | `'streets'` | Kaartrenderstijl |
| `distanceFilterEnabled` | `boolean` | `true` | Toon afstandsradiusfilter in zoekresultaten |
| `distanceSortEnabled` | `boolean` | `true` | Sta sortering op afstand toe |
| `defaultRadiusKm` | `number` | `50` | Standaard zoekstraal in kilometers |
| `showExactAddress` | `boolean` | `false` | Toon volledige adressen publiekelijk |
| `requireLocationOnSubmit` | `boolean` | `false` | Maak locatie verplicht bij inzendingen |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Fallback-coördinaten voor het kaartcentrum |

## Kaartproviders

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Provider | Omgevingsvariabele | Functies |
|----------|---------|----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Vectortegels, geocodering, clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Tegels, Places API, geocodering |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

API-sleutelstatus voor de beheerinterface.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Reactie van het `/api/map-status`-eindpunt.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Coördinatensysteem

### `Coordinates`

Het standaard geografische punttype dat in alle kaartcomponenten wordt gebruikt.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Begrenzingsvak voor viewportberekeningen.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Alternatief begrenzingsvak voor databasequery's.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Locatiegegevens

### `LocationData`

Itemlocatie opgeslagen in de databasetabel `item_location_index`.

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

Parameters voor op nabijheid gebaseerde itemzoekopdrachten.

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

Resultaat van een op locatie gebaseerde zoekopdracht.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Kaartcomponentconfiguratie

### `MapComponentProps`

Props voor het hoofd `Map`-component.

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

Configuratie van markerclustering.

```typescript
interface ClusterOptions {
  radius?: number;      // Cluster radius in pixels (default: 60)
  maxZoom?: number;      // Max zoom for clustering (default: 16)
  minZoom?: number;      // Min zoom for clustering (default: 0)
  minPoints?: number;    // Min points to form cluster (default: 2)
}
```

### `MapControlsConfig`

Schakel UI-bedieningselementen van de kaart in/uit.

```typescript
interface MapControlsConfig {
  showZoomControls?: boolean;
  showFullscreenControl?: boolean;
  showNavigationControl?: boolean;
  showScaleControl?: boolean;
}
```

## Gebruikerslocatievoorkeuren

Gebruikers kunnen standaard locatievoorkeuren instellen in hun klantprofiel (opgeslagen in de tabel `client_profiles`):

| Kolom | Type | Beschrijving |
|--------|------|-------------|
| `default_latitude` | `doublePrecision` | Standaard breedtegraad van de gebruiker |
| `default_longitude` | `doublePrecision` | Standaard lengtegraad van de gebruiker |
| `default_city` | `text` | Standaard stad van de gebruiker |
| `default_country` | `text` | Standaard land van de gebruiker |
| `location_privacy` | `text` | `'private'` (standaard) of `'public'` |

## Omgevingsvariabelen

| Omgevingsvariabele | Vereist | Beschrijving |
|---------|----------|-------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Voor Mapbox | Mapbox GL-toegangstoken |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Voor Google | Google Maps API-sleutel |

## Gerelateerde pagina's

- [Locatietypen](../types/location-types.md) -- volledige typedefinities voor locatiefuncties
- [Kaartconfiguratie](./map-config.md) -- aanvullende configuratie van de kaart-UI
- [Functieconfiguratie](./feature-config.md) -- instellingen voor functiemarkeringen
