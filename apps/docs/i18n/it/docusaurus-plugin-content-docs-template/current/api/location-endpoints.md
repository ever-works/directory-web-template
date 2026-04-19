---
id: location-endpoints
title: "Riferimento API Posizione"
sidebar_label: "Posizione"
sidebar_position: 51
---

# Riferimento API Posizione

## Panoramica

Gli endpoint di posizione forniscono accesso all'indice di posizione spaziale degli elementi nella directory. Supportano la ricerca di elementi per città, paese, ricerca di prossimità basata su raggio e il recupero dei dati delle coordinate per il rendering delle mappe. Tutti gli endpoint di posizione richiedono che la funzionalità di posizione sia abilitata nelle impostazioni di sistema.

## Endpoint

### GET /api/location/cities

Restituisce un elenco di nomi di città distinti dall'indice di posizione.

**Richiesta**

Nessun parametro richiesto.

**Risposta**
```typescript
{
  success: true;
  data: string[];   // Array di nomi di città, es. ["San Francisco", "London", "Tokyo"]
}
```

**Esempio**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Restituisce un elenco di nomi di paesi distinti dall'indice di posizione.

**Richiesta**

Nessun parametro richiesto.

**Risposta**
```typescript
{
  success: true;
  data: string[];   // Array di nomi di paesi, es. ["United States", "United Kingdom"]
}
```

**Esempio**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Restituisce le coordinate di tutti gli elementi indicizzati, con filtraggio opzionale per città o paese. Utilizzato per il rendering dei marker sulla mappa. Gli elementi remoti vengono automaticamente esclusi.

**Richiesta**

| Parametro | Tipo   | In    | Descrizione |
|-----------|--------|-------|-------------|
| city      | string | query | Filtra per nome città (non distingue maiuscole/minuscole) |
| country   | string | query | Filtra per nome paese (non distingue maiuscole/minuscole) |

**Risposta**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Identificatore slug dell'elemento
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Esempio**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Cerca elementi per posizione geografica utilizzando la prossimità basata su raggio, il nome della città o il nome del paese. Restituisce gli slug degli elementi corrispondenti e le informazioni opzionali sulla distanza.

**Richiesta**

| Parametro | Tipo   | In    | Descrizione |
|-----------|--------|-------|-------------|
| near_lat  | number | query | Latitudine per la ricerca per raggio |
| near_lng  | number | query | Longitudine per la ricerca per raggio |
| radius    | number | query | Raggio in km (predefinito: 50) |
| city      | string | query | Filtra per nome città |
| country   | string | query | Filtra per nome paese |

È richiesto almeno un parametro di ricerca: `near_lat` + `near_lng`, `city` o `country`.

**Risposta**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array di slug degli elementi corrispondenti
    distances: Record<string, number>;  // Mappa slug-distanza-km (solo ricerca per raggio)
  };
}
```

**Esempio**
```typescript
// Ricerca per raggio: elementi entro 25 km da San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Ricerca per città
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Autenticazione

Tutti gli endpoint di posizione sono **pubblici** -- non è richiesta autenticazione. Tuttavia, la funzionalità di posizione deve essere abilitata nelle impostazioni di sistema. Se le funzionalità di posizione sono disabilitate, tutti gli endpoint restituiscono un errore `404` con `"Location features are disabled"`.

## Codici di Errore

| Stato | Descrizione |
|--------|-------------|
| 400 | Coordinate non valide, raggio non valido o parametri di ricerca obbligatori mancanti |
| 404 | Le funzionalità di posizione sono disabilitate nelle impostazioni di sistema |
| 500 | Errore interno del server -- errore nella query del database |

## Limite di Frequenza

Non viene applicato alcun limite di frequenza esplicito a questi endpoint. Gli elementi remoti/virtuali vengono automaticamente esclusi dai risultati delle coordinate.

## Endpoint Correlati

- [Endpoint di Geocodifica](./geocode-endpoints) -- Geocodifica diretta e inversa (solo amministratori)
