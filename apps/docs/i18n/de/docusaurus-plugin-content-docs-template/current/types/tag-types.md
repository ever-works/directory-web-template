---
id: tag-types
title: Tag-Typdefinitionen
sidebar_label: Tag-Typen
sidebar_position: 20
---

# Tag-Typdefinitionen

**Quelle:** `lib/types/tag.ts`

Tags bieten ein flaches Etikettierungssystem für Artikel. Sie werden über die Admin-Oberfläche verwaltet und im dateibasierten Content-System gespeichert.

## Schnittstellen

### `TagData`

Die Basis-Tag-Datenstruktur.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Feld|Typ|Beschreibung|
|-------|------|-------------|
|`id`|`string`|Stabiler Bezeichner, der in Element-YAML-Dateien verwendet wird|
|`name`|`string`|Für Menschen lesbares Etikett, das in der Benutzeroberfläche angezeigt wird, 2–50 Zeichen|
|`isActive`|`boolean`|Inaktive Tags werden vor öffentlichen Filtern ausgeblendet, bleiben aber in den Daten erhalten|

### `TagWithCount`

Tag-Daten erweitert um Nutzungsstatistiken.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Nutzlast zum Erstellen eines neuen Tags.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Nutzlast zum Aktualisieren eines Tags. Der `id` kann nicht geändert werden.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Abfrageparameter zum Auflisten von Tags.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Antworttypen

### `TagListResponse`

Antwort der paginierten Tag-Liste.

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

Ergebnis der Einzeltag-Operation.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Validierungsregeln

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Feld|Regel|
|-------|------|
|`name`|2-50 Zeichen|
|`id`|Muss für alle Tags eindeutig sein|

## Tags im Inhaltssystem

Tags werden in Element-YAML-Dateien anhand ihrer ID referenziert:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Das Tag-Repository liest Tag-Definitionen aus dem Inhalts-Repository und stellt sie der Admin-Benutzeroberfläche und den Filterkomponenten zur Verfügung.

## Filterintegration

Tags werden über diese Komponenten in das clientseitige Filtersystem integriert:

- `components/filters/components/tags/` – Tag-Filter-Benutzeroberfläche
- `components/filters/hooks/use-tag-visibility.ts` – steuert, welche Tags angezeigt werden
- `components/filters/utils/tag-utils.ts` – Hilfsfunktionen für die Tag-Filterung

## Anwendungsbeispiel

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

## Verwandte Typen

- [Sammlungstypen](./collection-types.md) – Sammlungen als alternatives Gruppierungsmodell
- [Elementtypen](./item-types.md) – Elemente, die auf Tags verweisen
- [Berechtigungstypen](./permission-types.md) – `tags:read`, `tags:create` usw.
