---
id: collections-schema-deep-dive
title: "Favorieten en collecties Schema Deep Dive"
sidebar_label: "Collectieschema"
sidebar_position: 56
---

# Favorieten en collecties Schema Deep Dive

## Overzicht

De Ever Works-sjabloon implementeert een **favorietensysteem** dat dient als het mechanisme voor het verzamelen van gebruikers. Er is geen aparte `collections` tabel; het beheer van items door de gebruiker wordt afgehandeld via de tabel `favorites`, waarin door de gebruiker opgeslagen items met gedenormaliseerde metagegevens worden opgeslagen voor een efficiënte weergave. Voor door de beheerder beheerde collecties biedt de tabel `featured_items` een beheerde set gemarkeerde items.

**Bronbestand:** `template/lib/db/schema.ts`
**Relatiebestand:** `template/lib/db/migrations/relations.ts`

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

## Tabel: `featured_items`

Door de beheerder samengestelde verzameling gemarkeerde items. Ondersteunt bestellen, activeren/deactiveren en optionele tijdgebaseerde vervaldatum.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`itemSlug`|`item_slug`|`text`|Nee| - |Artikel-ID|
|`itemName`|`item_name`|`text`|Nee| - |Gedenormaliseerd|
|`itemIconUrl`|`item_icon_url`|`text`|Ja| - |Gedenormaliseerd|
|`itemCategory`|`item_category`|`text`|Ja| - |Gedenormaliseerd|
|`itemDescription`|`item_description`|`text`|Ja| - |Gedenormaliseerd|
|`featuredOrder`|`featured_order`|`integer`|Nee| `0` |Sorteervolgorde|
|`featuredUntil`|`featured_until`|`timestamp`|Ja| - |Automatische vervaldatum|
|`isActive`|`is_active`|`boolean`|Nee|`true`|Actieve schakelaar|
|`featuredBy`|`featured_by`|`text`|Nee| - |Beheerder gebruikers-ID|
|`featuredAt`|`featured_at`|`timestamp`|Nee|`now()`| - |
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`featured_items_item_slug_idx`|`itemSlug`|B-boom|
|`featured_items_featured_order_idx`|`featuredOrder`|B-boom|
|`featured_items_is_active_idx`|`isActive`|B-boom|
|`featured_items_featured_at_idx`|`featuredAt`|B-boom|
|`featured_items_featured_until_idx`|`featuredUntil`|B-boom|

### TypeScript-typen

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

## Relatiediagram

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

## Voorbeelden van zoekopdrachten

### Voeg item toe aan favorieten

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

### Verwijder item uit favorieten

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

### Controleer of het item favoriet is

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

### Ontvang de favorietenlijst van de gebruiker

```typescript
const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
```

### Ontvang de meest favoriete items

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

### Voeg een uitgelicht item toe

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

### Ontvang actieve aanbevolen items (niet verlopen)

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
