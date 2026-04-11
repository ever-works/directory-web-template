---
id: rich-text-editor
title: Edytor tekstu sformatowanego
sidebar_label: Edytor tekstu sformatowanego
sidebar_position: 12
---

# Edytor tekstu sformatowanego

Szablon Ever Works zawiera w pełni zintegrowany edytor tekstu sformatowanego obsługiwany przez [TipTap](https://tiptap.dev/), bezgłowy framework edytora zbudowany na bazie ProseMirror. Edytor obsługuje formatowanie treści, przesyłanie obrazów, listy zadań i dwukierunkową synchronizację z danymi formularzy.

## Przegląd architektury

System edytora jest zorganizowany w strukturę modułową w ramach `lib/editor/` :

| Katalog / plik | Cel |
|---|---|
| `providers/editor-provider.tsx` | Dostawca kontekstu reakcji, który inicjuje edytor TipTap ze wszystkimi rozszerzeniami |
| `hooks/use-tiptap-editor.ts` | Hak umożliwiający dostęp do instancji edytora z kontekstu lub bezpośredniej właściwości |
| `hooks/use-editor.ts` | Uproszczony kontekstowy hak konsumencki |
| `hooks/use-editor-sync.ts` | Dwukierunkowa synchronizacja między edytorem a stanem formularza |
| `contents/editor-content.tsx` | Komponent opakowania do renderowania obszaru zawartości edytora |
| `contents/use-editor-toolbar.ts` | Hook do zarządzania stanem paska narzędzi (mobilny/komputer stacjonarny, widoki) |

## Rozszerzenia TipTap

Edytor jest skonfigurowany z kompleksowym zestawem rozszerzeń poprzez `EditorContextProvider` :

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

### Informacje o rozszerzeniu

| Rozszerzenie | Opis |
|---|---|
| `StarterKit` | Podstawowe formatowanie: pogrubienie, kursywa, nagłówki, listy, cytaty blokowe, bloki kodu, linki |
| `HorizontalRule` | Wstawianie niestandardowej linii poziomej |
| `TextAlign` | Wyrównanie tekstu (do lewej, do środka, do prawej, justowanie) dla nagłówków i akapitów |
| `ImageUploadNode` | Przesyłanie obrazów metodą „przeciągnij i upuść” z ograniczeniami rozmiaru i liczby plików |
| `TaskList` / `TaskItem` | Interaktywne listy zadań/pól wyboru z zagnieżdżoną obsługą |
| `Highlight` | Podświetlanie tekstu z obsługą wielu kolorów |
| `Image` | Standardowe osadzanie obrazu poprzez `@tiptap/extension-image` |
| `Typography` | Automatyczne zamiany typograficzne (inteligentne cudzysłowy, myślniki) |
| `Superscript` / `Subscript` | Formatowanie tekstu w indeksie górnym i dolnym |
| `Selection` | Ulepszona obsługa zaznaczeń |

## Dostawca kontekstu edytora

Edytor jest inicjowany poprzez dostawcę kontekstu React. Owiń drzewo komponentów `EditorContextProvider` , aby udostępnić edytor:

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

Dostawca tworzy edytor z następującą konfiguracją:

- ** `immediatelyRender: false` ** -- Zapobiega niedopasowaniu nawodnienia SSR
- ** `shouldRerenderOnTransaction: false` ** — Optymalizacja wydajności w celu ograniczenia niepotrzebnych ponownych renderowań
- **Atrybuty dostępności** — Skonfigurowano etykiety autouzupełniania, autokorekty i ARIA
- **Minimalna wysokość** -- `min-h-96` zapewnia użyteczną powierzchnię edycyjną

## Dostęp do instancji edytora

### Używanie `useTiptapEditor` Główny hak dostępu do edytora obsługuje zarówno bezpośrednie wstrzykiwanie, jak i zastępowanie kontekstu:

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

### Używanie `useEditor` Prostszy hak, który ściśle wymaga uwzględnienia `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Synchronizacja treści

Hook `useEditorSync` obsługuje dwukierunkową synchronizację pomiędzy edytorem TipTap a stanem formularza. Jest to niezbędne do integracji edytora z formularzami zarządzanymi przez biblioteki stanu lub formularzy React.

### Podstawowa synchronizacja

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

### Synchronizacja pól formularza

W przypadku formularzy z wieloma polami `useEditorFieldSync` stanowi skrót:

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

### Synchronizuj zachowanie

| Kierunek | Wyzwalacz | Stan |
|---|---|---|
| Formularz do redaktora | `content` zmiany rekwizytów | Tylko gdy edytor jest pusty lub treść znacznie się różni |
| Edytor do formularza | `update` i `blur` wydarzenia | Zawsze propaguje bieżący kod HTML do wywołania zwrotnego formularza |

Hak pozwala uniknąć nieskończonych pętli aktualizacji, sprawdzając przed nadpisaniem, czy zawartość edytora jest pusta lub zasadniczo się różni.

## Komponent zawartości edytora

Opakowanie `EditorContent` obsługuje zawijanie słów i stylizację ProseMirror:

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

Komponent stosuje reguły CSS dotyczące prawidłowego zawijania tekstu:
- `break-words` na pojemniku ProseMirror
- `whitespace-pre-wrap` do zachowania białych znaków
- `overflow-wrap-anywhere` zapobiegające przelewaniu się w poziomie

## Zarządzanie paskami narzędzi

Hak `useEditorToolbar` zarządza stanem paska narzędzi, w tym responsywnością urządzeń mobilnych:

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

Pasek narzędzi obsługuje trzy tryby widoku mobilnego: `"main"` , `"highlighter"` i `"link"` .

## Prześlij obraz

Edytor obsługuje przesyłanie obrazów poprzez rozszerzenie `ImageUploadNode` :

| Ustawienie | Wartość |
|---|---|
| Akceptowane typy | `image/*` |
| Maksymalny rozmiar pliku | Zdefiniowane przez stałą `MAX_FILE_SIZE` |
| Maksymalna liczba obrazów na przesłane | 3 |
| Obsługa przesyłania | `handleImageUpload` funkcja użytkowa |

Obrazy można przesyłać za pomocą metody „przeciągnij i upuść” lub przycisku przesyłania na pasku narzędzi.

## Kluczowe pliki

| Plik | Ścieżka |
|---|---|
| Dostawca edytora | `lib/editor/providers/editor-provider.tsx` |
| Hak edytora TipTap | `lib/editor/hooks/use-tiptap-editor.ts` |
| Hak synchronizacji edytora | `lib/editor/hooks/use-editor-sync.ts` |
| Treść redaktora | `lib/editor/contents/editor-content.tsx` |
| Zaczep paska narzędzi | `lib/editor/contents/use-editor-toolbar.ts` |
| Hak kontekstowy edytora | `lib/editor/hooks/use-editor.ts` |
