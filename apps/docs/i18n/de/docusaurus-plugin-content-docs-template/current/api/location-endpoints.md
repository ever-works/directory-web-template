---
id: location-endpoints
title: "Location API Reference"
sidebar_label: "Location API Reference"
---

# Standort-API-Referenz

## Übersicht

Die Standort-Endpunkte bieten Zugriff auf den räumlichen Standortindex für Einträge im Verzeichnis. Sie unterstützen Abfragen von Einträgen nach Stadt, Land, radiusbasierter Nähesuche und das Abrufen von Koordinatendaten für Kartenrendering. Alle Standort-Endpunkte erfordern, dass das Standort-Feature in den Systemeinstellungen aktiviert ist.

## Endpunkte

### GET /api/location/cities

Gibt eine Liste eindeutiger Stadtnamen aus dem Standortindex zurück.

**Anfrage**

Keine Parameter erforderlich.

**Antwort**
```typescript
{
  success: true;
  data: string[];   // Array von Stadtnamen, z. B. ["San Francisco", "London", "Tokyo"]
}
```

### GET /api/location/countries

Gibt eine Liste eindeutiger Ländernamen aus dem Standortindex zurück.

**Anfrage**

Keine Parameter erforderlich.

**Antwort**
```typescript
{
  success: true;
  data: string[];   // Array von Ländernamen, z. B. ["United States", "United Kingdom"]
}
```

### GET /api/location/coordinates

Gibt Koordinaten für alle indizierten Einträge zurück, mit optional er Filterung nach Stadt oder Land. Wird für das Rendern von Kartenmarkierungen verwendet. Remote-Einträge werden automatisch ausgeschlossen.

**Anfrage**

| Parameter | Typ | In | Beschreibung |
|-----------|-----|----|--------------|
| city | string | query | Nach Stadtname filtern (Groß-/Kleinschreibung egal) |
| country | string | query | Nach Ländername filtern (Groß-/Kleinschreibung egal) |

**Antwort**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Eintrags-Slug-Identifier
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

### GET /api/location/search

Sucht nach Einträgen nach geografischem Standort mit radiusbasierter Nähe, Stadtname oder Ländername. Gibt passende Eintrags-Slugs und optional Entfernungsinformationen zurück.

**Anfrage**

| Parameter | Typ | In | Beschreibung |
|-----------|-----|----|--------------|
| near_lat | number | query | Breitengrad für die Radiussuche |
| near_lng | number | query | Längengrad für die Radiussuche |
| radius | number | query | Radius in km (Standard: 50) |
| city | string | query | Nach Stadtname filtern |
| country | string | query | Nach Ländername filtern |

Mindestens ein Suchparameter ist erforderlich: `near_lat` + `near_lng`, `city` oder `country`.

**Antwort**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array passender Eintrags-Slugs
    distances: Record<string, number>;  // Slug-zu-Entfernung-km-Zuordnung (nur Radiussuche)
  };
}
```

**Beispiel**
```typescript
// Radiussuche: Einträge innerhalb von 25 km von San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }
```

## Authentifizierung

Alle Standort-Endpunkte sind **öffentlich** – keine Authentifizierung erforderlich. Das Standort-Feature muss jedoch in den Systemeinstellungen aktiviert sein. Wenn Standortfeatures deaktiviert sind, geben alle Endpunkte einen `404`-Fehler mit `"Location features are disabled"` zurück.

## Fehlerantworten

| Status | Beschreibung |
|--------|--------------|
| 400 | Ungültige Koordinaten, ungültiger Radius oder fehlende erforderliche Suchparameter |
| 404 | Standortfeatures sind in den Systemeinstellungen deaktiviert |
| 500 | Interner Server-Fehler – Datenbankabfragefehler |

## Verwandte Endpunkte

- [Geocode-Endpunkte](./geocode-endpoints) – Vorwärts- und Rückwärts-Geocodierung (nur Admin)
