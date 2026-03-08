---
id: use-tags-exists-reference
title: useTagsExists Hook Reference
sidebar_label: useTagsExists
sidebar_position: 105
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useTagsExists

A hook that checks whether any tags exist in the database.

**Source file:** `template/hooks/use-tags-exists.ts`

## Overview

`useTagsExists` reads the `hasTags` flag from the `SettingsProvider` context and returns it in a structured result object. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

This hook answers the question "do any tags exist in the database?" It is distinct from `useTagsEnabled`, which checks whether the tags feature is turned on in the application configuration. A common pattern is to combine both hooks: show tag-related UI only when the feature is enabled **and** tags actually exist.

## Signature

```ts
function useTagsExists(): {
  data: TagsExistsResult | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

### TagsExistsResult

```ts
interface TagsExistsResult {
  exists: boolean;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `TagsExistsResult \| undefined` | Object containing an `exists` boolean. Always defined when the provider is available. |
| `data.exists` | `boolean` | `true` if tags exist in the database, `false` otherwise |
| `isLoading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `hasTags: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `hasTags` boolean from the context value.
3. It wraps the value in a `{ exists: hasTags }` object and returns it as `data`, along with `isLoading: false` and `error: null`.

The return shape (`data`, `isLoading`, `error`) mirrors the pattern used by TanStack Query hooks, making it straightforward to swap between context-based and query-based implementations.

## Usage Examples

### Conditionally rendering a tag filter

```tsx
import { useTagsExists } from '@/hooks/use-tags-exists';

function FilterPanel() {
  const { data } = useTagsExists();

  return (
    <div className="filter-panel">
      <CategoryFilter />
      {data?.exists && <TagFilter />}
      <PriceRangeFilter />
    </div>
  );
}
```

### Empty state in tag management

```tsx
import { useTagsExists } from '@/hooks/use-tags-exists';

function AdminTagsPage() {
  const { data } = useTagsExists();

  return (
    <div>
      <h1>Tags</h1>
      {data?.exists ? (
        <TagsManagementTable />
      ) : (
        <EmptyState
          title="No tags yet"
          description="Tags help users discover content through flexible labeling."
          action={<CreateTagButton />}
        />
      )}
    </div>
  );
}
```

### Combined with useTagsEnabled

```tsx
import { useTagsEnabled } from '@/hooks/use-tags-enabled';
import { useTagsExists } from '@/hooks/use-tags-exists';

function TagsSidebar() {
  const { tagsEnabled } = useTagsEnabled();
  const { data } = useTagsExists();

  if (!tagsEnabled || !data?.exists) {
    return null;
  }

  return (
    <aside>
      <h2>Popular Tags</h2>
      <PopularTagsList />
    </aside>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `hasTags` value through React context |

## Related Hooks

- [`useTagsEnabled`](/docs/template/hooks/use-tags-enabled-reference) -- Checks whether the tags feature is enabled
- [`useCategoriesExists`](/docs/template/hooks/use-categories-exists-reference) -- Checks whether categories exist in the database
- [`useCollectionsExists`](/docs/template/hooks/use-collections-exists-reference) -- Checks whether collections exist in the database
