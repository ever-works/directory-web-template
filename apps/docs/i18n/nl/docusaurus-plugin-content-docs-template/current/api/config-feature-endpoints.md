---
id: config-feature-endpoints
title: "Config & Feature Flags API Reference"
sidebar_label: "Config & Feature Flags API Reference"
---

# Configuratie & Feature Flags API Referentie

## Overzicht

Het Config Features-eindpunt geeft de huidige beschikbaarheidsvlaggen van functies voor de applicatie. Deze vlaggen geven aan welke database-afhankelijke functies actief zijn, zodat de frontend netjes kan terugvallen wanneer functies niet beschikbaar zijn. Dit is een openbaar, gecached eindpunt ontworpen voor intensief gebruik.

## Eindpunten

### GET /api/config/features

Geeft de huidige functiebeschikbaarheid terug op basis van systeemconfiguratie en databasebeschikbaarheid.

**Verzoek**

Geen parameters of lichaam vereist.

**Antwoord**
```typescript
{
  ratings: boolean;         // Of de beoordelingsfunctie beschikbaar is
  comments: boolean;        // Of de opmerkingenfunctie beschikbaar is
  favorites: boolean;       // Of de favorietenfunctie beschikbaar is
  featuredItems: boolean;   // Of de uitgelichte items-functie beschikbaar is
  surveys: boolean;         // Of de enquêtesfunctie beschikbaar is
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/config/features');
const features = await response.json();

if (features.ratings) {
  // Beoordelingscomponent renderen
}

if (!features.surveys) {
  // Enquêtesectie verbergen
}
```

## Authenticatie

Dit eindpunt is **openbaar** -- geen authenticatie vereist. Het is ontworpen om door de frontend bij het laden van de eerste pagina te worden gebruikt om te bepalen welke UI-functies moeten worden weergegeven.

## Foutantwoorden

| Status | Beschrijving |
|--------|-------------|
| 200 | Feature flags succesvol opgehaald |
| 500 | Interne fout -- geeft alle vlaggen als `false` terug voor veiligheid met `no-cache`-header |

Bij fouten geeft het eindpunt alle functies als `false` terug om ervoor te zorgen dat de applicatie veilig faalt in plaats van gebroken functionaliteit bloot te stellen.

## Snelheidsbeperking

Antwoorden worden gecached met de volgende headers:
- `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`
- Effectief 5 minuten gecached op CDN-niveau met een stale-while-revalidate venster van 10 minuten.

Foutantwoorden gebruiken `Cache-Control: no-cache` om het cachen van een gedegradeerde toestand te voorkomen.

## Gerelateerde Eindpunten

- [Gezondheids-eindpunten](./health-endpoints) -- Databaseverbindingsgezondheidscontrole
