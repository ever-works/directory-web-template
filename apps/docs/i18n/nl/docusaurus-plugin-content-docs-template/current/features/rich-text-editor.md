---
id: rich-text-editor
title: Rich Text-editor
sidebar_label: Rich Text-editor
sidebar_position: 12
---

# Rich Text-editor

De Ever Works-sjabloon bevat een volledig geïntegreerde rich-text-editor, mogelijk gemaakt door [TipTap](https://tiptap.dev/), een hoofdloos editorframework dat bovenop ProseMirror is gebouwd. De editor ondersteunt inhoudsopmaak, uploads van afbeeldingen, takenlijsten en bidirectionele synchronisatie met formuliergegevens.

## Architectuuroverzicht

Het editorsysteem is modulair opgebouwd onder `lib/editor/` :

| Directory / Bestand | Doel |
|---|---|
| `providers/editor-provider.tsx` | Reageer contextprovider die de TipTap-editor initialiseert met alle extensies |
| `hooks/use-tiptap-editor.ts` | Hook voor toegang tot de editorinstantie vanuit context of directe prop |
| `hooks/use-editor.ts` | Vereenvoudigde context consumentenhaak |
| `hooks/use-editor-sync.ts` | Bidirectionele synchronisatie tussen editor en formulierstatus |
| `contents/editor-content.tsx` | Wrappercomponent voor het weergeven van het inhoudsgebied van de editor |
| `contents/use-editor-toolbar.ts` | Hook voor het beheren van de werkbalkstatus (mobiel/desktop, weergaven) |

## TipTap-extensies

De editor is geconfigureerd met een uitgebreide reeks extensies via de `EditorContextProvider` :

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

### Extensiereferentie

| Extensie | Beschrijving |
|---|---|
| `StarterKit` | Kernopmaak: vet, cursief, koppen, lijsten, blokcitaten, codeblokken, links |
| `HorizontalRule` | Aangepaste horizontale regelinvoeging |
| `TextAlign` | Tekstuitlijning (links, midden, rechts, uitvullen) voor koppen en alinea's |
| `ImageUploadNode` | Uploaden van afbeeldingen via slepen en neerzetten met maximale grootte en beperkingen voor het aantal bestanden |
| `TaskList` / `TaskItem` | Interactieve taken-/selectievakjeslijsten met geneste ondersteuning |
| `Highlight` | Tekstmarkering met ondersteuning voor meerdere kleuren |
| `Image` | Standaard afbeelding insluiten via `@tiptap/extension-image` |
| `Typography` | Automatische typografische vervangingen (slimme aanhalingstekens, streepjes) |
| `Superscript` / `Subscript` | Superscript- en subscript-tekstopmaak |
| `Selection` | Verbeterde selectieverwerking |

## Editor-contextprovider

De editor wordt geïnitialiseerd via een React-contextprovider. Verpak uw componentenboom met `EditorContextProvider` om de editor beschikbaar te maken:

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

De provider maakt de editor met de volgende configuratie:

- ** `immediatelyRender: false` ** -- Voorkomt verkeerde SSR-hydratatie
- ** `shouldRerenderOnTransaction: false` ** -- Prestatie-optimalisatie om onnodige herweergave te verminderen
- **Toegankelijkheidsattributen** -- Autoaanvullen, autocorrectie en ARIA-labels zijn geconfigureerd
- **Minimale hoogte** -- `min-h-96` zorgt voor een bruikbaar bewerkingsgebied

## Toegang tot de Editor-instantie

### Gebruik `useTiptapEditor` De primaire hook voor toegang tot de editor ondersteunt zowel directe injectie als contextfallback:

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

### Met `useEditor` Een eenvoudiger haak die strikt vereist dat je binnen de `EditorContextProvider` blijft:

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Inhoudsynchronisatie

De `useEditorSync` -haak verzorgt de bidirectionele synchronisatie tussen de TipTap-editor en de formulierstatus. Dit is essentieel voor het integreren van de editor in formulieren die worden beheerd door React-status- of formulierbibliotheken.

### Basissynchronisatie

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

### Formulierveldsynchronisatie

Voor formulieren met meerdere velden geeft `useEditorFieldSync` een afkorting:

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

### Synchronisatiegedrag

| Richting | Trigger | Conditie |
|---|---|---|
| Formulier naar redacteur | `content` propwijzigingen | Alleen als de editor leeg is of de inhoud aanzienlijk verschilt |
| Editor voor formulier | `update` en `blur` evenementen | Geeft altijd de huidige HTML door aan het formulier callback |

De hook vermijdt oneindige updateloops door te controleren of de editorinhoud leeg is of substantieel anders is voordat deze wordt overschreven.

## Editor-inhoudscomponent

De `EditorContent` -wrapper zorgt voor tekstterugloop en ProseMirror-stijl:

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

De component past CSS-regels toe voor de juiste tekstterugloop:
- `break-words` op de ProseMirror-container
- `whitespace-pre-wrap` voor het behouden van witruimte
- `overflow-wrap-anywhere` ter voorkoming van horizontale overstroming

## Werkbalkbeheer

De `useEditorToolbar` -haak beheert de status van de werkbalk, inclusief mobiel reactievermogen:

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

De werkbalk ondersteunt drie mobiele weergavemodi: `"main"` , `"highlighter"` en `"link"` .

## Afbeelding uploaden

De editor ondersteunt het uploaden van afbeeldingen via de `ImageUploadNode` -extensie:

| Instelling | Waarde |
|---|---|
| Geaccepteerde typen | `image/*` |
| Maximale bestandsgrootte | Gedefinieerd door `MAX_FILE_SIZE` constante |
| Max. aantal afbeeldingen per upload | 3 |
| Uploadhandler | `handleImageUpload` nutsfunctie |

Afbeeldingen kunnen worden geüpload via slepen en neerzetten of via de uploadknop op de werkbalk.

## Sleutelbestanden

| Bestand | Pad |
|---|---|
| Editoraanbieder | `lib/editor/providers/editor-provider.tsx` |
| TipTap Editor-haak | `lib/editor/hooks/use-tiptap-editor.ts` |
| Editor Sync-hook | `lib/editor/hooks/use-editor-sync.ts` |
| Editorinhoud | `lib/editor/contents/editor-content.tsx` |
| Werkbalkhaak | `lib/editor/contents/use-editor-toolbar.ts` |
| Editor Context Hook | `lib/editor/hooks/use-editor.ts` |
