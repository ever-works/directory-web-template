---
id: use-collections-exists-reference
title: useCollectionsExists Hook Reference
sidebar_label: useCollectionsExists
sidebar_position: 102
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useCollectionsExists

A hook that checks whether any collections exist in the database.

**Source file:** `template/hooks/use-collections-exists.ts`

## Overview

`useCollectionsExists` reads the `hasCollections` flag from the `SettingsProvider` context and returns it in a structured result object. Because the value is server-rendered and passed through React context, there is no loading delay or network request -- the result is available immediately on mount.

Collections are curated groupings of items. This hook lets components check for their existence so that collection-related UI elements (navigation links, filter panels, featured sections) can be conditionally displayed.

## Signature

```ts
function useCollectionsExists(): {
  data: CollectionsExistsResult | undefined;
  isLoading: boolean;
  error: Error | null;
}
```

### CollectionsExistsResult

```ts
interface CollectionsExistsResult {
  exists: boolean;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `CollectionsExistsResult \| undefined` | Object containing an `exists` boolean. Always defined when the provider is available. |
| `data.exists` | `boolean` | `true` if collections exist in the database, `false` otherwise |
| `isLoading` | `boolean` | Always `false` -- the value is available synchronously from context |
| `error` | `Error \| null` | Always `null` -- no asynchronous operation is performed |

### Fallback Behavior

If the component is rendered outside of a `SettingsProvider`, the hook falls back to `hasCollections: true` (the provider's default fallback value).

## Implementation Details

1. The hook calls `useSettings()` to access the `SettingsProvider` context.
2. It destructures the `hasCollections` boolean from the context value.
3. It wraps the value in a `{ exists: hasCollections }` object and returns it as `data`, along with `isLoading: false` and `error: null`.

The return shape (`data`, `isLoading`, `error`) mirrors the pattern used by TanStack Query hooks, making it straightforward to swap between context-based and query-based implementations.

## Usage Examples

### Conditionally rendering a collections section

```tsx
import { useCollectionsExists } from '@/hooks/use-collections-exists';

function HomePage() {
  const { data } = useCollectionsExists();

  return (
    <main>
      <HeroSection />
      <FeaturedItems />
      {data?.exists && <CollectionsShowcase />}
      <LatestItems />
    </main>
  );
}
```

### Hiding a collections navigation link

```tsx
import { useCollectionsExists } from '@/hooks/use-collections-exists';

function MainNavigation() {
  const { data } = useCollectionsExists();

  return (
    <nav>
      <NavLink href="/">Home</NavLink>
      <NavLink href="/items">Items</NavLink>
      {data?.exists && <NavLink href="/collections">Collections</NavLink>}
      <NavLink href="/about">About</NavLink>
    </nav>
  );
}
```

### Admin collections overview with empty state

```tsx
import { useCollectionsExists } from '@/hooks/use-collections-exists';

function AdminCollectionsOverview() {
  const { data } = useCollectionsExists();

  if (!data?.exists) {
    return (
      <EmptyState
        title="No collections"
        description="Collections let you curate groups of items for your visitors."
        action={<CreateCollectionButton />}
      />
    );
  }

  return <CollectionsManagementTable />;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `SettingsProvider` | Provides the `hasCollections` value through React context |

## Related Hooks

- [`useCategoriesExists`](/template/hooks/use-categories-exists-reference) -- Checks whether categories exist in the database
- [`useTagsExists`](/template/hooks/use-tags-exists-reference) -- Checks whether tags exist in the database
