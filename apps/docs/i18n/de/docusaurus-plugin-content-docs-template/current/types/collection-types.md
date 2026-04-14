---
id: collection-types
title: Sammlungstypdefinitionen
sidebar_label: Sammlungstypen
sidebar_position: 15
---

# Sammlungstypdefinitionen

**Quelle:** `types/collection.ts`

Sammlungen sind kuratierte Gruppen von Objekten, die nach Themen geordnet sind. Sie ermöglichen es Administratoren, handverlesene Listen wie „Top Picks“, „Neu in dieser Woche“ oder „Best for Enterprise“ zu erstellen.

## Schnittstellen

### `Collection`

Die primäre Sammlungsdatenstruktur.

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

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`id`|`string`|Eindeutiger Bezeichner, 3–50 Zeichen|
|`slug`|`string`|URL-sichere Version des Namens|
|`name`|`string`|Anzeigename, 2–100 Zeichen|
|`description`|`string`|Nur-Text-Beschreibung, maximal 500 Zeichen|
|`icon_url`|`string?`|URL zu einem Symbol oder Titelbild|
|`item_count`|`number`|Berechnete Anzahl der zugewiesenen Elemente|
|`items`|`string[]?`|Artikel-IDs; wird nur auf Anfrage ausgefüllt|
|`isActive`|`boolean`|Steuert die öffentliche Sichtbarkeit|

### `CreateCollectionRequest`

Nutzlast zum Erstellen einer neuen Sammlung.

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

Nutzlast zum Aktualisieren einer vorhandenen Sammlung. Alle Felder außer `id` sind optional.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Nutzlast zum Zuweisen von Artikeln zu einer Sammlung.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Abfrageparameter zum Auflisten von Sammlungen.

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

## Antworttypen

### `CollectionsResponse`

Wird zurückgegeben, wenn mehrere Sammlungen aufgelistet werden.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Wird zurückgegeben, wenn eine einzelne Sammlung mit ihren Elementen abgerufen wird.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Validierungsregeln

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Feld|Regel|
|-------|------|
|`id`|3–50 Zeichen, muss eindeutig sein|
|`name`|2-100 Zeichen|
|`description`|Maximal 500 Zeichen|

## Anwendungsbeispiel

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

## Verwandte Typen

- [Elementtypen](./item-types.md) – Elemente, die zu Sammlungen gehören
- [Tag-Typen](./tag-types.md) – Tags als alternatives Organisationsmodell
