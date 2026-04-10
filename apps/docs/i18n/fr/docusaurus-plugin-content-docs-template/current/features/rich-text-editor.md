---
id: rich-text-editor
title: Éditeur de texte enrichi
sidebar_label: Éditeur de texte enrichi
sidebar_position: 12
---

# Éditeur de texte enrichi

The Ever Works Template includes a fully integrated rich text editor powered by [TipTap](https://tiptap.dev/), a headless editor framework built on top of ProseMirror. The editor supports content formatting, image uploads, task lists, and bidirectional synchronization with form data.

## Architecture Overview

The editor system is organized into a modular structure under `lib/editor/`:

| Directory / File | Purpose |
|---|---|
| `providers/editor-provider.tsx` | React context provider that initializes the TipTap editor with all extensions |
| `hooks/use-tiptap-editor.ts` | Hook for accessing the editor instance from context or direct prop |
| `hooks/use-editor.ts` | Simplified context consumer hook |
| `hooks/use-editor-sync.ts` | Bidirectional sync between editor and form state |
| `contents/editor-content.tsx` | Wrapper component for rendering the editor content area |
| `contents/use-editor-toolbar.ts` | Hook for managing toolbar state (mobile/desktop, views) |

## TipTap Extensions

The editor is configured with a comprehensive set of extensions through the `EditorContextProvider`:

```tsx
// lib/editor/providers/editor-provider.tsx
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
```

### Extension Reference

| Extension | Description |
|---|---|
| `StarterKit` | Core formatting: bold, italic, headings, lists, blockquotes, code blocks, links |
| `HorizontalRule` | Custom horizontal rule insertion |
| `TextAlign` | Text alignment (left, center, right, justify) for headings and paragraphs |
| `ImageUploadNode` | Drag-and-drop image upload with size limits and file count restrictions |
| `TaskList` / `TaskItem` | Interactive task/checkbox lists with nested support |
| `Highlight` | Text highlighting with multi-color support |
| `Image` | Standard image embedding via `@tiptap/extension-image` |
| `Typography` | Automatic typographic replacements (smart quotes, dashes) |
| `Superscript` / `Subscript` | Superscript and subscript text formatting |
| `Selection` | Enhanced selection handling |

## Editor Context Provider

The editor is initialized through a React context provider. Wrap your component tree with `EditorContextProvider` to make the editor available:

```tsx
import { EditorContextProvider } from '@/lib/editor/providers';

function MyPage() {
  return (
    <EditorContextProvider>
      <MyEditorComponent />
    </EditorContextProvider>
  );
}
```

The provider creates the editor with the following configuration:

- **`immediatelyRender: false`** -- Prevents SSR hydration mismatches
- **`shouldRerenderOnTransaction: false`** -- Performance optimization to reduce unnecessary re-renders
- **Accessibility attributes** -- Autocomplete, autocorrect, and ARIA labels are configured
- **Minimum height** -- `min-h-96` ensures a usable editing area

## Accessing the Editor Instance

### Using `useTiptapEditor`

The primary hook for accessing the editor supports both direct injection and context fallback:

```tsx
import { useTiptapEditor } from '@/lib/editor/hooks/use-tiptap-editor';

function MyToolbar({ editor: externalEditor }) {
  const { editor, editorState, canCommand } = useTiptapEditor(externalEditor);

  if (!editor) return null;

  return (
    <div>
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!canCommand?.().toggleBold()}
      >
        Bold
      </button>
    </div>
  );
}
```

### Using `useEditor`

A simpler hook that strictly requires being within the `EditorContextProvider`:

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Content Synchronization

The `useEditorSync` hook handles bidirectional synchronization between the TipTap editor and form state. This is essential for integrating the editor into forms managed by React state or form libraries.

### Basic Sync

```tsx
import { useEditorSync } from '@/lib/editor/hooks/use-editor-sync';

function DescriptionEditor({ editor }) {
  const [content, setContent] = useState('');

  useEditorSync({
    editor,
    content,
    onContentChange: setContent,
    fieldName: 'description',
    enableLogging: false
  });

  return <EditorContent editor={editor} />;
}
```

### Form Field Sync

For forms with multiple fields, `useEditorFieldSync` provides a shorthand:

```tsx
import { useEditorFieldSync } from '@/lib/editor/hooks/use-editor-sync';

function ItemForm({ editor }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    notes: ''
  });

  // Synchronizes formData.description with the editor
  useEditorFieldSync(editor, formData, 'description', setFormData);

  return <EditorContent editor={editor} />;
}
```

### Sync Behavior

| Direction | Trigger | Condition |
|---|---|---|
| Form to Editor | `content` prop changes | Only when editor is empty or content differs significantly |
| Editor to Form | `update` and `blur` events | Always propagates the current HTML to the form callback |

The hook avoids infinite update loops by checking whether the editor content is empty or substantially different before overwriting.

## Editor Content Component

The `EditorContent` wrapper handles word-wrapping and ProseMirror styling:

```tsx
import { EditorContent } from '@/lib/editor/contents/editor-content';

function MyEditor({ editor }) {
  return (
    <EditorContent
      editor={editor}
      toolbar={<MyToolbar editor={editor} />}
      className="prose dark:prose-invert"
      onPaste={handlePaste}
      onDrop={handleDrop}
    />
  );
}
```

The component applies CSS rules for proper text wrapping:
- `break-words` on the ProseMirror container
- `whitespace-pre-wrap` for preserving whitespace
- `overflow-wrap-anywhere` for preventing horizontal overflow

## Toolbar Management

The `useEditorToolbar` hook manages toolbar state including mobile responsiveness:

```tsx
import { useEditorToolbar } from '@/lib/editor/contents/use-editor-toolbar';

function Toolbar({ editor }) {
  const { rect, toolbarRef, isMobile, mobileView, setMobileView } = useEditorToolbar(editor);

  return (
    <div ref={toolbarRef}>
      {isMobile ? (
        <MobileToolbar view={mobileView} onViewChange={setMobileView} />
      ) : (
        <DesktopToolbar />
      )}
    </div>
  );
}
```

The toolbar supports three mobile view modes: `"main"`, `"highlighter"`, and `"link"`.

## Image Upload

The editor supports image uploads through the `ImageUploadNode` extension:

| Setting | Value |
|---|---|
| Accepted types | `image/*` |
| Max file size | Defined by `MAX_FILE_SIZE` constant |
| Max images per upload | 3 |
| Upload handler | `handleImageUpload` utility function |

Images can be uploaded via drag-and-drop or the toolbar upload button.

## Key Files

| File | Path |
|---|---|
| Editor Provider | `lib/editor/providers/editor-provider.tsx` |
| TipTap Editor Hook | `lib/editor/hooks/use-tiptap-editor.ts` |
| Editor Sync Hook | `lib/editor/hooks/use-editor-sync.ts` |
| Editor Content | `lib/editor/contents/editor-content.tsx` |
| Toolbar Hook | `lib/editor/contents/use-editor-toolbar.ts` |
| Editor Context Hook | `lib/editor/hooks/use-editor.ts` |