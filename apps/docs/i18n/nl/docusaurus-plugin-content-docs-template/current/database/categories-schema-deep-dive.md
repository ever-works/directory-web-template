---
id: categories-schema-deep-dive
title: "Categorieën & Bedrijven Schema Deep Dive"
sidebar_label: "Categorieën Schema"
sidebar_position: 52
---

# Categorieën & Bedrijven Schema Deep Dive

## Overzicht

In de Ever Works-sjabloon worden **categorieën gedefinieerd in het op Git gebaseerde CMS** (inhoudsopslagplaats), niet in de database. Er is geen `categories` databasetabel. De database biedt echter infrastructuur om items aan bedrijven te koppelen en bedrijfshiërarchieën bij te houden, wat een soortgelijk organisatorisch doel dient.

Deze pagina documenteert de `companies` tabel, de `items_companies` knooppunttabel en hoe categorie-/bedrijfsreferenties in het schema verschijnen.

**Bronbestand:** `template/lib/db/schema.ts`

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

## Tabel: `items_companies`

Verbindingstabel die artikelslugs koppelt aan bedrijfsrecords. Elke item-slug kan slechts aan één bedrijf worden gekoppeld (unieke beperking op `item_slug`).

### Kolommen

|Kolom|DB-naam|Typ|Nulleerbaar|Standaard|Beperkingen|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|Nee| - |Uniek|
|`companyId`|`company_id`|`text`|Nee| - |FK -> `companies.id` (CASCADE)|
|`createdAt`|`created_at`|`timestamp (tz)`|Nee|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Nee|`now()`| - |

### Indexen

|Naam|Kolommen|Typ|
|---|---|---|
|`items_companies_company_id_idx`|`companyId`|B-boom|

### TypeScript-typen

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

## Relatiediagram

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

## Voorbeelden van zoekopdrachten

### Ontvang alle actieve bedrijven

```typescript
import { db } from '@/lib/db/drizzle';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const activeCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.status, 'active'));
```

### Zoek bedrijf op domein

```typescript
const company = await db
    .select()
    .from(companies)
    .where(eq(companies.domain, 'example.com'))
    .limit(1);
```

### Koop spullen voor een bedrijf

```typescript
import { itemsCompanies } from '@/lib/db/schema';

const companyItems = await db
    .select()
    .from(itemsCompanies)
    .innerJoin(companies, eq(itemsCompanies.companyId, companies.id))
    .where(eq(companies.slug, 'acme-corp'));
```

### Koppel een artikel aan een bedrijf

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
