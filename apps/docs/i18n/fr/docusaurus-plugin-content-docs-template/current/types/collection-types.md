---
id: collection-types
title: Définitions des types de collecte
sidebar_label: Types de collectes
sidebar_position: 15
---

# Définitions des types de collecte

**Source :** `types/collection.ts`

Les collections sont des groupes d’éléments organisés par thème. Ils permettent aux administrateurs de créer des listes triées sur le volet telles que « Meilleurs choix », « Nouveau cette semaine » ou « Meilleur pour l'entreprise ».

## Interfaces

### `Collection`

Structure de données de collection principale.

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

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`id`|`string`|Identifiant unique, 3 à 50 caractères|
|`slug`|`string`|Version du nom sécurisée pour l'URL|
|`name`|`string`|Nom d'affichage, 2 à 100 caractères|
|`description`|`string`|Description en texte brut, 500 caractères maximum|
|`icon_url`|`string?`|URL vers une icône ou une image de couverture|
|`item_count`|`number`|Nombre calculé d'éléments attribués|
|`items`|`string[]?`|ID d'article ; renseigné uniquement sur demande|
|`isActive`|`boolean`|Contrôle la visibilité publique|

### `CreateCollectionRequest`

Charge utile pour créer une nouvelle collection.

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

Charge utile pour la mise à jour d’une collection existante. Tous les champs sauf `id` sont facultatifs.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Charge utile pour attribuer des éléments à une collection.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Paramètres de requête pour répertorier les collections.

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

## Types de réponses

### `CollectionsResponse`

Renvoyé lors de la liste de plusieurs collections.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Renvoyé lors de la récupération d’une seule collection avec ses éléments.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Règles de validation

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Champ|Règle|
|-------|------|
|`id`|3 à 50 caractères, doivent être uniques|
|`name`|2 à 100 caractères|
|`description`|500 caractères maximum|

## Exemple d'utilisation

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

## Types associés

- [Types d'éléments](./item-types.md) - éléments appartenant à des collections
- [Types de balises](./tag-types.md) -- les balises comme modèle organisationnel alternatif
