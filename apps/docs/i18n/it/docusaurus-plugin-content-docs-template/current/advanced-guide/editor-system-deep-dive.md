---
id: editor-system-deep-dive
title: Approfondimento sul sistema Rich Text Editor
sidebar_label: Sistema editore
sidebar_position: 7
---

# Approfondimento sul sistema Rich Text Editor

Questa guida copre il sistema di editor di testo RTF basato su TipTap, inclusa la configurazione delle estensioni, i nodi personalizzati, l'architettura della barra degli strumenti, la gestione delle immagini e la sincronizzazione dei moduli.

## Panoramica dell'architettura

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

## Configurazione dell'estensione

L'editor è configurato in `lib/editor/providers/editor-provider.tsx` con un set completo di estensioni:

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

### Riferimento all'estensione

| Estensione | Fonte | Scopo |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Base: paragrafi, intestazioni, elenchi, codice, grassetto, corsivo |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Divisori orizzontali |
| `TextAlign` | `@tiptap/extension-text-align` | Sinistra, centro, destra, giustifica l'allineamento |
| `ImageUploadNode` | Personalizzato | Caricamento di immagini tramite trascinamento con avanzamento |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Elenchi attività con casella di controllo (nidificati) |
| `Highlight` | `@tiptap/extension-highlight` | Evidenziazione del testo multicolore |
| `Image` | `@tiptap/extension-image` | Visualizzazione delle immagini in linea |
| `Typography` | `@tiptap/extension-typography` | virgolette intelligenti, trattini, puntini di sospensione |
| `Superscript` | `@tiptap/extension-superscript` | Testo in apice |
| `Subscript` | `@tiptap/extension-subscript` | Testo in pedice |
| `Selection` | `@tiptap/extensions` | Gestione della selezione migliorata |

## Fornitore dell'editor

L'istanza dell'editor viene creata tramite il contesto React per l'accesso a livello di applicazione:

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

### Ottimizzazioni delle prestazioni

- ** `immediatelyRender: false` **: Previene discrepanze di idratazione in SSR.
- ** `shouldRerenderOnTransaction: false` **: riduce i re-render di React a ogni pressione di un tasto. Solo le modifiche allo stato della barra degli strumenti attivano il nuovo rendering.

## Ganci personalizzati

### `useTiptapEditor` Fornisce l'accesso all'istanza dell'editor dal contesto o direttamente:

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

### `useEditor` Hook semplice basato sul contesto:

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

## Nodo di caricamento immagini `ImageUploadNode` è un'estensione TipTap personalizzata per il caricamento di immagini tramite trascinamento:

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

### Interfaccia della funzione di caricamento

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Gestore caricamento immagini

Il gestore predefinito in `lib/editor/utils/utils.ts` :

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

### Scorciatoie da tastiera

Il nodo di caricamento delle immagini registra la gestione della chiave Enter:

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

## Configurazione della barra degli strumenti

La barra degli strumenti è definita in `lib/editor/contents/toolbar-content.tsx` come componente modulare:

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

## Sincronizzazione dei dati dei moduli

### `useEditorSync` Gancio

Sincronizzazione bidirezionale tra l'editor e lo stato del modulo:

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

### `useEditorFieldSync` Gancio pratico

Per l'integrazione diretta con i dati del modulo basato su `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Funzioni di utilità

### Convalida dello schema

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

### Sanificazione degli URL

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Considerazioni sulle prestazioni

1. ** `React.memo` su ToolbarContent**: impedisce il nuovo rendering della barra degli strumenti quando cambia uno stato non correlato.
2. ** `shouldRerenderOnTransaction: false` **: solo i cambiamenti essenziali dello stato attivano i nuovi rendering di React.
3. ** `useMemo` per estensioni**: l'array di estensioni viene calcolato una volta e riutilizzato.
4. **Sincronizzazione basata su eventi**: la sincronizzazione dall'editor al modulo utilizza gli eventi TipTap ( `update` , `blur` ) invece del polling.
5. **Convalida `MAX_FILE_SIZE` **: il controllo della dimensione del file sul lato client impedisce tentativi di caricamento non necessari.

## Risoluzione dei problemi

### L'editor non esegue il rendering

1. Assicurarsi che `EditorContextProvider` avvolga l'albero dei componenti.
2. Verificare che sia impostato `immediatelyRender: false` (richiesto per SSR).
3. Verificare che tutte le dipendenze TipTap siano installate.

### I dati del modulo non vengono sincronizzati

1. Assicurarsi che `useEditorSync` o `useEditorFieldSync` venga chiamato con i parametri corretti.
2. Verificare che l'istanza dell'editor non sia nulla quando viene eseguito l'hook.
3. Verificare che `onContentChange` aggiorni correttamente lo stato del modulo.

### Il caricamento dell'immagine non è riuscito

1. Verifica che il gestore del caricamento restituisca una stringa URL valida.
2. Verifica che `MAX_FILE_SIZE` corrisponda ai limiti lato server.
3. Controlla la console del browser per errori CORS se carichi su un dominio diverso.

## Documentazione correlata

- [Architettura client API](./api-client-architecture.md)
- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
- [Approfondimento sull'architettura della memorizzazione nella cache](./caching-deep-dive.md)
