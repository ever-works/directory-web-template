---
id: items-engagement-endpoints
title: "Riferimento API Coinvolgimento Elementi"
sidebar_label: "Coinvolgimento Elementi"
sidebar_position: 54
---

# Riferimento API Coinvolgimento Elementi

## Panoramica

Gli endpoint di coinvolgimento degli elementi forniscono accesso alle metriche di coinvolgimento e ai punteggi di popolarità degli elementi della directory. Questi includono conteggi di visualizzazioni, voti, valutazioni, preferiti e commenti. L'endpoint dei punteggi di popolarità calcola inoltre una classifica ponderata che tiene conto delle metriche di coinvolgimento, dello stato in evidenza e della recenza del contenuto.

## Endpoint

### GET /api/items/engagement

Recupera le metriche di coinvolgimento per più elementi tramite i loro slug in una singola richiesta batch.

**Richiesta**

| Parametro | Tipo   | In    | Descrizione |
|-----------|--------|-------|-------------|
| slugs     | string | query | Elenco separato da virgole di slug degli elementi (obbligatorio, max 200) |

**Risposta**
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

**Esempio**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Endpoint di debug che restituisce gli elementi ordinati per punteggio di popolarità calcolato con una suddivisione dettagliata dei fattori di punteggio. Utile per capire come l'algoritmo di ordinamento classifica gli elementi.

**Richiesta**

| Parametro | Tipo   | In    | Descrizione |
|-----------|--------|-------|-------------|
| limit     | number | query | Numero di elementi da restituire (predefinito: 20, max: 100) |
| locale    | string | query | Codice lingua per gli elementi (predefinito: "en") |

**Risposta**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Punteggio totale calcolato (arrotondato)
    scoreBreakdown: {
      featured: number;          // 10000 se in evidenza, 0 altrimenti
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decade nell'arco di 180 giorni
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

**Esempio**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Autenticazione

Entrambi gli endpoint sono **pubblici** -- non è richiesta autenticazione. Sono contrassegnati come `force-dynamic` per garantire dati aggiornati ad ogni richiesta.
