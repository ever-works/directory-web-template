---
id: editor-system-deep-dive
title: Deep Dive zum Rich-Text-Editor-System
sidebar_label: Editorsystem
sidebar_position: 7
---

# Deep Dive zum Rich-Text-Editor-System

Dieses Handbuch behandelt das TipTap-basierte Rich-Text-Editor-System, einschließlich der Erweiterungskonfiguration, benutzerdefinierten Knoten, der Symbolleistenarchitektur, der Bildverarbeitung und der Formularsynchronisierung.

## Architekturübersicht

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

## Erweiterungskonfiguration

Der Editor wird in `lib/editor/providers/editor-provider.tsx` mit einem umfassenden Satz an Erweiterungen konfiguriert:

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

### Erweiterungsreferenz

| Erweiterung | Quelle | Zweck |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Basis: Absätze, Überschriften, Listen, Code, Fett, Kursiv |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Horizontale Linienteiler |
| `TextAlign` | `@tiptap/extension-text-align` | Links, Mitte, rechts, Ausrichtung ausrichten |
| `ImageUploadNode` | Benutzerdefiniert | Hochladen von Bildern per Drag-and-Drop mit Fortschritt |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Checkbox-Aufgabenlisten (verschachtelt) |
| `Highlight` | `@tiptap/extension-highlight` | Mehrfarbige Texthervorhebung |
| `Image` | `@tiptap/extension-image` | Inline-Bildanzeige |
| `Typography` | `@tiptap/extension-typography` | Intelligente Anführungszeichen, Bindestriche, Auslassungspunkte |
| `Superscript` | `@tiptap/extension-superscript` | Hochgestellter Text |
| `Subscript` | `@tiptap/extension-subscript` | Tiefgestellter Text |
| `Selection` | `@tiptap/extensions` | Verbesserte Auswahlhandhabung |

## Editor-Anbieter

Die Editor-Instanz wird über den React-Kontext für den anwendungsweiten Zugriff erstellt:

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

### Leistungsoptimierungen

- ** `immediatelyRender: false` **: Verhindert Fehlanpassungen der Flüssigkeitszufuhr in der SSR.
- ** `shouldRerenderOnTransaction: false` **: Reduziert das erneute Rendern von React bei jedem Tastendruck. Nur Statusänderungen der Symbolleiste lösen ein erneutes Rendern aus.

## Benutzerdefinierte Haken

### `useTiptapEditor` Bietet Zugriff auf die Editorinstanz über den Kontext oder direkt:

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

### `useEditor` Einfacher kontextbasierter Hook:

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

## Bild-Upload-Knoten

Das `ImageUploadNode` ist eine benutzerdefinierte TipTap-Erweiterung für Drag-and-Drop-Bild-Uploads:

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

### Upload-Funktionsschnittstelle

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Bild-Upload-Handler

Der Standardhandler in `lib/editor/utils/utils.ts` :

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

### Tastaturkürzel

Der Bild-Upload-Knoten registriert die Eingabeschlüsselverarbeitung:

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

## Symbolleistenkonfiguration

Die Symbolleiste ist in `lib/editor/contents/toolbar-content.tsx` als modulare Komponente definiert:

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

## Formulardatensynchronisierung

### `useEditorSync` Haken

Bidirektionale Synchronisierung zwischen Editor und Formularstatus:

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

### `useEditorFieldSync` Praktischer Haken

Zur direkten Integration mit `useState` -basierten Formulardaten:

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Utility-Funktionen

### Schemavalidierung

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

### URL-Bereinigung

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Leistungsüberlegungen

1. ** `React.memo` auf ToolbarContent**: Verhindert das erneute Rendern der Symbolleiste, wenn sich der Status ohne Zusammenhang ändert.
2. ** `shouldRerenderOnTransaction: false` **: Nur wesentliche Zustandsänderungen lösen React-Re-Renderings aus.
3. ** `useMemo` für Erweiterungen**: Das Erweiterungsarray wird einmal berechnet und wiederverwendet.
4. **Ereignisbasierte Synchronisierung**: Die Editor-zu-Formular-Synchronisierung verwendet TipTap-Ereignisse ( `update` , `blur` ) anstelle von Abfragen.
5. ** `MAX_FILE_SIZE` Validierung**: Die clientseitige Dateigrößenprüfung verhindert unnötige Upload-Versuche.

## Fehlerbehebung

### Editor rendert nicht

1. Stellen Sie sicher, dass `EditorContextProvider` den Komponentenbaum umschließt.
2. Überprüfen Sie, ob `immediatelyRender: false` eingestellt ist (erforderlich für SSR).
3. Stellen Sie sicher, dass alle TipTap-Abhängigkeiten installiert sind.

### Formulardaten werden nicht synchronisiert

1. Stellen Sie sicher, dass `useEditorSync` oder `useEditorFieldSync` mit den richtigen Parametern aufgerufen wird.
2. Stellen Sie sicher, dass die Editorinstanz nicht null ist, wenn der Hook ausgeführt wird.
3. Stellen Sie sicher, dass `onContentChange` den Formularstatus korrekt aktualisiert.

### Das Hochladen des Bildes schlägt fehl

1. Überprüfen Sie, ob der Upload-Handler eine gültige URL-Zeichenfolge zurückgibt.
2. Stellen Sie sicher, dass `MAX_FILE_SIZE` Ihren serverseitigen Grenzwerten entspricht.
3. Überprüfen Sie die Browserkonsole auf CORS-Fehler, wenn Sie in eine andere Domäne hochladen.

## Verwandte Dokumentation

- [API-Client-Architektur](./api-client-architecture.md)
- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
- [Deep Dive zur Caching-Architektur](./caching-deep-dive.md)
