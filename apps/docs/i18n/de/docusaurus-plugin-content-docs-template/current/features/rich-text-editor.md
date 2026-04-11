---
id: rich-text-editor
title: Rich-Text-Editor
sidebar_label: Rich-Text-Editor
sidebar_position: 12
---

# Rich-Text-Editor

Die Ever Works-Vorlage enthält einen vollständig integrierten Rich-Text-Editor, der von [TipTap](https://tiptap.dev/) unterstützt wird, einem Headless-Editor-Framework, das auf ProseMirror aufbaut. Der Editor unterstützt Inhaltsformatierung, Bild-Uploads, Aufgabenlisten und bidirektionale Synchronisierung mit Formulardaten.

## Architekturübersicht

Das Editorsystem ist modular aufgebaut unter `lib/editor/` :

| Verzeichnis / Datei | Zweck |
|---|---|
| `providers/editor-provider.tsx` | React-Kontextanbieter, der den TipTap-Editor mit allen Erweiterungen initialisiert |
| `hooks/use-tiptap-editor.ts` | Hook für den Zugriff auf die Editor-Instanz über Kontext oder direktes prop |
| `hooks/use-editor.ts` | Vereinfachter Kontext-Consumer-Hook |
| `hooks/use-editor-sync.ts` | Bidirektionale Synchronisierung zwischen Editor und Formularstatus |
| `contents/editor-content.tsx` | Wrapper-Komponente zum Rendern des Editor-Inhaltsbereichs |
| `contents/use-editor-toolbar.ts` | Hook zum Verwalten des Symbolleistenstatus (Mobil/Desktop, Ansichten) |

## TipTap-Erweiterungen

Der Editor wird über den `EditorContextProvider` mit einem umfangreichen Satz an Erweiterungen konfiguriert:

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

### Erweiterungsreferenz

| Erweiterung | Beschreibung |
|---|---|
| `StarterKit` | Kernformatierung: Fett, Kursiv, Überschriften, Listen, Anführungszeichen, Codeblöcke, Links |
| `HorizontalRule` | Benutzerdefinierte horizontale Regeleinfügung |
| `TextAlign` | Textausrichtung (links, zentriert, rechts, Blocksatz) für Überschriften und Absätze |
| `ImageUploadNode` | Hochladen von Bildern per Drag-and-Drop mit Größenbeschränkungen und Dateianzahlbeschränkungen |
| `TaskList` / `TaskItem` | Interaktive Aufgaben-/Kontrollkästchenlisten mit verschachtelter Unterstützung |
| `Highlight` | Texthervorhebung mit Mehrfarbenunterstützung |
| `Image` | Standard-Bilderinbettung über `@tiptap/extension-image` |
| `Typography` | Automatische typografische Ersetzungen (intelligente Anführungszeichen, Bindestriche) |
| `Superscript` / `Subscript` | Hochgestellte und tiefgestellte Textformatierung |
| `Selection` | Verbesserte Auswahlhandhabung |

## Editor-Kontextanbieter

Der Editor wird über einen React-Kontextanbieter initialisiert. Umschließen Sie Ihren Komponentenbaum mit `EditorContextProvider` , um den Editor verfügbar zu machen:

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

Der Anbieter erstellt den Editor mit der folgenden Konfiguration:

- ** `immediatelyRender: false` ** – Verhindert Fehlanpassungen der SSR-Hydratation
- ** `shouldRerenderOnTransaction: false` ** – Leistungsoptimierung zur Reduzierung unnötiger erneuter Renderings
- **Barrierefreiheitsattribute** – Autovervollständigung, Autokorrektur und ARIA-Beschriftungen sind konfiguriert
- **Mindesthöhe** – `min-h-96` sorgt für einen nutzbaren Bearbeitungsbereich

## Zugriff auf die Editor-Instanz

### Mit `useTiptapEditor` Der primäre Hook für den Zugriff auf den Editor unterstützt sowohl direkte Injektion als auch Kontext-Fallback:

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

### Mit `useEditor` Ein einfacherer Haken, der unbedingt innerhalb von `EditorContextProvider` liegen muss:

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Inhaltssynchronisierung

Der `useEditorSync` -Hook übernimmt die bidirektionale Synchronisierung zwischen dem TipTap-Editor und dem Formularstatus. Dies ist wichtig für die Integration des Editors in Formulare, die von React-Status- oder Formularbibliotheken verwaltet werden.

### Grundlegende Synchronisierung

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

### Formularfeldsynchronisierung

Für Formulare mit mehreren Feldern bietet `useEditorFieldSync` eine Abkürzung:

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

### Synchronisierungsverhalten

| Richtung | Auslöser | Zustand |
|---|---|---|
| Formular an Herausgeber | `content` Requisitenänderungen | Nur wenn der Editor leer ist oder sich der Inhalt erheblich unterscheidet |
| Editor zum Formular | `update` und `blur` Ereignisse | Gibt immer den aktuellen HTML-Code an den Formularrückruf weiter

Der Hook vermeidet endlose Aktualisierungsschleifen, indem er vor dem Überschreiben prüft, ob der Editorinhalt leer oder wesentlich anders ist.

## Editor-Inhaltskomponente

Der `EditorContent` -Wrapper übernimmt den Zeilenumbruch und das ProseMirror-Styling:

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

Die Komponente wendet CSS-Regeln für den korrekten Textumbruch an:
- `break-words` auf dem ProseMirror-Container
- `whitespace-pre-wrap` zur Beibehaltung von Leerzeichen
- `overflow-wrap-anywhere` zur Verhinderung eines horizontalen Überlaufs

## Symbolleistenverwaltung

Der `useEditorToolbar` -Hook verwaltet den Symbolleistenstatus einschließlich der mobilen Reaktionsfähigkeit:

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

Die Symbolleiste unterstützt drei mobile Ansichtsmodi: `"main"` , `"highlighter"` und `"link"` .

## Bild hochladen

Der Editor unterstützt das Hochladen von Bildern über die Erweiterung `ImageUploadNode` :

| Einstellung | Wert |
|---|---|
| Akzeptierte Typen | `image/*` |
| Maximale Dateigröße | Definiert durch die `MAX_FILE_SIZE` -Konstante |
| Maximale Bilder pro Upload | 3 |
| Upload-Handler | `handleImageUpload` Utility-Funktion |

Bilder können per Drag-and-Drop oder über die Schaltfläche zum Hochladen der Symbolleiste hochgeladen werden.

## Schlüsseldateien

| Datei | Pfad |
|---|---|
| Editor-Anbieter | `lib/editor/providers/editor-provider.tsx` |
| TipTap-Editor-Hook | `lib/editor/hooks/use-tiptap-editor.ts` |
| Editor-Synchronisierungs-Hook | `lib/editor/hooks/use-editor-sync.ts` |
| Herausgeberinhalt | `lib/editor/contents/editor-content.tsx` |
| Symbolleistenhaken | `lib/editor/contents/use-editor-toolbar.ts` |
| Editor-Kontext-Hook | `lib/editor/hooks/use-editor.ts` |
