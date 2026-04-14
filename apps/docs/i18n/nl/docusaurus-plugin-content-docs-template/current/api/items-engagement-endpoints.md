---
id: items-engagement-endpoints
title: "Items Engagement API Reference"
sidebar_label: "Items Engagement API Reference"
sidebar_position: 54
---

# Items Betrokkenheid API Referentie

## Overzicht

De Items Betrokkenheid-eindpunten bieden toegang tot betrokkenheidsstatistieken en populariteitsscores voor directory-items. Deze omvatten weergavetellers, stemmen, beoordelingen, favorieten en reacties. Het eindpunt voor populariteitsscores berekent bovendien een gewogen rangschikking die rekening houdt met betrokkenheidsstatistieken, uitgelichte status en inhoudsrecentheid.

## Eindpunten

### GET /api/items/engagement

Haalt betrokkenheidsstatistieken op voor meerdere items via hun slugs in één batchverzoek.

**Verzoek**

| Parameter | Type | In | Beschrijving |
|-----------|------|----|--------------|
| slugs | string | query | Door komma's gescheiden lijst van item-slugs (vereist, max 200) |

**Reactie**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Debug-eindpunt dat items gesorteerd op berekende populariteitsscore teruggeeft met een gedetailleerde uitsplitsing van scoringsfactoren. Nuttig voor het begrijpen van hoe het sorteringsalgoritme items rangschikt.

**Verzoek**

| Parameter | Type | In | Beschrijving |
|-----------|------|----|--------------|
| limit | number | query | Aantal terug te geven items (standaard: 20, max: 100) |
| locale | string | query | Taalcode voor items (standaard: "en") |

**Reactie**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Totale berekende score (afgerond)
    scoreBreakdown: {
      featured: number;          // 10000 indien uitgelicht, anders 0
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Vervalt over 180 dagen
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Voorbeeld**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Authenticatie

Beide eindpunten zijn **publiek** -- authenticatie is niet vereist. Ze zijn gemarkeerd als `force-dynamic` om bij elk verzoek actuele gegevens te garanderen.

## Foutreacties

| Status | Beschrijving |
|--------|--------------|
| 400 | Ontbrekende vereiste parameter `slugs` of meer dan 200 slugs opgegeven (betrokkenheid-eindpunt) |
| 500 | Interne serverfout -- databasequery mislukt |

## Snelheidsbeperking

Geen expliciete snelheidsbeperking. Het betrokkenheid-eindpunt beperkt de batchgrootte tot 200 slugs per verzoek ter voorkoming van misbruik. Beide eindpunten omzeilen Next.js-caching via `export const dynamic = 'force-dynamic'`.

## Gerelateerde eindpunten

- [Configuratiefunctie-eindpunten](./config-feature-endpoints) -- Controleer of beoordelingen/favorieten/reacties-functies zijn ingeschakeld
