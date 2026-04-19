---
id: admin-analytics-endpoints
title: "Admin Analytics Endpoints"
sidebar_label: "Admin Analytics Endpoints"
---

# Admin Analytics Eindpunten

De admin analytics API levert geografische analysegegevens voor het beheerdashboard, inclusief dekkingsstatistieken, distributieoverzichten en kaartvisualisatiegegevens. Alle eindpunten vereisen beheerdersauthenticatie.

## Overzicht

| Eindpunt | Methode | Auth | Beschrijving |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Admin | Geografische analysegegevens ophalen |

## Geografische Analyse Ophalen

```
GET /api/admin/geo-analytics
```

Geeft uitgebreide geografische distributieanalyses terug, inclusief dekkingsstatistieken, land-/stad-/servicegebiedsdistributies, locatiecoördinaten voor kaartmarkeringen en heatmapgegevens. Dit eindpunt aggregeert gegevens uit zowel de locatie-index als de itemrepository.

**Authenticatie:** Beheerder vereist (via `checkAdminAuth()`)

**Caching:** Uitgeschakeld — gebruikt `force-dynamic`, `revalidate: 0`, en `force-no-store` om verse gegevens voor het beheerdashboard te garanderen.

**Succesvol Antwoord (200):**

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

### Antwoordvelden

#### Stats-object

| Veld | Type | Beschrijving |
|---|---|---|
| `totalIndexed` | integer | Totaal aantal vermeldingen in de locatie-index |
| `totalItems` | integer | Totaal aantal items in de repository |
| `itemsWithLocation` | integer | Items met locatiegegevens of gemarkeerd als extern |
| `itemsRemote` | integer | Items gemarkeerd als extern/gedistribueerd |
| `coveragePercent` | number | Percentage items met locatiegegevens (afgerond op 1 decimaal) |
| `indexHealth.synced` | boolean | Of het indexaantal overeenkomt met het verwachte aantal |
| `indexHealth.indexCount` | integer | Niet-externe vermeldingen in de index |
| `indexHealth.expectedCount` | integer | Verwachte niet-externe vermeldingen op basis van brongegevens |
| `citiesCount` | integer | Aantal unieke steden in de index |
| `countriesCount` | integer | Aantal unieke landen in de index |
| `remoteCount` | integer | Aantal externe vermeldingen in de index |
| `lastIndexedAt` | string of null | ISO-tijdstempel van laatste indexupdate |
| `lastRebuildAt` | string of null | ISO-tijdstempel van laatste volledige herbouw |

#### Distributions-object

| Veld | Beschrijving |
|---|---|
| `byCountry` | Array van landnamen met aantallen, gesorteerd op aantal aflopend |
| `byCity` | Top 20 steden met aantallen, gesorteerd op aantal aflopend |
| `byServiceArea` | Servicegebieden met aantallen, gesorteerd op aantal aflopend |

#### Locations-array

Elk locatieobject levert gegevens voor kaartmarkeringen. Externe items op coördinaten `(0, 0)` worden gefilterd om misleidende kaartweergaven te voorkomen.

#### Heatmapgegevens

Array van breedtegraad-/lengtegraadparen voor uitsluitend niet-externe vermeldingen, geschikt voor het renderen van dichtheidsheatmaps.

### Gegevensbronnen

Het eindpunt aggregeert gegevens uit drie parallelle queries:

1. **Locatie-indexservice** (`getLocationIndexService().getIndexStats()`) — levert indexstatistieken
2. **Locatie-indexvermeldingen** (`getAllLocationEntries()`) — levert alle geïndexeerde locaties voor distributieberekeningen
3. **Itemrepository** (`itemRepository.findAll()`) — levert bronitemgegevens voor dekkingsberekeningen

### Dekkingsberekening

Het dekkingspercentage wordt berekend als:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Een item telt als "heeft locatie" als het een breedtegraadcoördinaat heeft of gemarkeerd is als extern (`is_remote: true`).

### Indexgezondheid

Indexgezondheid vergelijkt het aantal niet-externe vermeldingen in de locatie-index met het verwachte aantal afgeleid uit brongegevens:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Wanneer `synced` onwaar is, moeten beheerders overwegen de locatie-index opnieuw op te bouwen via het eindpunt `/api/admin/location-index`.

| Status | Voorwaarde |
|---|---|
| 401 | Niet geauthenticeerd als beheerder |
| 500 | Interne serverfout |

**Bron:** `template/app/api/admin/geo-analytics/route.ts`
