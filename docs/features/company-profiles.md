---
id: company-profiles
title: Company Profiles
sidebar_label: Company Profiles
sidebar_position: 16
---

# Company Profiles

The Ever Works Template includes a full company management system that allows administrators to create, manage, and associate companies with listed items. The system supports intelligent deduplication through domain and name matching, paginated listing with search, and a one-to-one relationship between items and companies.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `useItemCompany` | `hooks/use-item-company.ts` | Client hook for item-company associations |
| `company.service.ts` | `lib/services/company.service.ts` | Business logic for company creation and deduplication |
| `company.queries.ts` | `lib/db/queries/company.queries.ts` | Database queries for company CRUD and associations |
| `company.ts` | `types/company.ts` | TypeScript type definitions |
| `company.ts` | `lib/validations/company.ts` | Zod validation schemas |
| `CompanySelector` | `components/admin/companies/company-selector.tsx` | Company selector dropdown |
| `CompanyModal` | `components/admin/companies/company-modal.tsx` | Create/edit company modal |
| `CompanyStats` | `components/admin/companies/company-stats.tsx` | Company statistics display |
| `ItemCompanyManager` | `components/admin/items/item-company-manager.tsx` | Manage item-company associations |

## Company Data Model

```tsx
// types/company.ts
type Company = {
  id: string;
  name: string;
  website: string | null;
  domain: string | null;
  slug: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};
```

| Field | Description |
|---|---|
| `id` | Unique identifier (UUID) |
| `name` | Company display name |
| `website` | Full website URL |
| `domain` | Normalized domain (e.g., `example.com`) for deduplication |
| `slug` | URL-safe slug generated from name |
| `status` | Active or inactive status |

## Company Service

The `company.service.ts` provides business logic for company creation with built-in deduplication.

### Deduplication Strategy

The service uses a three-step lookup strategy before creating a new company:

1. **Domain lookup** (primary) -- Most reliable for identifying the same company
2. **Name lookup** (fallback) -- Exact match on company name
3. **Create new** -- Only if both lookups fail

```tsx
import { getOrCreateCompanyFromBrand } from '@/lib/services/company.service';

// Automatically deduplicates: finds existing or creates new
const company = await getOrCreateCompanyFromBrand('Acme Corp', 'https://acme.com/product');
```

### Creating from Client Data

```tsx
import { getOrCreateCompanyFromClient } from '@/lib/services/company.service';

const company = await getOrCreateCompanyFromClient({
  name: 'Acme Corp',
  website: 'https://www.acme.com'
});
// Returns existing company if domain "acme.com" or name "Acme Corp" already exists
```

### Domain Extraction

The service normalizes URLs to extract clean domains:

```tsx
// Internal function behavior:
extractDomain('https://www.Example.COM/path')  // 'example.com'
extractDomain('Example.com')                    // 'example.com'
extractDomain('http://sub.example.com/page')    // 'sub.example.com'
```

### Slug Generation

Slugs are auto-generated from company names:

```tsx
generateSlug('Acme Corp!')     // 'acme-corp'
generateSlug('example.com')    // 'example-com'
// Max length: 50 characters
```

## Database Queries

The `company.queries.ts` module provides comprehensive CRUD operations:

### Company CRUD

| Function | Description |
|---|---|
| `createCompany(data)` | Create a new company |
| `getCompanyById(id)` | Get company by UUID |
| `getCompanyBySlug(slug)` | Get company by slug (case-insensitive) |
| `getCompanyByDomain(domain)` | Get company by domain (case-insensitive) |
| `getCompanyByName(name)` | Get company by exact name (case-insensitive) |
| `updateCompany(id, data)` | Update company fields |
| `deleteCompany(id)` | Delete a company |

### Company Listing

```tsx
import { listCompanies } from '@/lib/db/queries/company.queries';

const result = await listCompanies({
  page: 1,
  limit: 10,
  search: 'acme',           // Searches name and domain
  status: 'active',
  sortBy: 'createdAt',      // 'name' | 'createdAt' | 'updatedAt'
  sortOrder: 'desc'
});

// Returns: { companies, total, page, totalPages, limit, activeCount, inactiveCount }
```

### Item-Company Associations

Each item can be linked to exactly one company. The association is managed through the `itemsCompanies` junction table:

| Function | Description |
|---|---|
| `linkItemToCompany(itemSlug, companyId)` | Idempotent link (creates or updates) |
| `unlinkItemFromCompany(itemSlug)` | Idempotent unlink |
| `getCompanyByItemSlug(itemSlug)` | Get company for an item |
| `listItemsByCompany(companyId, params)` | List items belonging to a company |
| `itemHasCompany(itemSlug)` | Check if item has a company |
| `getCompaniesWithItemCount(params)` | List companies with their item counts |

The `linkItemToCompany` function is idempotent:
- If no association exists, it creates one
- If the same company is already linked, it returns the existing association
- If a different company is linked, it updates the association

## The `useItemCompany` Hook

The client-side hook provides React Query-powered company management for items:

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function ItemCompanyManager({ itemSlug }) {
  const {
    company,       // Current company or null
    isLoading,     // Loading state
    isAssigning,   // Assignment in progress
    isRemoving,    // Removal in progress
    assignCompany, // Assign company by ID
    removeCompany, // Remove company association
    refetch        // Refresh data
  } = useItemCompany({ itemSlug, enabled: true });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) console.log('Company assigned!');
  };

  return (
    <div>
      {company ? (
        <div>
          <span>Company: {company.name}</span>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector onSelect={(id) => handleAssign(id)} />
      )}
    </div>
  );
}
```

### Caching Configuration

| Setting | Value |
|---|---|
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `retry` | 2 attempts |

### API Endpoints

The hook communicates with the following REST endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/items/{slug}/company` | Fetch current company for an item |
| `POST` | `/api/items/{slug}/company` | Assign a company to an item |
| `DELETE` | `/api/items/{slug}/company` | Remove company from an item |

## Admin Components

### Company Selector

A dropdown component for selecting existing companies:

```tsx
<CompanySelector onSelect={(companyId) => handleSelect(companyId)} />
```

### Company Modal

A modal for creating or editing companies:

```tsx
<CompanyModal
  isOpen={isOpen}
  onClose={onClose}
  company={existingCompany}  // null for create mode
  onSave={(data) => handleSave(data)}
/>
```

### Company Statistics

Displays aggregate statistics:

```tsx
<CompanyStats />
// Shows: total companies, active count, inactive count
```

## Key Files

| File | Path |
|---|---|
| Item Company Hook | `hooks/use-item-company.ts` |
| Company Service | `lib/services/company.service.ts` |
| Company Queries | `lib/db/queries/company.queries.ts` |
| Company Types | `types/company.ts` |
| Company Validations | `lib/validations/company.ts` |
| Company Selector | `components/admin/companies/company-selector.tsx` |
| Company Modal | `components/admin/companies/company-modal.tsx` |
| Item Company Manager | `components/admin/items/item-company-manager.tsx` |
