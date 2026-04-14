---
id: utility-endpoints
title: "Utility API Endpoints"
sidebar_label: "Utility API Endpoints"
---

# Hilfsprogramm-Endpunkte

Diese Endpunkte bieten System-Hilfsfunktionen wie Gesundheitsprüfungen, Versionsinformationen, Feature-Konfiguration, URL-Extraktion, Geokodierung und Standortdaten.

## Übersicht

| Endpunkt | Methode | Authentifizierung | Beschreibung |
|----------|---------|-------------------|--------------|
| `/api/health` | GET | Öffentlich | Systemgesundheit prüfen |
| `/api/version` | GET | Öffentlich | App-Version und Git-Metadaten |
| `/api/config` | GET | Öffentlich | Öffentliche Feature-Konfiguration |
| `/api/extract-url` | POST | Öffentlich | URL-Metadaten extrahieren |
| `/api/geocode` | GET | Benutzer | Adresse geokodieren |
| `/api/location/countries` | GET | Öffentlich | Länderliste abrufen |
| `/api/location/cities` | GET | Öffentlich | Städteliste abrufen |
| `/api/location/search` | GET | Öffentlich | Standort suchen |
| `/api/verify-recaptcha` | POST | Öffentlich | reCAPTCHA-Token verifizieren |

## Gesundheitsprüfung

```
GET /api/health
```

Gibt den Systemstatus und die Datenbankverbindung zurück.

**Erfolgsantwort (200):**

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-20T10:00:00.000Z"
}
```

| Status | Bedingung |
|--------|-----------|
| 200 | System und Datenbank bereit |
| 503 | Datenbankverbindung fehlgeschlagen |

**Quelle:** `template/app/api/health/route.ts`

## Version

```
GET /api/version
```

Gibt App-Version und Git-Commit-Metadaten zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "version": "1.2.3",
    "commit": "abc1234",
    "branch": "main",
    "buildDate": "2024-01-20T10:00:00.000Z"
  }
}
```

**Quelle:** `template/app/api/version/route.ts`

## Feature-Konfiguration

```
GET /api/config
```

Gibt öffentliche Feature-Flags und Konfigurationswerte zurück. Sensible Informationen werden nicht offengelegt.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "features": {
      "payments": true,
      "sponsorAds": true,
      "surveys": false,
      "newsletter": true
    },
    "paymentProvider": "stripe",
    "availableCurrencies": ["USD", "EUR", "GBP"]
  }
}
```

**Quelle:** `template/app/api/config/route.ts`

## URL-Metadaten extrahieren

```
POST /api/extract-url
```

Extrahiert Metadaten (Titel, Beschreibung, OG-Bild) aus einer externen URL.

**Anfragekörper:**

```json
{ "url": "https://example.com/some-page" }
```

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "title": "Seitentitel",
    "description": "Seitenbeschreibung",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico"
  }
}
```

| Status | Bedingung |
|--------|-----------|
| 400 | Fehlende oder ungültige URL |
| 422 | URL nicht erreichbar oder Metadaten nicht extrahierbar |

**Quelle:** `template/app/api/extract-url/route.ts`

## Geokodierung

```
GET /api/geocode?address=Berlin+Deutschland
```

Kodiert eine Adresse oder einen Ortsnamen in Koordinaten. Erfordert eine Benutzer-Session.

**Abfrageparameter:**

| Parameter | Typ | Erforderlich | Beschreibung |
|-----------|-----|--|--------------|
| `address` | string | Ja | Zu kodierende Adresse |
| `provider` | string | Nein | `mapbox` oder `google` (Standard: konfiguriert) |

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": {
    "latitude": 52.52,
    "longitude": 13.405,
    "formattedAddress": "Berlin, Deutschland",
    "components": {
      "city": "Berlin",
      "country": "DE",
      "postalCode": "10115"
    }
  }
}
```

**Quelle:** `template/app/api/geocode/route.ts`

## Standortdaten

### Länder abrufen

```
GET /api/location/countries
```

Gibt eine Liste aller Länder für Formulare und Filter zurück.

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "data": [
    { "code": "DE", "name": "Deutschland" },
    { "code": "AT", "name": "Österreich" },
    { "code": "CH", "name": "Schweiz" }
  ]
}
```

### Städte abrufen

```
GET /api/location/cities?country=DE
```

Gibt eine Liste von Städten für ein bestimmtes Land zurück.

**Abfrageparameter:**

| Parameter | Typ | Erforderlich |
|-----------|-----|--------------|
| `country` | string | Ja (ISO-3166-1 alpha-2) |

### Standortsuche

```
GET /api/location/search?q=Berlin
```

Volltext-Standortsuche über Länder und Städte.

**Quelle:** `template/app/api/location/`

## reCAPTCHA-Verifizierung

Siehe [reCAPTCHA-Endpunkte](/api/recaptcha-endpoints) für die vollständige Dokumentation.

```
POST /api/verify-recaptcha
```

**Anfragekörper:**

```json
{ "token": "03AGdBq25..." }
```

**Erfolgsantwort (200):**

```json
{
  "success": true,
  "score": 0.9
}
```
