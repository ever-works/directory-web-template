---
id: tag-types
title: Definities van tagtypes
sidebar_label: Tagtypen
sidebar_position: 20
---

# Definities van tagtypes

**Bron:** `lib/types/tag.ts`

Tags bieden een plat etiketteringssysteem voor artikelen. Ze worden beheerd via de beheerdersinterface en opgeslagen in het op bestanden gebaseerde inhoudssysteem.

## Interfaces

### `TagData`

De basistaggegevensstructuur.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Veld|Typ|Beschrijving|
|-------|------|-------------|
|`id`|`string`|Stabiele ID gebruikt in item-YAML-bestanden|
|`name`|`string`|Voor mensen leesbaar label weergegeven in gebruikersinterface, 2-50 tekens|
|`isActive`|`boolean`|Inactieve tags worden verborgen voor openbare filters, maar bewaard in de gegevens|

### `TagWithCount`

Taggegevens uitgebreid met gebruiksstatistieken.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Payload voor het maken van een nieuwe tag.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Payload voor het bijwerken van een tag. De `id` kan niet worden gewijzigd.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Queryparameters voor vermeldingstags.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Reactietypen

### `TagListResponse`

Gepagineerde taglijstreactie.

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

Resultaat van een enkele tagbewerking.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Validatieregels

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Veld|Regel|
|-------|------|
|`name`|2-50 tekens|
|`id`|Moet uniek zijn voor alle tags|

## Tags in het inhoudssysteem

Er wordt naar tags verwezen op basis van ID in item-YAML-bestanden:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

De tagrepository leest tagdefinities uit de contentrepository en levert deze aan de beheerdersinterface en filtercomponenten.

## Filterintegratie

Tags kunnen via deze componenten worden geïntegreerd met het filtersysteem aan de clientzijde:

- `components/filters/components/tags/` -- gebruikersinterface voor tagfilter
- `components/filters/hooks/use-tag-visibility.ts` -- bepaalt welke tags verschijnen
- `components/filters/utils/tag-utils.ts` -- helperfuncties voor tagfiltering

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Verzamelingstypen](./collection-types.md) -- collecties als alternatief groeperingsmodel
- [Item Types](./item-types.md) -- items die naar tags verwijzen
- [Toestemmingstypen](./permission-types.md) -- `tags:read`, `tags:create`, enz.
