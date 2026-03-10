---
id: editor-extensions
title: "Editor Extensions"
sidebar_label: "Editor Extensions"
sidebar_position: 49
---

# Editor Extensions

## Overview

The Editor Extensions module provides a centralized barrel export of TipTap editor extensions used in the application's rich text editor. It bundles formatting, structural, and interaction extensions from the TipTap ecosystem into a single import point, ensuring consistent editor capabilities across all editor instances in the application.

## Architecture

The module (`lib/editor/extensions/index.tsx`) acts as a re-export aggregator that imports individual TipTap extensions and exports them as a unified set. This pattern allows editor instances to import all required extensions from one location rather than scattering TipTap dependency imports across components.

```
lib/editor/extensions/
  |-- index.tsx
      |-- TaskItem, TaskList     (from @tiptap/extension-list)
      |-- TextAlign              (from @tiptap/extension-text-align)
      |-- HorizontalRule         (from @tiptap/extension-horizontal-rule)
      |-- Typography             (from @tiptap/extension-typography)
      |-- Subscript              (from @tiptap/extension-subscript)
      |-- Superscript            (from @tiptap/extension-superscript)
      |-- Selection              (from @tiptap/extensions)
      |-- Highlight              (from @tiptap/extension-highlight)
```

These extensions are consumed by the editor components that initialize TipTap with a configured extension list.

## API Reference

### Exports

All exports are re-exports of TipTap extension classes/objects. Each can be passed directly to TipTap's `useEditor()` hook or `Editor` constructor.

#### `Selection`

From `@tiptap/extensions`. Provides text selection handling and visual selection indicators in the editor.

#### `Highlight`

From `@tiptap/extension-highlight`. Enables text highlighting with customizable background colors. Supports multiple highlight colors via marks.

#### `Superscript`

From `@tiptap/extension-superscript`. Adds superscript text formatting (e.g., x^2).

#### `Subscript`

From `@tiptap/extension-subscript`. Adds subscript text formatting (e.g., H~2~O).

#### `Typography`

From `@tiptap/extension-typography`. Provides automatic typographic replacements such as smart quotes, em dashes, ellipses, and other typographic characters.

#### `HorizontalRule`

From `@tiptap/extension-horizontal-rule`. Adds horizontal rule (divider) node support, rendered as `<hr>` in the output.

#### `TextAlign`

From `@tiptap/extension-text-align`. Enables text alignment control (left, center, right, justify) on block-level nodes.

#### `TaskItem`

From `@tiptap/extension-list`. Provides individual task/checkbox item nodes for interactive task lists.

#### `TaskList`

From `@tiptap/extension-list`. Provides the container node for task items, rendering as an interactive checklist.

## Implementation Details

**Barrel export pattern**: The module uses named re-exports to keep the import surface clean. This allows tree-shaking to work properly -- unused extensions will not be included in the bundle if they are not imported by the consuming component.

**TSX file extension**: The file uses `.tsx` because it is part of the editor component ecosystem and may be extended with React component overrides (custom node views) in the future.

**No configuration in the barrel**: The extensions are exported in their default form. Configuration (such as `TextAlign.configure({ types: ['heading', 'paragraph'] })`) is applied at the editor instance level, not in this module.

## Configuration

Extensions are configured when initializing the TipTap editor, not in this module. Common configurations include:

```typescript
TextAlign.configure({
  types: ['heading', 'paragraph'],
  alignments: ['left', 'center', 'right', 'justify'],
})

Highlight.configure({
  multicolor: true,
})

TaskItem.configure({
  nested: true,
})
```

## Usage Examples

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Selection,
  Highlight,
  Superscript,
  Subscript,
  Typography,
  HorizontalRule,
  TextAlign,
  TaskItem,
  TaskList,
} from '@/lib/editor/extensions';

function RichTextEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Selection,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}

// Using individual extensions for a minimal editor
import { Typography, Highlight } from '@/lib/editor/extensions';

function SimpleEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}
```

## Best Practices

- Always import extensions from `@/lib/editor/extensions` rather than directly from `@tiptap/*` packages to maintain a single source of truth for the editor's extension set.
- Configure extensions at the editor instance level, not in the barrel module, so that different editor instances can use different configurations.
- When adding new TipTap extensions to the project, add them to this barrel export and document them here.
- Keep the extension list minimal -- only include extensions that are actually used in the application to minimize bundle size.
- Test new extensions in isolation before adding them to the barrel to ensure compatibility with the existing extension set.

## Related Modules

- [Component Patterns](/template/architecture/component-patterns) -- Editor components that consume these extensions
