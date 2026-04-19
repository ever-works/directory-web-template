---
id: categories-schema-deep-dive
title: "Aprofundamento do esquema de categorias e empresas"
sidebar_label: "Esquema de categorias"
sidebar_position: 52
---

# Aprofundamento do esquema de categorias e empresas

## Visão geral

No modelo Ever Works, **as categorias são definidas no CMS baseado em Git** (repositório de conteúdo), não no banco de dados. Não há tabela de banco de dados `categories`. No entanto, o banco de dados fornece infraestrutura para vincular itens a empresas e rastrear hierarquias empresariais, o que atende a um propósito organizacional semelhante.

Esta página documenta a tabela `companies`, a tabela de junção `items_companies` e como as referências de categoria/empresa aparecem em todo o esquema.

**Arquivo fonte:** `template/lib/db/schema.ts`

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

## Tabela: `items_companies`

Tabela de junção ligando slugs de itens aos registros da empresa. Cada slug de item só pode ser associado a uma empresa (restrição exclusiva em `item_slug`).

### Colunas

|Coluna|Nome do banco de dados|Tipo|Anulável|Padrão|Restrições|
|---|---|---|---|---|---|
|`itemSlug`|`item_slug`|`text`|Não| - |Único|
|`companyId`|`company_id`|`text`|Não| - |FK -> `companies.id` (CASCADA)|
|`createdAt`|`created_at`|`timestamp (tz)`|Não|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp (tz)`|Não|`now()`| - |

### Índices

|Nome|Colunas|Tipo|
|---|---|---|
|`items_companies_company_id_idx`|`companyId`|Árvore B|

### Tipos de TypeScript

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

## Diagrama de Relações

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

## Exemplos de consulta

### Obtenha todas as empresas ativas

```typescript
import { db } from '@/lib/db/drizzle';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const activeCompanies = await db
    .select()
    .from(companies)
    .where(eq(companies.status, 'active'));
```

### Encontre empresa por domínio

```typescript
const company = await db
    .select()
    .from(companies)
    .where(eq(companies.domain, 'example.com'))
    .limit(1);
```

### Obtenha itens para uma empresa

```typescript
import { itemsCompanies } from '@/lib/db/schema';

const companyItems = await db
    .select()
    .from(itemsCompanies)
    .innerJoin(companies, eq(itemsCompanies.companyId, companies.id))
    .where(eq(companies.slug, 'acme-corp'));
```

### Vincular um item a uma empresa

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
