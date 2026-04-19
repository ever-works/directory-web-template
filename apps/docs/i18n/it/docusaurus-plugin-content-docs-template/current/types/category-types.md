---
id: category-types
title: Definizioni dei tipi di categoria
sidebar_label: Tipi di categoria
sidebar_position: 3
---

# Definizioni dei tipi di categoria

**Fonte:** `lib/types/category.ts`

Le categorie vengono utilizzate per organizzare gli elementi in gruppi logici. Il modello utilizza un sistema basato su file in cui le categorie vengono archiviate come dati strutturati e a cui fanno riferimento gli elementi.

## Interfacce

### `CategoryData`

La struttura dei dati della categoria principale con campi minimi.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Identificatore univoco per la categoria (tipicamente uno slug come `"developer-tools"`)
- `name` - Nome visualizzato leggibile (ad esempio, `"Developer Tools"`)

### `CategoryWithCount`

Dati di categoria estesi che includono il conteggio degli articoli e lo stato attivo, utilizzati nei dashboard di amministrazione e negli elenchi di categorie.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Numero di articoli assegnati a questa categoria
- `isInactive` - Se la categoria esiste nella configurazione ma non ha elementi assegnati

### `CreateCategoryRequest`

Payload per la creazione di una nuova categoria.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Payload per l'aggiornamento di una categoria esistente. Estende `Partial<CreateCategoryRequest>` quindi è necessario fornire solo i campi da modificare, ma `id` è sempre obbligatorio.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Risposta impaginata per le query sull'elenco di categorie.

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

Busta di risposta per operazioni di singola categoria.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Parametri di query per filtrare e impaginare gli elenchi di categorie.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Quando `true`, include categorie che hanno zero elementi
- `sortBy` - Ordina per nome o ID della categoria
- L'ordinamento predefinito è crescente per nome

## Costanti

### `CATEGORY_VALIDATION`

Vincoli di convalida per i campi di categoria:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Esempi di utilizzo

### Creazione di una categoria

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

### Elenco delle categorie con opzioni

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

### Visualizzazione delle categorie con conteggi

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

### Aggiornamento di una categoria

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Tipi correlati

- [`ItemData.category`](./item-types.md) fa riferimento agli ID di categoria (supporta `string | string[]`)
- [`TagData`](./category-types.md) segue uno schema simile per i tag
- [`ItemListOptions.categories`](./item-types.md) accetta un array di ID di categoria per il filtraggio
