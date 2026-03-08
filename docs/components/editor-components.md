---
id: editor-components
title: "Editor Components"
sidebar_label: "Editor Components"
sidebar_position: 12
---

# Editor Components

The template includes a rich text editor built on [TipTap](https://tiptap.dev/) (a headless ProseMirror wrapper). The editor system lives in `lib/editor/` and provides a modular, extensible editing experience with toolbar controls, custom node views, and a context-based architecture.

## Architecture Overview

The editor is organized into six logical layers, all re-exported from the barrel file at `lib/editor/index.ts`:

```
lib/editor/
  components/       # UI primitives, toolbar buttons, node views, icons
  contents/         # EditorContent wrapper and ToolbarContent composition
  extensions/       # TipTap extension re-exports (TextAlign, TaskList, etc.)
  hooks/            # useEditor, useTiptapEditor, useCursorVisibility, etc.
  providers/        # EditorContextProvider (React context + editor init)
  utils/            # cn(), handleImageUpload, shortcut helpers, URL sanitization
```

The barrel export keeps imports clean:

```ts
export * from './components';
export * from './extensions';
export * from './providers';
export * from './hooks';
export * from './contents';
export * from './utils';
```

## EditorContextProvider

The provider creates the TipTap editor instance and distributes it via React context. It lives at `lib/editor/providers/editor-provider.tsx`.

```tsx
import { createContext, useMemo } from 'react';
import { useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  HorizontalRule, TextAlign, TaskItem, TaskList,
  Highlight, Typography, Superscript, Subscript, Selection
} from '@/lib/editor';
import { Image } from '@tiptap/extension-image';
import { cn, handleImageUpload, MAX_FILE_SIZE } from '@/lib/editor/utils';
import { ImageUploadNode } from '../components/node/image-upload-node';

export const EditorContext = createContext<Editor | null>(null);

export function EditorContextProvider({ children }: { children: React.ReactNode }) {
  const extensions = useMemo(() => [
    StarterKit?.configure({
      horizontalRule: false,
      link: { openOnClick: false, enableClickSelection: true }
    }),
    HorizontalRule,
    TextAlign?.configure({ types: ['heading', 'paragraph'] }),
    ImageUploadNode?.configure({
      accept: 'image/*',
      maxSize: MAX_FILE_SIZE,
      limit: 3,
      upload: handleImageUpload,
      onError: (error) => console.error('Upload failed:', error)
    }),
    TaskList,
    TaskItem?.configure({ nested: true }),
    Highlight?.configure({ multicolor: true }),
    Image,
    Typography,
    Superscript,
    Subscript,
    Selection
  ], []);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: 'on',
        autocorrect: 'on',
        autocapitalize: 'off',
        'aria-label': 'Main content area, start typing to enter text.',
        class: cn('min-h-96')
      }
    },
    extensions
  });

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
```

Key design decisions:

- **`immediatelyRender: false`** -- avoids hydration mismatches in Next.js SSR
- **`shouldRerenderOnTransaction: false`** -- prevents unnecessary re-renders on every keystroke
- **ARIA label** is set directly on the ProseMirror contentEditable element
- Extensions are memoized to avoid re-initialization

## Extensions

The template re-exports selected TipTap extensions from `lib/editor/extensions/index.tsx`:

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Base editing (paragraphs, headings, bold, italic, links, etc.) |
| `TextAlign` | Left, center, right, justify alignment for headings and paragraphs |
| `HorizontalRule` | Horizontal separator lines |
| `TaskList` / `TaskItem` | Interactive checkbox task lists with nesting support |
| `Highlight` | Multi-color text highlighting |
| `Typography` | Smart quotes and typographic replacements |
| `Superscript` / `Subscript` | Superscript and subscript text formatting |
| `Selection` | Enhanced selection rendering |
| `Image` | Image embedding within content |
| `ImageUploadNode` | Custom node for drag-and-drop image uploads |

## Toolbar

The toolbar is composed in `lib/editor/contents/toolbar-content.tsx` using granular button components:

```tsx
export const ToolbarContent = React.memo(({ editor }: { editor: Editor | null }) => {
  return (
    <>
      <Spacer />
      <ToolbarGroup>
        <UndoRedoButton action="undo" editor={editor} />
        <UndoRedoButton action="redo" editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} editor={editor} portal />
        <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} editor={editor} portal />
        <BlockquoteButton editor={editor} />
        <CodeBlockButton editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="bold" editor={editor} />
        <MarkButton type="italic" editor={editor} />
        <MarkButton type="strike" editor={editor} />
        <MarkButton type="code" editor={editor} />
        <MarkButton type="underline" editor={editor} />
        <ColorHighlightPopover editor={editor} />
        <LinkPopover editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <MarkButton type="superscript" editor={editor} />
        <MarkButton type="subscript" editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <TextAlignButton align="left" editor={editor} />
        <TextAlignButton align="center" editor={editor} />
        <TextAlignButton align="right" editor={editor} />
        <TextAlignButton align="justify" editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ImageUploadButton text="Add" editor={editor} />
      </ToolbarGroup>
      <ToolbarSeparator />
      <Spacer />
    </>
  );
});
```

### Available Toolbar Components

Located in `lib/editor/components/ui/`:

| Component | File | Purpose |
|-----------|------|---------|
| `MarkButton` | `mark-button/` | Toggle inline marks (bold, italic, strike, code, underline, super/subscript) |
| `HeadingDropdownMenu` | `heading-dropdown-menu/` | Heading level selector (H1--H4) |
| `ListDropdownMenu` | `list-dropdown-menu/` | List type selector (bullet, ordered, task) |
| `BlockquoteButton` | `blockquote-button/` | Toggle blockquote formatting |
| `CodeBlockButton` | `code-block-button/` | Insert or toggle code blocks |
| `TextAlignButton` | `text-align-button/` | Set paragraph/heading alignment |
| `ColorHighlightPopover` | `color-highlight-popover/` | Pick highlight colors |
| `LinkPopover` | `link-popover/` | Insert and edit hyperlinks |
| `ImageUploadButton` | `image-upload-button/` | Trigger image upload flow |
| `UndoRedoButton` | `undo-redo-button/` | Undo/redo history navigation |

## EditorContent Wrapper

The `EditorContent` component at `lib/editor/contents/editor-content.tsx` wraps TipTap's built-in `EditorContent` with word-wrap handling and an optional toolbar slot:

```tsx
interface EditorContentProps {
  editor: Editor;
  onContentChange?: (content: string) => void;
  className?: string;
  content?: string;
  placeholder?: string;
  toolbar?: React.ReactNode;
  // ... event handlers: onPaste, onDrop, onKeyDown, onFocus, onBlur
}

export function EditorContent({ style, className, ...props }: EditorContentProps) {
  return (
    <div style={{ wordWrap: 'break-word', overflowWrap: 'break-word', ...style }}>
      {props.toolbar && props.toolbar}
      <TiptapEditorContent
        {...props}
        className={cn(
          className,
          '[&_.ProseMirror]:break-words',
          '[&_.ProseMirror]:whitespace-pre-wrap',
          '[&_.ProseMirror]:overflow-wrap-anywhere'
        )}
      />
    </div>
  );
}
```

## Hooks

### useEditor

A convenience hook (`lib/editor/hooks/use-editor.ts`) that reads the editor from context:

```ts
import { useContext } from "react";
import { EditorContext } from "../providers";

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within a EditorProvider");
  }
  return context;
}
```

### useTiptapEditor

A more flexible hook (`lib/editor/hooks/use-tiptap-editor.ts`) that accepts an optional editor prop or falls back to context, and also provides reactive `editorState` and `canCommand`:

```ts
export function useTiptapEditor(providedEditor?: Editor | null): {
  editor: Editor | null;
  editorState?: Editor["state"];
  canCommand?: Editor["can"];
}
```

This pattern allows toolbar components to work both inside a TipTap context and when given an editor instance directly.

## Image Upload

Image uploads are handled by `handleImageUpload` in `lib/editor/utils/utils.ts`:

```ts
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) throw new Error("No file provided");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }
  // Default: simulated upload. Replace with your own upload implementation.
  for (let progress = 0; progress <= 100; progress += 10) {
    if (abortSignal?.aborted) throw new Error("Upload cancelled");
    await new Promise((resolve) => setTimeout(resolve, 500));
    onProgress?.({ progress });
  }
  return "/images/tiptap-ui-placeholder-image.jpg";
};
```

The `ImageUploadNode` extension uses this handler with built-in progress tracking and abort support.

## Utility Functions

Key utilities in `lib/editor/utils/utils.ts`:

| Function | Purpose |
|----------|---------|
| `cn(...classes)` | Lightweight class name joiner (like `clsx`) |
| `isMac()` | Platform detection for keyboard shortcuts |
| `formatShortcutKey()` | Converts modifier names to platform symbols |
| `parseShortcutKeys()` | Parses shortcut strings into display-ready arrays |
| `isMarkInSchema()` | Checks if a mark type exists in the editor schema |
| `isNodeInSchema()` | Checks if a node type exists in the editor schema |
| `isExtensionAvailable()` | Verifies one or more extensions are registered |
| `findNodeAtPosition()` | Safely retrieves a node at a document position |
| `findNodePosition()` | Finds a node's position by reference or position |
| `focusNextNode()` | Moves cursor focus to the next document node |
| `isAllowedUri()` | Validates URLs against allowed protocol schemes |
| `sanitizeUrl()` | Sanitizes user-provided URLs with protocol validation |

## Node Components

Custom node views are located in `lib/editor/components/node/`:

| Node | Purpose |
|------|---------|
| `image-upload-node` | Drag-and-drop image upload with progress indicator |
| `image-node` | Rendered image display within the document |
| `heading-node` | Custom heading rendering |
| `blockquote-node` | Custom blockquote styling |
| `code-block-node` | Syntax-highlighted code blocks |
| `horizontal-rule-node` | Visual horizontal divider |
| `list-node` | Custom list rendering |

## Customizing the Editor

To add a new toolbar button:

1. Create a component in `lib/editor/components/ui/your-button/`
2. Export it from `lib/editor/components/ui/index.ts`
3. Add it to `ToolbarContent` at the desired position
4. If it requires a new TipTap extension, register it in `EditorContextProvider`

To replace the image upload handler, provide your own async function that returns a URL:

```ts
ImageUploadNode?.configure({
  accept: 'image/*',
  maxSize: 10 * 1024 * 1024,
  upload: async (file, onProgress, abortSignal) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: abortSignal,
    });
    const data = await response.json();
    return data.url;
  },
})
```

## Related Files

| Path | Description |
|------|-------------|
| `lib/editor/index.ts` | Barrel export for entire editor module |
| `lib/editor/providers/editor-provider.tsx` | Context provider with editor initialization |
| `lib/editor/contents/toolbar-content.tsx` | Toolbar composition |
| `lib/editor/contents/editor-content.tsx` | Editor content wrapper |
| `lib/editor/hooks/use-editor.ts` | Context-based editor hook |
| `lib/editor/hooks/use-tiptap-editor.ts` | Flexible editor hook with state |
| `lib/editor/extensions/index.tsx` | Extension re-exports |
| `lib/editor/utils/utils.ts` | Utility functions and image upload handler |
| `lib/editor/components/ui/` | All toolbar button components |
| `lib/editor/components/node/` | Custom ProseMirror node views |
| `lib/editor/components/primitive/` | Low-level UI primitives (Button, Input, Popover, Toolbar) |
| `lib/editor/components/icons/` | SVG icon components for toolbar buttons |
