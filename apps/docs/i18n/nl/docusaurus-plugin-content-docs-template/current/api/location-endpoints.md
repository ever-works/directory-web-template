---
id: location-endpoints
title: "Location API Reference"
sidebar_label: "Location API Reference"
---

# Locatie API-referentie

## Overzicht

De Locatie-eindpunten bieden toegang tot de ruimtelijke locatie-index voor items in de directory. Ze ondersteunen het opvragen van items per stad, land, nabijheidszoekopdrachten op basis van straal, en het ophalen van coördinatengegevens voor kaartweergave. Alle locatie-eindpunten vereisen dat de locatiefunctie is ingeschakeld in de systeeminstellingen.

## Eindpunten

### GET /api/location/cities

Geeft een lijst van afzonderlijke stadsnamen uit de locatie-index terug.

**Aanvraag**

Geen parameters vereist.

**Reactie**
```typescript
{
  success: true;
  data: string[];   // Array van stadsnamen, bijv. ["San Francisco", "London", "Tokyo"]
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/location/cities');
const { data: cities } = await response.json();
// cities = ["San Francisco", "New York", "London", ...]
```

### GET /api/location/countries

Geeft een lijst van afzonderlijke landnamen uit de locatie-index terug.

**Aanvraag**

Geen parameters vereist.

**Reactie**
```typescript
{
  success: true;
  data: string[];   // Array van landnamen, bijv. ["United States", "United Kingdom"]
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/location/countries');
const { data: countries } = await response.json();
```

### GET /api/location/coordinates

Geeft coördinaten terug voor alle geïndexeerde items, met optioneel filteren op stad of land. Gebruikt voor het weergeven van kaartmarkeringen. Externe items worden automatisch uitgesloten.

**Aanvraag**

| Parameter | Type   | In    | Beschrijving |
|-----------|--------|-------|-------------|
| city      | string | query | Filteren op stadsnaam (hoofdletterongevoelig) |
| country   | string | query | Filteren op landnaam (hoofdletterongevoelig) |

**Reactie**
```typescript
{
  success: true;
  data: Array<{
    slug: string;        // Slug-identificator van het item
    latitude: number;
    longitude: number;
    city: string | null;
    country: string | null;
  }>;
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/location/coordinates?country=United States');
const { data: coordinates } = await response.json();
// coordinates[0] = { slug: "my-item", latitude: 37.77, longitude: -122.41, city: "San Francisco", country: "United States" }
```

### GET /api/location/search

Zoekt naar items op geografische locatie met behulp van nabijheid op basis van straal, stadsnaam of landnaam. Geeft overeenkomende item-slugs en optionele afstandsinformatie terug.

**Aanvraag**

| Parameter | Type   | In    | Beschrijving |
|-----------|--------|-------|-------------|
| near_lat  | number | query | Breedtegraad voor straalzoekopdracht |
| near_lng  | number | query | Lengtegraad voor straalzoekopdracht |
| radius    | number | query | Straal in km (standaard: 50) |
| city      | string | query | Filteren op stadsnaam |
| country   | string | query | Filteren op landnaam |

Minimaal één zoekparameter is vereist: `near_lat` + `near_lng`, `city`, of `country`.

**Reactie**
```typescript
{
  success: true;
  data: {
    slugs: string[];                    // Array van overeenkomende item-slugs
    distances: Record<string, number>;  // Slug-naar-afstand-km-tabel (alleen bij straalzoekopdracht)
  };
}
```

**Voorbeeld**
```typescript
// Straalzoekopdracht: items binnen 25 km van San Francisco
const response = await fetch('/api/location/search?near_lat=37.7749&near_lng=-122.4194&radius=25');
const { data } = await response.json();
// data.slugs = ["item-a", "item-b"]
// data.distances = { "item-a": 2.3, "item-b": 15.7 }

// Stadzoekopdracht
const cityResponse = await fetch('/api/location/search?city=London');
const cityData = await cityResponse.json();
// cityData.data.slugs = ["item-c", "item-d"]
```

## Authenticatie

Alle locatie-eindpunten zijn **openbaar** -- er is geen authenticatie vereist. De locatiefunctie moet echter zijn ingeschakeld in de systeeminstellingen. Als locatiefuncties zijn uitgeschakeld, geven alle eindpunten een `404` terug met `"Location features are disabled"`.

## Foutreacties

| Status | Beschrijving |
|--------|-------------|
| 400 | Ongeldige coördinaten, ongeldige straal, of ontbrekende verplichte zoekparameters |
| 404 | Locatiefuncties zijn uitgeschakeld in de systeeminstellingen |
| 500 | Interne serverfout -- databasequeryprobleem |

## Snelheidsbeperking

Er wordt geen expliciete snelheidsbeperking toegepast op deze eindpunten. Externe/virtuele items worden automatisch uitgesloten van coördinatenresultaten.

## Gerelateerde eindpunten

- [Geocode Endpoints](./geocode-endpoints) -- Voorwaartse en omgekeerde geocodering (alleen beheerder)
