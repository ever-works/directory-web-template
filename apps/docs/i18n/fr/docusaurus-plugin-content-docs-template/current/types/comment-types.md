---
id: comment-types
title: Définitions des types de commentaires
sidebar_label: Types de commentaires
sidebar_position: 4
---

# Définitions des types de commentaires

**Source :** `lib/types/comment.ts`

Les commentaires permettent aux utilisateurs de laisser des avis et des commentaires sur les éléments. Les types de commentaires sont principalement déduits du schéma de la base de données Drizzle ORM, garantissant qu'ils restent synchronisés avec les migrations de bases de données.

## Schéma de base de données

Les types `Comment` et `NewComment` sont déduits de la table `comments` définie dans `lib/db/schema.ts` :

```typescript
// From lib/db/schema.ts
const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => clientProfiles.id, { onDelete: 'cascade' }),
  itemId: text('itemId').notNull(),
  rating: integer('rating').notNull().default(0),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', {
    mode: 'date',
    withTimezone: true,
  }),
  deletedAt: timestamp('deleted_at', {
    mode: 'date',
    withTimezone: true,
  }),
});
```

## Espèces

### `Comment`

Type de sélection déduit du schéma de base de données. Représente un commentaire tel que renvoyé par les requêtes de base de données.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

Cela se résout en un objet avec la forme suivante :

```typescript
// Effective type (inferred from schema)
interface CommentShape {
  id: string;
  content: string;
  userId: string;
  itemId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}
```

**Détails du champ :**

|Champ|Tapez|Descriptif|
|-------|------|-------------|
|`id`|`string`|Clé primaire UUID générée automatiquement|
|`content`|`string`|Corps du texte du commentaire|
|`userId`|`string`|Clé étrangère vers `clientProfiles.id` (suppression en cascade)|
|`itemId`|`string`|Slug ou ID de l'élément commenté|
|`rating`|`number`|Note numérique (par défaut : 0)|
|`createdAt`|`Date`|Horodatage de création (avec fuseau horaire)|
|`updatedAt`|`Date`|Horodatage de la dernière mise à jour (avec fuseau horaire)|
|`editedAt`|`Date \|nul`|Horodatage de la dernière modification, nul si jamais modifié|
|`deletedAt`|`Date \|nul`|Horodatage de suppression logicielle, nul s'il n'est pas supprimé|

### `NewComment`

Type d'insertion déduit du schéma de base de données. Représente les données nécessaires pour créer un nouveau commentaire.

```typescript
type NewComment = typeof comments.$inferInsert;
```

Cela se résout en un objet où les champs générés automatiquement et par défaut sont facultatifs :

```typescript
// Effective type (inferred from schema)
interface NewCommentShape {
  id?: string;       // Auto-generated if not provided
  content: string;   // Required
  userId: string;    // Required
  itemId: string;    // Required
  rating?: number;   // Defaults to 0
  createdAt?: Date;  // Defaults to now()
  updatedAt?: Date;  // Defaults to now()
  editedAt?: Date | null;
  deletedAt?: Date | null;
}
```

### `CommentWithUser`

Type de commentaire étendu qui inclut les données utilisateur associées. Utilisé lors de l'affichage de commentaires dans l'interface utilisateur où les informations utilisateur (nom, avatar) sont nécessaires à côté du contenu du commentaire.

```typescript
interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}
```

## Exemples d'utilisation

### Créer un nouveau commentaire

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Interroger des commentaires avec des données utilisateur

```typescript
import type { CommentWithUser } from '@/lib/types/comment';

function renderComment(comment: CommentWithUser) {
  const authorName = comment.user.name ?? 'Anonymous';
  const isEdited = comment.editedAt !== null;
  const isDeleted = comment.deletedAt !== null;

  return {
    author: authorName,
    avatar: comment.user.image,
    text: isDeleted ? '[Comment deleted]' : comment.content,
    rating: comment.rating,
    date: comment.createdAt,
    edited: isEdited,
  };
}
```

### Filtrage des commentaires supprimés de manière logicielle

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Vérifier si un commentaire a été modifié

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Notes de conception

### Pourquoi les types induits par la bruine ?

Les types `Comment` et `NewComment` sont dérivés du schéma Drizzle ORM en utilisant `$inferSelect` et `$inferInsert`. Cette approche fournit :

1. **Synchronisation automatique** - Les types sont mis à jour automatiquement lorsque le schéma change via les migrations
2. **Distinction insertion/sélection** - `NewComment` marque correctement les champs générés automatiquement comme facultatifs
3. **Précision de la base de données** : les types correspondent exactement aux types et aux contraintes des colonnes de la base de données

### Modèle de suppression logicielle

Les commentaires utilisent un champ `deletedAt` pour une suppression logicielle :
- Une valeur `deletedAt` non nulle signifie que le commentaire est "supprimé" mais qu'il existe toujours dans la base de données.
- Les requêtes doivent filtrer par `deletedAt IS NULL` pour afficher uniquement les commentaires actifs.
- Le champ `editedAt` est distinct de `updatedAt` pour distinguer les mises à jour du système des modifications utilisateur.

### Comportement en cascade

Le champ `userId` possède une stratégie de suppression `CASCADE`. Lorsqu'un utilisateur est supprimé de `clientProfiles`, tous ses commentaires sont automatiquement supprimés de la base de données.

## Types associés

- [`Vote`](./vote-types.md) - Un autre type d'interaction utilisateur par élément
- [`ItemData`](./item-types.md) - L'élément parent auquel appartiennent les commentaires
- [`Profile`](./user-types.md) - Les données de profil utilisateur référencées par `CommentWithUser.user`
