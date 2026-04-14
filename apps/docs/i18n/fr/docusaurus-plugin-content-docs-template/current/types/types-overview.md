---
id: types-overview
title: Présentation du système de saisie
sidebar_label: Aperçu
sidebar_position: 0
---

# Présentation du système de saisie

Le modèle utilise un système de types TypeScript complet situé dans `lib/types/`. Ces définitions de types servent de source unique de vérité pour les structures de données utilisées dans les routes d'API, les services, les référentiels et les composants d'interface utilisateur.

## Type de fichiers

Le répertoire `lib/types/` contient les modules suivants :

|Fichier|Descriptif|
|------|-------------|
|`item.ts`|Données d'article, requêtes CRUD, options de liste, constantes de validation et définitions de statut|
|`user.ts`|Données utilisateur administrateur, types d'authentification, schémas de validation Zod et fonctions d'assistance|
|`profile.ts`|Structure de profil d'utilisateur public comprenant les liens sociaux, les compétences, le portfolio et les soumissions|
|`category.ts`|Données de catégorie, requêtes CRUD, options de liste et constantes de validation|
|`comment.ts`|Types de commentaires déduits du schéma de base de données, y compris les commentaires enrichis par l'utilisateur|
|`vote.ts`|Schéma de vote (Zod), types de réponse, types d'erreur et état de vote côté client|
|`survey.ts`|Types d'enquête et de réponse à l'enquête, options de filtre et énumérations de statut/type|
|`location.ts`|Paramètres de localisation, types de requêtes géographiques, types de fournisseurs de cartes et données de coordonnées|
|`sponsor-ad.ts`|Types de publicités des sponsors, y compris les demandes, les réponses, les statistiques et les données du tableau de bord|
|`client.ts`|Types de profils clients pour le portail destiné aux clients, y compris le tableau de bord et les statistiques|
|`client-item.ts`|Types de soumission d'éléments côté client avec mesures d'engagement et filtres de statut|
|`role.ts`|Types de rôles et d'autorisations pour le système RBAC|
|`tag.ts`|Données de balise, requêtes CRUD, options de liste et constantes de validation|
|`twenty-crm-config.types.ts`|Vingt types de configuration d'intégration CRM et de tests de connexion|
|`twenty-crm-entities.types.ts`|Vingt types d'entités CRM pour les enregistrements de personne et d'entreprise|
|`twenty-crm-errors.types.ts`|Types d'erreur structurés, codes d'erreur et protections de type pour les erreurs CRM|
|`twenty-crm-sync.types.ts`|Opérations Upsert, entrées de cache et types liés à la synchronisation|

## Modèles d'architecture

### Modèle CRUD cohérent

La plupart des types d'entités suivent un modèle cohérent d'interfaces :

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Constantes de validation

Chaque module d'entité exporte un objet constantes de validation en utilisant `as const` pour la sécurité des types :

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Ces constantes sont utilisées à la fois dans la validation côté serveur et dans la validation de formulaire côté client, garantissant des règles cohérentes dans toute la pile.

### Réponses syndicales discriminées

Les types de réponse API utilisent des unions discriminées pour une gestion des erreurs sécurisée :

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Ce modèle est utilisé par `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` et d'autres.

### Intégration du schéma Zod

Plusieurs modules utilisent Zod pour la validation d'exécution aux côtés des types TypeScript :

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Ceci est utilisé dans `vote.ts` (pour le schéma de vote) et `user.ts` (pour la validation de l'utilisateur).

### Types étendus avec relations

Les types qui incluent des données associées utilisent le mot-clé `extends` :

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Conventions d'importation

Les types sont importés à l'aide du mot-clé `type` pour les importations de type uniquement :

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Cela garantit que les types sont effacés au moment de la compilation et n'affectent pas la taille du bundle.

## Configuration et types d'exécution

Le module de localisation illustre un modèle utilisé pour la configuration :

- **Les types de configuration** utilisent `snake_case` pour correspondre aux fichiers de configuration YAML
- **Les types d'exécution** utilisent `camelCase` pour une utilisation idiomatique de TypeScript
- Une fonction de mappage convertit entre les deux formats

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Énumérations et étiquettes d'état

Les valeurs d'état sont définies sous forme d'objets const avec les mappages d'étiquettes et de couleurs correspondants :

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Types déduits par la base de données

Certains types sont déduits directement du schéma Drizzle ORM :

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Cette approche garantit que les types restent automatiquement synchronisés avec les migrations de bases de données.

## Documentation connexe

- [Types d'éléments](./item-types.md) - Structures de données d'éléments de base
- [Types d'utilisateurs](./user-types.md) - Authentification des utilisateurs et types de profils
- [Types de catégories](./category-types.md) - Types de gestion des catégories
- [Types de commentaires](./comment-types.md) - Types de commentaires et de révisions
- [Types de vote](./vote-types.md) - Types de systèmes de vote
- [Types d'enquête](./survey-types.md) - Types d'enquête et de réponse
- [Types de localisation](./location-types.md) - Géolocalisation et types de cartes
- [Types d'annonces de sponsoring](./sponsor-ad-types.md) - Types de parrainage et de publicité
- [Types CRM](./crm-types.md) - Vingt types d'intégration CRM
