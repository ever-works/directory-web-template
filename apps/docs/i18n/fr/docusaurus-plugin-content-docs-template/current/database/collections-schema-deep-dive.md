---
id: collections-schema-deep-dive
title: "Aperçu approfondi du schéma des favoris et des collections"
sidebar_label: "Schéma des collections"
sidebar_position: 56
---

# Aperçu approfondi du schéma des favoris et des collections

## Aperçu

Le modèle Ever Works implémente un **système de favoris** qui sert de mécanisme de collecte des utilisateurs. Il n'existe pas de table `collections` distincte : la conservation des éléments par l'utilisateur est gérée via la table `favorites`, qui stocke les éléments enregistrés par l'utilisateur avec des métadonnées dénormalisées pour un affichage efficace. Pour les collections organisées par l'administrateur, la table `featured_items` fournit un ensemble géré d'éléments mis en surbrillance.

**Fichier source :** `template/lib/db/schema.ts`
**Fichier relationnel :** `template/lib/db/migrations/relations.ts`

---

## Table: `favorites`

User-created bookmark/collection of items. Each user can save items to their personal favorites list.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `itemSlug` | `item_slug` | `text` | No | - | Item identifier |
| `itemName` | `item_name` | `text` | No | - | Denormalized display name |
| `itemIconUrl` | `item_icon_url` | `text` | Yes | - | Denormalized icon URL |
| `itemCategory` | `item_category` | `text` | Yes | - | Denormalized category |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `user_item_favorite_unique_idx` | `(userId, itemSlug)` | Unique |
| `favorites_user_id_idx` | `userId` | B-tree |
| `favorites_item_slug_idx` | `itemSlug` | B-tree |
| `favorites_created_at_idx` | `createdAt` | B-tree |

### Key Constraints

- **One favorite per user per item:** The unique composite index `user_item_favorite_unique_idx` on `(userId, itemSlug)` prevents duplicate favorites.
- **Cascade deletion:** When a user is deleted, all their favorites are automatically removed.

### TypeScript Types

```typescript
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type FavoriteWithUser = Favorite & {
    user: typeof users.$inferSelect;
};
```

---

## Tableau : `featured_items`

Collection d'éléments mis en surbrillance organisée par l'administrateur. Prend en charge la commande, l’activation/désactivation et l’expiration facultative basée sur le temps.

### Colonnes

|Colonne|Nom de la base de données|Tapez|Nullable|Par défaut|Contraintes|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Non|`crypto.randomUUID()`|Clé primaire|
|`itemSlug`|`item_slug`|`text`|Non| - |Identifiant de l'article|
|`itemName`|`item_name`|`text`|Non| - |Dénormalisé|
|`itemIconUrl`|`item_icon_url`|`text`|Oui| - |Dénormalisé|
|`itemCategory`|`item_category`|`text`|Oui| - |Dénormalisé|
|`itemDescription`|`item_description`|`text`|Oui| - |Dénormalisé|
|`featuredOrder`|`featured_order`|`integer`|Non| `0` |Ordre de tri|
|`featuredUntil`|`featured_until`|`timestamp`|Oui| - |Date d'expiration automatique|
|`isActive`|`is_active`|`boolean`|Non|`true`|Bascule active|
|`featuredBy`|`featured_by`|`text`|Non| - |ID utilisateur administrateur|
|`featuredAt`|`featured_at`|`timestamp`|Non|`now()`| - |
|`createdAt`|`created_at`|`timestamp`|Non|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Non|`now()`| - |

### Index

|Nom|Colonnes|Tapez|
|---|---|---|
|`featured_items_item_slug_idx`|`itemSlug`|Arbre B|
|`featured_items_featured_order_idx`|`featuredOrder`|Arbre B|
|`featured_items_is_active_idx`|`isActive`|Arbre B|
|`featured_items_featured_at_idx`|`featuredAt`|Arbre B|
|`featured_items_featured_until_idx`|`featuredUntil`|Arbre B|

### Types de scripts dactylographiés

```typescript
export type FeaturedItem = typeof featuredItems.$inferSelect;
export type NewFeaturedItem = typeof featuredItems.$inferInsert;
```

---

## Relations

```typescript
// From relations.ts
export const favoritesRelations = relations(favorites, ({ one }) => ({
    user: one(users, {
        fields: [favorites.userId],
        references: [users.id]
    }),
}));
```

---

## Diagramme des relations

```mermaid
erDiagram
    users ||--o{ favorites : "saves"

    favorites {
        text id PK
        text userId FK
        text item_slug
        text item_name
        text item_icon_url
        text item_category
        timestamp created_at
    }

    featured_items {
        text id PK
        text item_slug
        text item_name
        integer featured_order
        boolean is_active
        text featured_by
        timestamp featured_until
    }
```

---

## Favorites vs. Featured Items

| Aspect | `favorites` | `featured_items` |
|---|---|---|
| **Created by** | End users | Admin users |
| **Per-user** | Yes (user-scoped) | No (global) |
| **Ordering** | By `createdAt` | By `featuredOrder` |
| **Expiration** | None | Optional `featuredUntil` |
| **Active toggle** | No (exists = active) | Yes (`isActive` flag) |
| **Foreign key** | `users.id` | None (stores admin ID as text) |

---

## Exemples de requête

### Ajouter l'article aux favoris

```typescript
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';

await db.insert(favorites).values({
    userId,
    itemSlug: 'my-tool-slug',
    itemName: 'My Tool',
    itemIconUrl: '/icons/my-tool.png',
    itemCategory: 'Productivity',
}).onConflictDoNothing(); // Prevent duplicates
```

### Supprimer l'élément des favoris

```typescript
import { eq, and } from 'drizzle-orm';

await db
    .delete(favorites)
    .where(
        and(
            eq(favorites.userId, userId),
            eq(favorites.itemSlug, 'my-tool-slug')
        )
    );
```

### Vérifiez si l'élément est favori

```typescript
const isFavorited = await db
    .select({ id: favorites.id })
    .from(favorites)
    .where(
        and(
            eq(favorites.userId, userId),
            eq(favorites.itemSlug, 'my-tool-slug')
        )
    )
    .limit(1);
```

### Obtenir la liste des favoris de l'utilisateur

```typescript
const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
```

### Obtenez les articles les plus favoris

```typescript
import { sql } from 'drizzle-orm';

const popular = await db
    .select({
        itemSlug: favorites.itemSlug,
        itemName: favorites.itemName,
        count: sql<number>`count(*)`,
    })
    .from(favorites)
    .groupBy(favorites.itemSlug, favorites.itemName)
    .orderBy(sql`count(*) desc`)
    .limit(10);
```

### Ajouter un article en vedette

```typescript
import { featuredItems } from '@/lib/db/schema';

await db.insert(featuredItems).values({
    itemSlug: 'premium-tool',
    itemName: 'Premium Tool',
    itemCategory: 'Productivity',
    featuredOrder: 1,
    isActive: true,
    featuredBy: adminUserId,
    featuredUntil: new Date('2025-12-31'),
});
```

### Obtenez des articles en vedette actifs (non expirés)

```typescript
import { or, isNull, gte } from 'drizzle-orm';

const activeFeatured = await db
    .select()
    .from(featuredItems)
    .where(
        and(
            eq(featuredItems.isActive, true),
            or(
                isNull(featuredItems.featuredUntil),
                gte(featuredItems.featuredUntil, new Date())
            )
        )
    )
    .orderBy(asc(featuredItems.featuredOrder));
```

---

## Design Notes

- **Denormalized item data.** Both tables store `itemName`, `itemIconUrl`, and `itemCategory` directly rather than looking up the Git CMS at read time. This makes list queries fast but means data can become stale if items are renamed.
- **No collection grouping.** Unlike a full "collection" system with folders/lists, favorites is a flat list per user. Items can be filtered by `itemCategory` for grouping.
- **Featured items are global.** They appear the same for all users, unlike favorites which are per-user.
