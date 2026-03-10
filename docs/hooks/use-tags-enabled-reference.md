---
id: use-tags-enabled-reference
title: useTagsEnabled Hook Reference
sidebar_label: useTagsEnabled
sidebar_position: 104
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useTagsEnabled

A hook that checks whether the tags feature is enabled in the application settings.

**Source file:** `template/hooks/use-tags-enabled.ts`

## Overview

`useTagsEnabled` reads the `tagsEnabled` flag from the `SettingsProvider` context. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

This hook answers the question "is the tags feature turned on?" which is controlled by the application configuration. It does **not** check whether any tags actually exist in the database (see `useTagsExists` for that).

## Signature

```ts
function useTagsEnabled(): {
  tagsEnabled: boolean;
  loading: boolean;
  error: Error | null;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `tagsEnabled` | `boolean` | `true` if the tags feature is enabled in application settings, `false` otherwise |
| `loading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `tagsEnabled: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `tagsEnabled` boolean from the context value.
3. It returns the value along with `loading: false` and `error: null`, since the value comes from server-rendered context and involves no asynchronous fetching.

## Usage Examples

### Conditionally rendering tag chips on items

```tsx
import { useTagsEnabled } from '@/hooks/use-tags-enabled';

function ItemDetail({ item }: { item: Item }) {
  const { tagsEnabled } = useTagsEnabled();

  return (
    <article>
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      {tagsEnabled && item.tags.length > 0 && (
        <div className="flex gap-2">
          {item.tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} />
          ))}
        </div>
      )}
    </article>
  );
}
```

### Hiding the tag filter sidebar

```tsx
import { useTagsEnabled } from '@/hooks/use-tags-enabled';

function FilterSidebar() {
  const { tagsEnabled } = useTagsEnabled();

  return (
    <aside>
      <CategoryFilter />
      {tagsEnabled && <TagFilter />}
      <SortOptions />
    </aside>
  );
}
```

### Combined with useTagsExists

```tsx
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { useTagsExists } from '@/hooks/use-tags-exists';

function TagCloud() {
  const { tagsEnabled } = useTagsEnabled();
  const { data } = useTagsExists();

  // Only show tag cloud when feature is enabled AND tags exist
  if (!tagsEnabled || !data?.exists) {
    return null;
  }

  return <TagCloudWidget />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `tagsEnabled` value through React context |

## Related Hooks

- [`useTagsExists`](/template/hooks/use-tags-exists-reference) -- Checks whether tags exist in the database
- [`useCategoriesEnabled`](/template/hooks/use-categories-enabled-reference) -- Checks whether the categories feature is enabled
- [`useCompaniesEnabled`](/template/hooks/use-companies-enabled-reference) -- Checks whether the companies feature is enabled
- [`useSurveysEnabled`](/template/hooks/use-surveys-enabled-reference) -- Checks whether the surveys feature is enabled
