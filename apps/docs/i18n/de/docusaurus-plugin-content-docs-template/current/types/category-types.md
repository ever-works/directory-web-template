---
id: category-types
title: Kategorietypdefinitionen
sidebar_label: Kategorietypen
sidebar_position: 3
---

# Kategorietypdefinitionen

**Quelle:** `lib/types/category.ts`

Kategorien werden verwendet, um Elemente in logischen Gruppen zu organisieren. Die Vorlage verwendet ein dateibasiertes System, in dem Kategorien als strukturierte Daten gespeichert und von Elementen referenziert werden.

## Schnittstellen

### `CategoryData`

Die Kernkategoriedatenstruktur mit minimalen Feldern.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` – Eindeutige Kennung für die Kategorie (normalerweise ein Slug wie `"developer-tools"`)
- `name` – Menschenlesbarer Anzeigename (z. B. `"Developer Tools"`)

### `CategoryWithCount`

Erweiterte Kategoriedaten, die die Artikelanzahl und den aktiven Status umfassen und in Admin-Dashboards und Kategorielisten verwendet werden.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` – Anzahl der dieser Kategorie zugewiesenen Elemente
- `isInactive` – Ob die Kategorie in der Konfiguration vorhanden ist, aber keine zugewiesenen Elemente hat

### `CreateCategoryRequest`

Nutzlast zum Erstellen einer neuen Kategorie.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Nutzlast zum Aktualisieren einer vorhandenen Kategorie. Erweitert `Partial<CreateCategoryRequest>`, sodass nur die zu ändernden Felder bereitgestellt werden müssen, `id` jedoch immer erforderlich ist.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Paginierte Antwort für Kategorielistenabfragen.

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

Antwortumschlag für Vorgänge mit einer Kategorie.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Abfrageparameter zum Filtern und Paginieren von Kategorielisten.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` – Wenn `true`, werden Kategorien mit null Elementen einbezogen
- `sortBy` – Sortieren nach Kategoriename oder ID
- Die Standardsortierreihenfolge ist aufsteigend nach Namen

## Konstanten

### `CATEGORY_VALIDATION`

Validierungseinschränkungen für Kategoriefelder:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Anwendungsbeispiele

### Eine Kategorie erstellen

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

### Auflisten von Kategorien mit Optionen

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

### Kategorien mit Zählungen anzeigen

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

### Aktualisieren einer Kategorie

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Verwandte Typen

- [`ItemData.category`](./item-types.md) verweist auf Kategorie-IDs (unterstützt `string | string[]`)
- [`TagData`](./category-types.md) folgt einem ähnlichen Muster für Tags
- [`ItemListOptions.categories`](./item-types.md) akzeptiert ein Array von Kategorie-IDs zum Filtern
