---
id: geocode-endpoints
title: "Geocode API Reference"
sidebar_label: "Geocode API Reference"
---

# Geocode API-referentie

## Overzicht

De Geocode-eindpunten bieden mogelijkheden voor voorwaartse geocodering (adres naar coördinaten) en omgekeerde geocodering (coördinaten naar adres). Resultaten worden 15 minuten gecached om externe API-aanroepen te verminderen. Deze eindpunten vereisen beheerdersauthenticatie om kostenmisbruik van de onderliggende Mapbox/Google-geocoderingsservices te voorkomen.

## Eindpunten

### POST /api/geocode

Converteert een adres naar coördinaten (voorwaartse geocodering) of coördinaten naar een adres (omgekeerde geocodering). De aanvraagbody bepaalt welke bewerking wordt uitgevoerd op basis van of het veld `address` of de velden `latitude`/`longitude` worden opgegeven.

#### Voorwaartse geocodering (adres naar coördinaten)

**Aanvraag**
```typescript
{
  address: string;          // 1-500 tekens, vereist
  options?: {
    countryCodes?: string[];  // ISO 3166-1 alpha-2-codes, bijv. ["US", "CA"]
    language?: string;        // ISO 639-1-taalcode, bijv. "en"
    proximity?: {
      latitude: number;       // -90 tot 90
      longitude: number;      // -180 tot 180
    };
  };
}
```

**Reactie**
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
    confidence: number;       // 0 tot 1
  };
}
```

**Voorbeeld**
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

#### Omgekeerde geocodering (coördinaten naar adres)

**Aanvraag**
```typescript
{
  latitude: number;         // -90 tot 90, vereist
  longitude: number;        // -180 tot 180, vereist
  options?: {
    language?: string;        // ISO 639-1-taalcode
  };
}
```

**Reactie**
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

**Voorbeeld**
```typescript
const response = await fetch('/api/geocode', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latitude: 37.4224764,
    longitude: -122.0842499,
    options: { language: 'en' }
  })
});
const data = await response.json();
```

### GET /api/geocode

Geeft de status van de geocoderingsservice terug, inclusief welke providers zijn geconfigureerd en cachestatistieken.

**Aanvraag**

Geen aanvraagbody vereist. Authenticatie via sessiecookie.

**Reactie**
```typescript
{
  success: true;
  data: {
    enabled: boolean;         // Of locatiefuncties zijn ingeschakeld
    configured: boolean;      // Of er een geocoderingsprovider is geconfigureerd
    providers: {
      mapbox: boolean;
      google: boolean;
    };
    cache: {
      size: number;           // Huidige cachegrootte
      maxSize: number;        // Maximale cachegrootte (1000)
      ttlMs: number;          // Cache-TTL in milliseconden (900000 = 15 min)
    };
  };
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/geocode');
const status = await response.json();
// status.data.providers.mapbox === true
```

## Authenticatie

- **GET /api/geocode**: Vereist een geauthenticeerde sessie (elke gebruiker).
- **POST /api/geocode**: Vereist een geauthenticeerde sessie met **beheerdersrol**. Niet-beheerdersgebruikers ontvangen een `403 Forbidden`-reactie. Deze beperking voorkomt API-kostenmisbruik.

## Foutreacties

| Status | Beschrijving |
|--------|-------------|
| 400 | Ongeldige aanvraaggegevens -- slecht adres, ongeldige coördinaten, of schemavalidatiefout |
| 401 | Niet geautoriseerd -- geen geauthenticeerde sessie |
| 403 | Verboden -- beheerderstoegang vereist (alleen POST) |
| 404 | Geen geocoderingsresultaten gevonden voor het opgegeven adres of de opgegeven coördinaten |
| 503 | Locatiefuncties zijn uitgeschakeld in de instellingen, of geocoderingsservice is niet geconfigureerd |

## Snelheidsbeperking

Resultaten worden gecached gedurende 15 minuten (TTL 900.000 ms) met een maximale cachegrootte van 1.000 vermeldingen. Alle geocoderingsaanvragen worden voor kostenbewaking geauditlogd.

## Gerelateerde eindpunten

- [Location Endpoints](./location-endpoints) -- Locatiezoekfunctie, steden, landen en coördinaten
