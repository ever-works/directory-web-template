---
id: items-schema-deep-dive
title: "项目架构深入探究"
sidebar_label: "项目架构"
sidebar_position: 50
---

# 项目架构深入探究

## 概述

在 Ever Works 模板中，**项目存储在基于 Git 的 CMS**（`.content/` 目录）中，而不是存储在传统的数据库表中。但是，多个数据库表支持与项目相关的操作，例如跟踪视图、审核更改、索引位置、管理收藏夹、展示项目以及将项目链接到公司。

此页面记录了引用或支持项目的每个数据库表。

**源文件：** `template/lib/db/schema.ts`

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

## 表：`favorites`

存储用户书签/收藏夹与项目的关系，由 slug 标识。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`userId`|`userId`|`text`|否| - |FK -> `users.id`（级联）|
|`itemSlug`|`item_slug`|`text`|否| - | - |
|`itemName`|`item_name`|`text`|否| - | - |
|`itemIconUrl`|`item_icon_url`|`text`|是的| - | - |
|`itemCategory`|`item_category`|`text`|是的| - | - |
|`createdAt`|`created_at`|`timestamp`|否|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`user_item_favorite_unique_idx`|`(userId, itemSlug)`|独特|
|`favorites_user_id_idx`|`userId`|B树|
|`favorites_item_slug_idx`|`itemSlug`|B树|
|`favorites_created_at_idx`|`createdAt`|B树|

### TypeScript 类型

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

## 表：`item_views`

跟踪每个项目的每日独特浏览量。使用基于 cookie 的匿名查看者识别和 UTC 日期重复数据删除。出于隐私考虑，不存储 IP 地址。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`crypto.randomUUID()`|主键|
|`itemId`|`item_id`|`text`|否| - |物品子弹|
|`viewerId`|`viewer_id`|`text`|否| - |匿名 cookie ID|
|`viewedDateUtc`|`viewed_date_utc`|`text`|否| - |YYYY-MM-DD 格式|
|`viewedAt`|`viewed_at`|`timestamp (tz)`|否|`now()`|精准查看时间|

### 索引

|名称|专栏|类型|
|---|---|---|
|`item_views_unique_daily_idx`|`(itemId, viewerId, viewedDateUtc)`|独特|
|`item_views_item_date_idx`|`(itemId, viewedDateUtc)`|复合B树|

### TypeScript 类型

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

## 表：`item_location_index`

项目的地理空间索引，支持“Near Me”过滤和基于距离的排序。这是一个仅包含索引的表——事实来源仍然在 Git CMS 中。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|否| - |主键|
|`latitude`|`latitude`|`doublePrecision`|否| - | - |
|`longitude`|`longitude`|`doublePrecision`|否| - | - |
|`address`|`address`|`text`|是的| - | - |
|`city`|`city`|`text`|是的| - | - |
|`state`|`state`|`text`|是的| - | - |
|`country`|`country`|`text`|是的| - | - |
|`cityNormalized`|`city_normalized`|`text`|是的| - |小写，修剪|
|`countryNormalized`|`country_normalized`|`text`|是的| - |小写，修剪|
|`postalCode`|`postal_code`|`text`|是的| - | - |
|`serviceArea`|`service_area`|`text`|是的| - | - |
|`isRemote`|`is_remote`|`boolean`|否|`false`| - |
|`indexedAt`|`indexed_at`|`timestamp (tz)`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`item_location_index_latitude_idx`|`latitude`|B树|
|`item_location_index_longitude_idx`|`longitude`|B树|
|`item_location_index_city_idx`|`city`|B树|
|`item_location_index_country_idx`|`country`|B树|
|`item_location_index_city_normalized_idx`|`cityNormalized`|B树|
|`item_location_index_country_normalized_idx`|`countryNormalized`|B树|
|`item_location_index_is_remote_idx`|`isRemote`|B树|
|`item_location_index_indexed_at_idx`|`indexedAt`|B树|
|`item_location_index_lat_long_idx`|`(latitude, longitude)`|复合B树|

### TypeScript 类型

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

## 表：`location_index_meta`

单例表跟踪位置索引跨部署重建元数据。

### 专栏

|专栏|数据库名称|类型|可空|默认|约束条件|
|---|---|---|---|---|---|
|`id`|`id`|`text`|否|`'singleton'`|主键|
|`lastRebuildAt`|`last_rebuild_at`|`timestamp (tz)`|是的| - | - |
|`lastRebuildDurationMs`|`last_rebuild_duration_ms`|`integer`|是的| - | - |
|`lastRebuildItemCount`|`last_rebuild_item_count`|`integer`|是的| - | - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|否|`now()`| - |

### 索引

|名称|专栏|类型|
|---|---|---|
|`location_index_meta_singleton_idx`|`id`|独特|

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

## 查询示例

### 获取用户收藏夹

```typescript
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));
```

### 记录项目视图

```typescript
import { itemViews } from '@/lib/db/schema';

await db.insert(itemViews).values({
    itemId: 'my-item-slug',
    viewerId: cookieViewerId,
    viewedDateUtc: '2025-01-15',
}).onConflictDoNothing();
```

### 获取活跃的特色项目

```typescript
import { featuredItems } from '@/lib/db/schema';
import { eq, asc, or, isNull, gte } from 'drizzle-orm';

const featured = await db
    .select()
    .from(featuredItems)
    .where(eq(featuredItems.isActive, true))
    .orderBy(asc(featuredItems.featuredOrder));
```

### 查找某个位置（边界框）附近的项目

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

### 获取项目的审核历史记录

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
