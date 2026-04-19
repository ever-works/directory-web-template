---
id: category-types
title: Definicje typów kategorii
sidebar_label: Typy kategorii
sidebar_position: 3
---

# Definicje typów kategorii

**Źródło:** `lib/types/category.ts`

Kategorie służą do organizowania elementów w logiczne grupy. Szablon korzysta z systemu opartego na plikach, w którym kategorie są przechowywane jako uporządkowane dane i odwołują się do nich elementy.

## Interfejsy

### `CategoryData`

Podstawowa struktura danych kategorii z minimalnymi polami.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` – Unikalny identyfikator kategorii (zwykle ślimak taki jak `"developer-tools"`)
- `name` - Nazwa wyświetlana czytelna dla człowieka (np. `"Developer Tools"`)

### `CategoryWithCount`

Rozszerzone dane kategorii, które obejmują liczbę elementów i stan aktywny, używane w panelach administracyjnych i listach kategorii.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Liczba pozycji przypisanych do tej kategorii
- `isInactive` - Czy kategoria istnieje w konfiguracji, ale nie ma przypisanych elementów

### `CreateCategoryRequest`

Ładunek umożliwiający utworzenie nowej kategorii.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Ładunek umożliwiający aktualizację istniejącej kategorii. Rozszerza `Partial<CreateCategoryRequest>`, więc należy podać tylko zmieniane pola, ale `id` jest zawsze wymagane.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Paginowana odpowiedź na zapytania dotyczące listy kategorii.

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

Koperta odpowiedzi dla operacji pojedynczej kategorii.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Parametry zapytań do filtrowania i paginacji list kategorii.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` — gdy `true` obejmuje kategorie zawierające zero elementów
- `sortBy` - Sortuj według nazwy kategorii lub identyfikatora
- Domyślny porządek sortowania jest rosnący według nazwy

## Stałe

### `CATEGORY_VALIDATION`

Ograniczenia walidacyjne dla pól kategorii:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Przykłady użycia

### Tworzenie kategorii

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

### Kategorie aukcji z opcjami

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

### Wyświetlanie kategorii z liczbami

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

### Aktualizacja kategorii

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Powiązane typy

- [`ItemData.category`](./item-types.md) odwołuje się do identyfikatorów kategorii (obsługuje `string | string[]`)
- [`TagData`](./category-types.md) ma podobny wzór dla tagów
- [`ItemListOptions.categories`](./item-types.md) akceptuje tablicę identyfikatorów kategorii do filtrowania
