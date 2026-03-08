---
id: use-categories-exists-reference
title: useCategoriesExists Hook Reference
sidebar_label: useCategoriesExists
sidebar_position: 101
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCategoriesExists

A hook that checks whether any categories exist in the database.

**Source file:** `template/hooks/use-categories-exists.ts`

## Overview

`useCategoriesExists` reads the `hasCategories` flag from the `SettingsProvider` context and returns it in a structured result object. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

This hook answers the question "do any categories exist in the database?" It is distinct from `useCategoriesEnabled`, which checks whether the categories feature is turned on in the application configuration.

## Signature

```ts
function useCategoriesExists(): {
  data: CategoriesExistsResult | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

### CategoriesExistsResult

```ts
interface CategoriesExistsResult {
  exists: boolean;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `CategoriesExistsResult \| undefined` | Object containing an `exists` boolean. Always defined when the provider is available. |
| `data.exists` | `boolean` | `true` if categories exist in the database, `false` otherwise |
| `isLoading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `hasCategories: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `hasCategories` boolean from the context value.
3. It wraps the value in a `{ exists: hasCategories }` object and returns it as `data`, along with `isLoading: false` and `error: null`.

The return shape (`data`, `isLoading`, `error`) mirrors the pattern used by TanStack Query hooks, making it straightforward to swap between context-based and query-based implementations.

## Usage Examples

### Conditionally rendering a categories list

```tsx
import { useCategoriesExists } from '@/hooks/use-categories-exists';

function CategoriesSection() {
  const { data, isLoading } = useCategoriesExists();

  if (isLoading || !data?.exists) {
    return null;
  }

  return <CategoriesList />;
}
```

### Showing empty state messaging

```tsx
import { useCategoriesExists } from '@/hooks/use-categories-exists';

function AdminCategoriesPage() {
  const { data } = useCategoriesExists();

  return (
    <div>
      <h1>Categories</h1>
      {data?.exists ? (
        <CategoriesTable />
      ) : (
        <EmptyState
          title="No categories yet"
          description="Create your first category to organize items."
          action={<CreateCategoryButton />}
        />
      )}
    </div>
  );
}
```

### Combined with useCategoriesEnabled

```tsx
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useCategoriesExists } from '@/hooks/use-categories-exists';

function CategoryNavItem() {
  const { categoriesEnabled } = useCategoriesEnabled();
  const { data } = useCategoriesExists();

  // Hide navigation item if feature is off or no categories exist
  if (!categoriesEnabled || !data?.exists) {
    return null;
  }

  return <NavLink href="/categories">Categories</NavLink>;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `hasCategories` value through React context |

## Related Hooks

- [`useCategoriesEnabled`](/docs/template/hooks/use-categories-enabled-reference) -- Checks whether the categories feature is enabled
- [`useTagsExists`](/docs/template/hooks/use-tags-exists-reference) -- Checks whether tags exist in the database
- [`useCollectionsExists`](/docs/template/hooks/use-collections-exists-reference) -- Checks whether collections exist in the database
