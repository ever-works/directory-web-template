---
id: item-types
title: Definicje typów elementów
sidebar_label: Typy przedmiotów
sidebar_position: 1
---

# Definicje typów elementów

**Źródło:** `lib/types/item.ts`

Elementy to podstawowe elementy treści w szablonie. Moduł ten definiuje struktury danych do tworzenia, odczytywania, aktualizowania i wystawiania elementów na liście, wraz ze stałymi walidacyjnymi i typami zarządzania statusem.

## Interfejsy

### `ItemLocationData`

Dane o lokalizacji przedmiotów, które można geokodować. Przechowywane w YAML i indeksowane w `item_location_index` w celu szybkich zapytań geograficznych.

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

Podstawowa struktura danych elementu zwracana przez operacje odczytu.

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

**Kluczowe szczegóły:**
- `category` obsługuje zarówno pojedynczy ciąg znaków, jak i tablicę dla elementów z wielu kategorii
- `status` wykorzystuje czterostanowy proces zatwierdzania: wersja robocza, oczekująca, zatwierdzona, odrzucona
- `deleted_at` umożliwia miękkie usuwanie bez usuwania danych
- `action` definiuje typ przycisku CTA na stronie szczegółów elementu

### `CreateItemRequest`

Ładunek wejściowy służący do tworzenia nowego elementu (punkt końcowy POST).

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

Ładunek wejściowy do aktualizacji istniejącego elementu. Rozszerza `Partial<CreateItemRequest>`, więc wszystkie pola z wyjątkiem `id` są opcjonalne.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

Parametry zapytań do filtrowania i paginacji list elementów.

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

Odpowiedź podzielona na strony na zapytania dotyczące listy pozycji.

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

Koperta odpowiedzi dla operacji na jednym elemencie.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

Ładunek umożliwiający zatwierdzenie lub odrzucenie elementu podczas procesu recenzji.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## Wpisz aliasy

### `SortField`

Poprawne pola do sortowania list artykułów:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

Kierunek sortowania:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

Typ unii wywodzący się z `ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## Stałe

### `ITEM_VALIDATION`

Ograniczenia walidacyjne dla pól pozycji:

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

Wartości stanu kanonicznego dla przepływu pracy zatwierdzania elementu:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

Czytelne dla człowieka etykiety dla każdego statusu:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

Mapowania kolorów interfejsu użytkownika dla każdego statusu:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Przykłady użycia

### Tworzenie przedmiotu

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### Filtrowanie elementów

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### Renderowanie odznak stanu

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## Powiązane typy

- [`ItemLocationData`](./location-types.md) odniesienia `MapProvider` z modułu lokalizacji
- [`ClientSubmissionData`](./item-types.md) w `client-item.ts` rozszerza `ItemData` o wskaźniki zaangażowania
- [`CategoryData`](./category-types.md) definiuje wartości kategorii, do których odwołują się `ItemData.category`
- [`TagData`](./category-types.md) definiuje wartości tagów, do których odwołują się `ItemData.tags`
