---
id: items-schema-deep-dive
title: "Głębokie nurkowanie w schemacie przedmiotów"
sidebar_label: "Schemat przedmiotów"
sidebar_position: 50
---

# Głębokie nurkowanie w schemacie przedmiotów

## Przegląd

W szablonie Ever Works **elementy są przechowywane w katalogu CMS opartym na Git** (`.content/`), a nie w tradycyjnej tabeli bazy danych. Jednak wiele tabel bazy danych obsługuje operacje związane z elementami, takie jak śledzenie wyświetleń, kontrolowanie zmian, indeksowanie lokalizacji, zarządzanie ulubionymi, prezentowanie elementów i łączenie elementów z firmami.

Na tej stronie dokumentowana jest każda tabela bazy danych, która odwołuje się do elementów lub je obsługuje.

**Plik źródłowy:** `template/lib/db/schema.ts`

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

Przechowuje zakładki użytkownika/ulubione powiązania z elementami identyfikowanymi przez ślimaka.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`userId`|`userId`|`text`|Nie| - |FK -> `users.id` (KASKADA)|
|`itemSlug`|`item_slug`|`text`|Nie| - | - |
|`itemName`|`item_name`|`text`|Nie| - | - |
|`itemIconUrl`|`item_icon_url`|`text`|Tak| - | - |
|`itemCategory`|`item_category`|`text`|Tak| - | - |
|`createdAt`|`created_at`|`timestamp`|Nie|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`user_item_favorite_unique_idx`|`(userId, itemSlug)`|Wyjątkowy|
|`favorites_user_id_idx`|`userId`|Drzewo B|
|`favorites_item_slug_idx`|`itemSlug`|Drzewo B|
|`favorites_created_at_idx`|`createdAt`|Drzewo B|

### Typy TypeScriptu

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

Śledzi unikalne dzienne wyświetlenia każdego przedmiotu. Wykorzystuje anonimową identyfikację przeglądającego w oparciu o pliki cookie i deduplikację dat UTC. Nie przechowuje adresów IP w celu zapewnienia prywatności.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`crypto.randomUUID()`|Klucz podstawowy|
|`itemId`|`item_id`|`text`|Nie| - |Problem z przedmiotem|
|`viewerId`|`viewer_id`|`text`|Nie| - |Anonimowy identyfikator pliku cookie|
|`viewedDateUtc`|`viewed_date_utc`|`text`|Nie| - |Format RRRR-MM-DD|
|`viewedAt`|`viewed_at`|`timestamp (tz)`|Nie|`now()`|Dokładny czas oglądania|

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`item_views_unique_daily_idx`|`(itemId, viewerId, viewedDateUtc)`|Wyjątkowy|
|`item_views_item_date_idx`|`(itemId, viewedDateUtc)`|Kompozytowe drzewo B|

### Typy TypeScriptu

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

Indeks geoprzestrzenny elementów umożliwiający filtrowanie „W pobliżu mnie” i sortowanie na podstawie odległości. To jest tabela zawierająca wyłącznie indeksy — źródło prawdy pozostaje w Git CMS.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|Nie| - |Klucz podstawowy|
|`latitude`|`latitude`|`doublePrecision`|Nie| - | - |
|`longitude`|`longitude`|`doublePrecision`|Nie| - | - |
|`address`|`address`|`text`|Tak| - | - |
|`city`|`city`|`text`|Tak| - | - |
|`state`|`state`|`text`|Tak| - | - |
|`country`|`country`|`text`|Tak| - | - |
|`cityNormalized`|`city_normalized`|`text`|Tak| - |Małe litery, przycięte|
|`countryNormalized`|`country_normalized`|`text`|Tak| - |Małe litery, przycięte|
|`postalCode`|`postal_code`|`text`|Tak| - | - |
|`serviceArea`|`service_area`|`text`|Tak| - | - |
|`isRemote`|`is_remote`|`boolean`|Nie|`false`| - |
|`indexedAt`|`indexed_at`|`timestamp (tz)`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`item_location_index_latitude_idx`|`latitude`|Drzewo B|
|`item_location_index_longitude_idx`|`longitude`|Drzewo B|
|`item_location_index_city_idx`|`city`|Drzewo B|
|`item_location_index_country_idx`|`country`|Drzewo B|
|`item_location_index_city_normalized_idx`|`cityNormalized`|Drzewo B|
|`item_location_index_country_normalized_idx`|`countryNormalized`|Drzewo B|
|`item_location_index_is_remote_idx`|`isRemote`|Drzewo B|
|`item_location_index_indexed_at_idx`|`indexedAt`|Drzewo B|
|`item_location_index_lat_long_idx`|`(latitude, longitude)`|Kompozytowe drzewo B|

### Typy TypeScriptu

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

Metadane dotyczące indeksu lokalizacji śledzenia tabeli Singleton odbudowują metadane w różnych wdrożeniach.

### Kolumny

|Kolumna|Nazwa bazy danych|Wpisz|Możliwość wartości null|Domyślne|Ograniczenia|
|---|---|---|---|---|---|
|`id`|`id`|`text`|Nie|`'singleton'`|Klucz podstawowy|
|`lastRebuildAt`|`last_rebuild_at`|`timestamp (tz)`|Tak| - | - |
|`lastRebuildDurationMs`|`last_rebuild_duration_ms`|`integer`|Tak| - | - |
|`lastRebuildItemCount`|`last_rebuild_item_count`|`integer`|Tak| - | - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nie|`now()`| - |

### Indeksy

|Imię|Kolumny|Wpisz|
|---|---|---|
|`location_index_meta_singleton_idx`|`id`|Wyjątkowy|

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

## Przykłady zapytań

### Pobierz ulubione użytkownika

```typescript
import { db } from '@/lib/db/drizzle';
import { favorites } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));
```

### Nagraj widok elementu

```typescript
import { itemViews } from '@/lib/db/schema';

await db.insert(itemViews).values({
    itemId: 'my-item-slug',
    viewerId: cookieViewerId,
    viewedDateUtc: '2025-01-15',
}).onConflictDoNothing();
```

### Zdobądź aktywne polecane elementy

```typescript
import { featuredItems } from '@/lib/db/schema';
import { eq, asc, or, isNull, gte } from 'drizzle-orm';

const featured = await db
    .select()
    .from(featuredItems)
    .where(eq(featuredItems.isActive, true))
    .orderBy(asc(featuredItems.featuredOrder));
```

### Znajdź elementy w pobliżu lokalizacji (obwiednia)

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

### Uzyskaj historię audytu dla elementu

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
