---
id: location-types
title: Standorttypdefinitionen
sidebar_label: Standorttypen
sidebar_position: 7
---

# Standorttypdefinitionen

**Quelle:** `lib/types/location.ts`

Das Standortmodul bietet umfassende Typdefinitionen für Geolokalisierungsfunktionen, einschließlich Kartenanbieterkonfiguration, Standorteinstellungen, Geoabfragen und Standortdatenspeicherung. Es unterstützt sowohl Mapbox- als auch Google Maps-Anbieter.

## Aufzählungstypen

### `MapProvider`

Unterstützte Kartenanbieteroptionen:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Optionen für den Kartenrendering-Stil:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Einstellungstypen

### `LocationConfigSettings`

Konfigurationseinstellungen wie in `config.yml` unter Verwendung von `snake_case` Benennung gespeichert. Wird beim Parsen des Abschnitts `settings.location` der Konfigurationsdatei verwendet.

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

Laufzeitstandorteinstellungen mit `camelCase` Benennung. Wird in der gesamten Anwendung für typsicheren Zugriff verwendet.

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

**Hauptunterschiede zu `LocationConfigSettings`:**
- Alle Felder sind Pflichtfelder (nicht optional), da Standardwerte angewendet werden
- Verwendet `camelCase` Benennung anstelle von `snake_case`
- `default_center` Tupel wird in ein benanntes `{ latitude, longitude }` Objekt konvertiert

## Standardwerte

### `DEFAULT_LOCATION_SETTINGS`

Standardwerte werden angewendet, wenn die Einstellungen nicht konfiguriert sind:

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

## Datentypen

### `LocationData`

Standortdaten für Artikel, die in der Tabelle `item_location_index` gespeichert sind. Dies ist eine reine Indexstruktur. Die Quelle der Wahrheit bleibt in den YAML-Dateien.

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

## API-Statustypen

### `MapProviderStatus`

Statusinformationen für einen einzelnen Kartenanbieter, die in der Admin-Benutzeroberfläche verwendet werden, um den konfigurierten/nicht konfigurierten Status anzuzeigen, ohne API-Schlüssel offenzulegen.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Antwort vom `map-status` API-Endpunkt, der den Konfigurationsstatus für beide Anbieter meldet.

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

## Geo-Abfragetypen

### `GeoBoundingBox`

Begrenzungsrahmen für Geodatenabfragen, der einen rechteckigen Bereich auf der Karte definiert.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Optionen für standortbasierte Artikelabfragen. Unterstützt Umkreissuche, Stadt-/Landfilterung und Einbeziehung entfernter Artikel.

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

Ergebnis einer ortsbezogenen Artikelabfrage inklusive Entfernungsberechnung.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Funktionen

### `mapLocationConfigToRuntime`

Ordnet `snake_case` Konfigurationseinstellungen von YAML `camelCase` Laufzeiteinstellungen zu. Wendet Standardwerte für alle fehlenden Felder an.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Beispiel:**

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

## Anwendungsbeispiele

### Elemente nach Standort abfragen

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Status des Kartenanbieters wird überprüft

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

### Verwenden des Begrenzungsrahmens für Ansichtsfensterabfragen

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

## Designhinweise

### Konfiguration vs. Laufzeitmuster

Das Standortmodul verwendet ein zweischichtiges Typensystem:

1. **Konfigurationstypen** (`LocationConfigSettings`) verwenden `snake_case`, um den YAML-Dateikonventionen zu entsprechen
2. **Laufzeittypen** (`LocationSettings`) verwenden `camelCase` für idiomatisches TypeScript
3. Die Funktion `mapLocationConfigToRuntime()` verbindet beides und wendet Standardwerte an

Dieses Muster stellt sicher, dass YAML-Dateien für Menschen lesbar bleiben, während der Anwendungscode den TypeScript-Konventionen folgt.

### Nur indexbasierte Standortdaten

`LocationData` wird für schnelle Geoabfragen in der Datenbanktabelle `item_location_index` gespeichert, die Quelle der Wahrheit für Artikelstandorte bleibt jedoch in den YAML-Inhaltsdateien. Der Index wird neu erstellt, wenn Elemente aktualisiert werden.

### Überlegungen zum Datenschutz

Die Einstellung `showExactAddress` (Standard: `false`) steuert, ob genaue Adressen angezeigt werden. Wenn die Funktion deaktiviert ist, werden den Benutzern nur Informationen auf Stadt-/Länderebene angezeigt.

## Verwandte Typen

- [`ItemLocationData`](./item-types.md) – Standortdaten eingebettet in Artikel-YAML-Dateien
- [`ItemListOptions`](./item-types.md) – Die Elementfilterung unterstützt die Felder `city`, `country` und `includeRemote`
