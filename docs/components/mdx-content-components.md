---
id: mdx-content-components
title: MDX Content Components
sidebar_label: MDX Content
sidebar_position: 62
---

# MDX Content Components

## Overview

The MDX content components handle rendering of MDX (Markdown + JSX) content within item detail pages and other content areas. The system includes an MDX renderer with custom component overrides, tag components for use inside MDX content, and markdown tag display components for rendering tag links in markdown-derived content.

**Source:** `components/mdx.tsx`, `components/mdx-components.tsx`, `components/markdown-tags.tsx`

## Architecture

```
components/
  mdx.tsx               # MDX wrapper using next-mdx-remote/rsc
  mdx-components.tsx    # Custom MDX component overrides (Tag, TagList)
  markdown-tags.tsx     # MarkdownTag, MarkdownTags, TagsSection for rendered content
```

**Rendering Pipeline:**

1. MDX source content (from `.content/` git repository) is passed to the `MDX` component
2. `MDXRemote` from `next-mdx-remote/rsc` compiles and renders the MDX at build/request time
3. Custom components are injected via the `components` prop, overriding default HTML elements
4. Tags within MDX content use `Tag` and `TagList` components from `mdx-components.tsx`
5. Markdown-derived tag sections use `MarkdownTags` and `TagsSection` for display

## Components

### MDX

Main wrapper component that renders MDX content with custom component overrides.

```tsx
import { MDX } from "@/components/mdx";

<MDX source={item.content} />
```

Internally configures `MDXRemote` with a set of custom components including:
- `TagList` -- Container for tag groups
- `Tag` -- Individual tag chip
- `MarkdownTag` -- Tag link for markdown content
- `MarkdownTags` -- Tag list for markdown content
- `TagsSection` -- Titled section containing tags

This is a React Server Component (RSC) compatible wrapper since `next-mdx-remote/rsc` runs at the server level.

### Tag (MDX Component)

HeroUI `Chip`-based tag component for use inside MDX content.

```tsx
// Used inside MDX content:
<Tag name="open-source" />
<Tag name="free" active={true} />
```

Features:
- Renders as a HeroUI `Chip` with `variant="flat"` or `variant="solid"` when active
- Clickable with hover effects
- Uses primary color theme for active state

### TagList (MDX Component)

Container component for grouping `Tag` components inside MDX.

```tsx
// Used inside MDX content:
<TagList>
  <Tag name="open-source" />
  <Tag name="self-hosted" />
  <Tag name="free" />
</TagList>
```

Renders as a `flex flex-wrap gap-2` container.

### MarkdownTag

Single tag link component for markdown-rendered content.

```tsx
import { MarkdownTag } from "@/components/markdown-tags";

<MarkdownTag name="project-management" />
```

Features:
- Normalizes tag names for URL generation (lowercase, hyphenated)
- Links to `/tags/{normalized-name}`
- Styled as a small rounded chip with primary color accent

URL normalization: `"Project Management"` becomes `/tags/project-management`

### MarkdownTags

List of `MarkdownTag` components.

```tsx
import { MarkdownTags } from "@/components/markdown-tags";

<MarkdownTags tags={["open-source", "free", "self-hosted"]} />
```

Renders a flex-wrap container of `MarkdownTag` items.

### TagsSection

Titled section containing `MarkdownTags`.

```tsx
import { TagsSection } from "@/components/markdown-tags";

<TagsSection title="Related Tags" tags={item.tags} />
```

Renders a heading (`h3`) followed by the tag list, with consistent spacing and styling.

## Props Reference

### MDX Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | `string` | required | Raw MDX source content to render |

### Tag Props (MDX Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Tag display name |
| `active` | `boolean` | `false` | Whether the tag shows active/selected styling |

### TagList Props (MDX Component)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | `Tag` components to render |

### MarkdownTag Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | required | Tag name (will be normalized for URL) |

### MarkdownTags Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tags` | `string[]` | required | Array of tag name strings |

### TagsSection Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | required | Section heading text |
| `tags` | `string[]` | required | Array of tag name strings |

## Styling

- **MDX wrapper**: Inherits page styling; `MDXRemote` output is wrapped in standard prose container
- **Tag (MDX)**: HeroUI `Chip` with `size="sm"`, `variant="flat"` (default) or `variant="solid"` (active), primary color
- **TagList**: `flex flex-wrap gap-2` container
- **MarkdownTag**: `px-4 py-1.5 text-xs font-semibold rounded-full` with gradient background `from-primary-50/80 to-primary-100/80`, border `border-primary-200/60`, shadow on hover
- **MarkdownTag icon**: `FiTag` icon in a circular container `w-5 h-5 rounded-full bg-primary-100/60`
- **TagsSection heading**: `text-sm font-medium text-dark--theme-600 dark:text-dark--theme-200` with `FiHash` icon
- All tag components support dark mode with `dark:` Tailwind prefixes

## Usage Examples

### Rendering item detail MDX content

```tsx
// In an item detail page
async function ItemDetailPage({ params }) {
  const item = await getItem(params.slug);

  return (
    <article>
      <h1>{item.name}</h1>
      <MDX source={item.content} />
    </article>
  );
}
```

### Custom tags inside MDX content

```mdx
## Features

This tool supports the following platforms:

<TagList>
  <Tag name="Windows" />
  <Tag name="macOS" />
  <Tag name="Linux" active={true} />
</TagList>
```

### Tag section on detail page

```tsx
{item.tags && item.tags.length > 0 && (
  <TagsSection
    title="Tags"
    tags={item.tags.map(t => typeof t === 'string' ? t : t.name)}
  />
)}
```

## Related Components

- **[Item Utilities](./item-utility-components.md)** -- `ItemTags` and `ItemTagsSection` for non-MDX tag display
- **[Filters](./filters-components.md)** -- Tag filter system that shares tag data models
- **[Layouts](./layouts-components.md)** -- Layout components that link to detail pages where MDX is rendered
