---
id: use-companies-enabled-reference
title: useCompaniesEnabled Hook Reference
sidebar_label: useCompaniesEnabled
sidebar_position: 103
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCompaniesEnabled

A hook that checks whether the companies feature is enabled in the application settings.

**Source file:** `template/hooks/use-companies-enabled.ts`

## Overview

`useCompaniesEnabled` reads the `companiesEnabled` flag from the `SettingsProvider` context. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

When companies are enabled, items can be associated with company profiles, and company-related UI elements (company pages, company badges on items, company filters) become visible throughout the application.

## Signature

```ts
function useCompaniesEnabled(): {
  companiesEnabled: boolean;
  loading: boolean;
  error: Error | null;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `companiesEnabled` | `boolean` | `true` if the companies feature is enabled in application settings, `false` otherwise |
| `loading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `companiesEnabled: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `companiesEnabled` boolean from the context value.
3. It returns the value along with `loading: false` and `error: null`, since the value comes from server-rendered context and involves no asynchronous fetching.

## Usage Examples

### Conditionally showing company information on item cards

```tsx
import { useCompaniesEnabled } from '@/hooks/use-companies-enabled';

function ItemCard({ item }: { item: Item }) {
  const { companiesEnabled } = useCompaniesEnabled();

  return (
    <div className="item-card">
      <h3>{item.title}</h3>
      <p>{item.description}</p>
      {companiesEnabled && item.company && (
        <CompanyBadge company={item.company} />
      )}
    </div>
  );
}
```

### Hiding company filter in search

```tsx
import { useCompaniesEnabled } from '@/hooks/use-companies-enabled';

function SearchFilters() {
  const { companiesEnabled } = useCompaniesEnabled();

  return (
    <div className="filters">
      <CategoryFilter />
      <TagFilter />
      {companiesEnabled && <CompanyFilter />}
      <PriceFilter />
    </div>
  );
}
```

### Guarding a company profile page

```tsx
import { useCompaniesEnabled } from '@/hooks/use-companies-enabled';
import { notFound } from 'next/navigation';

function CompanyProfilePage({ companyId }: { companyId: string }) {
  const { companiesEnabled } = useCompaniesEnabled();

  if (!companiesEnabled) {
    notFound();
  }

  return <CompanyProfile id={companyId} />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `companiesEnabled` value through React context |

## Related Hooks

- [`useCategoriesEnabled`](/template/hooks/use-categories-enabled-reference) -- Checks whether the categories feature is enabled
- [`useTagsEnabled`](/template/hooks/use-tags-enabled-reference) -- Checks whether the tags feature is enabled
- [`useSurveysEnabled`](/template/hooks/use-surveys-enabled-reference) -- Checks whether the surveys feature is enabled
- [`useItemCompany`](/template/hooks/use-item-company-reference) -- Fetches company data for a specific item
