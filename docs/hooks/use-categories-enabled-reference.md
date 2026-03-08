---
id: use-categories-enabled-reference
title: useCategoriesEnabled Hook Reference
sidebar_label: useCategoriesEnabled
sidebar_position: 100
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCategoriesEnabled

A hook that checks whether the categories feature is enabled in the application settings.

**Source file:** `template/hooks/use-categories-enabled.ts`

## Overview

`useCategoriesEnabled` reads the `categoriesEnabled` flag from the `SettingsProvider` context. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

This hook answers the question "is the categories feature turned on?" which is controlled by the application configuration. It does **not** check whether any categories actually exist in the database (see `useCategoriesExists` for that).

## Signature

```ts
function useCategoriesEnabled(): {
  categoriesEnabled: boolean;
  loading: boolean;
  error: Error | null;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `categoriesEnabled` | `boolean` | `true` if the categories feature is enabled in application settings, `false` otherwise |
| `loading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `categoriesEnabled: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `categoriesEnabled` boolean from the context value.
3. It returns the value along with `loading: false` and `error: null`, since the value comes from server-rendered context and involves no asynchronous fetching.

## Usage Examples

### Conditionally rendering a categories section

```tsx
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';

function Sidebar() {
  const { categoriesEnabled } = useCategoriesEnabled();

  return (
    <aside>
      <SearchWidget />
      {categoriesEnabled && <CategoriesWidget />}
      <RecentItems />
    </aside>
  );
}
```

### Guarding a categories page

```tsx
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { redirect } from 'next/navigation';

function CategoriesPage() {
  const { categoriesEnabled } = useCategoriesEnabled();

  if (!categoriesEnabled) {
    redirect('/');
  }

  return <CategoriesList />;
}
```

### Combined with useCategoriesExists

```tsx
import { useCategoriesEnabled } from '@/hooks/use-categories-enabled';
import { useCategoriesExists } from '@/hooks/use-categories-exists';

function CategoriesFilter() {
  const { categoriesEnabled } = useCategoriesEnabled();
  const { data } = useCategoriesExists();

  // Only show filter when feature is enabled AND categories exist
  if (!categoriesEnabled || !data?.exists) {
    return null;
  }

  return <CategoryFilterDropdown />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `categoriesEnabled` value through React context |

## Related Hooks

- [`useCategoriesExists`](/docs/template/hooks/use-categories-exists-reference) -- Checks whether categories exist in the database
- [`useCompaniesEnabled`](/docs/template/hooks/use-companies-enabled-reference) -- Checks whether the companies feature is enabled
- [`useTagsEnabled`](/docs/template/hooks/use-tags-enabled-reference) -- Checks whether the tags feature is enabled
- [`useSurveysEnabled`](/docs/template/hooks/use-surveys-enabled-reference) -- Checks whether the surveys feature is enabled
