---
id: editor-system-deep-dive
title: Rich Text Editor-systeem Diepgaande duik
sidebar_label: Editor-systeem
sidebar_position: 7
---

# Rich Text Editor-systeem Diepe duik

Deze handleiding behandelt het op TipTap gebaseerde rich-text-editorsysteem, inclusief extensieconfiguratie, aangepaste knooppunten, werkbalkarchitectuur, beeldverwerking en formuliersynchronisatie.

## Architectuuroverzicht

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

## Extensieconfiguratie

De editor is in `lib/editor/providers/editor-provider.tsx` geconfigureerd met een uitgebreide reeks extensies:

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

### Extensiereferentie

| Extensie | Bron | Doel |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Basis: paragrafen, koppen, lijsten, code, vet, cursief |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Horizontale lijnverdelers |
| `TextAlign` | `@tiptap/extension-text-align` | Links, midden, rechts, uitlijning uitvullen |
| `ImageUploadNode` | Aangepast | Afbeelding uploaden met slepen en neerzetten met voortgang |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Takenlijsten met selectievakjes (genest) |
| `Highlight` | `@tiptap/extension-highlight` | Meerkleurige tekstmarkering |
| `Image` | `@tiptap/extension-image` | Inline beeldweergave |
| `Typography` | `@tiptap/extension-typography` | Slimme aanhalingstekens, streepjes, weglatingsteken |
| `Superscript` | `@tiptap/extension-superscript` | Superscripttekst |
| `Subscript` | `@tiptap/extension-subscript` | Subscripttekst |
| `Selection` | `@tiptap/extensions` | Verbeterde selectieverwerking |

## Editorprovider

De editorinstantie wordt gemaakt via React-context voor applicatiebrede toegang:

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

### Prestatieoptimalisaties

- ** `immediatelyRender: false` **: Voorkomt verkeerde hydratatie bij SSR.
- ** `shouldRerenderOnTransaction: false` **: Vermindert het opnieuw renderen van React bij elke toetsaanslag. Alleen wijzigingen in de status van de werkbalk veroorzaken een nieuwe weergave.

## Aangepaste haken

### `useTiptapEditor` Biedt toegang tot de editorinstantie vanuit context of rechtstreeks:

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

### `useEditor` Eenvoudige contextgebaseerde hook:

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

## Knooppunt voor het uploaden van afbeeldingen

De `ImageUploadNode` is een aangepaste TipTap-extensie voor het uploaden van afbeeldingen via slepen en neerzetten:

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

### Uploadfunctie-interface

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Handler voor het uploaden van afbeeldingen

De standaardhandler in `lib/editor/utils/utils.ts` :

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

### Sneltoetsen

Het knooppunt voor het uploaden van afbeeldingen registreert Enter-sleutelafhandeling:

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

## Werkbalkconfiguratie

De werkbalk is in `lib/editor/contents/toolbar-content.tsx` gedefinieerd als een modulair onderdeel:

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

## Synchronisatie van formuliergegevens

### `useEditorSync` Haak

Bidirectionele synchronisatie tussen de editor en de formulierstatus:

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

### `useEditorFieldSync` Handige haak

Voor directe integratie met op `useState` gebaseerde formuliergegevens:

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Hulpprogramma's

### Schemavalidatie

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

### URL-opschoning

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Prestatieoverwegingen

1. ** `React.memo` op ToolbarContent**: Voorkomt dat de werkbalk opnieuw wordt weergegeven wanneer niet-gerelateerde status verandert.
2. ** `shouldRerenderOnTransaction: false` **: alleen essentiële statuswijzigingen activeren React-herweergaven.
3. ** `useMemo` voor extensies**: De array met extensies wordt één keer berekend en opnieuw gebruikt.
4. **Op gebeurtenissen gebaseerde synchronisatie**: de synchronisatie van editor naar formulier maakt gebruik van TipTap-gebeurtenissen ( `update` , `blur` ) in plaats van polling.
5. ** `MAX_FILE_SIZE` validatie**: controle van de bestandsgrootte aan de clientzijde voorkomt onnodige uploadpogingen.

## Problemen oplossen

### Editor rendert niet

1. Zorg ervoor dat `EditorContextProvider` de componentenboom omhult.
2. Controleer of `immediatelyRender: false` is ingesteld (vereist voor SSR).
3. Controleer of alle TipTap-afhankelijkheden zijn geïnstalleerd.

### Formuliergegevens worden niet gesynchroniseerd

1. Zorg ervoor dat `useEditorSync` of `useEditorFieldSync` wordt aangeroepen met de juiste parameters.
2. Controleer of de editorinstantie niet nul is wanneer de hook wordt uitgevoerd.
3. Controleer of `onContentChange` de formulierstatus correct bijwerkt.

### Uploaden van afbeelding mislukt

1. Controleer of de uploadhandler een geldige URL-tekenreeks retourneert.
2. Controleer of `MAX_FILE_SIZE` overeenkomt met uw serverlimieten.
3. Controleer de browserconsole op CORS-fouten als u uploadt naar een ander domein.

## Gerelateerde documentatie

- [API-clientarchitectuur] (./api-client-architectuur.md)
- [Foutherstelpatronen] (./error-recovery-patterns.md)
- [Caching-architectuur diepe duik](./caching-deep-dive.md)
