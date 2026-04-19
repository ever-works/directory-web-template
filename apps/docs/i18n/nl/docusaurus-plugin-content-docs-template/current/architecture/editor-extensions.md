---
id: editor-extensions
title: "Editor-extensies"
sidebar_label: "Editor-extensies"
sidebar_position: 49
---

# Editor-extensies

## Overzicht

De Editor Extensions-module biedt een gecentraliseerde export van TipTap-editorextensies die worden gebruikt in de rich text-editor van de toepassing. Het bundelt opmaak-, structurele- en interactie-uitbreidingen van het TipTap-ecosysteem in één enkel importpunt, waardoor consistente editormogelijkheden voor alle editorinstanties in de applicatie worden gegarandeerd.

## Architectuur

De module (`lib/editor/extensions/index.tsx`) fungeert als een herexportaggregator die individuele TipTap-extensies importeert en deze exporteert als een uniforme set. Met dit patroon kunnen editorinstanties alle vereiste extensies vanaf één locatie importeren in plaats van de import van TipTap-afhankelijkheid over componenten te verspreiden.

```
lib/editor/extensions/
  |-- index.tsx
      |-- TaskItem, TaskList     (from @tiptap/extension-list)
      |-- TextAlign              (from @tiptap/extension-text-align)
      |-- HorizontalRule         (from @tiptap/extension-horizontal-rule)
      |-- Typography             (from @tiptap/extension-typography)
      |-- Subscript              (from @tiptap/extension-subscript)
      |-- Superscript            (from @tiptap/extension-superscript)
      |-- Selection              (from @tiptap/extensions)
      |-- Highlight              (from @tiptap/extension-highlight)
```

Deze extensies worden gebruikt door de editorcomponenten die TipTap initialiseren met een geconfigureerde extensielijst.

## API-referentie

### Exporteert

Alle exports zijn herexports van TipTap-extensieklassen/objecten. Elk kan rechtstreeks worden doorgegeven aan TipTap's `useEditor()` hook of `Editor` constructor.

#### `Selection`

Van `@tiptap/extensions`. Biedt verwerking van tekstselectie en visuele selectie-indicatoren in de editor.

#### `Highlight`

Van `@tiptap/extension-highlight`. Maakt tekstmarkering mogelijk met aanpasbare achtergrondkleuren. Ondersteunt meerdere markeringskleuren via markeringen.

#### `Superscript`

Van `@tiptap/extension-superscript`. Voegt superscript-tekstopmaak toe (bijvoorbeeld x^2).

#### `Subscript`

Van `@tiptap/extension-subscript`. Voegt subscript-tekstopmaak toe (bijvoorbeeld H~2~O).

#### `Typography`

Van `@tiptap/extension-typography`. Biedt automatische typografische vervangingen, zoals slimme aanhalingstekens, em-streepjes, ellipsen en andere typografische tekens.

#### `HorizontalRule`

Van `@tiptap/extension-horizontal-rule`. Voegt ondersteuning voor knooppunten met horizontale regels (verdelers) toe, weergegeven als `<hr>` in de uitvoer.

#### `TextAlign`

Van `@tiptap/extension-text-align`. Maakt controle van de tekstuitlijning mogelijk (links, midden, rechts, uitvullen) op knooppunten op blokniveau.

#### `TaskItem`

Van `@tiptap/extension-list`. Biedt individuele taak-/selectievakje-itemknooppunten voor interactieve takenlijsten.

#### `TaskList`

Van `@tiptap/extension-list`. Biedt het containerknooppunt voor taakitems en wordt weergegeven als een interactieve checklist.

## Implementatiedetails

**Vatexportpatroon**: De module gebruikt benoemde herexports om het importoppervlak schoon te houden. Hierdoor werkt het schudden van bomen correct: ongebruikte extensies worden niet in de bundel opgenomen als ze niet door de consumerende component worden geïmporteerd.

**TSX-bestandsextensie**: het bestand gebruikt `.tsx` omdat het deel uitmaakt van het ecosysteem van de editorcomponent en in de toekomst mogelijk wordt uitgebreid met React-componentoverschrijvingen (aangepaste knooppuntweergaven).

**Geen configuratie in de loop**: de extensies worden in hun standaardvorm geëxporteerd. Configuratie (zoals `TextAlign.configure({ types: ['heading', 'paragraph'] })`) wordt toegepast op het niveau van de editorinstantie, niet in deze module.

## Configuratie

Extensies worden geconfigureerd bij het initialiseren van de TipTap-editor, niet in deze module. Veel voorkomende configuraties zijn onder meer:

```typescript
TextAlign.configure({
  types: ['heading', 'paragraph'],
  alignments: ['left', 'center', 'right', 'justify'],
})

Highlight.configure({
  multicolor: true,
})

TaskItem.configure({
  nested: true,
})
```

## Gebruiksvoorbeelden

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Selection,
  Highlight,
  Superscript,
  Subscript,
  Typography,
  HorizontalRule,
  TextAlign,
  TaskItem,
  TaskList,
} from '@/lib/editor/extensions';

function RichTextEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Selection,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}

// Using individual extensions for a minimal editor
import { Typography, Highlight } from '@/lib/editor/extensions';

function SimpleEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}
```

## Beste praktijken

- Importeer extensies altijd vanuit `@/lib/editor/extensions` in plaats van rechtstreeks vanuit `@tiptap/*`-pakketten om één enkele bron van waarheid te behouden voor de extensieset van de editor.
- Configureer extensies op het niveau van de editorinstantie, niet in de vatmodule, zodat verschillende editorinstanties verschillende configuraties kunnen gebruiken.
- Wanneer u nieuwe TipTap-extensies aan het project toevoegt, voegt u deze toe aan deze vatexport en documenteert u ze hier.
- Houd de extensielijst minimaal: neem alleen extensies op die daadwerkelijk in de applicatie worden gebruikt om de bundelgrootte te minimaliseren.
- Test nieuwe uitbreidingen afzonderlijk voordat u ze aan de cilinder toevoegt, om compatibiliteit met de bestaande uitbreidingsset te garanderen.

## Gerelateerde modules

- [Componentpatronen](/template/architecture/component-patterns) - Editorcomponenten die deze extensies gebruiken
