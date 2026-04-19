---
id: collections-schema-deep-dive
title: "المفضلة والمجموعات مخطط الغوص العميق"
sidebar_label: "مخطط المجموعات"
sidebar_position: 56
---

# المفضلة والمجموعات مخطط الغوص العميق

## نظرة عامة

يطبق قالب Ever Works **نظام المفضلة** الذي يعمل بمثابة آلية تجميع المستخدمين. لا يوجد جدول `collections` منفصل - تتم معالجة تنظيم المستخدم للعناصر من خلال جدول `favorites`، الذي يخزن العناصر المحفوظة بواسطة المستخدم مع بيانات تعريف غير طبيعية للعرض الفعال. بالنسبة للمجموعات التي ينظمها المسؤول، يوفر الجدول `featured_items` مجموعة مُدارة من العناصر المميزة.

**الملف المصدر:** `template/lib/db/schema.ts`
**ملف العلاقات:** `template/lib/db/migrations/relations.ts`

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

## الجدول: `featured_items`

مجموعة برعاية المشرف من العناصر المميزة. يدعم الطلب والتنشيط/التعطيل وانتهاء الصلاحية الاختياري القائم على الوقت.

### أعمدة

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`id`|`id`|`text`|لا|`crypto.randomUUID()`|المفتاح الأساسي|
|`itemSlug`|`item_slug`|`text`|لا| - |معرف العنصر|
|`itemName`|`item_name`|`text`|لا| - |غير طبيعي|
|`itemIconUrl`|`item_icon_url`|`text`|نعم| - |غير طبيعي|
|`itemCategory`|`item_category`|`text`|نعم| - |غير طبيعي|
|`itemDescription`|`item_description`|`text`|نعم| - |غير طبيعي|
|`featuredOrder`|`featured_order`|`integer`|لا| `0` |ترتيب الترتيب|
|`featuredUntil`|`featured_until`|`timestamp`|نعم| - |تاريخ انتهاء الصلاحية التلقائي|
|`isActive`|`is_active`|`boolean`|لا|`true`|تبديل نشط|
|`featuredBy`|`featured_by`|`text`|لا| - |معرف المستخدم المسؤول|
|`featuredAt`|`featured_at`|`timestamp`|لا|`now()`| - |
|`createdAt`|`created_at`|`timestamp`|لا|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|لا|`now()`| - |

### الفهارس

|الاسم|أعمدة|اكتب|
|---|---|---|
|`featured_items_item_slug_idx`|`itemSlug`|شجرة ب|
|`featured_items_featured_order_idx`|`featuredOrder`|شجرة ب|
|`featured_items_is_active_idx`|`isActive`|شجرة ب|
|`featured_items_featured_at_idx`|`featuredAt`|شجرة ب|
|`featured_items_featured_until_idx`|`featuredUntil`|شجرة ب|

### أنواع تايب سكريبت

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

## مخطط العلاقات

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

## أمثلة الاستعلام

### إضافة عنصر إلى المفضلة

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

### إزالة العنصر من المفضلة

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

### تحقق مما إذا كان العنصر مفضلاً

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

### الحصول على قائمة المفضلة للمستخدم

```typescript
const userFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));
```

### احصل على معظم العناصر المفضلة

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

### إضافة عنصر مميز

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

### احصل على العناصر المميزة النشطة (غير منتهية الصلاحية)

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
