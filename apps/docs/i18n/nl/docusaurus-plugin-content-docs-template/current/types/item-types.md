---
id: item-types
title: Definities van itemtypes
sidebar_label: Artikeltypen
sidebar_position: 1
---

# Definities van itemtypes

**Bron:** `lib/types/item.ts`

Items zijn de belangrijkste inhoudsentiteiten in de sjabloon. Deze module definieert de datastructuren voor het maken, lezen, bijwerken en weergeven van items, samen met validatieconstanten en statusbeheertypen.

## Interfaces

### `ItemLocationData`

Locatiegegevens voor items die kunnen worden geocodeerd. Opgeslagen in YAML en geïndexeerd in `item_location_index` voor snelle geo-query's.

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

De primaire itemgegevensstructuur die wordt geretourneerd door leesbewerkingen.

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

**Belangrijkste details:**
- `category` ondersteunt zowel een enkele tekenreeks als een array voor items uit meerdere categorieën
- `status` gebruikt een goedkeuringsstroom met vier statussen: concept, in behandeling, goedgekeurd, afgewezen
- `deleted_at` maakt zachte verwijdering mogelijk zonder gegevens te verwijderen
- `action` definieert het CTA-knoptype op de itemdetailpagina

### `CreateItemRequest`

Voer de payload in voor het maken van een nieuw item (POST-eindpunt).

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

Voer de payload in voor het bijwerken van een bestaand item. Breidt `Partial<CreateItemRequest>` uit, zodat alle velden behalve `id` optioneel zijn.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

Queryparameters voor het filteren en pagineren van itemlijsten.

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

Gepagineerd antwoord voor query's op de itemlijst.

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

Antwoordenvelop voor bewerkingen met één artikel.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

Payload voor het goedkeuren of afwijzen van een item tijdens het beoordelingsproces.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## Typ aliassen

### `SortField`

Geldige velden voor het sorteren van artikellijsten:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

Sorteerrichting:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

Een samenvoegingstype afgeleid van `ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## Constanten

### `ITEM_VALIDATION`

Validatiebeperkingen voor itemvelden:

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

Canonieke statuswaarden voor de workflow voor itemgoedkeuring:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

Voor mensen leesbare labels voor elke status:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

UI-kleurtoewijzingen voor elke status:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Gebruiksvoorbeelden

### Een artikel maken

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

### Artikelen filteren

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

### Statusbadges weergeven

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

## Gerelateerde typen

- [`ItemLocationData`](./location-types.md) referenties `MapProvider` uit de locatiemodule
- [`ClientSubmissionData`](./item-types.md) in `client-item.ts` breidt `ItemData` uit met betrokkenheidsstatistieken
- [`CategoryData`](./category-types.md) definieert de categoriewaarden waarnaar wordt verwezen in `ItemData.category`
- [`TagData`](./category-types.md) definieert de tagwaarden waarnaar wordt verwezen in `ItemData.tags`
