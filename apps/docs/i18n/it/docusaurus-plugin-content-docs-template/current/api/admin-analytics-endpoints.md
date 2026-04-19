---
id: admin-analytics-endpoints
title: "Endpoint Admin Analytics"
sidebar_label: "Admin Analytics"
---

# Endpoint Admin Analytics

L'API di analisi amministrativa fornisce dati di analisi geografica per il pannello di amministrazione, incluse statistiche di copertura, ripartizioni per distribuzione e dati per la visualizzazione su mappa. Tutti gli endpoint richiedono l'autenticazione come amministratore.

## Panoramica

| Endpoint | Metodo | Auth | Descrizione |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Amministratore | Ottieni dati di analisi geografica |

## Ottieni Analisi Geografica

```
GET /api/admin/geo-analytics
```

Restituisce un'analisi completa della distribuzione geografica, incluse le statistiche di copertura, le distribuzioni per paese/città/area di servizio, le coordinate per i marker della mappa e i dati per la heatmap. Questo endpoint aggrega i dati sia dall'indice delle posizioni che dal repository degli elementi.

**Autenticazione:** Amministratore richiesto (tramite `checkAdminAuth()`)

**Caching:** Disabilitato -- utilizza `force-dynamic`, `revalidate: 0` e `force-no-store` per garantire dati aggiornati nel pannello di amministrazione.

**Risposta di successo (200):**

```json
{
  "success": true,
  "data": {
    "stats": {
      "totalIndexed": 450,
      "totalItems": 500,
      "itemsWithLocation": 420,
      "itemsRemote": 30,
      "coveragePercent": 84.0,
      "indexHealth": {
        "synced": true,
        "indexCount": 390,
        "expectedCount": 390
      },
      "citiesCount": 85,
      "countriesCount": 25,
      "remoteCount": 30,
      "lastIndexedAt": "2024-01-20T10:30:00.000Z",
      "lastRebuildAt": "2024-01-15T08:00:00.000Z"
    },
    "distributions": {
      "byCountry": [
        { "name": "United States", "count": 150 },
        { "name": "United Kingdom", "count": 80 },
        { "name": "Germany", "count": 45 }
      ],
      "byCity": [
        { "name": "San Francisco", "count": 35 },
        { "name": "London", "count": 28 },
        { "name": "Berlin", "count": 20 }
      ],
      "byServiceArea": [
        { "area": "North America", "count": 200 },
        { "area": "Europe", "count": 180 }
      ]
    },
    "locations": [
      {
        "itemSlug": "example-tool",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "city": "San Francisco",
        "country": "United States",
        "isRemote": false
      }
    ],
    "heatmapData": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 51.5074, "lng": -0.1278 }
    ]
  }
}
```

### Campi della risposta

#### Oggetto Stats

| Campo | Tipo | Descrizione |
|---|---|---|
| `totalIndexed` | intero | Totale voci nell'indice delle posizioni |
| `totalItems` | intero | Totale elementi nel repository |
| `itemsWithLocation` | intero | Elementi con dati di posizione o contrassegnati come remoti |
| `itemsRemote` | intero | Elementi contrassegnati come remoti/distribuiti |
| `coveragePercent` | numero | Percentuale di elementi con dati di posizione (arrotondato a 1 decimale) |
| `indexHealth.synced` | booleano | Indica se il conteggio dell'indice corrisponde al conteggio atteso |
| `indexHealth.indexCount` | intero | Voci non remote nell'indice |
| `indexHealth.expectedCount` | intero | Voci non remote attese in base ai dati sorgente |
| `citiesCount` | intero | Numero di città distinte nell'indice |
| `countriesCount` | intero | Numero di paesi distinti nell'indice |
| `remoteCount` | intero | Numero di voci remote nell'indice |
| `lastIndexedAt` | stringa o null | Timestamp ISO dell'ultimo aggiornamento dell'indice |
| `lastRebuildAt` | stringa o null | Timestamp ISO dell'ultima ricostruzione completa |

#### Oggetto Distributions

| Campo | Descrizione |
|---|---|
| `byCountry` | Array di nomi di paesi con conteggi, ordinati per conteggio decrescente |
| `byCity` | Prime 20 città con conteggi, ordinate per conteggio decrescente |
| `byServiceArea` | Aree di servizio con conteggi, ordinate per conteggio decrescente |

#### Array Locations

Ogni oggetto di posizione fornisce dati per i marker della mappa. Gli elementi remoti alle coordinate `(0, 0)` vengono filtrati per evitare visualizzazioni errate sulla mappa.

#### Dati Heatmap

Array di coppie latitudine/longitudine solo per le voci non remote, adatte per il rendering di heatmap di densità.

### Fonti dei dati

L'endpoint aggrega i dati da tre query parallele:

1. **Location Index Service** (`getLocationIndexService().getIndexStats()`) -- fornisce le statistiche dell'indice
2. **Location Index Entries** (`getAllLocationEntries()`) -- fornisce tutte le posizioni indicizzate per i calcoli di distribuzione
3. **Item Repository** (`itemRepository.findAll()`) -- fornisce i dati degli elementi sorgente per i calcoli di copertura

### Calcolo della copertura

La percentuale di copertura è calcolata come:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Un elemento viene conteggiato come "con posizione" se ha una coordinata di latitudine o è contrassegnato come remoto (`is_remote: true`).

### Stato dell'indice

Lo stato dell'indice confronta il numero di voci non remote nell'indice delle posizioni con il conteggio atteso derivato dai dati sorgente:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Quando `synced` è false, gli amministratori dovrebbero considerare di ricostruire l'indice delle posizioni tramite l'endpoint `/api/admin/location-index`.

| Stato | Condizione |
|---|---|
| 401 | Non autenticato come amministratore |
| 500 | Errore interno del server |

**Sorgente:** `template/app/api/admin/geo-analytics/route.ts`
