---
id: items-engagement-endpoints
title: "Items Engagement API Reference"
sidebar_label: "Items Engagement API Reference"
---

# Einträge-Engagement-API-Referenz

## Übersicht

Die Einträge-Engagement-Endpunkte bieten Zugriff auf Engagement-Metriken und Popularitäts-Scores für Verzeichniseinträge. Dazu gehören Aufrufzählungen, Stimmen, Bewertungen, Favoriten und Kommentare. Der Popularitäts-Score-Endpunkt berechnet zusätzlich ein gewichtetes Ranking unter Berücksichtigung von Engagement-Metriken, Featured-Status und Inhaltsaktualität.

## Endpunkte

### GET /api/items/engagement

Ruft Engagement-Metriken für mehrere Einträge per Slug in einer einzigen Batch-Anfrage ab.

**Anfrage**

| Parameter | Typ | In | Beschreibung |
|-----------|-----|----|--------------|
| slugs | string | query | Kommagetrennte Liste von Eintrags-Slugs (erforderlich, max. 200) |

**Antwort**
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

**Beispiel**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Debug-Endpunkt, der Einträge nach berechnetem Popularitäts-Score mit einer detaillierten Aufschlüsselung der Scoring-Faktoren sortiert zurückgibt.

**Anfrage**

| Parameter | Typ | In | Beschreibung |
|-----------|-----|----|--------------|
| limit | number | query | Anzahl der zurückzugebenden Einträge (Standard: 20, max: 100) |
| locale | string | query | Sprachcode für Einträge (Standard: "en") |

**Antwort**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Gesamter berechneter Score (gerundet)
    scoreBreakdown: {
      featured: number;          // 10000 wenn hervorgehoben, sonst 0
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Verfällt über 180 Tage
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

**Beispiel**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Authentifizierung

Beide Endpunkte sind **öffentlich** – keine Authentifizierung erforderlich. Sie sind als `force-dynamic` markiert, um bei jeder Anfrage aktuelle Daten zu gewährleisten.
