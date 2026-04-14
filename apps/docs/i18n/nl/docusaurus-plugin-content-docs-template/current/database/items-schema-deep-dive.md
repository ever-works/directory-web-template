---
id: items-schema-deep-dive
title: "Itemsschema Diepe duik"
sidebar_label: "Artikelenschema"
sidebar_position: 50
---

# Itemsschema Diepe duik

## Overzicht

In de Ever Works-sjabloon worden **items opgeslagen in een op Git gebaseerd CMS** (`.content/` directory), niet in een traditionele databasetabel. Meerdere databasetabellen ondersteunen echter itemgerelateerde bewerkingen, zoals het bijhouden van weergaven, het controleren van wijzigingen, het indexeren van locaties, het beheren van favorieten, het weergeven van items en het koppelen van items aan bedrijven.

Deze pagina documenteert elke databasetabel die naar items verwijst of deze ondersteunt.

**Bronbestand:** `template/lib/db/schema.ts`

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

## Tabel: `favorites`

Slaat gebruikersbladwijzer-/favorietrelaties met items op, geïdentificeerd door slug.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`userId`|`userId`|`text`|Nee| - |FK -> `users.id` (CASCADE)|
|`itemSlug`|`item_slug`|`text`|Nee| - | - |
|`itemName`|`item_name`|`text`|Nee| - | - |
|`itemIconUrl`|`item_icon_url`|`text`|Ja| - | - |
|`itemCategory`|`item_category`|`text`|Ja| - | - |
|`createdAt`|`created_at`|`timestamp`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`user_item_favorite_unique_idx`|`(userId, itemSlug)`|Uniek|
|`favorites_user_id_idx`|`userId`|B-boom|
|`favorites_item_slug_idx`|`itemSlug`|B-boom|
|`favorites_created_at_idx`|`createdAt`|B-boom|

### TypeScript-typen

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

## Tabel: `item_views`

Houdt unieke dagelijkse weergaven bij per item. Maakt gebruik van op cookies gebaseerde anonieme kijkersidentificatie en UTC-datumontdubbeling. Slaat geen IP-adressen op vanwege privacy.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`crypto.randomUUID()`|Primaire sleutel|
|`itemId`|`item_id`|`text`|Nee| - |Artikel slak|
|`viewerId`|`viewer_id`|`text`|Nee| - |Anonieme cookie-ID|
|`viewedDateUtc`|`viewed_date_utc`|`text`|Nee| - |JJJJ-MM-DD-formaat|
|`viewedAt`|`viewed_at`|`timestamp (tz)`|Nee|`now()`|Nauwkeurige kijktijd|

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`item_views_unique_daily_idx`|`(itemId, viewerId, viewedDateUtc)`|Uniek|
|`item_views_item_date_idx`|`(itemId, viewedDateUtc)`|Composiet B-boom|

### TypeScript-typen

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

## Tabel: `item_location_index`

Geospatiale index voor items, waardoor filteren op "Near Me" en op afstand gebaseerd sorteren mogelijk wordt. Dit is een tabel met alleen een index; de bron van de waarheid blijft in het Git CMS.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|Nee| - |Primaire sleutel|
|`latitude`|`latitude`|`doublePrecision`|Nee| - | - |
|`longitude`|`longitude`|`doublePrecision`|Nee| - | - |
|`address`|`address`|`text`|Ja| - | - |
|`city`|`city`|`text`|Ja| - | - |
|`state`|`state`|`text`|Ja| - | - |
|`country`|`country`|`text`|Ja| - | - |
|`cityNormalized`|`city_normalized`|`text`|Ja| - |Kleine letters, bijgesneden|
|`countryNormalized`|`country_normalized`|`text`|Ja| - |Kleine letters, bijgesneden|
|`postalCode`|`postal_code`|`text`|Ja| - | - |
|`serviceArea`|`service_area`|`text`|Ja| - | - |
|`isRemote`|`is_remote`|`boolean`|Nee|`false`| - |
|`indexedAt`|`indexed_at`|`timestamp (tz)`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`item_location_index_latitude_idx`|`latitude`|B-boom|
|`item_location_index_longitude_idx`|`longitude`|B-boom|
|`item_location_index_city_idx`|`city`|B-boom|
|`item_location_index_country_idx`|`country`|B-boom|
|`item_location_index_city_normalized_idx`|`cityNormalized`|B-boom|
|`item_location_index_country_normalized_idx`|`countryNormalized`|B-boom|
|`item_location_index_is_remote_idx`|`isRemote`|B-boom|
|`item_location_index_indexed_at_idx`|`indexedAt`|B-boom|
|`item_location_index_lat_long_idx`|`(latitude, longitude)`|Composiet B-boom|

### TypeScript-typen

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

## Tabel: `location_index_meta`

Singleton-tabel-trackinglocatie-index herbouwt metagegevens voor verschillende implementaties.

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nee|`'singleton'`|Primaire sleutel|
|`lastRebuildAt`|`last_rebuild_at`|`timestamp (tz)`|Ja| - | - |
|`lastRebuildDurationMs`|`last_rebuild_duration_ms`|`integer`|Ja| - | - |
|`lastRebuildItemCount`|`last_rebuild_item_count`|`integer`|Ja| - | - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`location_index_meta_singleton_idx`|`id`|Uniek|

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

## Voorbeelden van zoekopdrachten

### Haal gebruikersfavorieten op

```typescript
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));
```

### Neem een itemweergave op

```typescript
import { itemViews } from '@/lib/db/schema';

await db.insert(itemViews).values({
    itemId: 'my-item-slug',
    viewerId: cookieViewerId,
    viewedDateUtc: '2025-01-15',
}).onConflictDoNothing();
```

### Ontvang actieve aanbevolen items

```typescript
import { featuredItems } from '@/lib/db/schema';
import { eq, asc, or, isNull, gte } from 'drizzle-orm';

const featured = await db
    .select()
    .from(featuredItems)
    .where(eq(featuredItems.isActive, true))
    .orderBy(asc(featuredItems.featuredOrder));
```

### Items in de buurt van een locatie zoeken (kader)

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

### Ontvang de auditgeschiedenis voor een item

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
