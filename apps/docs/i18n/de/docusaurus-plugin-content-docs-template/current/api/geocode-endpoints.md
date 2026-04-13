---
id: geocode-endpoints
title: "Geocode API Reference"
sidebar_label: "Geocode API Reference"
---

# Geocode-API-Referenz

## Übersicht

Die Geocode-Endpunkte bieten Vorwärts-Geocodierung (Adresse zu Koordinaten) und Rückwärts-Geocodierung (Koordinaten zu Adresse). Ergebnisse werden 15 Minuten gecacht, um externe API-Aufrufe zu reduzieren. Diese Endpunkte erfordern Admin-Authentifizierung, um Kostenmissbrauch der zugrundeliegenden Mapbox/Google-Geocodierungsdienste zu verhindern.

## Endpunkte

### POST /api/geocode

Konvertiert eine Adresse in Koordinaten (Vorwärts-Geocodierung) oder Koordinaten in eine Adresse (Rückwärts-Geocodierung). Der Anfragekörper bestimmt, welche Operation ausgeführt wird.

#### Vorwärts-Geocodierung (Adresse zu Koordinaten)

**Anfrage**
```typescript
{
  address: string;          // 1–500 Zeichen, erforderlich
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2-Codes, z. B. ["US", "CA"]
    language?: string;        // ISO 639-1-Sprachcode, z. B. "en"
    proximity?: {
      latitude: number;       // -90 bis 90
      longitude: number;      // -180 bis 180
    };
  };
}
```

**Antwort**
```typescript
{
  success: true;
  data: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
    confidence: number;       // 0 bis 1
  };
}
```

**Beispiel**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    address: '1600 Amphitheatre Parkway, Mountain View, CA',
    options: {
      countryCodes: ['US'],
      language: 'en'
    }
  })
});
const data = await response.json();
```

#### Rückwärts-Geocodierung (Koordinaten zu Adresse)

**Anfrage**
```typescript
{
  latitude: number;         // -90 bis 90, erforderlich
  longitude: number;        // -180 bis 180, erforderlich
  options?: {
    language?: string;        // ISO 639-1-Sprachcode
  };
}
```

**Antwort**
```typescript
{
  success: true;
  data: {
    formattedAddress: string;
    streetAddress: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    postalCode: string;
  };
}
```

### GET /api/geocode

Gibt den Status des Geocodierungsdienstes zurück, einschließlich konfigurierter Anbieter und Cache-Statistiken.

**Antwort**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Ob Standortfeatures aktiviert sind
    configured: boolean;      // Ob ein Geocodierungsanbieter konfiguriert ist
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Aktuelle Cache-Größe
      maxSize: number;        // Maximale Cache-Größe (1000)
      ttlMs: number;          // Cache-TTL in Millisekunden (900000 = 15 Min.)
    };
  };
}
```

## Authentifizierung

- **GET /api/geocode**: Erfordert eine authentifizierte Sitzung (jeder Benutzer).
- **POST /api/geocode**: Erfordert eine authentifizierte Sitzung mit **Admin-Rolle**. Nicht-Admin-Benutzer erhalten eine `403 Forbidden`-Antwort.

## Fehlerantworten

| Status | Beschreibung |
|--------|--------------|
| 400 | Ungültige Anfragedaten – fehlerhafte Adresse, ungültige Koordinaten oder Schema-Validierungsfehler |
| 401 | Nicht autorisiert – keine authentifizierte Sitzung |
| 403 | Verboten – Admin-Zugriff erforderlich (nur POST) |
| 404 | Keine Geocodierungsergebnisse für die angegebene Adresse oder Koordinaten gefunden |
| 503 | Standortfeatures in Einstellungen deaktiviert oder Geocodierungsdienst nicht konfiguriert |

## Ratenbegrenzung

Ergebnisse werden 15 Minuten gecacht (TTL 900.000 ms) mit einer maximalen Cache-Größe von 1.000 Einträgen. Alle Geocodierungsanfragen werden für Kostenverfolgungszwecke protokolliert.

## Verwandte Endpunkte

- [Standort-Endpunkte](./location-endpoints) – Standortsuche, Städte, Länder und Koordinaten
