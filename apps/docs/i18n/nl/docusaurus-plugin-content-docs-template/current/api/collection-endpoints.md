---
id: collection-endpoints
title: "Collection API Endpoints"
sidebar_label: "Collection API Endpoints"
---

# Collectie API Eindpunten

De Collecties API biedt een openbaar eindpunt voor het controleren of actieve collecties bestaan in het systeem. Collecties worden opgeslagen in de database en beheerd via de collectierepositorylaag.

**Bronbestand:** `template/app/api/collections/exists/route.ts`

## Eindpuntoverzicht

| Methode | Pad | Auth | Beschrijving |
|---------|-----|------|-------------|
| GET | `/api/collections/exists` | Geen | Controleer of actieve collecties bestaan |

---

## GET `/api/collections/exists`

Controleert of er actieve collecties beschikbaar zijn. Geeft een boolean `exists`-vlag terug samen met het aantal actieve collecties. Dit is een openbaar eindpunt dat voornamelijk door de frontend wordt gebruikt om te bepalen of collectie-gerelateerde UI-elementen moeten worden weergegeven.

### Queryparameters

Geen.

### Hoe Het Werkt

De handler gebruikt de `collectionRepository` om alle actieve collecties op te halen en controleert vervolgens of het resultaat een niet-lege array is:

```ts
const collections = await collectionRepository.findAll({
  includeInactive: false
});

const hasCollections =
  Array.isArray(collections) && collections.length > 0;

return NextResponse.json({
  exists: hasCollections,
  count: collections?.length || 0
});
```

### Antwoordvorm

#### 200 -- Collecties Gevonden

```json
{
  "exists": true,
  "count": 5
}
```

#### 200 -- Geen Collecties

```json
{
  "exists": false,
  "count": 0
}
```

#### 500 -- Serverfout

Bij fouten geeft het eindpunt een 500-status terug met een generiek foutbericht. Gedetailleerde foutinformatie wordt alleen aan de serverzijde gelogd:

```json
{
  "exists": false,
  "count": 0,
  "error": "Failed to check collections existence"
}
```

### Authenticatie

Dit is een **openbaar eindpunt** -- geen authenticatie vereist.

### Gebruiksvoorbeeld

```ts
// Controleer of collecties bestaan alvorens collectiesectie te renderen
const res = await fetch('/api/collections/exists');
const data = await res.json();

if (data.exists) {
  console.log(`${data.count} actieve collecties beschikbaar`);
  // Render collectienavigatie
}
```

### Verschillen met Categorieën-eindpunt

| Aspect | Categorieën | Collecties |
|--------|------------|----------|
| Gegevensbron | Git-gebaseerde CMS-inhoud | Database via repositorylaag |
| Foutgedrag | Geeft 200 terug met `exists: false` | Geeft 500 terug met foutbericht |
| Filterondersteuning | Locale-parameter | Alleen-actief filter (vastgecodeerd) |
| Vereist database | Nee | Ja |

### Notities

- Alleen **actieve** collecties worden geteld. Inactieve collecties worden uitgesloten door het filter `includeInactive: false`.
- Gedetailleerde fouten worden aan de serverzijde gelogd en nooit aan de client blootgesteld (om informatieblootstelling te voorkomen).
- Het eindpunt vereist een werkende databaseverbinding omdat collecties database-gebaseerd zijn.

### Gerelateerde Bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/collections/exists/route.ts` | Route-handler |
| `template/lib/repositories/collection.repository.ts` | Collectie-databaselaag |
