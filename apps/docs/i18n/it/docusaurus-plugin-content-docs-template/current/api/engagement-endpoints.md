---
id: engagement-endpoints
title: "Endpoint API Coinvolgimento"
sidebar_label: "Coinvolgimento"
sidebar_position: 12
---

# Endpoint API Coinvolgimento

L'API Coinvolgimento fornisce endpoint per recuperare metriche di coinvolgimento (visualizzazioni, voti, valutazioni, preferiti, commenti) e calcolare punteggi di popolarità per gli elementi. Questi endpoint alimentano le funzionalità di ordinamento, classificazione e analisi del template.

**File sorgente:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Riepilogo degli endpoint

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| GET | `/api/items/engagement` | Nessuna | Recupera metriche di coinvolgimento per più elementi |
| GET | `/api/items/popularity-scores` | Nessuna | Ottieni elementi ordinati per punteggio di popolarità calcolato |

Entrambi gli endpoint utilizzano `dynamic = 'force-dynamic'` per garantire dati aggiornati ad ogni richiesta.

---

## GET `/api/items/engagement`

Recupera le metriche di coinvolgimento per più elementi identificati dai loro slug. Restituisce una mappa da slug a metriche.

### Parametri di query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Sì** | -- | Elenco separato da virgole di slug degli elementi |

### Vincoli

- Il parametro `slugs` è **obbligatorio**. Ometterlo restituisce un errore 400.
- Massimo **200 slug** per richiesta. Superare questo limite restituisce un errore 400.

### Come funziona

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

### Forma della risposta

#### 200 -- Metriche recuperate

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

#### 200 -- Vuoto (nessuno slug fornito dopo l'analisi)

```json
{
  "metrics": {}
}
```

#### 400 -- Slug mancanti

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Troppi slug

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Errore del server

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Esempio di utilizzo

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Accedi alle metriche di un singolo elemento
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Un endpoint di debug/analisi che restituisce gli elementi ordinati per punteggio di popolarità calcolato. L'algoritmo di punteggio utilizza la scala logaritmica e considera più segnali di coinvolgimento oltre alla recency.

### Parametri di query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `20` | Numero di elementi da restituire (max 100) |
| `locale` | string | No | `"en"` | Locale per il recupero dei dati degli elementi |

### Algoritmo di punteggio

Il punteggio di popolarità è calcolato come somma di componenti ponderati:

| Componente | Peso | Formula |
|-----------|--------|---------|
| Bonus in evidenza | +10.000 | Bonus piatto per gli elementi in evidenza |
| Visualizzazioni | 1.000x | `log10(views + 1) * 1000` |
| Voti | 1.200x | `log10(max(votes, 0) + 1) * 1200` |
| Valutazione media | 500x | `avgRating * 500` |
| Preferiti | 1.100x | `log10(favorites + 1) * 1100` |
| Commenti | 1.000x | `log10(comments + 1) * 1000` |
| Recency (meno di 30 giorni) | fino a +1.000 | Decadimento lineare su 30 giorni |
| Recency (30-90 giorni) | fino a +500 | Decadimento lineare sui successivi 60 giorni |
| Recency (90-180 giorni) | fino a +250 | Decadimento lineare sui successivi 90 giorni |

Gli elementi senza dati di coinvolgimento ricevono un punteggio euristico di fallback basato sul conteggio dei tag, la lunghezza del nome, la presenza dell'icona e l'esistenza del codice promozionale.

### Forma della risposta

#### 200 -- Punteggi recuperati

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

### Esempio di utilizzo

```ts
// Recupera i 10 elementi più popolari
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Punteggio: ${item.score}`);
});
```

### Note

- L'algoritmo di punteggio corrisponde alla logica di ordinamento in produzione in `sort-utils.ts`.
- La scala logaritmica impedisce che gli elementi con conteggi di visualizzazioni estremamente elevati dominino la classifica.
- Il bonus di recency assicura che gli elementi appena aggiunti ricevano un temporaneo aumento di visibilità.
- Gli elementi sono ordinati per punteggio decrescente; i pareggi vengono risolti alfabeticamente per nome.

### File sorgente correlati

| File | Scopo |
|------|---------|
| `template/app/api/items/engagement/route.ts` | Endpoint metriche di coinvolgimento |
| `template/app/api/items/popularity-scores/route.ts` | Endpoint punteggio di popolarità |
| `template/lib/db/queries/engagement.queries.ts` | Query del database per i dati di coinvolgimento |
| `template/lib/content.ts` | `getCachedItems` per i dati degli elementi |
