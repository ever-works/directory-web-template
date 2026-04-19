---
id: collections-schema-deep-dive
title: "Schemat Ulubione i Kolekcje Głębokie nurkowanie"
sidebar_label: "Schemat kolekcji"
sidebar_position: 56
---

# Schemat Ulubione i Kolekcje Głębokie nurkowanie

## Przegląd

Szablon Ever Works implementuje **system ulubionych**, który służy jako mechanizm gromadzenia danych przez użytkowników. Nie ma osobnej tabeli `collections` — przeglądanie elementów przez użytkownika odbywa się poprzez tabelę `favorites`, w której przechowywane są elementy zapisane przez użytkownika ze zdenormalizowanymi metadanymi w celu wydajnego wyświetlania. W przypadku kolekcji wybranych przez administratora tabela `featured_items` udostępnia zarządzany zestaw wyróżnionych elementów.

**Plik źródłowy:** `template/lib/db/schema.ts`
**Plik relacji:** `template/lib/db/migrations/relations.ts`

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

## Tabela: `featured_items`

Kolekcja wyróżnionych elementów wybrana przez administratora. Obsługuje zamawianie, aktywację/dezaktywację i opcjonalne wygaśnięcie na podstawie czasu.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`itemSlug`|`item_slug`|`text`|Nie| - |Identyfikator przedmiotu|
|`itemName`|`item_name`|`text`|Nie| - |Zdenormalizowany|
|`itemIconUrl`|`item_icon_url`|`text`|Tak| - |Zdenormalizowany|
|`itemCategory`|`item_category`|`text`|Tak| - |Zdenormalizowany|
|`itemDescription`|`item_description`|`text`|Tak| - |Zdenormalizowany|
|`featuredOrder`|`featured_order`|`integer`|Nie| `0` |Kolejność sortowania|
|`featuredUntil`|`featured_until`|`timestamp`|Tak| - |Data automatycznego wygaśnięcia|
|`isActive`|`is_active`|`boolean`|Nie|`true`|Aktywny przełącznik|
|`featuredBy`|`featured_by`|`text`|Nie| - |Identyfikator użytkownika administratora|
|`featuredAt`|`featured_at`|`timestamp`|Nie|`now()`| - |
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`featured_items_item_slug_idx`|`itemSlug`|Drzewo B|
|`featured_items_featured_order_idx`|`featuredOrder`|Drzewo B|
|`featured_items_is_active_idx`|`isActive`|Drzewo B|
|`featured_items_featured_at_idx`|`featuredAt`|Drzewo B|
|`featured_items_featured_until_idx`|`featuredUntil`|Drzewo B|

### Typy TypeScriptu

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

## Schemat relacji

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

## Przykłady zapytań

### Dodaj element do ulubionych

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

### Usuń element z ulubionych

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

### Sprawdź, czy element jest dodany do ulubionych

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

### Uzyskaj listę ulubionych użytkowników

```typescript
const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
```

### Zdobądź najbardziej ulubione przedmioty

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

### Dodaj polecany przedmiot

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

### Zdobądź aktywne polecane elementy (nie wygasły)

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
