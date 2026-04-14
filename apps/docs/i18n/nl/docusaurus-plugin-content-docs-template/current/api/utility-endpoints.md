---
id: utility-endpoints
title: "Utility API Endpoints"
sidebar_label: "Utility API Endpoints"
---

# Utility API-eindpunten

Utility-eindpunten bieden infrastructuurservices, waaronder gezondheidschecks, versie-informatie, functieconfiguratie, geocodering, reCAPTCHA-verificatie, URL-extractie, locatiegegevens en interne bewerkingen.

## Gezondheidscheck (`/api/health`)

### Databasegezondheid

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/health/database` | Databaseconnectiviteit controleren |

Geeft de verbindingsstatus van de database terug. Gebruikt door monitoringsystemen en gezondheidschecks bij implementatie.

**Reactie (gezond):**

```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Reactie (ongezond):**

```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "Connection refused",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Authenticatie:** Openbaar (geen authenticatie vereist). Dit eindpunt moet toegankelijk zijn voor load balancers en monitoringservices.

## Versie (`/api/version`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/version` | Versie-informatie van de applicatie ophalen |
| `GET` | `/api/version/sync` | Versie- en synchronisatiestatus ophalen |

### Versiereactie

Geeft de applicatieversie, build-informatie en runtime-omgeving terug:

```json
{
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Versie + Synchronisatiestatus

Het eindpunt `/api/version/sync` breidt de versie-informatie uit met de synchronisatiestatus van de contentrepository, handig voor het debuggen van de versheid van content.

**Authenticatie:** Openbaar.

## Functieconfiguratie (`/api/config`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/config/features` | Ingeschakelde functievlaggen ophalen |

Geeft de huidige configuratie van functievlaggen terug voor de client-side applicatie. Hierdoor kan de frontend functies voorwaardelijk weergeven op basis van server-side configuratie.

**Reactie:**

```json
{
  "features": {
    "payments": true,
    "sponsorAds": true,
    "surveys": false,
    "map": true,
    "newsletter": true
  }
}
```

**Authenticatie:** Openbaar. Functievlaggen zijn geen gevoelige gegevens.

## URL-extractie (`/api/extract`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `POST` | `/api/extract` | Metadata uit een URL extraheren |

Haalt een URL op en extraheert metadata zoals titel, beschrijving, afbeelding en favicon. Gebruikt door het formulier voor het indienen van items om velden automatisch in te vullen vanuit een URL.

**Aanvraag:**

```json
{
  "url": "https://example.com/product"
}
```

**Reactie:**

```json
{
  "success": true,
  "data": {
    "title": "Product Name",
    "description": "Product description from meta tags",
    "image": "https://example.com/og-image.png",
    "favicon": "https://example.com/favicon.ico",
    "siteName": "Example.com"
  }
}
```

**Authenticatie:** Vereist. Voorkomt misbruik van server-side URL-ophaling.

## Geocodering (`/api/geocode`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `POST` | `/api/geocode` | Een adres geocoderen naar coördinaten |

Converteert een tekstadres naar geografische coördinaten (breedte-/lengtegraad) met behulp van een externe geocoderingsservice.

**Aanvraag:**

```json
{
  "address": "1600 Amphitheatre Parkway, Mountain View, CA"
}
```

**Reactie:**

```json
{
  "success": true,
  "data": {
    "lat": 37.4224764,
    "lng": -122.0842499,
    "formattedAddress": "1600 Amphitheatre Pkwy, Mountain View, CA 94043, USA"
  }
}
```

**Authenticatie:** Vereist.

## Locatiegegevens (`/api/location`)

Eindpunten voor het zoeken naar locaties en referentiegegevens.

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/location/countries` | Alle landen weergeven |
| `GET` | `/api/location/cities` | Steden weergeven (met landfilter) |
| `GET` | `/api/location/coordinates` | Coördinaten ophalen voor een locatie |
| `GET` | `/api/location/search` | Locaties zoeken op querystring |

### Landen

Geeft een lijst van landen terug met ISO-codes, namen en optionele metadata.

### Steden

Ondersteunt filteren op landcode:

```
GET /api/location/cities?country=US
```

### Locatiezoekopdracht

Zoeken in volledige tekst op locatie:

```
GET /api/location/search?q=San Francisco
```

**Authenticatie:** Openbaar.

## reCAPTCHA-verificatie (`/api/verify-recaptcha`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `POST` | `/api/verify-recaptcha` | Een reCAPTCHA-token verifiëren |

Server-side verificatie van Google reCAPTCHA-tokens. Gebruikt door formulieren die botbeveiliging vereisen.

**Aanvraag:**

```json
{
  "token": "recaptcha-response-token"
}
```

**Reactie:**

```json
{
  "success": true,
  "score": 0.9,
  "action": "submit"
}
```

**Authenticatie:** Openbaar (reCAPTCHA wordt doorgaans op openbare formulieren gebruikt).

## Referentiegegevens (`/api/reference`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `GET` | `/api/reference` | Referentiegegevens voor formulierdropdowns ophalen |

Geeft referentiegegevens terug die worden gebruikt om dropdown-menu's en selectievelden in de applicatie te vullen, zoals prijsmodellen, licentietypen en platformcategorieën.

**Authenticatie:** Openbaar.

## Interne bewerkingen (`/api/internal`)

| Methode | Pad | Beschrijving |
|---------|-----|-------------|
| `POST` | `/api/internal/db-init` | Databaseschema initialiseren en gegevens seeden |

### Database-initialisatie

Het eindpunt `/api/internal/db-init` triggert databasemigratie en optionele invoeging van seed-gegevens. Dit wordt doorgaans eenmalig aangeroepen tijdens de initiële implementatie of bij het herstellen van een ontwikkelomgeving.

**Authenticatie:** Dit eindpunt moet worden beveiligd via omgevingsspecifieke toegangscontroles of een gedeeld geheim. Het is niet bedoeld voor regelmatig gebruik.

## Beveiligingsoverwegingen

### Openbare eindpunten

De volgende utility-eindpunten zijn opzettelijk openbaar:
- Gezondheidschecks (nodig voor monitoring/load balancers)
- Versie-informatie (niet gevoelig)
- Functievlaggen (niet-gevoelige configuratie)
- Locatiegegevens (referentiegegevens)
- reCAPTCHA-verificatie (openbare formulierbeveiliging)
- Referentiegegevens (dropdown-waarden)

### Beveiligde eindpunten

Deze eindpunten vereisen authenticatie om misbruik te voorkomen:
- URL-extractie (voorkomt misbruik van server-side request forgery)
- Geocodering (beperkte externe API-aanroepen)
- Database-initialisatie (destructieve bewerking)
