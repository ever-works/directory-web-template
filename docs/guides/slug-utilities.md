---
id: slug-utilities
title: "Slug Generation & Utilities"
sidebar_label: "Slug Utilities"
sidebar_position: 20
---

# Slug Generation and Utilities

The template includes a slug utility module (`lib/utils/slug.ts`) that provides bidirectional conversion between human-readable text and URL-safe slugs. These functions are used throughout the application for generating route paths, filter URLs, and content identifiers.

## Functions

### slugify

Converts arbitrary text into a URL-safe slug string.

```ts
import { slugify } from '@/lib/utils/slug';

slugify('Hello World');           // "hello-world"
slugify('Rock & Roll');           // "rock-and-roll"
slugify('  Extra   Spaces  ');    // "extra-spaces"
slugify('Special @#$% Chars!');   // "special-chars"
slugify('Multiple---Dashes');     // "multiple-dashes"
slugify('');                      // ""
```

#### Implementation

```ts
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/&/g, '-and-')        // Replace & with "-and-"
    .replace(/[^\w\-]+/g, '')      // Remove non-word characters
    .replace(/\-\-+/g, '-')        // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
}
```

#### Transformation Steps

The function applies five sequential regex replacements:

| Step | Pattern | Replacement | Purpose |
|------|---------|-------------|---------|
| 1 | `/\s+/g` | `-` | Spaces become hyphens |
| 2 | `/&/g` | `-and-` | Ampersands become "-and-" |
| 3 | `/[^\w\-]+/g` | `""` | Strip special characters |
| 4 | `/\-\-+/g` | `-` | Collapse consecutive hyphens |
| 5 | `/^-+\|-+$/g` | `""` | Remove leading/trailing hyphens |

#### Input Safety

The function returns an empty string for falsy or non-string inputs:

```ts
slugify(null);      // ""
slugify(undefined); // ""
slugify('');        // ""
slugify(123);       // "" (not a string)
```

### deslugify

Converts a slug back into human-readable text. This is the inverse of `slugify`.

```ts
import { deslugify } from '@/lib/utils/slug';

deslugify('hello-world');        // "hello world"
deslugify('rock-and-roll');      // "rock&roll"
deslugify('project-management'); // "project management"
deslugify('');                   // ""
```

#### Implementation

```ts
export function deslugify(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }
  return slug
    .replace(/-and-/g, '&')   // Restore ampersands
    .replace(/-/g, ' ')       // Replace hyphens with spaces
    .trim();
}
```

#### Transformation Steps

| Step | Pattern | Replacement | Purpose |
|------|---------|-------------|---------|
| 1 | `/-and-/g` | `&` | Restore ampersands first |
| 2 | `/-/g` | `" "` | Remaining hyphens become spaces |

The order matters: `-and-` is replaced before `-` to avoid partial replacement.

## Usage Patterns

### Route Generation

Generate URL paths from content titles:

```ts
import { slugify } from '@/lib/utils/slug';

const title = 'Project Management Tools';
const url = `/categories/${slugify(title)}`;
// "/categories/project-management-tools"
```

### Display from URL Params

Convert route parameters back to display text:

```ts
import { deslugify } from '@/lib/utils/slug';

// In a page component receiving params
interface PageProps {
  params: { slug: string };
}

export default function CategoryPage({ params }: PageProps) {
  const displayName = deslugify(params.slug);
  // "project management tools"

  return <h1>{displayName}</h1>;
}
```

### Tag and Category Filtering

The slug utilities integrate with the filter sync system for URL-friendly filter values:

```ts
import { slugify, deslugify } from '@/lib/utils/slug';

// Encode a tag for URL
const tagSlug = slugify('Time & Attendance');
// "time-and-attendance"

// Decode back for display
const tagDisplay = deslugify(tagSlug);
// "time&attendance"
```

### Content Identifiers

Generate stable identifiers for content items:

```ts
import { slugify } from '@/lib/utils/slug';

function generateContentId(name: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new Error('Cannot generate ID from empty name');
  }
  return slug;
}
```

## Edge Cases

| Input | `slugify` Output | Notes |
|-------|-----------------|-------|
| `"Hello World"` | `"hello-world"` | Standard case |
| `"R&D Tools"` | `"r-and-d-tools"` | Ampersand expansion |
| `"  spaces  "` | `"spaces"` | Trimmed |
| `"---dashes---"` | `"dashes"` | Leading/trailing dashes removed |
| `"a--b--c"` | `"a-b-c"` | Consecutive dashes collapsed |
| `"@#$%"` | `""` | All special characters removed |
| `""` | `""` | Empty string passthrough |
| `null` | `""` | Null safety |

## Roundtrip Considerations

The `slugify` and `deslugify` functions are **not perfect inverses**. Information is lost during slugification:

```ts
slugify('Hello World!');  // "hello-world"
deslugify('hello-world'); // "hello world" (lowercase, no exclamation)
```

Specifically, `slugify` discards:
- Original casing (everything is lowercased)
- Special characters (except hyphens and ampersands)
- Multiple consecutive spaces

For scenarios requiring perfect roundtrip fidelity, store the original text alongside the slug.

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/slug.ts` | Slug generation and reversal utilities |
