---
id: tag-types
title: Definizioni del tipo di tag
sidebar_label: Tipi di tag
sidebar_position: 20
---

# Definizioni del tipo di tag

**Fonte:** `lib/types/tag.ts`

I tag forniscono un sistema di etichettatura piatto per gli articoli. Sono gestiti tramite l'interfaccia di amministrazione e archiviati nel sistema di contenuti basato su file.

## Interfacce

### `TagData`

La struttura dei dati del tag di base.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Campo|Digitare|Descrizione|
|-------|------|-------------|
|`id`|`string`|Identificatore stabile utilizzato nei file YAML degli elementi|
|`name`|`string`|Etichetta leggibile mostrata nell'interfaccia utente, da 2 a 50 caratteri|
|`isActive`|`boolean`|I tag inattivi vengono nascosti dai filtri pubblici ma conservati nei dati|

### `TagWithCount`

Dati dei tag estesi con statistiche di utilizzo.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Payload per la creazione di un nuovo tag.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Payload per l'aggiornamento di un tag. `id` non può essere modificato.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Parametri di query per elencare i tag.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Tipi di risposta

### `TagListResponse`

Risposta dell'elenco di tag impaginato.

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

Risultato dell'operazione con tag singolo.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Regole di convalida

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Campo|Regola|
|-------|------|
|`name`|2-50 caratteri|
|`id`|Deve essere univoco in tutti i tag|

## Tag nel sistema di contenuti

I tag fanno riferimento all'ID nei file YAML degli elementi:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Il repository dei tag legge le definizioni dei tag dal repository dei contenuti e le fornisce all'interfaccia utente di amministrazione e ai componenti del filtro.

## Integrazione filtro

I tag si integrano con il sistema di filtro lato client attraverso questi componenti:

- `components/filters/components/tags/` -- interfaccia utente del filtro tag
- `components/filters/hooks/use-tag-visibility.ts` -- controlla quali tag vengono visualizzati
- `components/filters/utils/tag-utils.ts` -- funzioni di supporto per il filtraggio dei tag

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di raccolta](./collection-types.md) -- raccolte come modello di raggruppamento alternativo
- [Tipi di elemento](./item-types.md) -- elementi che fanno riferimento ai tag
- [Tipi di autorizzazione](./permission-types.md) -- `tags:read`, `tags:create`, ecc.
