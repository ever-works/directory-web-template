---
id: editor-system-deep-dive
title: Rich Text Editor System Deep Dive
sidebar_label: Editor System
sidebar_position: 7
---

# Rich Text Editor System Deep Dive

This guide covers the TipTap-based rich text editor system, including extension configuration, custom nodes, toolbar architecture, image handling, and form synchronization.

## Architecture Overview

```
Editor System Architecture
============================

  EditorContextProvider
  |
  +-- useEditor() hook      <-- StarterKit + extensions
  |
  +-- EditorContent          <-- TipTap EditorContent wrapper
  |   |
  |   +-- ToolbarContent     <-- Modular toolbar components
  |   |   |
  |   |   +-- HeadingDropdownMenu
  |   |   +-- ListDropdownMenu
  |   |   +-- MarkButton (bold, italic, strike, etc.)
  |   |   +-- TextAlignButton
  |   |   +-- ImageUploadButton
  |   |   +-- LinkPopover
  |   |   +-- ColorHighlightPopover
  |   |   +-- UndoRedoButton
  |   |
  |   +-- ProseMirror (content area)
  |
  +-- useEditorSync()        <-- Bidirectional form sync
  |
  +-- Custom Node Extensions
      |
      +-- ImageUploadNode
      +-- HorizontalRuleNode
```

## Extension Configuration

The editor is configured in `lib/editor/providers/editor-provider.tsx` with a comprehensive set of extensions:

```typescript
// lib/editor/providers/editor-provider.tsx
const extensions = useMemo(() => [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ImageUploadNode.configure({
    accept: 'image/*',
    maxSize: MAX_FILE_SIZE,   // 5MB
    limit: 3,
    upload: handleImageUpload,
    onError: (error) => console.error('Upload failed:', error),
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  Selection,
], []);
```

### Extension Reference

| Extension | Source | Purpose |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Base: paragraphs, headings, lists, code, bold, italic |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Horizontal line dividers |
| `TextAlign` | `@tiptap/extension-text-align` | Left, center, right, justify alignment |
| `ImageUploadNode` | Custom | Drag-and-drop image upload with progress |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Checkbox task lists (nested) |
| `Highlight` | `@tiptap/extension-highlight` | Multi-color text highlighting |
| `Image` | `@tiptap/extension-image` | Inline image display |
| `Typography` | `@tiptap/extension-typography` | Smart quotes, dashes, ellipsis |
| `Superscript` | `@tiptap/extension-superscript` | Superscript text |
| `Subscript` | `@tiptap/extension-subscript` | Subscript text |
| `Selection` | `@tiptap/extensions` | Enhanced selection handling |

## Editor Provider

The editor instance is created via React context for application-wide access:

```typescript
// lib/editor/providers/editor-provider.tsx
export const EditorContext = createContext<Editor | null>(null);

export function EditorContextProvider({ children }) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: 'on',
        autocorrect: 'on',
        autocapitalize: 'off',
        'aria-label': 'Main content area, start typing to enter text.',
        class: cn('min-h-96'),
      },
    },
    extensions,
  });

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
```

### Performance Optimizations

- **`immediatelyRender: false`**: Prevents hydration mismatches in SSR.
- **`shouldRerenderOnTransaction: false`**: Reduces React re-renders on every keystroke. Only toolbar state changes trigger re-renders.

## Custom Hooks

### `useTiptapEditor`

Provides access to the editor instance from context or directly:

```typescript
// lib/editor/hooks/use-tiptap-editor.ts
export function useTiptapEditor(providedEditor?: Editor | null) {
  const { editor: coreEditor } = useCurrentEditor();
  const mainEditor = useMemo(
    () => providedEditor || coreEditor,
    [providedEditor, coreEditor]
  );

  const editorState = useEditorState({
    editor: mainEditor,
    selector(context) {
      return {
        editor: context.editor,
        editorState: context.editor?.state,
        canCommand: context.editor?.can,
      };
    },
  });

  return editorState || { editor: null };
}
```

### `useEditor`

Simple context-based hook:

```typescript
// lib/editor/hooks/use-editor.ts
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within a EditorProvider");
  }
  return context;
}
```

## Image Upload Node

The `ImageUploadNode` is a custom TipTap extension for drag-and-drop image uploads:

```typescript
// lib/editor/components/node/image-upload-node/image-upload-node-extension.ts
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  name: "imageUpload",
  group: "block",
  draggable: true,
  atom: true,

  addOptions() {
    return {
      type: "image",
      accept: "image/*",
      limit: 1,
      maxSize: 0,         // 0 = unlimited
      upload: undefined,
      onError: undefined,
      onSuccess: undefined,
      HTMLAttributes: {},
    };
  },
});
```

### Upload Function Interface

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Image Upload Handler

The default handler in `lib/editor/utils/utils.ts`:

```typescript
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) throw new Error("No file provided");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }

  // Replace with your upload implementation
  // e.g., upload to S3, Cloudflare R2, or your API
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const { url } = await response.json();
  return url;
};
```

### Keyboard Shortcuts

The image upload node registers Enter key handling:

```typescript
addKeyboardShortcuts() {
  return {
    Enter: ({ editor }) => {
      const { selection } = editor.state;
      const { nodeAfter } = selection.$from;
      if (nodeAfter?.type.name === "imageUpload" && editor.isActive("imageUpload")) {
        // Trigger file picker
        const nodeEl = editor.view.nodeDOM(selection.$from.pos);
        nodeEl?.firstChild?.click();
        return true;
      }
      return false;
    },
  };
}
```

## Toolbar Configuration

The toolbar is defined in `lib/editor/contents/toolbar-content.tsx` as a modular component:

```typescript
// lib/editor/contents/toolbar-content.tsx
export const ToolbarContent = React.memo(({ editor }) => (
  <>
    <ToolbarGroup>
      <UndoRedoButton action="undo" editor={editor} />
      <UndoRedoButton action="redo" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <HeadingDropdownMenu levels={[1, 2, 3, 4]} editor={editor} />
      <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} editor={editor} />
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
      <TextAlignButton align="left" editor={editor} />
      <TextAlignButton align="center" editor={editor} />
      <TextAlignButton align="right" editor={editor} />
      <TextAlignButton align="justify" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ImageUploadButton text="Add" editor={editor} />
    </ToolbarGroup>
  </>
));
```

## Form Data Synchronization

### `useEditorSync` Hook

Bidirectional sync between the editor and form state:

```typescript
// lib/editor/hooks/use-editor-sync.ts
export function useEditorSync({
  editor, content, onContentChange, fieldName, enableLogging
}: UseEditorSyncOptions) {

  // Form -> Editor (initial load / reset)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content && (!currentContent.trim() || currentContent === '<p></p>')) {
        editor.commands.setContent(content || '');
      }
    }
  }, [editor, content]);

  // Editor -> Form (on change)
  useEffect(() => {
    if (!editor) return;
    const updateContent = () => onContentChange(editor.getHTML());
    editor.on('update', updateContent);
    editor.on('blur', updateContent);
    return () => {
      editor.off('update', updateContent);
      editor.off('blur', updateContent);
    };
  }, [editor, onContentChange]);
}
```

### `useEditorFieldSync` Convenience Hook

For direct integration with `useState`-based form data:

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Utility Functions

### Schema Validation

```typescript
import { isMarkInSchema, isNodeInSchema, isExtensionAvailable } from '@/lib/editor/utils';

// Check if a mark exists before toggling
if (isMarkInSchema('highlight', editor)) {
  editor.chain().focus().toggleHighlight().run();
}

// Check if a node type is available
if (isNodeInSchema('taskList', editor)) {
  editor.chain().focus().toggleTaskList().run();
}

// Check extension availability (logs warning if not found)
if (isExtensionAvailable(editor, ['imageUpload', 'image'])) {
  editor.commands.setImageUploadNode();
}
```

### URL Sanitization

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Performance Considerations

1. **`React.memo` on ToolbarContent**: Prevents toolbar re-renders when unrelated state changes.
2. **`shouldRerenderOnTransaction: false`**: Only essential state changes trigger React re-renders.
3. **`useMemo` for extensions**: Extensions array is computed once and reused.
4. **Event-based sync**: The editor-to-form sync uses TipTap events (`update`, `blur`) instead of polling.
5. **`MAX_FILE_SIZE` validation**: Client-side file size check prevents unnecessary upload attempts.

## Troubleshooting

### Editor not rendering

1. Ensure `EditorContextProvider` wraps the component tree.
2. Check that `immediatelyRender: false` is set (required for SSR).
3. Verify that all TipTap dependencies are installed.

### Form data not syncing

1. Ensure `useEditorSync` or `useEditorFieldSync` is called with the correct parameters.
2. Check that the editor instance is not null when the hook runs.
3. Verify that `onContentChange` correctly updates the form state.

### Image upload fails

1. Check that the upload handler returns a valid URL string.
2. Verify `MAX_FILE_SIZE` matches your server-side limits.
3. Check the browser console for CORS errors if uploading to a different domain.

## Related Documentation

- [API Client Architecture](./api-client-architecture.md)
- [Error Recovery Patterns](./error-recovery-patterns.md)
- [Caching Architecture Deep Dive](./caching-deep-dive.md)
