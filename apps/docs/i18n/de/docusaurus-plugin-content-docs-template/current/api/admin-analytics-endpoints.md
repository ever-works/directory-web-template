---
id: admin-analytics-endpoints
title: "Admin Analytics Endpoints"
sidebar_label: "Admin Analytics Endpoints"
---

# Admin Analytics Endpunkte

Die Admin-Analytics-API liefert geografische Analysedaten für das Admin-Dashboard, einschließlich Abdeckungsstatistiken, Verteilungsübersichten und Kartenvisualisierungsdaten. Alle Endpunkte erfordern Admin-Authentifizierung.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|---|---|---|---|
| `/api/admin/geo-analytics` | GET | Admin | Geografische Analysedaten abrufen |

## Geografische Analysen abrufen

```
GET /api/admin/geo-analytics
```

Gibt umfassende geografische Verteilungsanalysen zurück, einschließlich Abdeckungsstatistiken, Länder-/Stadt-/Servicegebietsverteilungen, Standortkoordinaten für Kartenmarkierungen und Heatmap-Daten. Dieser Endpunkt aggregiert Daten aus dem Standortindex und dem Element-Repository.

**Authentifizierung:** Admin erforderlich (via `checkAdminAuth()`)

**Caching:** Deaktiviert – verwendet `force-dynamic`, `revalidate: 0` und `force-no-store`, um aktuelle Daten für das Admin-Dashboard sicherzustellen.

**Erfolgsantwort (200):**

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

### Antwortfelder

#### Stats-Objekt

| Feld | Typ | Beschreibung |
|---|---|---|
| `totalIndexed` | integer | Gesamteinträge im Standortindex |
| `totalItems` | integer | Gesamtelemente im Repository |
| `itemsWithLocation` | integer | Elemente mit Standortdaten oder als Remote markiert |
| `itemsRemote` | integer | Als Remote/Verteilt markierte Elemente |
| `coveragePercent` | number | Prozentsatz der Elemente mit Standortdaten (auf 1 Dezimalstelle gerundet) |
| `indexHealth.synced` | boolean | Ob die Indexanzahl mit der erwarteten Anzahl übereinstimmt |
| `indexHealth.indexCount` | integer | Nicht-Remote-Einträge im Index |
| `indexHealth.expectedCount` | integer | Erwartete Nicht-Remote-Einträge basierend auf Quelldaten |
| `citiesCount` | integer | Anzahl unterschiedlicher Städte im Index |
| `countriesCount` | integer | Anzahl unterschiedlicher Länder im Index |
| `remoteCount` | integer | Anzahl der Remote-Einträge im Index |
| `lastIndexedAt` | string oder null | ISO-Zeitstempel der letzten Indexaktualisierung |
| `lastRebuildAt` | string oder null | ISO-Zeitstempel des letzten vollständigen Rebuilds |

#### Distributions-Objekt

| Feld | Beschreibung |
|---|---|
| `byCountry` | Array von Ländernamen mit Anzahl, absteigend sortiert |
| `byCity` | Top 20 Städte mit Anzahl, absteigend sortiert |
| `byServiceArea` | Servicegebiete mit Anzahl, absteigend sortiert |

#### Locations-Array

Jedes Standortobjekt liefert Daten für Kartenmarkierungen. Remote-Elemente bei Koordinaten `(0, 0)` werden herausgefiltert, um irreführende Kartenanzeigen zu vermeiden.

#### Heatmap-Daten

Array von Breiten-/Längengradspaaren nur für Nicht-Remote-Einträge, geeignet für die Darstellung von Dichte-Heatmaps.

### Datenquellen

Der Endpunkt aggregiert Daten aus drei parallelen Abfragen:

1. **Location Index Service** (`getLocationIndexService().getIndexStats()`) – liefert Indexstatistiken
2. **Location Index Entries** (`getAllLocationEntries()`) – liefert alle indizierten Standorte für Verteilungsberechnungen
3. **Item Repository** (`itemRepository.findAll()`) – liefert Quellelementdaten für Abdeckungsberechnungen

### Abdeckungsberechnung

Der Abdeckungsprozentsatz wird berechnet als:

```
coveragePercent = round((itemsWithLocation / totalItems) * 100, 1)
```

Ein Element gilt als „mit Standort versehen", wenn es eine Breitengradkoordinate hat oder als Remote markiert ist (`is_remote: true`).

### Index-Gesundheit

Die Index-Gesundheit vergleicht die Anzahl der Nicht-Remote-Einträge im Standortindex mit der erwarteten Anzahl aus den Quelldaten:

```
expectedCount = itemsWithLocation - itemsRemote
indexCount = totalIndexed - remoteCount
synced = (indexCount === expectedCount)
```

Wenn `synced` false ist, sollten Administratoren einen Rebuild des Standortindex über den Endpunkt `/api/admin/location-index` in Betracht ziehen.

| Status | Bedingung |
|---|---|
| 401 | Nicht als Admin authentifiziert |
| 500 | Interner Serverfehler |

**Quelle:** `template/app/api/admin/geo-analytics/route.ts`
