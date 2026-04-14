---
id: editor-extensions
title: "Estensioni dell'editor"
sidebar_label: "Estensioni dell'editor"
sidebar_position: 49
---

# Estensioni dell'editor

## Panoramica

Il modulo Estensioni dell'editor fornisce un'esportazione centralizzata delle estensioni dell'editor TipTap utilizzate nell'editor di testo RTF dell'applicazione. Raggruppa estensioni di formattazione, struttura e interazione dall'ecosistema TipTap in un unico punto di importazione, garantendo funzionalità di editor coerenti in tutte le istanze di editor nell'applicazione.

## Architettura

Il modulo (`lib/editor/extensions/index.tsx`) funge da aggregatore di riesportazione che importa singole estensioni TipTap e le esporta come un set unificato. Questo modello consente alle istanze dell'editor di importare tutte le estensioni richieste da una posizione anziché distribuire le importazioni delle dipendenze TipTap tra i componenti.

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

Queste estensioni vengono utilizzate dai componenti dell'editor che inizializzano TipTap con un elenco di estensioni configurato.

## Riferimento API

### Esportazioni

Tutte le esportazioni sono riesportazioni di classi/oggetti di estensione TipTap. Ciascuno può essere passato direttamente all'hook `useEditor()` di TipTap o al costruttore `Editor`.

#### `Selection`

Da `@tiptap/extensions`. Fornisce la gestione della selezione del testo e indicatori visivi di selezione nell'editor.

#### `Highlight`

Da `@tiptap/extension-highlight`. Abilita l'evidenziazione del testo con colori di sfondo personalizzabili. Supporta più colori di evidenziazione tramite segni.

#### `Superscript`

Da `@tiptap/extension-superscript`. Aggiunge la formattazione del testo in apice (ad esempio x^2).

#### `Subscript`

Da `@tiptap/extension-subscript`. Aggiunge la formattazione del testo in pedice (ad esempio, H~2~O).

#### `Typography`

Da `@tiptap/extension-typography`. Fornisce sostituzioni tipografiche automatiche come virgolette inglesi, trattini, puntini di sospensione e altri caratteri tipografici.

#### `HorizontalRule`

Da `@tiptap/extension-horizontal-rule`. Aggiunge il supporto del nodo della regola orizzontale (divisore), reso come `<hr>` nell'output.

#### `TextAlign`

Da `@tiptap/extension-text-align`. Abilita il controllo dell'allineamento del testo (sinistra, centro, destra, giustifica) sui nodi a livello di blocco.

#### `TaskItem`

Da `@tiptap/extension-list`. Fornisce singoli nodi di attività/caselle di controllo per elenchi di attività interattive.

#### `TaskList`

Da `@tiptap/extension-list`. Fornisce il nodo contenitore per gli elementi dell'attività, visualizzandoli come un elenco di controllo interattivo.

## Dettagli di implementazione

**Modello di esportazione barile**: il modulo utilizza riesportazioni con nome per mantenere pulita la superficie di importazione. Ciò consente allo scuotimento degli alberi di funzionare correttamente: le estensioni inutilizzate non verranno incluse nel pacchetto se non vengono importate dal componente di consumo.

**Estensione file TSX**: il file utilizza `.tsx` perché fa parte dell'ecosistema del componente editor e potrebbe essere esteso in futuro con le sostituzioni del componente React (visualizzazioni dei nodi personalizzate).

**Nessuna configurazione nel barile**: le estensioni vengono esportate nella loro forma predefinita. La configurazione (come `TextAlign.configure({ types: ['heading', 'paragraph'] })`) viene applicata a livello di istanza dell'editor, non in questo modulo.

## Configurazione

Le estensioni vengono configurate durante l'inizializzazione dell'editor TipTap, non in questo modulo. Le configurazioni comuni includono:

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

## Esempi di utilizzo

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

## Migliori pratiche

- Importa sempre le estensioni dai pacchetti `@/lib/editor/extensions` anziché direttamente dai pacchetti `@tiptap/*` per mantenere un'unica fonte attendibile per il set di estensioni dell'editor.
- Configura le estensioni a livello di istanza dell'editor, non nel modulo barile, in modo che diverse istanze dell'editor possano utilizzare configurazioni diverse.
- Quando aggiungi nuove estensioni TipTap al progetto, aggiungile a questa esportazione di barili e documentale qui.
- Mantieni l'elenco delle estensioni al minimo: includi solo le estensioni effettivamente utilizzate nell'applicazione per ridurre al minimo le dimensioni del pacchetto.
- Testare le nuove estensioni separatamente prima di aggiungerle alla canna per garantire la compatibilità con il set di estensioni esistente.

## Moduli correlati

- [Component Patterns](/template/architecture/component-patterns) - Componenti dell'editor che utilizzano queste estensioni
