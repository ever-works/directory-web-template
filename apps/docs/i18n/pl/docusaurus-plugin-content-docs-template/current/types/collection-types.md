---
id: collection-types
title: Definicje typów kolekcji
sidebar_label: Typy kolekcji
sidebar_position: 15
---

# Definicje typów kolekcji

**Źródło:** `types/collection.ts`

Kolekcje to wyselekcjonowane grupy elementów uporządkowane tematycznie. Umożliwiają administratorom tworzenie starannie wybranych list, takich jak „Najpopularniejsze”, „Nowości w tym tygodniu” lub „Najlepsze dla przedsiębiorstw”.

## Interfejsy

### `Collection`

Podstawowa struktura danych kolekcji.

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

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`id`|`string`|Unikalny identyfikator, 3-50 znaków|
|`slug`|`string`|Wersja nazwy bezpieczna dla adresu URL|
|`name`|`string`|Nazwa wyświetlana, 2–100 znaków|
|`description`|`string`|Zwykły opis tekstowy, maksymalnie 500 znaków|
|`icon_url`|`string?`|Adres URL ikony lub obrazu okładki|
|`item_count`|`number`|Obliczona liczba przypisanych elementów|
|`items`|`string[]?`|identyfikatory przedmiotów; wypełniane tylko na żądanie|
|`isActive`|`boolean`|Kontroluje widoczność publiczną|

### `CreateCollectionRequest`

Ładunek umożliwiający utworzenie nowej kolekcji.

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

Ładunek umożliwiający aktualizację istniejącej kolekcji. Wszystkie pola z wyjątkiem `id` są opcjonalne.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Ładunek służący do przypisywania elementów do kolekcji.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Parametry zapytania dotyczące wyświetlania kolekcji.

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

## Typy odpowiedzi

### `CollectionsResponse`

Zwracany w przypadku wystawiania wielu kolekcji.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Zwracany podczas pobierania pojedynczej kolekcji z jej elementami.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Zasady walidacji

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Pole|Reguła|
|-------|------|
|`id`|3-50 znaków, musi być unikalny|
|`name`|2-100 znaków|
|`description`|Maksymalnie 500 znaków|

## Przykład użycia

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

## Powiązane typy

- [Typy przedmiotów](./item-types.md) — elementy należące do kolekcji
- [Typy tagów](./tag-types.md) – tagi jako alternatywny model organizacyjny
