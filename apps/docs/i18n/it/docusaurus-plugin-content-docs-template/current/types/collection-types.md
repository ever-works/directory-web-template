---
id: collection-types
title: Definizioni del tipo di raccolta
sidebar_label: Tipi di raccolta
sidebar_position: 15
---

# Definizioni del tipo di raccolta

**Fonte:** `types/collection.ts`

Le collezioni sono gruppi curati di articoli organizzati per tema. Consentono agli amministratori di creare elenchi selezionati manualmente come "Scelte migliori", "Novità di questa settimana" o "Il migliore per le aziende".

## Interfacce

### `Collection`

La struttura dei dati della raccolta primaria.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`id`|`string`|Identificatore univoco, da 3 a 50 caratteri|
|`slug`|`string`|Versione sicura per URL del nome|
|`name`|`string`|Nome visualizzato, da 2 a 100 caratteri|
|`description`|`string`|Descrizione in testo semplice, massimo 500 caratteri|
|`icon_url`|`string?`|URL di un'icona o di un'immagine di copertina|
|`item_count`|`number`|Conteggio calcolato degli elementi assegnati|
|`items`|`string[]?`|ID articolo; compilato solo quando richiesto|
|`isActive`|`boolean`|Controlla la visibilità pubblica|

### `CreateCollectionRequest`

Payload per la creazione di una nuova raccolta.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

Payload per l'aggiornamento di una raccolta esistente. Tutti i campi tranne `id` sono facoltativi.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Payload per l'assegnazione di elementi a una raccolta.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Parametri di query per elencare le raccolte.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## Tipi di risposta

### `CollectionsResponse`

Restituito quando si elencano più raccolte.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Restituito durante il recupero di una singola raccolta con i relativi elementi.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Regole di convalida

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Campo|Regola|
|-------|------|
|`id`|Da 3 a 50 caratteri, deve essere univoco|
|`name`|2-100 caratteri|
|`description`|Massimo 500 caratteri|

## Esempio di utilizzo

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## Tipi correlati

- [Tipi di elemento](./item-types.md) -- elementi che appartengono a raccolte
- [Tipi di tag](./tag-types.md) -- tag come modello organizzativo alternativo
