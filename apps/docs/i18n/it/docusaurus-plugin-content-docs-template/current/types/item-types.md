---
id: item-types
title: Definizioni del tipo di articolo
sidebar_label: Tipi di elementi
sidebar_position: 1
---

# Definizioni del tipo di articolo

**Fonte:** `lib/types/item.ts`

Gli elementi sono le entità di contenuto principali nel modello. Questo modulo definisce le strutture dati per la creazione, la lettura, l'aggiornamento e l'elenco degli elementi, insieme alle costanti di convalida e ai tipi di gestione dello stato.

## Interfacce

### `ItemLocationData`

Dati sulla posizione per gli elementi che possono essere geocodificati. Archiviato in YAML e indicizzato in `item_location_index` per query geografiche veloci.

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

La struttura dati dell'elemento primario restituita dalle operazioni di lettura.

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

**Dettagli principali:**
- `category` supporta sia una singola stringa che un array per elementi multicategoria
- `status` utilizza un flusso di approvazione in quattro stati: bozza, in attesa, approvato, rifiutato
- `deleted_at` consente l'eliminazione temporanea senza rimuovere i dati
- `action` definisce il tipo di pulsante CTA nella pagina dei dettagli dell'articolo

### `CreateItemRequest`

Inserisci il payload per la creazione di un nuovo elemento (endpoint POST).

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

Inserisci il carico utile per aggiornare un articolo esistente. Estende `Partial<CreateItemRequest>` quindi tutti i campi tranne `id` sono facoltativi.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

Parametri di query per filtrare e impaginare gli elenchi di elementi.

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

Risposta impaginata per le query sull'elenco di elementi.

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

Busta di risposta per operazioni su un singolo elemento.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

Payload per l'approvazione o il rifiuto di un articolo durante il processo di revisione.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## Digitare Alias

### `SortField`

Campi validi per ordinare gli elenchi di articoli:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

Direzione dell'ordinamento:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

Un tipo di unione derivato da `ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## Costanti

### `ITEM_VALIDATION`

Vincoli di convalida per i campi articolo:

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

Valori di stato canonici per il flusso di lavoro di approvazione dell'articolo:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

Etichette leggibili per ogni stato:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

Mappature dei colori dell'interfaccia utente per ogni stato:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Esempi di utilizzo

### Creazione di un oggetto

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### Filtraggio degli elementi

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### Rendering dei badge di stato

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## Tipi correlati

- [`ItemLocationData`](./location-types.md) riferimenti `MapProvider` dal modulo di posizione
- [`ClientSubmissionData`](./item-types.md) in `client-item.ts` estende `ItemData` con metriche di coinvolgimento
- [`CategoryData`](./category-types.md) definisce i valori di categoria a cui si fa riferimento in `ItemData.category`
- [`TagData`](./category-types.md) definisce i valori dei tag a cui si fa riferimento in `ItemData.tags`
