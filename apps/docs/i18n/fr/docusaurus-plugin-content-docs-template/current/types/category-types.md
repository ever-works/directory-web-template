---
id: category-types
title: Définitions des types de catégories
sidebar_label: Types de catégories
sidebar_position: 3
---

# Définitions des types de catégories

**Source :** `lib/types/category.ts`

Categories are used to organize items into logical groups. The template uses a file-based system where categories are stored as structured data and referenced by items.

## Interfaces

### `CategoryData`

The core category data structure with minimal fields.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Unique identifier for the category (typically a slug like `"developer-tools"`)
- `name` - Nom d'affichage lisible par l'homme (par exemple, `"Developer Tools"`)

### `CategoryWithCount`

Données de catégorie étendues qui incluent le nombre d'éléments et l'état actif, utilisées dans les tableaux de bord d'administration et les listes de catégories.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Nombre d'éléments affectés à cette catégorie
- `isInactive` - Si la catégorie existe dans la configuration mais n'a aucun élément attribué

### `CreateCategoryRequest`

Charge utile pour créer une nouvelle catégorie.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Charge utile pour mettre à jour une catégorie existante. Extends `Partial<CreateCategoryRequest>` so only the fields being changed need to be provided, but `id` is always required.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Réponse paginée pour les requêtes de liste de catégories.

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

Enveloppe de réponse pour les opérations monocatégories.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Query parameters for filtering and paginating category lists.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Lorsque `true`, inclut les catégories qui ne contiennent aucun élément
- `sortBy` - Trier par nom de catégorie ou ID
- L'ordre de tri par défaut est croissant par nom

## Constantes

### `CATEGORY_VALIDATION`

Contraintes de validation pour les champs de catégorie :

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Exemples d'utilisation

### Créer une catégorie

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### Liste des catégories avec options

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### Afficher les catégories avec des décomptes

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### Mettre à jour une catégorie

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Types associés

- [`ItemData.category`](./item-types.md) fait référence aux ID de catégorie (prend en charge `string | string[]`)
- [`TagData`](./category-types.md) suit un modèle similaire pour les balises
- [`ItemListOptions.categories`](./item-types.md) accepte un tableau d'ID de catégorie pour le filtrage
