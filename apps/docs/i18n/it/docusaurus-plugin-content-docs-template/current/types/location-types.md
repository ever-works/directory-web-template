---
id: location-types
title: Definizioni del tipo di posizione
sidebar_label: Tipi di posizione
sidebar_position: 7
---

# Definizioni del tipo di posizione

**Fonte:** `lib/types/location.ts`

Il modulo di posizione fornisce definizioni di tipo complete per le funzionalità di geolocalizzazione, tra cui la configurazione del provider di mappe, le impostazioni di posizione, le query geografiche e l'archiviazione dei dati sulla posizione. Supporta sia i provider Mapbox che Google Maps.

## Tipi di enumerazione

### `MapProvider`

Opzioni del provider di mappe supportate:

```typescript
type MapProvider = 'mapbox' | 'google';
```

### `MapStyle`

Opzioni di stile di rendering della mappa:

```typescript
type MapStyle = 'streets' | 'satellite';
```

## Tipi di impostazioni

### `LocationConfigSettings`

Impostazioni di configurazione memorizzate in `config.yml` utilizzando la denominazione `snake_case`. Utilizzato durante l'analisi della sezione `settings.location` del file di configurazione.

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

Impostazioni della posizione di runtime utilizzando la denominazione `camelCase`. Utilizzato in tutta l'applicazione per l'accesso indipendente dai tipi.

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

**Differenze fondamentali rispetto a `LocationConfigSettings`:**
- Tutti i campi sono obbligatori (non facoltativi) perché vengono applicate le impostazioni predefinite
- Utilizza la denominazione `camelCase` invece di `snake_case`
- La tupla `default_center` viene convertita in un oggetto denominato `{ latitude, longitude }`

## Valori predefiniti

### `DEFAULT_LOCATION_SETTINGS`

Valori predefiniti applicati quando le impostazioni non sono configurate:

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

## Tipi di dati

### `LocationData`

Dati sulla posizione per gli elementi archiviati nella tabella `item_location_index`. Questa è una struttura di solo indice; la fonte della verità rimane nei file YAML.

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

## Tipi di stato API

### `MapProviderStatus`

Informazioni sullo stato per un singolo provider di mappe, utilizzate nell'interfaccia utente di amministrazione per mostrare lo stato configurato/non configurato senza esporre le chiavi API.

```typescript
interface MapProviderStatus {
  provider: MapProvider;
  isConfigured: boolean;
  displayName: string;
}
```

### `MapStatusResponse`

Risposta dall'endpoint API `map-status`, che riporta lo stato di configurazione per entrambi i provider.

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

## Tipi di query geografiche

### `GeoBoundingBox`

Riquadro di delimitazione per query geospaziali, che definisce una regione rettangolare sulla mappa.

```typescript
interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}
```

### `LocationQueryOptions`

Opzioni per query di articoli basate sulla posizione. Supporta la ricerca per raggio, il filtro per città/paese e l'inclusione di elementi remoti.

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

Risultato di una query di elemento basata sulla posizione, incluso il calcolo della distanza.

```typescript
interface LocationQueryResult {
  itemSlug: string;
  distanceKm?: number;
  city: string | null;
  country: string | null;
}
```

## Funzioni

### `mapLocationConfigToRuntime`

Mappa le impostazioni di configurazione `snake_case` da YAML alle impostazioni di runtime `camelCase`. Applica le impostazioni predefinite per tutti i campi mancanti.

```typescript
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

**Esempio:**

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

## Esempi di utilizzo

### Interrogazione di elementi per posizione

```typescript
import type { LocationQueryOptions } from '@/lib/types/location';

const query: LocationQueryOptions = {
  latitude: 40.7128,
  longitude: -74.006,
  radiusKm: 25,
  includeRemote: true,
};
```

### Controllo dello stato del fornitore della mappa

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

### Utilizzo del riquadro di delimitazione per le query del viewport

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

## Note di progettazione

### Configurazione e modello di runtime

Il modulo di localizzazione utilizza un sistema di tipo a due livelli:

1. **Tipi di configurazione** (`LocationConfigSettings`) utilizza `snake_case` per corrispondere alle convenzioni dei file YAML
2. **Tipi runtime** (`LocationSettings`) utilizzare `camelCase` per TypeScript idiomatico
3. La funzione `mapLocationConfigToRuntime()` collega i due, applicando le impostazioni predefinite

Questo modello garantisce che i file YAML rimangano leggibili dall'uomo mentre il codice dell'applicazione segue le convenzioni TypeScript.

### Dati sulla posizione solo indice

`LocationData` è archiviato nella tabella del database `item_location_index` per query geografiche veloci, ma la fonte attendibile per le posizioni degli elementi rimane nei file di contenuto YAML. L'indice viene ricostruito quando gli elementi vengono aggiornati.

### Considerazioni sulla privacy

L'impostazione `showExactAddress` (impostazione predefinita: `false`) controlla se vengono visualizzati indirizzi precisi. Se disabilitato, agli utenti vengono mostrate solo le informazioni a livello di città/paese.

## Tipi correlati

- [`ItemLocationData`](./item-types.md) - Dati sulla posizione incorporati nei file YAML dell'elemento
- [`ItemListOptions`](./item-types.md) - Il filtraggio degli elementi supporta i campi `city`, `country` e `includeRemote`
