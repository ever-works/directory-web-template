---
id: category-types
title: Definities van categorietypes
sidebar_label: Categorietypen
sidebar_position: 3
---

# Definities van categorietypes

**Bron:** `lib/types/category.ts`

Categorieën worden gebruikt om items in logische groepen te ordenen. De sjabloon maakt gebruik van een op bestanden gebaseerd systeem waarin categorieën worden opgeslagen als gestructureerde gegevens waarnaar wordt verwezen door items.

## Interfaces

### `CategoryData`

De gegevensstructuur van de kerncategorie met minimale velden.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Unieke identificatie voor de categorie (meestal een naaktslak zoals `"developer-tools"`)
- `name` - Voor mensen leesbare weergavenaam (bijvoorbeeld `"Developer Tools"`)

### `CategoryWithCount`

Uitgebreide categoriegegevens, waaronder het aantal artikelen en de actieve status, gebruikt in beheerdersdashboards en categorielijsten.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Aantal items toegewezen aan deze categorie
- `isInactive` - Of de categorie bestaat in de configuratie, maar geen toegewezen items heeft

### `CreateCategoryRequest`

Payload voor het maken van een nieuwe categorie.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Payload voor het bijwerken van een bestaande categorie. Breidt `Partial<CreateCategoryRequest>` uit, zodat alleen de velden die worden gewijzigd hoeven te worden opgegeven, maar `id` is altijd vereist.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Gepagineerd antwoord voor query's op categorielijsten.

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

Antwoordenvelop voor operaties van één categorie.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Queryparameters voor het filteren en pagineren van categorielijsten.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Wanneer `true`, categorieën omvat die nul items bevatten
- `sortBy` - Sorteren op categorienaam of ID
- De standaard sorteervolgorde is oplopend op naam

## Constanten

### `CATEGORY_VALIDATION`

Validatiebeperkingen voor categorievelden:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Gebruiksvoorbeelden

### Een categorie aanmaken

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

### Lijstcategorieën met opties

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

### Categorieën met tellingen weergeven

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

### Een categorie bijwerken

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Gerelateerde typen

- [`ItemData.category`](./item-types.md) verwijst naar categorie-ID's (ondersteunt `string | string[]`)
- [`TagData`](./category-types.md) volgt een soortgelijk patroon voor tags
- [`ItemListOptions.categories`](./item-types.md) accepteert een reeks categorie-ID's voor filtering
