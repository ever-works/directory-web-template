---
id: tag-types
title: Definicje typów tagów
sidebar_label: Typy tagów
sidebar_position: 20
---

# Definicje typów tagów

**Źródło:** `lib/types/tag.ts`

Tagi zapewniają płaski system etykietowania przedmiotów. Są one zarządzane poprzez interfejs administratora i przechowywane w systemie zawartości opartym na plikach.

## Interfejsy

### `TagData`

Podstawowa struktura danych znacznika.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Pole|Wpisz|Opis|
|-------|------|-------------|
|`id`|`string`|Stabilny identyfikator używany w plikach YAML pozycji|
|`name`|`string`|Etykieta czytelna dla człowieka wyświetlana w interfejsie użytkownika, 2–50 znaków|
|`isActive`|`boolean`|Nieaktywne tagi są ukryte przed filtrami publicznymi, ale zachowane w danych|

### `TagWithCount`

Dane tagów rozszerzone o statystyki użytkowania.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Ładunek umożliwiający utworzenie nowego tagu.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Ładunek umożliwiający aktualizację tagu. Nie można zmienić `id`.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Parametry zapytania dotyczące tagów listy.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Typy odpowiedzi

### `TagListResponse`

Odpowiedź na listę znaczników spaginowaną.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

Wynik operacji na pojedynczym tagu.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Zasady walidacji

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Pole|Reguła|
|-------|------|
|`name`|2-50 znaków|
|`id`|Musi być unikalny we wszystkich tagach|

## Tagi w systemie treści

Do tagów odwołuje się identyfikator w plikach YAML pozycji:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Repozytorium tagów odczytuje definicje tagów z repozytorium treści i udostępnia je interfejsowi administratora oraz komponentom filtra.

## Integracja filtrów

Tagi integrują się z systemem filtrów po stronie klienta poprzez następujące komponenty:

- `components/filters/components/tags/` — interfejs użytkownika filtra tagów
- `components/filters/hooks/use-tag-visibility.ts` — kontroluje, które tagi się pojawiają
- `components/filters/utils/tag-utils.ts` -- funkcje pomocnicze do filtrowania tagów

## Przykład użycia

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## Powiązane typy

- [Typy kolekcji](./collection-types.md) -- kolekcje jako alternatywny model grupowania
- [Typy elementów](./item-types.md) — elementy odwołujące się do tagów
- [Typy uprawnień](./permission-types.md) -- `tags:read`, `tags:create` itd.
