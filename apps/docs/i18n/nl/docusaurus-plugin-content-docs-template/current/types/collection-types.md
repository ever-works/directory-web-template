---
id: collection-types
title: Definities van collectietypes
sidebar_label: Verzamelingstypen
sidebar_position: 15
---

# Definities van collectietypes

**Bron:** `types/collection.ts`

Collecties zijn samengestelde groepen items, gerangschikt op thema. Hiermee kunnen beheerders zorgvuldig geselecteerde lijsten maken, zoals 'Topkeuze', 'Nieuw deze week' of 'Beste voor ondernemingen'.

## Interfaces

### `Collection`

De primaire verzamelingsgegevensstructuur.

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

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`id`|`string`|Unieke identificatie, 3-50 tekens|
|`slug`|`string`|URL-veilige versie van de naam|
|`name`|`string`|Weergavenaam, 2-100 tekens|
|`description`|`string`|Beschrijving in platte tekst, maximaal 500 tekens|
|`icon_url`|`string?`|URL naar een pictogram of omslagafbeelding|
|`item_count`|`number`|Berekende telling van toegewezen items|
|`items`|`string[]?`|Artikel-ID's; wordt alleen ingevuld wanneer daarom wordt gevraagd|
|`isActive`|`boolean`|Regelt de publieke zichtbaarheid|

### `CreateCollectionRequest`

Payload voor het maken van een nieuwe collectie.

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

Payload voor het bijwerken van een bestaande verzameling. Alle velden behalve `id` zijn optioneel.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Payload voor het toewijzen van items aan een collectie.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Queryparameters voor het weergeven van collecties.

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

## Reactietypen

### `CollectionsResponse`

Geretourneerd bij het aanbieden van meerdere collecties.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Geretourneerd bij het ophalen van een enkele verzameling met bijbehorende items.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Validatieregels

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Veld|Regel|
|-------|------|
|`id`|3-50 tekens, moet uniek zijn|
|`name`|2-100 tekens|
|`description`|Maximaal 500 tekens|

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Item Types](./item-types.md) -- items die tot collecties behoren
- [Tagtypen](./tag-types.md) -- tags als alternatief organisatiemodel
