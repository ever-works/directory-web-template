---
id: editor-extensions
title: "Editor-Erweiterungen"
sidebar_label: "Editor-Erweiterungen"
sidebar_position: 49
---

# Editor-Erweiterungen

## Übersicht

Das Modul „Editor-Erweiterungen“ bietet einen zentralisierten Barrel-Export von TipTap-Editor-Erweiterungen, die im Rich-Text-Editor der Anwendung verwendet werden. Es bündelt Formatierungs-, Struktur- und Interaktionserweiterungen aus dem TipTap-Ökosystem in einem einzigen Importpunkt und gewährleistet so konsistente Editorfunktionen über alle Editorinstanzen in der Anwendung hinweg.

## Architektur

Das Modul (`lib/editor/extensions/index.tsx`) fungiert als Re-Export-Aggregator, der einzelne TipTap-Erweiterungen importiert und sie als einheitliches Set exportiert. Dieses Muster ermöglicht es Editor-Instanzen, alle erforderlichen Erweiterungen von einem Ort zu importieren, anstatt TipTap-Abhängigkeitsimporte auf mehrere Komponenten zu verteilen.

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

Diese Erweiterungen werden von den Editorkomponenten genutzt, die TipTap mit einer konfigurierten Erweiterungsliste initialisieren.

## API-Referenz

### Exporte

Alle Exporte sind Reexporte von TipTap-Erweiterungsklassen/-objekten. Jeder kann direkt an den `useEditor()` Hook oder den `Editor` Konstruktor von TipTap übergeben werden.

#### `Selection`

Ab `@tiptap/extensions`. Bietet die Handhabung der Textauswahl und visuelle Auswahlindikatoren im Editor.

#### `Highlight`

Ab `@tiptap/extension-highlight`. Ermöglicht die Texthervorhebung mit anpassbaren Hintergrundfarben. Unterstützt mehrere Hervorhebungsfarben über Markierungen.

#### `Superscript`

Ab `@tiptap/extension-superscript`. Fügt hochgestellte Textformatierung hinzu (z. B. x^2).

#### `Subscript`

Ab `@tiptap/extension-subscript`. Fügt eine tiefgestellte Textformatierung hinzu (z. B. H~2~O).

#### `Typography`

Ab `@tiptap/extension-typography`. Bietet automatische typografische Ersetzungen wie Anführungszeichen, Gedankenstriche, Ellipsen und andere typografische Zeichen.

#### `HorizontalRule`

Ab `@tiptap/extension-horizontal-rule`. Fügt Unterstützung für horizontale Regelknoten (Teiler) hinzu, die in der Ausgabe als `<hr>` gerendert werden.

#### `TextAlign`

Ab `@tiptap/extension-text-align`. Aktiviert die Steuerung der Textausrichtung (links, zentriert, rechts, Blocksatz) auf Knoten auf Blockebene.

#### `TaskItem`

Ab `@tiptap/extension-list`. Stellt einzelne Aufgaben-/Kontrollkästchenelementknoten für interaktive Aufgabenlisten bereit.

#### `TaskList`

Ab `@tiptap/extension-list`. Stellt den Containerknoten für Aufgabenelemente bereit und wird als interaktive Checkliste dargestellt.

## Implementierungsdetails

**Fass-Exportmuster**: Das Modul verwendet benannte Re-Exporte, um die Importoberfläche sauber zu halten. Dadurch kann Tree-Shaking ordnungsgemäß funktionieren – ungenutzte Erweiterungen werden nicht in das Bundle aufgenommen, wenn sie nicht von der verbrauchenden Komponente importiert werden.

**TSX-Dateierweiterung**: Die Datei verwendet `.tsx`, da sie Teil des Editor-Komponenten-Ökosystems ist und in Zukunft möglicherweise um React-Komponentenüberschreibungen (benutzerdefinierte Knotenansichten) erweitert wird.

**Keine Konfiguration im Lauf**: Die Erweiterungen werden in ihrer Standardform exportiert. Die Konfiguration (z. B. `TextAlign.configure({ types: ['heading', 'paragraph'] })`) wird auf der Ebene der Editorinstanz angewendet, nicht in diesem Modul.

## Konfiguration

Erweiterungen werden bei der Initialisierung des TipTap-Editors konfiguriert, nicht in diesem Modul. Zu den gängigen Konfigurationen gehören:

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

## Anwendungsbeispiele

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

## Best Practices

- Importieren Sie Erweiterungen immer aus `@/lib/editor/extensions` und nicht direkt aus `@tiptap/*`-Paketen, um eine einzige Quelle der Wahrheit für den Erweiterungssatz des Herausgebers zu erhalten.
- Konfigurieren Sie Erweiterungen auf der Ebene der Editorinstanz, nicht im Barrel-Modul, sodass verschiedene Editorinstanzen unterschiedliche Konfigurationen verwenden können.
- Wenn Sie dem Projekt neue TipTap-Erweiterungen hinzufügen, fügen Sie diese diesem Barrel-Export hinzu und dokumentieren Sie sie hier.
- Halten Sie die Erweiterungsliste minimal – schließen Sie nur Erweiterungen ein, die tatsächlich in der Anwendung verwendet werden, um die Bundle-Größe zu minimieren.
- Testen Sie neue Erweiterungen isoliert, bevor Sie sie dem Lauf hinzufügen, um die Kompatibilität mit dem vorhandenen Erweiterungssatz sicherzustellen.

## Verwandte Module

- [Komponentenmuster](/template/architecture/component-patterns) – Editorkomponenten, die diese Erweiterungen nutzen
