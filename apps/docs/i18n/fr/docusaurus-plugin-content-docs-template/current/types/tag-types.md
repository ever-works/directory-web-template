---
id: tag-types
title: Définitions des types de balises
sidebar_label: Types de balises
sidebar_position: 20
---

# Définitions des types de balises

**Source :** `lib/types/tag.ts`

Les balises fournissent un système d’étiquetage plat pour les articles. Ils sont gérés via l'interface d'administration et stockés dans le système de contenu basé sur des fichiers.

## Interfaces

### `TagData`

La structure de données de la balise de base.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`id`|`string`|Identifiant stable utilisé dans les fichiers YAML de l'élément|
|`name`|`string`|Étiquette lisible par l'homme affichée dans l'interface utilisateur, de 2 à 50 caractères|
|`isActive`|`boolean`|Les balises inactives sont masquées des filtres publics mais préservées dans les données|

### `TagWithCount`

Données de balise étendues avec des statistiques d'utilisation.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Charge utile pour créer une nouvelle balise.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Charge utile pour la mise à jour d'une balise. Le `id` ne peut pas être modifié.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Paramètres de requête pour lister les balises.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Types de réponses

### `TagListResponse`

Réponse de liste de balises paginées.

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

Résultat de l’opération avec une seule balise.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Règles de validation

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Champ|Règle|
|-------|------|
|`name`|2 à 50 caractères|
|`id`|Doit être unique dans toutes les balises|

## Balises dans le système de contenu

Les balises sont référencées par ID dans les fichiers YAML des éléments :

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Le référentiel de balises lit les définitions de balises à partir du référentiel de contenu et les fournit à l'interface utilisateur d'administration et aux composants de filtre.

## Intégration des filtres

Les balises s'intègrent au système de filtrage côté client via ces composants :

- `components/filters/components/tags/` -- interface utilisateur du filtre de balises
- `components/filters/hooks/use-tag-visibility.ts` -- contrôle quelles balises apparaissent
- `components/filters/utils/tag-utils.ts` -- fonctions d'assistance pour le filtrage des balises

## Exemple d'utilisation

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

## Types associés

- [Types de collections](./collection-types.md) -- collections comme modèle de regroupement alternatif
- [Types d'éléments](./item-types.md) - éléments faisant référence à des balises
- [Types d'autorisations](./permission-types.md) -- `tags:read`, `tags:create`, etc.
