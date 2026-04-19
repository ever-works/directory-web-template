---
id: location-types
title: Definities van locatietypes
sidebar_label: Locatietypen
sidebar_position: 7
---

# Definities van locatietypes

**Bron:** `lib/types/location.ts`

De locatiemodule biedt uitgebreide typedefinities voor geolocatiefuncties, waaronder configuratie van kaartproviders, locatie-instellingen, geoquery's en opslag van locatiegegevens. Het ondersteunt zowel Mapbox- als Google Maps-providers.

## Enum-typen

### `MapProvider`

Ondersteunde kaartprovideropties:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Opties voor kaartweergavestijl:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Instellingen typen

### `LocationConfigSettings`

Configuratie-instellingen zoals opgeslagen in `config.yml` met `snake_case` naamgeving. Wordt gebruikt bij het parseren van de sectie `settings.location` van het configuratiebestand.

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

Runtime-locatie-instellingen met `camelCase`-naamgeving. Wordt in de hele applicatie gebruikt voor typeveilige toegang.

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

**Belangrijkste verschillen met `LocationConfigSettings`:**
- Alle velden zijn verplicht (niet-optioneel) omdat standaardwaarden worden toegepast
- Gebruikt `camelCase` naamgeving in plaats van `snake_case`
- `default_center` tupel wordt geconverteerd naar een benoemd `{ latitude, longitude }` object

## Standaardwaarden

### `DEFAULT_LOCATION_SETTINGS`

Standaardwaarden die worden toegepast wanneer de instellingen niet zijn geconfigureerd:

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

## Gegevenstypen

### `LocationData`

Locatiegegevens voor items die zijn opgeslagen in de `item_location_index` tabel. Dit is een alleen-indexstructuur; de bron van de waarheid blijft in YAML-bestanden.

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

## API-statustypen

### `MapProviderStatus`

Statusinformatie voor een enkele kaartprovider, gebruikt in de beheerdersinterface om de geconfigureerde/niet-geconfigureerde status weer te geven zonder API-sleutels bloot te leggen.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Reactie van het `map-status` API-eindpunt, waarin de configuratiestatus voor beide providers wordt gerapporteerd.

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

## Geo-querytypen

### `GeoBoundingBox`

Begrenzingsvak voor georuimtelijke zoekopdrachten, waarbij een rechthoekig gebied op de kaart wordt gedefinieerd.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Opties voor locatiegebaseerde artikelquery's. Ondersteunt zoeken op straal, stad-/landfiltering en externe itemopname.

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

Resultaat van een locatiegebaseerde artikelzoekopdracht, inclusief afstandsberekening.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Functies

### `mapLocationConfigToRuntime`

Mapt `snake_case` configuratie-instellingen van YAML naar `camelCase` runtime-instellingen. Past standaardwaarden toe voor ontbrekende velden.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Voorbeeld:**

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

## Gebruiksvoorbeelden

### Items opvragen op locatie

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Status van kaartaanbieder controleren

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

### Begrenzingsvak gebruiken voor viewport-query's

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

## Ontwerpnotities

### Configuratie versus runtimepatroon

De locatiemodule maakt gebruik van een tweelaags systeem:

1. **Config-typen** (`LocationConfigSettings`) gebruiken `snake_case` om overeen te komen met de YAML-bestandsconventies
2. **Runtime-typen** (`LocationSettings`) gebruiken `camelCase` voor idiomatische TypeScript
3. De functie `mapLocationConfigToRuntime()` overbrugt de twee en past standaardwaarden toe

Dit patroon zorgt ervoor dat YAML-bestanden leesbaar blijven voor mensen, terwijl de applicatiecode de TypeScript-conventies volgt.

### Alleen indexlocatiegegevens

`LocationData` wordt opgeslagen in de `item_location_index` databasetabel voor snelle geoquery's, maar de bron van waarheid voor itemlocaties blijft in de YAML-inhoudsbestanden. De index wordt opnieuw opgebouwd wanneer items worden bijgewerkt.

### Privacyoverwegingen

De instelling `showExactAddress` (standaard: `false`) bepaalt of precieze adressen worden weergegeven. Indien uitgeschakeld, wordt alleen informatie op stad-/landniveau aan gebruikers getoond.

## Gerelateerde typen

- [`ItemLocationData`](./item-types.md) - Locatiegegevens ingebed in item YAML-bestanden
- [`ItemListOptions`](./item-types.md) - Artikelfiltering ondersteunt de velden `city`, `country` en `includeRemote`
