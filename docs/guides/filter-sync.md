---
id: filter-sync
title: "Filter Synchronization"
sidebar_label: "Filter Sync"
sidebar_position: 22
---

# Filter Synchronization

The `url-filter-sync` module (`lib/utils/url-filter-sync.ts`) handles bidirectional synchronization between filter state and URL parameters. It supports clean URLs for single-filter routes, query parameter encoding for multi-filter combinations, and optional location and search filters.

## Core Types

### FilterState

The central state object representing all active filters:

```ts
interface FilterState {
  tags: string[];
  categories: string[];
  q?: string;           // Search query (optional)
  nearLat?: number;     // Latitude for proximity search
  nearLng?: number;     // Longitude for proximity search
  radius?: number;      // Search radius
  city?: string;        // City filter
  country?: string;     // Country filter
}
```

### URLFilterOptions

Configuration for URL generation:

```ts
interface URLFilterOptions {
  basePath?: string;  // Default: "/"
  locale?: string;    // Locale prefix (e.g., "en", "fr")
}
```

## URL Generation

### generateFilterURL

Generates a URL string from the current filter state. The function applies smart routing rules to produce clean URLs when possible:

```ts
import { generateFilterURL } from '@/lib/utils/url-filter-sync';

// No filters: base path
generateFilterURL({ tags: [], categories: [] });
// "/"

// Single tag: clean URL
generateFilterURL({ tags: ['react'], categories: [] });
// "/tags/react"

// Single category: clean URL
generateFilterURL({ tags: [], categories: ['tools'] });
// "/categories/tools"

// Multiple tags: query parameters
generateFilterURL({ tags: ['react', 'vue'], categories: [] });
// "/?tags=react,vue"

// Mixed filters: query parameters
generateFilterURL({ tags: ['react'], categories: ['tools'] });
// "/?tags=react&categories=tools"
```

### URL Routing Rules

| Condition | URL Pattern | Example |
|-----------|-------------|---------|
| No filters | Base path | `/` |
| Single tag, no categories | Clean tag URL | `/tags/react` |
| Single category, no tags | Clean category URL | `/categories/tools` |
| Multiple tags or categories | Query parameters | `/?tags=a,b&categories=x,y` |

### Locale Support

When a locale is provided, it is prepended to all generated URLs:

```ts
generateFilterURL(
  { tags: ['react'], categories: [] },
  { locale: 'fr' }
);
// "/fr/tags/react"

generateFilterURL(
  { tags: ['react', 'vue'], categories: [] },
  { locale: 'en', basePath: '/directory' }
);
// "/en/directory?tags=react,vue"
```

### Location and Search Parameters

Location and search parameters are appended as query strings to any URL pattern:

```ts
generateFilterURL({
  tags: ['react'],
  categories: [],
  q: 'dashboard',
  nearLat: 40.7128,
  nearLng: -74.006,
  radius: 50,
});
// "/tags/react?q=dashboard&near_lat=40.7128&near_lng=-74.006&radius=50"

generateFilterURL({
  tags: [],
  categories: [],
  city: 'New York',
  country: 'US',
});
// "/?city=New+York&country=US"
```

## URL Parsing

### parseFilterFromSearchParams

Extracts filter state from URL search parameters:

```ts
import { parseFilterFromSearchParams } from '@/lib/utils/url-filter-sync';

const params = new URLSearchParams('tags=react,vue&categories=tools&q=search');
const filters = parseFilterFromSearchParams(params);
// {
//   tags: ['react', 'vue'],
//   categories: ['tools'],
//   q: undefined,
//   ...
// }
```

The function also parses location parameters:

```ts
const params = new URLSearchParams(
  'near_lat=40.7128&near_lng=-74.006&radius=50&city=New+York'
);
const filters = parseFilterFromSearchParams(params);
// {
//   tags: [],
//   categories: [],
//   nearLat: 40.7128,
//   nearLng: -74.006,
//   radius: 50,
//   city: 'New York',
// }
```

### parseFilterFromTagRoute

Creates a filter state from a tag route parameter:

```ts
import { parseFilterFromTagRoute } from '@/lib/utils/url-filter-sync';

// For route /tags/project-management
const filters = parseFilterFromTagRoute('project-management');
// { tags: ['project-management'], categories: [] }
```

### parseFilterFromCategoryRoute

Creates a filter state from a category route parameter:

```ts
import { parseFilterFromCategoryRoute } from '@/lib/utils/url-filter-sync';

// For route /categories/team-tools
const filters = parseFilterFromCategoryRoute('team-tools');
// { tags: [], categories: ['team-tools'] }
```

## Filter State Manipulation

The module provides immutable helper functions for modifying filter state. Each function returns a new `FilterState` object rather than mutating the input.

### Adding Filters

```ts
import {
  addTagToFilters,
  addCategoryToFilters,
} from '@/lib/utils/url-filter-sync';

const state = { tags: ['react'], categories: [] };

addTagToFilters(state, 'vue');
// { tags: ['react', 'vue'], categories: [] }

addCategoryToFilters(state, 'tools');
// { tags: ['react'], categories: ['tools'] }
```

Duplicate additions are ignored:

```ts
addTagToFilters(state, 'react');
// { tags: ['react'], categories: [] } -- unchanged
```

### Removing Filters

```ts
import {
  removeTagFromFilters,
  removeCategoryFromFilters,
} from '@/lib/utils/url-filter-sync';

const state = { tags: ['react', 'vue'], categories: ['tools'] };

removeTagFromFilters(state, 'vue');
// { tags: ['react'], categories: ['tools'] }

removeCategoryFromFilters(state, 'tools');
// { tags: ['react', 'vue'], categories: [] }
```

### Toggling Filters

Toggle functions add a filter if absent, or remove it if present:

```ts
import {
  toggleTagInFilters,
  toggleCategoryInFilters,
} from '@/lib/utils/url-filter-sync';

const state = { tags: ['react'], categories: [] };

toggleTagInFilters(state, 'react');
// { tags: [], categories: [] } -- removed

toggleTagInFilters(state, 'vue');
// { tags: ['react', 'vue'], categories: [] } -- added
```

### Clearing All Filters

```ts
import { clearAllFilters } from '@/lib/utils/url-filter-sync';

clearAllFilters();
// { tags: [], categories: [] }
```

## Filter Comparison

### isFilterEmpty

Checks whether any filters are active:

```ts
import { isFilterEmpty } from '@/lib/utils/url-filter-sync';

isFilterEmpty({ tags: [], categories: [] });              // true
isFilterEmpty({ tags: ['react'], categories: [] });       // false
isFilterEmpty({ tags: [], categories: [], city: 'NYC' }); // false
```

The function also considers location filters (city, country, coordinates) as non-empty.

### areFiltersEqual

Performs a deep comparison of two filter states including location data:

```ts
import { areFiltersEqual } from '@/lib/utils/url-filter-sync';

const a = { tags: ['react'], categories: [], nearLat: 40.7 };
const b = { tags: ['react'], categories: [], nearLat: 40.7 };
areFiltersEqual(a, b); // true

const c = { tags: ['react', 'vue'], categories: [] };
const d = { tags: ['react'], categories: [] };
areFiltersEqual(c, d); // false
```

Note that tag and category order matters for this comparison -- `['react', 'vue']` is not equal to `['vue', 'react']`.

## Encoding and Decoding

Filter values are encoded for URL safety using `encodeURIComponent` and decoded with `decodeURIComponent`:

```ts
// Internal helper functions
function encodeFilterValue(value: string): string {
  return encodeURIComponent(value.toLowerCase().trim());
}

function decodeFilterValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    console.error('Error decoding filter value:', error);
    return value; // Fallback to raw value on decode errors
  }
}
```

Values are lowercased and trimmed during encoding. Decoding includes error handling to gracefully handle malformed URL values.

## Typical Integration Pattern

A common pattern in page components:

```ts
import {
  parseFilterFromSearchParams,
  generateFilterURL,
  toggleTagInFilters,
} from '@/lib/utils/url-filter-sync';

function FilterableList({ searchParams }: { searchParams: URLSearchParams }) {
  const filters = parseFilterFromSearchParams(searchParams);

  const handleTagClick = (tag: string) => {
    const newFilters = toggleTagInFilters(filters, tag);
    const newUrl = generateFilterURL(newFilters);
    router.push(newUrl);
  };

  return (
    <div>
      <TagList
        tags={availableTags}
        activeTags={filters.tags}
        onTagClick={handleTagClick}
      />
      <ItemGrid filters={filters} />
    </div>
  );
}
```

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/url-filter-sync.ts` | URL filter synchronization utilities |
