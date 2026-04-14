---
id: item-types
title: Elementtypdefinitionen
sidebar_label: Artikeltypen
sidebar_position: 1
---

# Elementtypdefinitionen

**Quelle:** `lib/types/item.ts`

Elemente sind die zentralen Inhaltseinheiten in der Vorlage. Dieses Modul definiert die Datenstrukturen zum Erstellen, Lesen, Aktualisieren und Auflisten von Elementen sowie Validierungskonstanten und Statusverwaltungstypen.

## Schnittstellen

### `ItemLocationData`

Standortdaten für Artikel, die geokodiert werden können. In YAML gespeichert und in `item_location_index` für schnelle Geoabfragen indiziert.

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

Die primäre Elementdatenstruktur, die von Lesevorgängen zurückgegeben wird.

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

**Wichtige Details:**
- `category` unterstützt sowohl eine einzelne Zeichenfolge als auch ein Array für Elemente mit mehreren Kategorien
- `status` verwendet einen vierstufigen Genehmigungsablauf: Entwurf, ausstehend, genehmigt, abgelehnt
- `deleted_at` ermöglicht das vorläufige Löschen, ohne Daten zu entfernen
- `action` definiert den CTA-Schaltflächentyp auf der Artikeldetailseite

### `CreateItemRequest`

Eingabenutzlast zum Erstellen eines neuen Elements (POST-Endpunkt).

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

Eingabenutzlast zum Aktualisieren eines vorhandenen Elements. Erweitert `Partial<CreateItemRequest>`, sodass alle Felder außer `id` optional sind.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

Abfrageparameter zum Filtern und Paginieren von Artikellisten.

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

Paginierte Antwort für Abfragen zur Artikelliste.

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

Antwortumschlag für Einzelelementoperationen.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

Nutzlast zum Genehmigen oder Ablehnen eines Artikels während des Überprüfungsprozesses.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## Geben Sie Aliase ein

### `SortField`

Gültige Felder zum Sortieren von Artikellisten:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

Sortierrichtung:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

Ein von `ITEM_STATUSES` abgeleiteter Union-Typ:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## Konstanten

### `ITEM_VALIDATION`

Validierungseinschränkungen für Artikelfelder:

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

Kanonische Statuswerte für den Artikelgenehmigungsworkflow:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

Für Menschen lesbare Etiketten für jeden Status:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

UI-Farbzuordnungen für jeden Status:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Anwendungsbeispiele

### Einen Artikel erstellen

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

### Elemente filtern

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

### Statusabzeichen rendern

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

## Verwandte Typen

- [`ItemLocationData`](./location-types.md) verweist auf `MapProvider` aus dem Standortmodul
- [`ClientSubmissionData`](./item-types.md) in `client-item.ts` erweitert `ItemData` um Engagement-Metriken
- [`CategoryData`](./category-types.md) definiert die Kategoriewerte, auf die in `ItemData.category` verwiesen wird
- [`TagData`](./category-types.md) definiert die Tag-Werte, auf die in `ItemData.tags` verwiesen wird
