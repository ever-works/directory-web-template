---
id: rich-text-editor
title: Editor di testo ricco
sidebar_label: Editor di testo ricco
sidebar_position: 12
---

# Editor di testo ricco

Il modello Ever Works include un editor di testo RTF completamente integrato basato su [TipTap](https://tiptap.dev/), un framework di editor senza testa costruito su ProseMirror. L'editor supporta la formattazione del contenuto, il caricamento di immagini, elenchi di attività e sincronizzazione bidirezionale con i dati del modulo.

## Panoramica dell'architettura

Il sistema editor è organizzato in una struttura modulare sotto `lib/editor/` :

| Directory/File | Scopo |
|---|---|
| `providers/editor-provider.tsx` | Provider di contesto React che inizializza l'editor TipTap con tutte le estensioni |
| `hooks/use-tiptap-editor.ts` | Hook per accedere all'istanza dell'editor dal contesto o direttamente dalla prop |
| `hooks/use-editor.ts` | Hook consumatore contesto semplificato |
| `hooks/use-editor-sync.ts` | Sincronizzazione bidirezionale tra editor e stato del modulo |
| `contents/editor-content.tsx` | Componente wrapper per il rendering dell'area contenuto dell'editor |
| `contents/use-editor-toolbar.ts` | Hook per la gestione dello stato della barra degli strumenti (mobile/desktop, visualizzazioni) |

## Estensioni TipTap

L'editor è configurato con un set completo di estensioni tramite `EditorContextProvider` :

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

### Riferimento all'estensione

| Estensione | Descrizione |
|---|---|
| `StarterKit` | Formattazione principale: grassetto, corsivo, titoli, elenchi, virgolette, blocchi di codice, collegamenti |
| `HorizontalRule` | Inserimento riga orizzontale personalizzata |
| `TextAlign` | Allineamento del testo (sinistra, centro, destra, giustifica) per intestazioni e paragrafi |
| `ImageUploadNode` | Caricamento di immagini tramite trascinamento con limiti di dimensione e restrizioni sul numero di file |
| `TaskList` / `TaskItem` | Elenchi interattivi di attività/caselle di controllo con supporto nidificato |
| `Highlight` | Evidenziazione del testo con supporto multicolore |
| `Image` | Incorporamento di immagini standard tramite `@tiptap/extension-image` |
| `Typography` | Sostituzioni tipografiche automatiche (virgolette intelligenti, trattini) |
| `Superscript` / `Subscript` | Formattazione del testo in apice e pedice |
| `Selection` | Gestione della selezione migliorata |

## Fornitore del contesto dell'editor

L'editor viene inizializzato tramite un provider di contesto React. Racchiudi l'albero dei componenti con `EditorContextProvider` per rendere disponibile l'editor:

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

Il provider crea l'editor con la seguente configurazione:

- ** `immediatelyRender: false` ** -- Previene la mancata corrispondenza dell'idratazione SSR
- ** `shouldRerenderOnTransaction: false` ** -- Ottimizzazione delle prestazioni per ridurre i re-render non necessari
- **Attributi di accessibilità**: completamento automatico, correzione automatica ed etichette ARIA sono configurate
- **Altezza minima** -- `min-h-96` garantisce un'area di modifica utilizzabile

## Accesso all'istanza dell'editor

### Usando `useTiptapEditor` L'hook principale per accedere all'editor supporta sia l'iniezione diretta che il fallback del contesto:

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

### Usando `useEditor` Un gancio più semplice che richiede rigorosamente di trovarsi all'interno di `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Sincronizzazione dei contenuti

L'hook `useEditorSync` gestisce la sincronizzazione bidirezionale tra l'editor TipTap e lo stato del modulo. Ciò è essenziale per integrare l'editor nei moduli gestiti dallo stato React o dalle librerie dei moduli.

### Sincronizzazione di base

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

### Sincronizzazione campo modulo

Per i moduli con più campi, `useEditorFieldSync` fornisce una scorciatoia:

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

### Comportamento di sincronizzazione

| Direzione | Trigger | Condizione |
|---|---|---|
| Modulo per l'editore | `content` modifiche all'elica | Solo quando l'editor è vuoto o il contenuto differisce in modo significativo |
| Redattore del modulo | Eventi `update` e `blur` | Propaga sempre l'HTML corrente nel modulo callback |

L'hook evita cicli di aggiornamento infiniti controllando se il contenuto dell'editor è vuoto o sostanzialmente diverso prima di sovrascriverlo.

## Componente contenuto dell'editor

Il wrapper `EditorContent` gestisce il ritorno a capo e lo stile ProseMirror:

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

Il componente applica le regole CSS per il corretto avvolgimento del testo:
- `break-words` sul contenitore ProseMirror
- `whitespace-pre-wrap` per preservare gli spazi bianchi
- `overflow-wrap-anywhere` per evitare traboccamenti orizzontali

## Gestione della barra degli strumenti

Il gancio `useEditorToolbar` gestisce lo stato della barra degli strumenti, inclusa la reattività mobile:

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

La barra degli strumenti supporta tre modalità di visualizzazione mobile: `"main"` , `"highlighter"` e `"link"` .

## Caricamento immagini

L'editor supporta il caricamento di immagini tramite l'estensione `ImageUploadNode` :

| Impostazione | Valore |
|---|---|
| Tipi accettati | `image/*` |
| Dimensione massima del file | Definito dalla costante `MAX_FILE_SIZE` |
| Numero massimo di immagini per caricamento | 3|
| Gestore caricamento | `handleImageUpload` funzione di utilità |

Le immagini possono essere caricate tramite trascinamento o tramite il pulsante di caricamento della barra degli strumenti.

## File chiave

| File | Percorso |
|---|---|
| Fornitore editore | `lib/editor/providers/editor-provider.tsx` |
| Gancio dell'editor TipTap | `lib/editor/hooks/use-tiptap-editor.ts` |
| Gancio di sincronizzazione dell'editor | `lib/editor/hooks/use-editor-sync.ts` |
| Contenuto dell'editore | `lib/editor/contents/editor-content.tsx` |
| Gancio della barra degli strumenti | `lib/editor/contents/use-editor-toolbar.ts` |
| Hook contesto editor | `lib/editor/hooks/use-editor.ts` |
