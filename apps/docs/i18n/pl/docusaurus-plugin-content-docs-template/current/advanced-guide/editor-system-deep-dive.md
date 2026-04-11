---
id: editor-system-deep-dive
title: Głębokie zanurzenie się w systemie edytora tekstu sformatowanego
sidebar_label: System edytorski
sidebar_position: 7
---

# Głębokie zanurzenie się w systemie edytora tekstu sformatowanego

W tym przewodniku opisano system edytora tekstu sformatowanego oparty na TipTap, w tym konfigurację rozszerzeń, węzły niestandardowe, architekturę pasków narzędzi, obsługę obrazów i synchronizację formularzy.

## Przegląd architektury

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

## Konfiguracja rozszerzenia

Edytor jest skonfigurowany w wersji `lib/editor/providers/editor-provider.tsx` z rozbudowanym zestawem rozszerzeń:

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

### Informacje o rozszerzeniu

| Rozszerzenie | Źródło | Cel |
|----------|--------|--------|
| `StarterKit` | `@tiptap/starter-kit` | Baza: akapity, nagłówki, listy, kod, pogrubienie, kursywa |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Poziome dzielniki linii |
| `TextAlign` | `@tiptap/extension-text-align` | Lewo, środek, prawo, wyjustuj wyrównanie |
| `ImageUploadNode` | Niestandardowe | Przeciągnij i upuść przesyłanie obrazu z postępem |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Listy zadań z polami wyboru (zagnieżdżone) |
| `Highlight` | `@tiptap/extension-highlight` | Wielokolorowe podświetlanie tekstu |
| `Image` | `@tiptap/extension-image` | Wbudowane wyświetlanie obrazu |
| `Typography` | `@tiptap/extension-typography` | Inteligentne cudzysłowy, myślniki, wielokropki |
| `Superscript` | `@tiptap/extension-superscript` | Tekst indeksu górnego |
| `Subscript` | `@tiptap/extension-subscript` | Tekst indeksu |
| `Selection` | `@tiptap/extensions` | Ulepszona obsługa zaznaczeń |

## Dostawca edytora

Instancja edytora jest tworzona poprzez kontekst React w celu zapewnienia dostępu w całej aplikacji:

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

### Optymalizacja wydajności

- ** `immediatelyRender: false` **: Zapobiega niedopasowaniu nawodnienia w SSR.
- ** `shouldRerenderOnTransaction: false` **: Zmniejsza ponowne renderowanie React przy każdym naciśnięciu klawisza. Tylko zmiany stanu paska narzędzi powodują ponowne renderowanie.

## Niestandardowe haki

### `useTiptapEditor` Zapewnia dostęp do instancji edytora z kontekstu lub bezpośrednio:

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

### `useEditor` Prosty hak kontekstowy:

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

## Węzeł przesyłania obrazu `ImageUploadNode` to niestandardowe rozszerzenie TipTap umożliwiające przesyłanie obrazów metodą „przeciągnij i upuść”:

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

### Interfejs funkcji przesyłania

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Procedura przesyłania obrazów

Domyślny moduł obsługi w `lib/editor/utils/utils.ts` :

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

### Skróty klawiaturowe

Węzeł przesyłania obrazów rejestruje obsługę klawiszy Enter:

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

## Konfiguracja paska narzędzi

Pasek narzędzi jest zdefiniowany w `lib/editor/contents/toolbar-content.tsx` jako komponent modułowy:

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

## Synchronizacja danych formularza

### `useEditorSync` Hak

Dwukierunkowa synchronizacja pomiędzy edytorem a stanem formularza:

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

### `useEditorFieldSync` Wygodny hak

Do bezpośredniej integracji z danymi formularzy opartymi na `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Funkcje użytkowe

### Walidacja schematu

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

### Oczyszczanie adresów URL

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Względy wydajności

1. ** `React.memo` na ToolbarContent**: Zapobiega ponownemu renderowaniu paska narzędzi w przypadku zmiany niepowiązanego stanu.
2. ** `shouldRerenderOnTransaction: false` **: Tylko istotne zmiany stanu wyzwalają ponowne renderowanie React.
3. ** `useMemo` dla rozszerzeń**: Tablica rozszerzeń jest obliczana raz i używana ponownie.
4. **Synchronizacja oparta na zdarzeniach**: Synchronizacja między edytorem a formularzem wykorzystuje zdarzenia TipTap ( `update` , `blur` ) zamiast odpytywania.
5. **Weryfikacja `MAX_FILE_SIZE` **: Sprawdzanie rozmiaru pliku po stronie klienta zapobiega niepotrzebnym próbom przesyłania.

## Rozwiązywanie problemów

### Edytor nie renderuje

1. Upewnij się, że `EditorContextProvider` otacza drzewo komponentów.
2. Sprawdź, czy ustawiono `immediatelyRender: false` (wymagane w przypadku SSR).
3. Sprawdź, czy zainstalowano wszystkie zależności TipTap.

### Dane formularza nie są synchronizowane

1. Upewnij się, że wywołano `useEditorSync` lub `useEditorFieldSync` z poprawnymi parametrami.
2. Sprawdź, czy instancja edytora nie ma wartości null po uruchomieniu haka.
3. Sprawdź, czy `onContentChange` poprawnie aktualizuje stan formularza.

### Przesyłanie obrazu nie powiodło się

1. Sprawdź, czy moduł obsługi przesyłania zwraca prawidłowy ciąg adresu URL.
2. Sprawdź, czy `MAX_FILE_SIZE` odpowiada limitom po stronie serwera.
3. W przypadku przesyłania do innej domeny sprawdź konsolę przeglądarki pod kątem błędów CORS.

## Powiązana dokumentacja

- [Architektura klienta API](./api-client-architecture.md)
- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
- [Dogłębne zapoznanie się z architekturą buforowania](./caching-deep-dive.md)
