---
id: location-config
title: "Referenz zur Standortkonfiguration"
sidebar_label: "Standort"
sidebar_position: 13
---

# Referenz zur Standortkonfiguration

Diese Seite dokumentiert alle Standort- und Karteneinstellungen, die in der Vorlage verfügbar sind. Die Konfiguration fließt von Ihrem YAML-Inhalts-Repository über den `SettingsProvider` in React-Komponenten.

## Konfigurationsquelle

Standorteinstellungen werden im Abschnitt `settings.location` der `config.yml` Ihres Inhalts-Repositorys definiert:

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

## Konfigurationstypen

### LocationConfigSettings (YAML / snake_case)

Die rohe Form, die aus `config.yml` gelesen wird, definiert in `lib/types/location.ts`:

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

### LocationSettings (Laufzeit / camelCase)

Die Laufzeitform, die in der gesamten Anwendung verwendet wird:

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

Die Funktion `mapLocationConfigToRuntime()` konvertiert snake_case YAML-Einstellungen in das camelCase-Laufzeitformat.

### Einstellungsbeschreibungen

| Einstellung | Typ | Standard | Beschreibung |
|-------------|-----|----------|---------------|
| `enabled` | `boolean` | `false` | Hauptschalter für alle Standortfunktionen |
| `provider` | `MapProvider` | `'mapbox'` | Kartenkachel- und Geocoding-Anbieter |
| `mapStyle` | `MapStyle` | `'streets'` | Kartenrenderingstil |
| `distanceFilterEnabled` | `boolean` | `true` | Entfernungsradiusfilter in der Suche anzeigen |
| `distanceSortEnabled` | `boolean` | `true` | Ergebnisse nach Entfernung sortieren erlauben |
| `defaultRadiusKm` | `number` | `50` | Standard-Suchradius in Kilometern |
| `showExactAddress` | `boolean` | `false` | Vollständige Adressen öffentlich anzeigen |
| `requireLocationOnSubmit` | `boolean` | `false` | Standort für Einreichungen erforderlich machen |
| `defaultCenter` | `{lat, lng}` | `{0, 0}` | Fallback-Kartenmittelpunkt-Koordinaten |

## Kartenanbieter

### `MapProvider`

```typescript
type MapProvider = 'mapbox' | 'google';
```

| Anbieter | Umgebungsvariable | Funktionen |
|----------|-------------------|-----------|
| Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` | Vektorkacheln, Geocoding, Clustering |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Kacheln, Places API, Geocoding |

### `MapStyle`

```typescript
type MapStyle = 'streets' | 'satellite';
```

### `MapProviderStatus`

API-Schlüssel-Status für die Admin-Benutzeroberfläche.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Antwort vom Endpunkt `/api/map-status`.

```typescript
interface MapStatusResponse {
  mapbox: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
  google: { isConfigured: boolean; isPreviewAvailable: boolean; name: string };
}
```

## Koordinatensystem

### `Coordinates`

Der standardmäßige geografische Punkttyp, der in allen Kartenkomponenten verwendet wird.

```typescript
interface Coordinates {
  latitude: number;
  longitude: number;
}
```

### `MapBounds`

Begrenzungsrahmen für Viewport-Berechnungen.

```typescript
interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
```

### `GeoBoundingBox`

Alternativer Begrenzungsrahmen für Datenbankabfragen.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

## Standortdaten

### `LocationData`

Elementstandort, der in der Datenbanktabelle `item_location_index` gespeichert ist.

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

Parameter für näherungsbasierte Elementsuchen.

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
