---
id: company-service
title: "Company Service Deep Dive"
sidebar_label: "Company Service"
sidebar_position: 40
---

# Company Service

## Overview

The Company Service manages the creation and deduplication of company records within the platform. It provides intelligent lookup strategies to prevent duplicate company entries by checking domain-based and name-based matches before creating new records. This service is used when associating companies with client profiles or items (via brand/source URL).

## Architecture

The Company Service sits in the business logic layer (`lib/services/company.service.ts`) and delegates all database operations to the company queries module (`lib/db/queries/company.queries`). It is consumed by client profile workflows (associating a user with their employer) and item ingestion pipelines (mapping item brands to company records). The service is stateless and exports pure async functions.

```
Client Profile / Item Ingestion
        |
   company.service.ts
        |
   company.queries.ts
        |
     Database (companies table)
```

## API Reference

### Functions

#### `getOrCreateCompanyFromClient(input: CompanyInput): Promise<Company | null>`

Creates or retrieves a company based on client profile data (name and website).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `input` | `CompanyInput` | Object with `name: string \| null` and `website: string \| null` |

**Returns:** `Company | null` -- The matched or newly created company, or `null` if both name and website are missing.

**Deduplication Strategy:**
1. Extract and normalize domain from the provided website URL
2. Look up by domain (most reliable)
3. Fall back to exact name match
4. Create a new company only if both lookups fail

---

#### `getOrCreateCompanyFromBrand(brand: string, sourceUrl: string): Promise<Company>`

Creates or retrieves a company from a brand name and item source URL. Unlike the client variant, this always returns a company (never null) because both parameters are required.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `brand` | `string` | Brand name from the item |
| `sourceUrl` | `string` | Full URL of the item source for domain extraction |

**Returns:** `Company` -- The matched or newly created company.

---

#### `extractDomain(url: string): string | null` (private)

Extracts and normalizes a domain from a URL. Adds protocol if missing, lowercases the hostname, and strips the `www.` prefix.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | `string` | A website URL, with or without protocol |

**Returns:** `string | null` -- Normalized domain (e.g., `example.com`) or `null` on parse failure.

---

#### `generateSlug(text: string): string` (private)

Generates a URL-safe slug from arbitrary text. Converts to lowercase, replaces non-alphanumeric characters with hyphens, trims leading/trailing hyphens, and caps at 50 characters.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `text` | `string` | Input text (company name or domain) |

**Returns:** `string` -- URL-safe slug, max 50 characters.

## Implementation Details

- **Deduplication is domain-first:** Domain lookup is the primary deduplication strategy because it is more reliable than name matching (company names can vary in formatting).
- **Dynamic imports:** The `getCompanyByName` function is imported dynamically (via `await import(...)`) within the fallback path. This is a deliberate code-splitting optimization -- name lookups are only needed when domain lookups fail.
- **Slug generation:** Slugs are generated from the company name (or domain as fallback) and are capped at 50 characters for URL friendliness.
- **New company defaults:** Newly created companies are always given `status: 'active'`.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Lookup by domain | `getCompanyByDomain(domain)` | `companies` |
| Lookup by name | `getCompanyByName(name)` | `companies` |
| Create company | `createCompany(data)` | `companies` |

The service relies on the `companies` table with at minimum: `name`, `website`, `domain`, `slug`, and `status` columns.

## Error Handling

- Returns `null` from `getOrCreateCompanyFromClient` when insufficient data is provided (both name and website are null/empty).
- URL parsing failures in `extractDomain` are caught silently and return `null`, allowing the fallback to name-based lookup.
- Database errors propagate up to the caller (no try/catch wrapping at the service level).

## Usage Examples

```typescript
import {
  getOrCreateCompanyFromClient,
  getOrCreateCompanyFromBrand,
} from '@/lib/services/company.service';

// From a client profile
const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com/about',
});
// Returns existing company with domain 'acme.com' or creates a new one

// From an item's brand and source URL
const brandCompany = await getOrCreateCompanyFromBrand(
  'TechStartup',
  'https://techstartup.io/products/widget'
);
// Looks up 'techstartup.io' domain, falls back to name 'TechStartup'
```

## Configuration

This service does not require any environment variables. It depends entirely on the database being properly configured and the company queries module being available.

## Related Services

- [Content Services](./content-services.md) -- Items reference companies via brand associations
- [User Service](./user-service.md) -- Client profiles can be linked to companies
- [Item Service](./item-service.md) -- Items are associated with companies through brand names
