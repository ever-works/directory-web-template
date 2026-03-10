---
id: use-item-company-reference
title: useItemCompany Hook Reference
sidebar_label: useItemCompany
sidebar_position: 74
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useItemCompany

Manages the association between an item and a company. Provides methods to fetch the currently assigned company, assign a new company, and remove the assignment. Used in admin panels and item detail pages where company attribution is needed.

**Source:** `template/hooks/use-item-company.ts`

## Exported Hooks

| Hook | Purpose |
|------|---------|
| `useItemCompany` | Fetch, assign, and remove company associations for an item |

## Exported Types

```ts
export interface ItemCompanyAssignment {
  itemSlug: string;
  companyId: string;
  company?: Company;
}

export interface AssignCompanyRequest {
  itemSlug: string;
  companyId: string;
}

export interface ItemCompanyResponse {
  success: boolean;
  data: Company | null;
}

export interface AssignCompanyResponse {
  success: boolean;
  data: {
    itemSlug: string;
    companyId: string;
    createdAt: string;
    updatedAt: string;
  };
  created: boolean;
}

export interface RemoveCompanyResponse {
  success: boolean;
  deleted: boolean;
}

export interface UseItemCompanyOptions {
  itemSlug: string;
  enabled?: boolean;
}

export interface UseItemCompanyReturn {
  company: Company | null;
  isLoading: boolean;
  isAssigning: boolean;
  isRemoving: boolean;
  assignCompany: (companyId: string) => Promise<boolean>;
  removeCompany: () => Promise<boolean>;
  refetch: () => void;
}
```

---

## Signature

```ts
function useItemCompany(options: UseItemCompanyOptions): UseItemCompanyReturn;
```

### Parameters (Options)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `itemSlug` | `string` | — | **Required.** The item slug to manage company associations for. |
| `enabled` | `boolean` | `true` | Disable the query when `false`. |

---

## Return Values

```ts
const {
  company,           // Company | null -- Currently assigned company, or null
  isLoading,         // boolean -- True on initial fetch
  isAssigning,       // boolean -- True while the assign mutation runs
  isRemoving,        // boolean -- True while the remove mutation runs
  assignCompany,     // (companyId: string) => Promise<boolean>
  removeCompany,     // () => Promise<boolean>
  refetch,           // () => void -- Re-execute the company query
} = useItemCompany({ itemSlug });
```

---

## Cache Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-company', itemSlug]` |
| `staleTime` | 5 minutes |
| `gcTime` | 10 minutes |
| `retry` | 2 attempts |
| `enabled` | `options.enabled && !!itemSlug` |

---

## Implementation Details

- **Slug normalization:** Both fetch and mutation API functions normalize the `itemSlug` to lowercase and trim whitespace before making requests, preventing duplicate cache entries for differently-cased slugs.
- **Assign vs. update:** The `assignCompany` mutation posts to `/api/items/:slug/company`. If the assignment already exists, the API returns `created: false` and the hook shows an info toast instead of a success toast.
- **409 Conflict handling:** When the assign mutation receives a 409 status, the error message from the server is displayed directly rather than a generic failure message.
- **Remove feedback:** The `removeCompany` mutation deletes via `/api/items/:slug/company`. If no assignment existed (`deleted: false`), an info toast is shown instead of a success toast.
- **Cache invalidation:** Both mutations invalidate the `['item-company', itemSlug]` query key on success, triggering an automatic refetch of the current company assignment.
- **Boolean returns:** Both `assignCompany` and `removeCompany` return `Promise<boolean>` -- `true` on success, `false` on error.

---

## Usage: Display Assigned Company

```tsx
function ItemCompanyBadge({ itemSlug }: { itemSlug: string }) {
  const { company, isLoading } = useItemCompany({ itemSlug });

  if (isLoading) return <Skeleton className="h-6 w-32" />;
  if (!company) return <span className="text-muted-foreground">No company</span>;

  return (
    <div className="flex items-center gap-2">
      {company.logoUrl && <img src={company.logoUrl} alt="" className="h-6 w-6 rounded" />}
      <span>{company.name}</span>
    </div>
  );
}
```

## Usage: Assign Company from a Select

```tsx
function CompanyAssigner({ itemSlug }: { itemSlug: string }) {
  const { company, assignCompany, removeCompany, isAssigning, isRemoving } = useItemCompany({
    itemSlug,
  });

  const handleAssign = async (companyId: string) => {
    const success = await assignCompany(companyId);
    if (success) {
      console.log('Company assigned');
    }
  };

  const handleRemove = async () => {
    const success = await removeCompany();
    if (success) {
      console.log('Company removed');
    }
  };

  return (
    <div>
      {company ? (
        <div className="flex items-center gap-2">
          <span>Assigned: {company.name}</span>
          <button onClick={handleRemove} disabled={isRemoving}>
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      ) : (
        <CompanySelect
          onSelect={handleAssign}
          disabled={isAssigning}
          placeholder={isAssigning ? 'Assigning...' : 'Select a company'}
        />
      )}
    </div>
  );
}
```

## Usage: Conditional Fetch

```tsx
function ConditionalCompany({ itemSlug, showCompany }: { itemSlug: string; showCompany: boolean }) {
  const { company, isLoading } = useItemCompany({
    itemSlug,
    enabled: showCompany, // Only fetch when the section is visible
  });

  if (!showCompany) return null;
  if (isLoading) return <Skeleton />;

  return <CompanyCard company={company} />;
}
```

---

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | `useQuery`, `useMutation`, `useQueryClient` for caching and mutations |
| `sonner` | Toast notifications for mutation feedback |
| `@/lib/api/server-api-client` | `serverClient` for API calls |
| `@/types/company` | `Company` type definition |

## Related Hooks

- [`useClientItemDetails`](/template/hooks/use-client-item-details-reference) -- Item detail fetching (often displayed alongside company data)
- [`useItemHistory`](/template/hooks/use-item-history-reference) -- Audit history may include company assignment changes
- [`useItemRating`](/template/hooks/use-item-rating-reference) -- Another item-level data hook
