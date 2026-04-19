---
id: featured-items-api-endpoints
title: Endpoint API Elementi in evidenza
sidebar_label: API Elementi in evidenza
sidebar_position: 63
---

# Endpoint API Elementi in evidenza

L'API Elementi in evidenza fornisce un endpoint pubblico per recuperare gli elementi in evidenza visualizzati sul sito web. Gli elementi in evidenza sono gestiti tramite il pannello di amministrazione e memorizzati nel database con supporto per l'ordinamento, l'attivazione e le date di scadenza.

**Sorgente:** `template/app/api/featured-items/route.ts`

---

## Ottieni elementi in evidenza

Restituisce un elenco di elementi in evidenza attivi per la visualizzazione pubblica. Filtra automaticamente gli elementi inattivi e (facoltativamente) quelli scaduti.

| Proprietà | Valore |
|----------|-------|
| **Metodo** | `GET` |
| **Percorso** | `/api/featured-items` |
| **Autenticazione** | Nessuna (pubblico) |

### Parametri di query

| Parametro | Tipo | Richiesto | Predefinito | Descrizione |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `6` | Numero massimo di elementi in evidenza da restituire (1-50) |
| `includeExpired` | `boolean` | No | `false` | Se includere gli elementi passati la loro data `featured_until` |

### Risposta

**Stato 200** -- Elementi in evidenza recuperati con successo.

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
    }
  ],
  "count": 1
}
```

### Campi della risposta

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `data` | `array` | Array di oggetti elementi in evidenza |
| `count` | `number` | Numero di elementi in evidenza restituiti |
| `data[].id` | `string` | ID del record elemento in evidenza |
| `data[].itemSlug` | `string` | Identificatore slug dell'elemento |
| `data[].itemName` | `string` | Nome visualizzato dell'elemento |
| `data[].itemDescription` | `string \| null` | Descrizione dell'elemento in evidenza |
| `data[].itemIconUrl` | `string \| null` | URL dell'icona dell'elemento |
| `data[].itemImageUrl` | `string \| null` | URL dell'immagine banner in evidenza |
| `data[].featuredOrder` | `number` | Ordine di visualizzazione (più alto = più prominente) |
| `data[].isActive` | `boolean` | Se l'elemento è attualmente in evidenza |
| `data[].featuredAt` | `string` (ISO 8601) | Quando l'elemento è stato messo in evidenza |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Data di scadenza (`null` = nessuna scadenza) |
| `data[].createdAt` | `string` (ISO 8601) | Timestamp di creazione del record |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Timestamp dell'ultimo aggiornamento |

### Ordinamento

Gli elementi sono ordinati per:
1. `featuredOrder` decrescente (ordine più alto prima)
2. `featuredAt` decrescente (più recentemente in evidenza prima)

### Logica di filtraggio

L'endpoint applica questi filtri:

1. **Solo attivi:** Vengono restituiti solo gli elementi con `isActive = true`.
2. **Controllo scadenza** (quando `includeExpired` è `false`):
   - Gli elementi con `featuredUntil = null` sono sempre inclusi (nessuna scadenza).
   - Gli elementi con `featuredUntil >= data corrente` sono inclusi (non ancora scaduti).
   - Gli elementi con `featuredUntil < data corrente` sono esclusi.

### Risposta di errore

**Stato 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Esempi curl

```bash
# Ottieni gli elementi in evidenza predefiniti (top 6, escludi scaduti)
curl -s http://localhost:3000/api/featured-items

# Ottieni i top 3 elementi in evidenza
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Includi elementi in evidenza scaduti
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Combina parametri
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### Utilizzo TypeScript

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Utilizzo
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (ordine: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Scade: ${item.featuredUntil}`);
  }
});
```

### Note di implementazione

- La disponibilità del database viene verificata all'avvio tramite `checkDatabaseAvailability()`.
- Il parametro `limit` viene analizzato dalla stringa di query con un valore predefinito di `6`. Un input superiore a 50 non viene limitato (validato lato client).
- Gli errori vengono registrati solo in modalità sviluppo per evitare rumore nei log di produzione.
- Gli elementi in evidenza sono gestiti tramite gli endpoint del pannello di amministrazione (vedi [Endpoint Admin](/template/api/admin-endpoints)).
- Il campo `featuredUntil` supporta sia la messa in evidenza permanente (`null`) che quella a tempo limitato.
