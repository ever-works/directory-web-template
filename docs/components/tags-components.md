---
id: tags-components
title: "Tags Reference"
sidebar_label: "Tags"
sidebar_position: 51
---

# Tags

## Overview

The tags system comprises four components that handle tag display, filtering, sidebar navigation, and bulk management. `TagsCards` renders a responsive grid of tag cards for browsing; `TagsFilter` (tags-items) provides a searchable checkbox list with sort controls; `TagsItemsColumn` builds a full sidebar with tag navigation, active filters display, and sort options; and `TagsModal` shows selected tags in a modal dialog with removal capability.

## Architecture

```
template/components/
  tags-cards.tsx          # Grid display of tag cards with navigation
  tags-items.tsx          # Searchable tag filter with checkboxes and sort
  tags-items-column.tsx   # Sidebar column with tag navigation and filters
  tags-modal.tsx          # Modal for viewing/removing selected tags
```

---

## TagsCards

### Import

```typescript
import { TagsCards } from "@/components/tags-cards";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tags` | `Tag[]` | Yes | - | Array of tag objects to display as cards. |
| `basePath` | `string` | No | `undefined` | Base URL path for tag links (currently unused; navigation uses `/?tags={id}`). |
| `className` | `string` | No | `undefined` | Additional CSS classes for each tag card wrapper. |
| `compact` | `boolean` | No | `false` | Compact mode with smaller padding, text sizes, and no text truncation. Ideal for dedicated tags listing pages. |

### Usage Examples

#### Basic Usage

```tsx
<TagsCards tags={tags} />
```

#### Compact Mode for Tag Listing Page

```tsx
<TagsCards tags={tags} compact />
```

### Behavior

- Clicking a tag navigates to `/?tags={tagId}` to filter the main listing.
- Active tags (matching URL `?tags` param) receive a highlighted border style.
- A loading spinner overlay appears on the clicked card during navigation.
- Returns `null` when the tags array is empty.

### Card Anatomy

Each card displays:
1. **Hash icon** in a themed container.
2. **Tag name** with `capitalize` and hover color transition.
3. **Arrow icon** that slides in on hover.
4. **Item count badge** at the bottom showing `{count} items`.
5. **Gradient accent** in the bottom-right corner.

---

## TagsFilter

### Import

```typescript
import TagsFilter from "@/components/tags-items";
// Types
import type { TagOption, SortOption, TagsFilterProps } from "@/components/tags-items";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tags` | `TagOption[]` | Yes | - | Array of tag options, each with `id` and `name`. |
| `onTagsChange` | `(selectedTags: string[]) => void` | Yes | - | Callback fired when the tag selection changes. Receives an array of selected tag IDs. |
| `onSortChange` | `(sortOption: string) => void` | Yes | - | Callback fired when the sort option changes. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the container. |

### Built-in Sort Options

| Value | Label |
|-------|-------|
| `time-desc` | Sort by Time (dsc) |
| `time-asc` | Sort by Time (asc) |
| `name-desc` | Sort by Name (dsc) |
| `name-asc` | Sort by Name (asc) |

### Usage Examples

```tsx
<TagsFilter
  tags={[
    { id: "react", name: "React" },
    { id: "vue", name: "Vue" },
    { id: "angular", name: "Angular" },
  ]}
  onTagsChange={(selected) => console.log("Selected:", selected)}
  onSortChange={(sort) => console.log("Sort:", sort)}
/>
```

### Features

- **Search input** filters tags by name in real time.
- **Select all** checkbox toggles all visible (filtered) tags.
- **Individual checkboxes** for each tag with theme-colored active state.
- **Sort dropdown** with collapsible option list.

---

## TagsItemsColumn

### Import

```typescript
import { TagsItemsColumn } from "@/components/tags-items-column";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `total` | `number` | Yes | - | Total number of items across all tags. Displayed in the "All" link badge. |
| `tag` | `Tag[]` | Yes | - | Array of tag objects used to populate the sidebar navigation. |

### Usage Examples

```tsx
<TagsItemsColumn total={150} tag={tags} />
```

### Layout

The component renders two layouts:

| Breakpoint | Layout |
|------------|--------|
| Mobile (`md:hidden`) | Collapsible `Accordion` containing the tag list. |
| Desktop (`hidden md:flex`) | Fixed-width sidebar (max 280px / 256px) with search, tag list, active filters, and sort controls. |

### Desktop Sidebar Sections

1. **Search bar** - `SearchInput` for filtering items by keyword.
2. **Tags list** - Scrollable list of tag links with item counts. Active tag is highlighted with `bg-theme-primary-500 text-white`. Tag names longer than 20 characters are truncated with tooltip.
3. **Active filters** - Displays current search term, selected tags (removable), and active sort option. Includes a "Clear All" button.
4. **Sort controls** - `SortControl` component for changing sort order.

---

## TagsModal

### Import

```typescript
import { TagsModal } from "@/components/tags-modal";
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls modal visibility. |
| `onClose` | `() => void` | Yes | - | Callback to close the modal. |
| `selectedTags` | `string[]` | Yes | - | Array of currently selected tag IDs. |
| `tags` | `Tag[]` | Yes | - | Full list of available tags (used to resolve names from IDs). |
| `onRemoveTag` | `(tagId: string) => void` | Yes | - | Callback fired when a tag chip is clicked for removal. |

### Usage Examples

```tsx
<TagsModal
  isOpen={showTagsModal}
  onClose={() => setShowTagsModal(false)}
  selectedTags={selectedTagIds}
  tags={allTags}
  onRemoveTag={(tagId) => removeTag(tagId)}
/>
```

### Features

- Displays selected tags as removable chips with a `x` button.
- Scrollable container (`max-h-60`) for many selected tags.
- Empty state with animated icon, heading, and descriptive text.
- Close button at the bottom using theme primary color.
- All text is translatable via the `tagsModal` namespace.

## Styling

- **TagsCards**: Responsive grid from 1 to 6 columns depending on breakpoint and container width mode. Cards use glassmorphic styling with `backdrop-blur-md` and gradient accents.
- **TagsFilter**: Dark-themed panel (`bg-gray-900`) designed for overlay/sidebar use with `bg-gray-800/50` search input.
- **TagsItemsColumn**: Light/dark adaptive sidebar with `backdrop-blur-xs` and bordered sections.
- **TagsModal**: Uses HeroUI `Modal` with custom class overrides for header border and backdrop blur.

## Accessibility

- **TagsCards**: Cards have `role="button"`, `tabIndex={0}`, `aria-label`, and keyboard event handlers for Enter/Space.
- **TagsFilter**: Checkbox inputs have proper `<label>` wrappers for click targeting. Search input has a visible search icon placeholder.
- **TagsItemsColumn**: Uses HeroUI `Accordion` with `aria-label="Tags"` for the mobile collapsible. Tag links use HeroUI `Tooltip` for truncated names.
- **TagsModal**: HeroUI `Modal` provides built-in focus trapping, Escape to close, and backdrop click to dismiss.

## Related Components

- [Filter System](/docs/template/components/filter-system) - Parent filtering infrastructure that coordinates tag selection.
- [Categories Grid](/docs/template/components/categories-grid-components) - Similar card-based browsing for categories.
- [Sort Menu](/docs/template/components/sort-menu-components) - Standalone sort dropdown used alongside tag filters.
