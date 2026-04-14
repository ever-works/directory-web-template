---
id: engagement-endpoints
title: "Engagement API Endpoints"
sidebar_label: "Engagement API Endpoints"
sidebar_position: 12
---

# Betrokkenheid API Eindpunten

De Betrokkenheid API biedt eindpunten voor het ophalen van betrokkenheidsstatistieken (weergaven, stemmen, beoordelingen, favorieten, reacties) en het berekenen van populariteitsscores voor items. Deze eindpunten vormen de basis voor de sorteer-, rangschikkings- en analysefuncties van het sjabloon.

**Bronbestanden:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|---------|-----|---------------|--------------|
| GET | `/api/items/engagement` | Geen | Betrokkenheidsstatistieken ophalen voor meerdere items |
| GET | `/api/items/popularity-scores` | Geen | Items ophalen gesorteerd op berekende populariteitsscore |

Beide eindpunten gebruiken `dynamic = 'force-dynamic'` om bij elk verzoek actuele gegevens te garanderen.

---

## GET `/api/items/engagement`

Haalt betrokkenheidsstatistieken op voor meerdere items geïdentificeerd door hun slugs. Geeft een overzicht van slug naar statistieken terug.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|--------------|
| `slugs` | string | **Ja** | -- | Door komma's gescheiden lijst van item-slugs |

### Beperkingen

- De parameter `slugs` is **verplicht**. Weglaten geeft een 400-fout.
- Maximum van **200 slugs** per verzoek. Overschrijding geeft een 400-fout.

### Werking

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Reactievorm

#### 200 -- Statistieken opgehaald

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Leeg (geen slugs na verwerking)

```json
{
  "metrics": {}
}
```

#### 400 -- Ontbrekende slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Te veel slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Serverfout

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Gebruiksvoorbeeld

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Statistieken van afzonderlijk item benaderen
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Een debug/analyse-eindpunt dat items gesorteerd op hun berekende populariteitsscore teruggeeft. Het scoresalgoritme gebruikt logaritmische schaling en houdt rekening met meerdere betrokkenheidssignalen plus recentheid.

### Queryparameters

| Parameter | Type | Vereist | Standaard | Beschrijving |
|-----------|------|---------|-----------|--------------|
| `limit` | integer | Nee | `20` | Aantal items om terug te geven (max 100) |
| `locale` | string | Nee | `"en"` | Taalinstelling voor het ophalen van itemgegevens |

### Scoresalgoritme

De populariteitsscore wordt berekend als de som van gewogen componenten:

| Component | Gewicht | Formule |
|-----------|---------|---------|
| Uitgelicht-bonus | +10.000 | Vaste bonus voor uitgelichte items |
| Weergaven | 1.000x | `log10(views + 1) * 1000` |
| Stemmen | 1.200x | `log10(max(votes, 0) + 1) * 1200` |
| Gemiddelde beoordeling | 500x | `avgRating * 500` |
| Favorieten | 1.100x | `log10(favorites + 1) * 1100` |
| Reacties | 1.000x | `log10(comments + 1) * 1000` |
| Recentheid (onder 30 dagen) | tot +1.000 | Lineair verval over 30 dagen |
| Recentheid (30-90 dagen) | tot +500 | Lineair verval over de volgende 60 dagen |
| Recentheid (90-180 dagen) | tot +250 | Lineair verval over de volgende 90 dagen |

Items zonder betrokkenheidsgegevens ontvangen een heuristische terugvalscore op basis van het aantal tags, naamlengte, aanwezigheid van een pictogram en het bestaan van een promotiecode.

### Reactievorm

#### 200 -- Scores opgehaald

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Gebruiksvoorbeeld

```ts
// Top 10 populairste items ophalen
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### Opmerkingen

- Het scoresalgoritme komt overeen met de productiesorteringlogica in `sort-utils.ts`.
- Logaritmische schaling voorkomt dat items met extreem hoge weergaveaantallen de ranglijst domineren.
- De recentiebonus zorgt ervoor dat nieuw toegevoegde items tijdelijk een verhoogde zichtbaarheid krijgen.
- Items worden aflopend gesorteerd op score; gelijke scores worden alfabetisch gebroken op naam.

### Gerelateerde bronbestanden

| Bestand | Doel |
|---------|------|
| `template/app/api/items/engagement/route.ts` | Eindpunt betrokkenheidsstatistieken |
| `template/app/api/items/popularity-scores/route.ts` | Eindpunt populariteitsscores |
| `template/lib/db/queries/engagement.queries.ts` | Databasequery's voor betrokkenheidsgegevens |
| `template/lib/content.ts` | `getCachedItems` voor itemgegevens |
