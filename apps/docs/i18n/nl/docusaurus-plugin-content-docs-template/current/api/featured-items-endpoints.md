---
id: featured-items-endpoints
title: "Featured Items API Endpoints"
sidebar_label: "Featured Items API Endpoints"
sidebar_position: 18
---

# Uitgelichte Items API Eindpunten

De Uitgelichte Items API biedt een publiek eindpunt voor het ophalen van items die prominent worden weergegeven op de website. Uitgelichte items ondersteunen volgorde, vervaldatums en actieve/inactieve statussen.

**Bronbestand:** `template/app/api/featured-items/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|---------|-----|---------------|--------------|
| GET | `/api/featured-items` | Geen | Actieve uitgelichte items ophalen voor publieke weergave |

---

## GET `/api/featured-items`

Geeft een lijst van actieve uitgelichte items terug voor publieke weergave. Filtert automatisch inactieve items eruit en sluit optioneel verlopen items uit op basis van hun `featuredUntil`-datum. Items worden gesorteerd op uitgelichte volgorde (aflopend) en uitgelichte datum (aflopend) voor optimale presentatie.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|--------------|
| `limit` | integer | Nee | 6 | Maximum aantal terug te geven items (1-50) |
| `includeExpired` | boolean | Nee | `false` | Of items voorbij hun `featuredUntil`-datum moeten worden opgenomen |

### Databasevereiste

Het eindpunt controleert de databasebeschikbaarheid voor verwerking. Als de database niet is geconfigureerd, geeft de controle `checkDatabaseAvailability()` een passende foutreactie.

### Werking

De query bouwt dynamisch condities op basis van parameters:

```ts
// Altijd filteren op actieve items
const conditions = [eq(featuredItems.isActive, true)];

// Optioneel verlopen items uitsluiten
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Sorteringslogica

Items worden gesorteerd op twee velden in aflopende volgorde:

1. **`featuredOrder`** -- Hogere waarden verschijnen eerst (door beheerder gecontroleerde prioriteit)
2. **`featuredAt`** -- Recentelijker uitgelichte items verschijnen eerst (tiebreaker)

### Reactievorm

#### 200 -- Uitgelichte items opgehaald

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- Geen uitgelichte items

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Serverfout

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Gegevensmodel

Elk uitgelicht item-record bevat:

| Veld | Type | Beschrijving |
|------|------|--------------|
| `id` | string | Unieke record-ID van uitgelicht item |
| `itemSlug` | string | Slug van het uitgelichte item |
| `itemName` | string | Weergavenaam |
| `itemDescription` | string (nullable) | Beschrijving voor uitgelichte weergave |
| `itemIconUrl` | string (nullable) | URL van itempictogram |
| `itemImageUrl` | string (nullable) | URL van uitgelichte bannerafbeelding |
| `featuredOrder` | integer | Weergaveprioriteit (hoger = prominenter) |
| `isActive` | boolean | Of momenteel uitgelicht |
| `featuredAt` | datetime | Wanneer het item uitgelicht werd |
| `featuredUntil` | datetime (nullable) | Vervaldatum (null betekent geen vervaldatum) |
| `createdAt` | datetime | Aanmaaktijdstempel van record |
| `updatedAt` | datetime (nullable) | Tijdstempel van laatste bijwerking |

### Vervalgedrag

- Items met `featuredUntil: null` vervallen nooit en worden altijd opgenomen.
- Items met een `featuredUntil`-datum in het verleden worden standaard uitgesloten.
- Het instellen van `includeExpired=true` omzeilt de vervalfiltering (nuttig voor beheerdersweergaven).

### Gebruiksvoorbeeld

```ts
// Top 3 uitgelichte items ophalen voor hero-sectie op startpagina
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Uitgelicht: ${item.itemName} (volgorde: ${item.featuredOrder})`);
  });
}
```

### Opmerkingen

- Fouten worden alleen gelogd in ontwikkelingsmodus (`NODE_ENV === 'development'`).
- Dit is een **publiek eindpunt** -- authenticatie is niet vereist.
- Uitgelichte items worden door beheerders beheerd via het beheerderspaneel (zie Beheerdereindpunten).

---

## Gerelateerde bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/featured-items/route.ts` | Publiek eindpunt voor uitgelichte items |
| `template/lib/db/schema.ts` | Tabeldefinitie van `featuredItems` |
| `template/lib/utils/database-check.ts` | Controle op databasebeschikbaarheid |
