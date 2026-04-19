---
id: items-schema-deep-dive
title: "Aprofundamento do esquema de itens"
sidebar_label: "Esquema de Itens"
sidebar_position: 50
---

# Aprofundamento do esquema de itens

## Visão geral

No modelo Ever Works, **os itens são armazenados em um CMS baseado em Git** (`.content/`), não em uma tabela de banco de dados tradicional. No entanto, múltiplas tabelas de banco de dados suportam operações relacionadas a itens, como rastreamento de visualizações, auditoria de alterações, indexação de locais, gerenciamento de favoritos, destaque de itens e vinculação de itens a empresas.

Esta página documenta todas as tabelas do banco de dados que fazem referência ou suportam itens.

**Arquivo fonte:** `template/lib/db/schema.ts`

---

## Item-Supporting Tables

| Table | Purpose |
|---|---|
| `favorites` | User-saved favorite items |
| `featured_items` | Admin-curated featured items |
| `item_views` | Per-day unique view tracking |
| `item_audit_logs` | Complete change history for admin panel |
| `item_location_index` | Geospatial index for "Near Me" filtering |
| `items_companies` | Links items to company records |
| `location_index_meta` | Singleton metadata for location index |

---

## Tabela: `favorites`

Armazena relacionamentos de favoritos/favoritos do usuário com itens, identificados por slug.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`userId`|`userId`|`text`|Não| - |FK -> `users.id` (CASCADA)|
|`itemSlug`|`item_slug`|`text`|Não| - | - |
|`itemName`|`item_name`|`text`|Não| - | - |
|`itemIconUrl`|`item_icon_url`|`text`|Sim| - | - |
|`itemCategory`|`item_category`|`text`|Sim| - | - |
|`createdAt`|`created_at`|`timestamp`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`user_item_favorite_unique_idx`|`(userId, itemSlug)`|Único|
|`favorites_user_id_idx`|`userId`|Árvore B|
|`favorites_item_slug_idx`|`itemSlug`|Árvore B|
|`favorites_created_at_idx`|`createdAt`|Árvore B|

### Tipos de TypeScript

```typescript
export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
export type FavoriteWithUser = Favorite & {
    user: typeof users.$inferSelect;
};
```

---

## Table: `featured_items`

Admin-curated list of items to highlight on the site. Supports ordering and optional expiration.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `itemSlug` | `item_slug` | `text` | No | - | - |
| `itemName` | `item_name` | `text` | No | - | - |
| `itemIconUrl` | `item_icon_url` | `text` | Yes | - | - |
| `itemCategory` | `item_category` | `text` | Yes | - | - |
| `itemDescription` | `item_description` | `text` | Yes | - | - |
| `featuredOrder` | `featured_order` | `integer` | No | `0` | Display ordering |
| `featuredUntil` | `featured_until` | `timestamp` | Yes | - | Optional expiration |
| `isActive` | `is_active` | `boolean` | No | `true` | - |
| `featuredBy` | `featured_by` | `text` | No | - | Admin user ID |
| `featuredAt` | `featured_at` | `timestamp` | No | `now()` | - |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `featured_items_item_slug_idx` | `itemSlug` | B-tree |
| `featured_items_featured_order_idx` | `featuredOrder` | B-tree |
| `featured_items_is_active_idx` | `isActive` | B-tree |
| `featured_items_featured_at_idx` | `featuredAt` | B-tree |
| `featured_items_featured_until_idx` | `featuredUntil` | B-tree |

### TypeScript Types

```typescript
export type FeaturedItem = typeof featuredItems.$inferSelect;
export type NewFeaturedItem = typeof featuredItems.$inferInsert;
```

---

## Tabela: `item_views`

Rastreia visualizações diárias exclusivas por item. Usa identificação de visualizador anônimo baseada em cookie e desduplicação de data UTC. Não armazena endereços IP para privacidade.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`crypto.randomUUID()`|Chave Primária|
|`itemId`|`item_id`|`text`|Não| - |Lesma de item|
|`viewerId`|`viewer_id`|`text`|Não| - |ID de cookie anônimo|
|`viewedDateUtc`|`viewed_date_utc`|`text`|Não| - |Formato AAAA-MM-DD|
|`viewedAt`|`viewed_at`|`timestamp (tz)`|Não|`now()`|Tempo de visualização preciso|

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`item_views_unique_daily_idx`|`(itemId, viewerId, viewedDateUtc)`|Único|
|`item_views_item_date_idx`|`(itemId, viewedDateUtc)`|Árvore B composta|

### Tipos de TypeScript

```typescript
export type ItemView = typeof itemViews.$inferSelect;
export type NewItemView = typeof itemViews.$inferInsert;
```

---

## Table: `item_audit_logs`

Stores the complete change history for items managed through the admin panel. Since items live in Git, `itemId` is the slug (not a foreign key).

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `itemId` | `item_id` | `text` | No | - | Item slug |
| `itemName` | `item_name` | `text` | No | - | Denormalized |
| `action` | `action` | `text (enum)` | No | - | See enum values below |
| `previousStatus` | `previous_status` | `text` | Yes | - | For status changes |
| `newStatus` | `new_status` | `text` | Yes | - | For status changes |
| `changes` | `changes` | `jsonb` | Yes | - | `{ field: { old, new } }` |
| `performedBy` | `performed_by` | `text` | Yes | - | FK -> `users.id` (SET NULL) |
| `performedByName` | `performed_by_name` | `text` | Yes | - | Denormalized |
| `notes` | `notes` | `text` | Yes | - | Review notes |
| `metadata` | `metadata` | `jsonb` | Yes | - | IP, user agent, etc. |
| `createdAt` | `created_at` | `timestamp (tz)` | No | `now()` | - |

### Action Enum Values

```typescript
export const ItemAuditAction = {
    CREATED: 'created',
    UPDATED: 'updated',
    STATUS_CHANGED: 'status_changed',
    REVIEWED: 'reviewed',
    DELETED: 'deleted',
    RESTORED: 'restored'
} as const;
```

### Indexes

| Name | Columns | Type |
|---|---|---|
| `item_audit_logs_item_id_idx` | `itemId` | B-tree |
| `item_audit_logs_action_idx` | `action` | B-tree |
| `item_audit_logs_performed_by_idx` | `performedBy` | B-tree |
| `item_audit_logs_created_at_idx` | `createdAt` | B-tree |
| `item_audit_logs_item_id_action_idx` | `(itemId, action)` | Composite B-tree |

### TypeScript Types

```typescript
export type ItemAuditLog = typeof itemAuditLogs.$inferSelect;
export type NewItemAuditLog = typeof itemAuditLogs.$inferInsert;
export type ItemAuditChanges = Record<string, { old: unknown; new: unknown }>;
```

---

## Tabela: `item_location_index`

Índice geoespacial para itens, permitindo filtragem "Perto de mim" e classificação baseada em distância. Esta é uma tabela apenas de índice – a fonte da verdade permanece no Git CMS.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|Não| - |Chave Primária|
|`latitude`|`latitude`|`doublePrecision`|Não| - | - |
|`longitude`|`longitude`|`doublePrecision`|Não| - | - |
|`address`|`address`|`text`|Sim| - | - |
|`city`|`city`|`text`|Sim| - | - |
|`state`|`state`|`text`|Sim| - | - |
|`country`|`country`|`text`|Sim| - | - |
|`cityNormalized`|`city_normalized`|`text`|Sim| - |Minúsculas, aparadas|
|`countryNormalized`|`country_normalized`|`text`|Sim| - |Minúsculas, aparadas|
|`postalCode`|`postal_code`|`text`|Sim| - | - |
|`serviceArea`|`service_area`|`text`|Sim| - | - |
|`isRemote`|`is_remote`|`boolean`|Não|`false`| - |
|`indexedAt`|`indexed_at`|`timestamp (tz)`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`item_location_index_latitude_idx`|`latitude`|Árvore B|
|`item_location_index_longitude_idx`|`longitude`|Árvore B|
|`item_location_index_city_idx`|`city`|Árvore B|
|`item_location_index_country_idx`|`country`|Árvore B|
|`item_location_index_city_normalized_idx`|`cityNormalized`|Árvore B|
|`item_location_index_country_normalized_idx`|`countryNormalized`|Árvore B|
|`item_location_index_is_remote_idx`|`isRemote`|Árvore B|
|`item_location_index_indexed_at_idx`|`indexedAt`|Árvore B|
|`item_location_index_lat_long_idx`|`(latitude, longitude)`|Árvore B composta|

### Tipos de TypeScript

```typescript
export type ItemLocationIndex = typeof itemLocationIndex.$inferSelect;
export type NewItemLocationIndex = typeof itemLocationIndex.$inferInsert;
```

---

## Table: `items_companies`

Links item slugs to company database records.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `itemSlug` | `item_slug` | `text` | No | - | Unique |
| `companyId` | `company_id` | `text` | No | - | FK -> `companies.id` (CASCADE) |
| `createdAt` | `created_at` | `timestamp (tz)` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp (tz)` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `items_companies_company_id_idx` | `companyId` | B-tree |

---

## Tabela: `location_index_meta`

Metadados de reconstrução de índice de localização de rastreamento de tabela singleton em implantações.

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Não|`'singleton'`|Chave Primária|
|`lastRebuildAt`|`last_rebuild_at`|`timestamp (tz)`|Sim| - | - |
|`lastRebuildDurationMs`|`last_rebuild_duration_ms`|`integer`|Sim| - | - |
|`lastRebuildItemCount`|`last_rebuild_item_count`|`integer`|Sim| - | - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`location_index_meta_singleton_idx`|`id`|Único|

---

## Relations Diagram

```mermaid
erDiagram
    users ||--o{ favorites : "has many"
    users ||--o{ item_audit_logs : "performed by"
    users ||--o{ sponsor_ads : "sponsors"
    companies ||--o{ items_companies : "has many"

    favorites {
        text id PK
        text userId FK
        text item_slug
        text item_name
        timestamp created_at
    }

    featured_items {
        text id PK
        text item_slug
        text item_name
        integer featured_order
        boolean is_active
        text featured_by
    }

    item_views {
        text id PK
        text item_id
        text viewer_id
        text viewed_date_utc
        timestamp viewed_at
    }

    item_audit_logs {
        text id PK
        text item_id
        text action
        text performed_by FK
        jsonb changes
    }

    item_location_index {
        text item_slug PK
        doublePrecision latitude
        doublePrecision longitude
        text city
        text country
    }

    items_companies {
        text item_slug UK
        text company_id FK
    }
```

---

## Exemplos de consulta

### Buscar favoritos do usuário

```typescript
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));
```

### Gravar uma visualização de item

```typescript
import { itemViews } from '@/lib/db/schema';

await db.insert(itemViews).values({
    itemId: 'my-item-slug',
    viewerId: cookieViewerId,
    viewedDateUtc: '2025-01-15',
}).onConflictDoNothing();
```

### Obtenha itens em destaque ativos

```typescript
import { featuredItems } from '@/lib/db/schema';
import { eq, asc, or, isNull, gte } from 'drizzle-orm';

const featured = await db
    .select()
    .from(featuredItems)
    .where(eq(featuredItems.isActive, true))
    .orderBy(asc(featuredItems.featuredOrder));
```

### Encontre itens próximos a um local (caixa delimitadora)

```typescript
import { itemLocationIndex } from '@/lib/db/schema';
import { and, between } from 'drizzle-orm';

const nearby = await db
    .select()
    .from(itemLocationIndex)
    .where(
        and(
            between(itemLocationIndex.latitude, minLat, maxLat),
            between(itemLocationIndex.longitude, minLng, maxLng)
        )
    );
```

### Obtenha o histórico de auditoria de um item

```typescript
import { itemAuditLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

const history = await db
    .select()
    .from(itemAuditLogs)
    .where(eq(itemAuditLogs.itemId, 'my-item-slug'))
    .orderBy(desc(itemAuditLogs.createdAt));
```

---

## Design Notes

- **Items are NOT in the database.** They live in a Git-based CMS cloned into `.content/`. The database only stores metadata, indexes, and relationships.
- **Item identification is by slug.** All item-supporting tables reference items via `item_slug` or `item_id` (which IS the slug), not via foreign keys.
- **Denormalization is intentional.** Tables like `favorites` and `featured_items` store `item_name` and `item_icon_url` to avoid cross-system lookups at read time.
- **Privacy-first views.** The `item_views` table uses anonymous cookie IDs and does not store IP addresses.
