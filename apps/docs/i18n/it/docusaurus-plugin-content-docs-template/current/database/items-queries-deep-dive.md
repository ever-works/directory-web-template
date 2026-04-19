---
id: items-queries-deep-dive
title: Query sull'elemento Approfondimento
sidebar_label: Query sull'elemento Approfondimento
sidebar_position: 60
---

# Query sull'elemento Approfondimento

Riferimento completo per tutte le funzioni di query del database relative agli elementi, tra cui l'identificazione degli elementi, la normalizzazione degli slug, il tracciamento delle viste e l'aggregazione delle viste.

## Panoramica

Il livello di query dell'elemento è suddiviso in due moduli:

- **`item.queries.ts`** -- Utilità per l'identificazione degli articoli e la normalizzazione degli sfasamenti
- **`item-view.queries.ts`** -- Monitoraggio della visualizzazione degli articoli con deduplicazione e aggregazione giornaliere

Gli elementi nel modello Ever Works vengono archiviati come file YAML in un repository CMS basato su Git. Il database memorizza i **dati sul coinvolgimento** (voti, commenti, visualizzazioni, preferiti) digitati in base agli slug dell'elemento, non al contenuto dell'elemento stesso.

## File di origine

```
lib/db/queries/item.queries.ts
lib/db/queries/item-view.queries.ts
```

---

## Function Reference: item.queries.ts

### `normalizeItemSlug`

Normalizes an item slug to ensure consistency across the system.

```typescript
function normalizeItemSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description          |
|-----------|----------|----------|----------------------|
| `slug`    | `string` | Yes      | Raw slug input       |

**Returns:** `string` -- Normalized slug (lowercase, trimmed)

**Throws:**
- `Error` if slug is falsy, not a string, empty after trimming, or contains invalid characters

**Validation Rules:**
- Must be a non-empty string
- After normalization: lowercase and trimmed
- Must match regex `/^[a-zA-Z0-9_-]+$/` (alphanumeric, hyphens, underscores only)

**Usage Example:**

```typescript
import { normalizeItemSlug } from '@/lib/db/queries';

const slug = normalizeItemSlug('My-Cool-Tool');
// Returns: 'my-cool-tool'

normalizeItemSlug(''); // Throws Error
normalizeItemSlug('invalid slug!'); // Throws Error
```

---

### `getItemIdFromSlug`

Mappa uno slug di elemento su un itemId per le operazioni del database. In questo sistema, itemId È lo slug normalizzato.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-----------|----------|----------|-------------|
|`slug`|`string`|Sì|Lumaca dell'oggetto|

**Restituisce:** `string` -- Slug normalizzato come itemId

**Modello SQL:** Nessuna query sul database: delega a `normalizeItemSlug`.

---

### `validateItemExists`

Validates if a slug exists in the content system. Currently a placeholder that validates slug format only.

```typescript
async function validateItemExists(slug: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description            |
|-----------|----------|----------|------------------------|
| `slug`    | `string` | Yes      | Item slug to validate  |

**Returns:** `Promise<boolean>` -- `true` if slug format is valid, `false` otherwise

**Note:** This function currently only validates format. It does not check against the actual Git-based content system.

---

## Riferimento funzione: item-view.queries.ts

### `recordItemView`

Registra la visualizzazione di un elemento con deduplicazione giornaliera. Utilizza `ON CONFLICT DO NOTHING` per ignorare silenziosamente le visualizzazioni duplicate per lo stesso elemento, visualizzatore e data UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Sì|Lumaca dell'oggetto|
|`view.viewerId`|`string`|Sì|Identificativo del visualizzatore (utente/anonimo)|
|`view.viewedDateUtc`|`string`|Sì|Stringa della data UTC (AAAA-MM-GG)|

**Restituisce:** `Promise<boolean>` -- `true` se è stata registrata una nuova vista, `false` se era un duplicato

**Modello SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Note sulle prestazioni:**
- Utilizza `ON CONFLICT DO NOTHING` per gli inserti idempotenti
- Il vincolo univoco su `(itemId, viewerId, viewedDateUtc)` garantisce la deduplicazione giornaliera
- Non è necessario il viaggio di andata e ritorno per verificare la presenza di duplicati

---

### `getTotalViewsCount`

Gets the total view count for a set of items.

```typescript
async function getTotalViewsCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<number>` -- Total view count across all specified items

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views WHERE item_id IN (...);
```

**Edge Case:** Returns `0` if `itemSlugs` is empty (no DB query executed).

---

### `getRecentViewsCount`

Ottiene il conteggio delle visualizzazioni degli elementi negli ultimi N giorni.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Predefinito|Descrizione|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Sì| --      |Matrice di slug di oggetti|
|`days`|`number`|No| `7`     |Numero di giorni in cui guardare indietro|

**Resi:** `Promise<number>` -- Visualizza il conteggio per il periodo

**Modello SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Note sulle prestazioni:**
- Utilizza stringhe di data UTC per il filtraggio indipendente dal fuso orario
- Efficiente quando la colonna `viewedDateUtc` è indicizzata

---

### `getDailyViewsData`

Returns a Map of daily view counts keyed by date string (YYYY-MM-DD) for the last N days.

```typescript
async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<Map<string, number>>` -- Map of `YYYY-MM-DD` date string to view count

**SQL Pattern:**

```sql
SELECT viewed_date_utc, count(*)
FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?
GROUP BY viewed_date_utc;
```

---

### `getViewsPerItem`

Ottiene il numero di visualizzazioni per elemento per la visualizzazione degli elementi principali.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Sì|Matrice di slug di oggetti|

**Resi:** `Promise<Map<string, number>>` -- Mappa dello slug degli articoli per visualizzare il conteggio

**Modello SQL:**

```sql
SELECT item_id, count(*) FROM item_views
WHERE item_id IN (...)
GROUP BY item_id;
```

---

## Helper Functions (Internal)

### `getUtcDateString`

Internal helper that returns a UTC date string for N days ago. Uses UTC methods to avoid timezone-related off-by-one errors.

```typescript
function getUtcDateString(daysAgo: number = 0): string
// Returns: 'YYYY-MM-DD' format
```

---

## Note sulle prestazioni

1. **Protezione array vuoto** -- Tutte le funzioni di aggregazione restituiscono immediatamente risultati zero/vuoti quando viene passato un array `itemSlugs` vuoto, evitando query non necessarie al database.

2. **Deduplicazione giornaliera** -- `recordItemView` utilizza un vincolo univoco e `ON CONFLICT DO NOTHING` per una deduplicazione efficiente e senza blocchi senza controllo preliminare.

3. **Date basate su UTC** -- Il filtraggio delle date di visualizzazione utilizza stringhe di date UTC (`YYYY-MM-DD`), garantendo un comportamento coerente tra i fusi orari dei server.

4. **Normalizzazione slug** -- `getItemIdFromSlug` viene richiamato in tutto il livello di coinvolgimento (voti, commenti) per garantire un'identificazione coerente degli elementi.

## Esempi di utilizzo

### Registrazione di una visualizzazione di pagina

```typescript
import { recordItemView } from '@/lib/db/queries';

const isNew = await recordItemView({
  itemId: 'clockify',
  viewerId: 'user-123',
  viewedDateUtc: '2025-06-15',
});

if (isNew) {
  console.log('New unique view recorded');
}
```

### Creazione di un grafico delle visualizzazioni del dashboard

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
