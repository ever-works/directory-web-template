---
id: collections-schema-deep-dive
title: "Aprofundamento do esquema de favoritos e coleções"
sidebar_label: "Esquema de coleções"
sidebar_position: 56
---

# Aprofundamento do esquema de favoritos e coleções

## Visão geral

O modelo Ever Works implementa um **sistema de favoritos** que serve como mecanismo de coleta de usuários. Não há uma tabela `collections` separada - a curadoria de itens do usuário é feita por meio da tabela `favorites`, que armazena itens salvos pelo usuário com metadados desnormalizados para exibição eficiente. Para coleções com curadoria de administrador, a tabela `featured_items` fornece um conjunto gerenciado de itens destacados.

**Arquivo fonte:** `template/lib/db/schema.ts`
**Arquivo de relações:** `template/lib/db/migrations/relations.ts`

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

Coleção de itens destacados com curadoria de administrador. Suporta pedido, ativação/desativação e expiração opcional baseada em tempo.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`itemSlug`|`item_slug`|`text`|Não| - |Identificador do item|
|`itemName`|`item_name`|`text`|Não| - |Desnormalizado|
|`itemIconUrl`|`item_icon_url`|`text`|Sim| - |Desnormalizado|
|`itemCategory`|`item_category`|`text`|Sim| - |Desnormalizado|
|`itemDescription`|`item_description`|`text`|Sim| - |Desnormalizado|
|`featuredOrder`|`featured_order`|`integer`|Não| `0` |Ordem de classificação|
|`featuredUntil`|`featured_until`|`timestamp`|Sim| - |Data de expiração automática|
|`isActive`|`is_active`|`boolean`|Não|`true`|Alternar ativo|
|`featuredBy`|`featured_by`|`text`|Não| - |ID do usuário administrador|
|`featuredAt`|`featured_at`|`timestamp`|Não|`now()`| - |
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`featured_items_item_slug_idx`|`itemSlug`|Árvore B|
|`featured_items_featured_order_idx`|`featuredOrder`|Árvore B|
|`featured_items_is_active_idx`|`isActive`|Árvore B|
|`featured_items_featured_at_idx`|`featuredAt`|Árvore B|
|`featured_items_featured_until_idx`|`featuredUntil`|Árvore B|

### Tipos de TypeScript

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

## Diagrama de Relações

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

## Exemplos de consulta

### Adicionar item aos favoritos

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

### Remover item dos favoritos

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

### Verifique se o item está favorito

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

### Obtenha a lista de favoritos do usuário

```typescript
const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
```

### Obtenha os itens mais favoritos

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

### Adicione um item em destaque

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

### Obtenha itens em destaque ativos (não expirados)

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
