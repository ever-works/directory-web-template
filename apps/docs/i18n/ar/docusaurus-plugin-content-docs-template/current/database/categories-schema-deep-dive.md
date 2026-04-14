---
id: categories-schema-deep-dive
title: "الفئات والشركات مخطط الغوص العميق"
sidebar_label: "مخطط الفئات"
sidebar_position: 52
---

# الفئات والشركات مخطط الغوص العميق

## نظرة عامة

في قالب Ever Works، **يتم تعريف الفئات في نظام إدارة المحتوى (CMS) القائم على Git** (مستودع المحتوى)، وليس في قاعدة البيانات. لا يوجد جدول قاعدة بيانات `categories`. ومع ذلك، توفر قاعدة البيانات بنية أساسية لربط العناصر بالشركات وتتبع التسلسل الهرمي للشركة، وهو ما يخدم غرضًا تنظيميًا مماثلاً.

توثق هذه الصفحة جدول `companies` وجدول الوصلات `items_companies` وكيفية ظهور مراجع الفئة/الشركة في المخطط بأكمله.

**الملف المصدر:** `template/lib/db/schema.ts`

---

## Table: `companies`

Stores company/organization records that can be linked to items.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `name` | `name` | `text` | No | - | - |
| `website` | `website` | `text` | Yes | - | - |
| `domain` | `domain` | `text` | Yes | - | Unique |
| `slug` | `slug` | `text` | Yes | - | Unique |
| `status` | `status` | `text (enum)` | No | `'active'` | `active`, `inactive` |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `companies_name_idx` | `name` | B-tree |
| `companies_status_idx` | `status` | B-tree |
| `companies_domain_unique_idx` | `domain` | Unique |
| `companies_slug_unique_idx` | `slug` | Unique |

### TypeScript Types

```typescript
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
```

---

## الجدول: `items_companies`

جدول الوصلات الذي يربط الارتباطات الثابتة للعناصر بسجلات الشركة. يمكن ربط كل سبيكة عنصر بشركة واحدة فقط (قيد فريد على `item_slug`).

### أعمدة

|العمود|اسم قاعدة البيانات|اكتب|لاغية|الافتراضي|القيود|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|لا| - |فريدة من نوعها|
|`companyId`|`company_id`|`text`|لا| - |FK -> `companies.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp (tz)`|لا|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|لا|`now()`| - |

### الفهارس

|الاسم|أعمدة|اكتب|
|---|---|---|
|`items_companies_company_id_idx`|`companyId`|شجرة ب|

### أنواع تايب سكريبت

```typescript
export type ItemCompany = typeof itemsCompanies.$inferSelect;
export type NewItemCompany = typeof itemsCompanies.$inferInsert;
```

---

## Category References in Other Tables

While categories do not have a dedicated table, category data appears as denormalized fields in several tables:

| Table | Column | Purpose |
|---|---|---|
| `favorites` | `item_category` | Cached category name for display |
| `featured_items` | `item_category` | Cached category name for display |

These fields store the category string at the time the record is created, avoiding the need to look up the Git CMS at read time.

---

## مخطط العلاقات

```mermaid
erDiagram
    companies ||--o{ items_companies : "has many"

    companies {
        text id PK
        text name
        text website
        text domain UK
        text slug UK
        text status
        timestamp created_at
    }

    items_companies {
        text item_slug UK
        text company_id FK
        timestamp created_at
        timestamp updated_at
    }

    favorites {
        text id PK
        text item_slug
        text item_category
    }

    featured_items {
        text id PK
        text item_slug
        text item_category
    }
```

---

## How Categories Work

1. **Content repository defines categories.** The `.content/` directory (cloned from `DATA_REPOSITORY`) contains category definitions in markdown/YAML files.
2. **Items belong to categories in Git.** Each item's frontmatter specifies its category.
3. **Database stores category strings.** When favorites or featured items are created, the category name is copied from the content layer into the database as a denormalized field.
4. **Companies provide organizational grouping.** The `companies` + `items_companies` tables allow linking items to real-world organizations, separate from content categories.

---

## أمثلة الاستعلام

### الحصول على جميع الشركات النشطة

```typescript
import { db } from '@/lib/db/drizzle';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const activeCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.status, 'active'));
```

### البحث عن الشركة حسب المجال

```typescript
const company = await db
    .select()
    .from(companies)
    .where(eq(companies.domain, 'example.com'))
    .limit(1);
```

### الحصول على العناصر للشركة

```typescript
import { itemsCompanies } from '@/lib/db/schema';

const companyItems = await db
    .select()
    .from(itemsCompanies)
    .innerJoin(companies, eq(itemsCompanies.companyId, companies.id))
    .where(eq(companies.slug, 'acme-corp'));
```

### ربط عنصر بشركة

```typescript
await db.insert(itemsCompanies).values({
    itemSlug: 'my-tool-slug',
    companyId: company.id,
});
```

---

## Design Notes

- **One item, one company.** The unique constraint on `item_slug` in `items_companies` means each item can only belong to one company.
- **Companies have unique domains and slugs.** Both `domain` and `slug` have unique indexes for fast lookups and URL routing.
- **Category data is read from Git at runtime.** The database does not need to store category hierarchies or metadata -- this comes from the content layer.
