---
id: featured-items-endpoints
title: "Endpoint API Elementi in evidenza"
sidebar_label: "Elementi in evidenza"
sidebar_position: 18
---

# Endpoint API Elementi in evidenza

L'API Elementi in evidenza fornisce un endpoint pubblico per recuperare gli elementi evidenziati per una visualizzazione prominente sul sito web. Gli elementi in evidenza supportano l'ordinamento, le date di scadenza e gli stati attivo/inattivo.

**File sorgente:** `template/app/api/featured-items/route.ts`

## Riepilogo degli endpoint

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|----------|----------------|-------------|
| GET | `/api/featured-items` | Nessuna | Ottieni elementi in evidenza attivi per la visualizzazione pubblica |

---

## GET `/api/featured-items`

Restituisce un elenco di elementi in evidenza attivi per la visualizzazione pubblica. Filtra automaticamente gli elementi inattivi e opzionalmente esclude gli elementi scaduti in base alla loro data `featuredUntil`. Gli elementi sono ordinati per ordine in evidenza (decrescente) e data di messa in evidenza (decrescente) per una presentazione ottimale.

### Parametri di query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|-----------|-------------|-------------|
| `limit` | integer | No | 6 | Numero massimo di elementi da restituire (1-50) |
| `includeExpired` | boolean | No | `false` | Se includere gli elementi passati la loro data `featuredUntil` |

### Requisito del database

L'endpoint verifica la disponibilità del database prima dell'elaborazione. Se il database non è configurato, il controllo `checkDatabaseAvailability()` restituisce una risposta di errore appropriata.

### Come funziona

La query costruisce le condizioni dinamicamente in base ai parametri:

```ts
// Filtra sempre per elementi attivi
const conditions = [eq(featuredItems.isActive, true)];

// Esclude opzionalmente gli elementi scaduti
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

### Logica di ordinamento

Gli elementi sono ordinati per due campi in ordine decrescente:

1. **`featuredOrder`** -- I valori più alti appaiono prima (priorità controllata dall'amministratore)
2. **`featuredAt`** -- Gli elementi messi in evidenza più recentemente appaiono prima (spareggio)

### Forma della risposta

#### 200 -- Elementi in evidenza recuperati

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

#### 200 -- Nessun elemento in evidenza

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Errore del server

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Modello di dati

Ogni record di elemento in evidenza contiene:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | string | ID univoco del record elemento in evidenza |
| `itemSlug` | string | Slug dell'elemento in evidenza |
| `itemName` | string | Nome visualizzato |
| `itemDescription` | string (nullable) | Descrizione per la visualizzazione in evidenza |
| `itemIconUrl` | string (nullable) | URL dell'icona dell'elemento |
| `itemImageUrl` | string (nullable) | URL dell'immagine banner in evidenza |
| `featuredOrder` | integer | Priorità di visualizzazione (più alto = più prominente) |
| `isActive` | boolean | Se attualmente in evidenza |
| `featuredAt` | datetime | Quando l'elemento è stato messo in evidenza |
| `featuredUntil` | datetime (nullable) | Data di scadenza (null significa nessuna scadenza) |
| `createdAt` | datetime | Timestamp di creazione del record |
| `updatedAt` | datetime (nullable) | Timestamp dell'ultimo aggiornamento |

### Comportamento di scadenza

- Gli elementi con `featuredUntil: null` non scadono mai e sono sempre inclusi.
- Gli elementi con una data `featuredUntil` nel passato sono esclusi per impostazione predefinita.
- L'impostazione di `includeExpired=true` bypassa il filtro di scadenza (utile per le viste admin).

### Esempio di utilizzo

```ts
// Recupera i top 3 elementi in evidenza per la sezione hero della homepage
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`In evidenza: ${item.itemName} (ordine: ${item.featuredOrder})`);
  });
}
```

### Note

- Gli errori vengono registrati solo in modalità sviluppo (`NODE_ENV === 'development'`).
- Questo è un **endpoint pubblico** -- non è richiesta alcuna autenticazione.
- Gli elementi in evidenza sono gestiti dagli amministratori tramite il pannello di amministrazione (vedi Endpoint Admin).

---

## File sorgente correlati

| File | Scopo |
|------|-------|
| `template/app/api/featured-items/route.ts` | Endpoint pubblico elementi in evidenza |
| `template/lib/db/schema.ts` | Definizione tabella `featuredItems` |
| `template/lib/utils/database-check.ts` | Verifica disponibilità database |
