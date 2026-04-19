---
id: editor-extensions
title: "Rozszerzenia edytora"
sidebar_label: "Rozszerzenia edytora"
sidebar_position: 49
---

# Rozszerzenia edytora

## Przegląd

Moduł Editor Extensions zapewnia scentralizowany eksport beczkowy rozszerzeń edytora TipTap używanych w edytorze tekstu sformatowanego aplikacji. Łączy rozszerzenia formatowania, struktury i interakcji z ekosystemu TipTap w jeden punkt importu, zapewniając spójne możliwości edytora we wszystkich instancjach edytora w aplikacji.

## Architektura

Moduł (`lib/editor/extensions/index.tsx`) pełni funkcję agregatora reeksportu, który importuje poszczególne rozszerzenia TipTap i eksportuje je jako ujednolicony zestaw. Ten wzorzec umożliwia instancjom edytora importowanie wszystkich wymaganych rozszerzeń z jednego miejsca, zamiast rozpraszać importy zależności TipTap pomiędzy komponentami.

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

Rozszerzenia te są wykorzystywane przez komponenty edytora, które inicjują TipTap ze skonfigurowaną listą rozszerzeń.

## Dokumentacja API

### Eksport

Wszystkie eksporty są reeksportami klas/obiektów rozszerzeń TipTap. Każdy z nich można przekazać bezpośrednio do haka `useEditor()` programu TipTap lub konstruktora `Editor`.

#### `Selection`

Od `@tiptap/extensions`. Zapewnia obsługę zaznaczania tekstu i wizualne wskaźniki zaznaczania w edytorze.

#### `Highlight`

Od `@tiptap/extension-highlight`. Umożliwia podświetlanie tekstu za pomocą dostosowywalnych kolorów tła. Obsługuje wiele kolorów podświetlenia za pomocą znaczników.

#### `Superscript`

Od `@tiptap/extension-superscript`. Dodaje formatowanie tekstu w indeksie górnym (np. x^2).

#### `Subscript`

Od `@tiptap/extension-subscript`. Dodaje formatowanie tekstu indeksu dolnego (np. H~2~O).

#### `Typography`

Od `@tiptap/extension-typography`. Zapewnia automatyczne zamienniki typograficzne, takie jak inteligentne cudzysłowy, myślniki, elipsy i inne znaki typograficzne.

#### `HorizontalRule`

Od `@tiptap/extension-horizontal-rule`. Dodaje obsługę węzłów linii poziomej (dzielnika), renderowanej jako `<hr>` na wyjściu.

#### `TextAlign`

Od `@tiptap/extension-text-align`. Umożliwia kontrolę wyrównania tekstu (do lewej, do środka, do prawej, justowanie) w węzłach na poziomie bloku.

#### `TaskItem`

Od `@tiptap/extension-list`. Udostępnia węzły poszczególnych zadań/pola wyboru dla interaktywnych list zadań.

#### `TaskList`

Od `@tiptap/extension-list`. Udostępnia węzeł kontenera dla elementów zadań, renderując jako interaktywną listę kontrolną.

## Szczegóły wdrożenia

**Wzorzec eksportu beczki**: Moduł wykorzystuje nazwane reeksporty, aby utrzymać czystość powierzchni importu. Dzięki temu wstrząsanie drzewem działa prawidłowo — nieużywane rozszerzenia nie zostaną uwzględnione w pakiecie, jeśli nie zostaną zaimportowane przez komponent zużywający.

**Rozszerzenie pliku TSX**: Plik wykorzystuje `.tsx`, ponieważ jest częścią ekosystemu komponentów edytora i może w przyszłości zostać rozszerzony o zastąpienia komponentów React (niestandardowe widoki węzłów).

**Brak konfiguracji w beczce**: Rozszerzenia są eksportowane w ich domyślnej formie. Konfiguracja (taka jak `TextAlign.configure({ types: ['heading', 'paragraph'] })`) jest stosowana na poziomie instancji edytora, a nie w tym module.

## Konfiguracja

Rozszerzenia konfiguruje się podczas inicjalizacji edytora TipTap, a nie w tym module. Typowe konfiguracje obejmują:

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

## Przykłady użycia

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

## Najlepsze praktyki

- Zawsze importuj rozszerzenia z pakietów `@/lib/editor/extensions`, a nie bezpośrednio z pakietów `@tiptap/*`, aby zachować jedno źródło prawdy dla zestawu rozszerzeń redaktora.
- Skonfiguruj rozszerzenia na poziomie instancji edytora, a nie w module beczki, aby różne instancje edytora mogły korzystać z różnych konfiguracji.
- Dodając do projektu nowe rozszerzenia TipTap, dodaj je do eksportu beczki i udokumentuj je tutaj.
- Zachowaj minimalną listę rozszerzeń — uwzględniaj tylko rozszerzenia, które są faktycznie używane w aplikacji, aby zminimalizować rozmiar pakietu.
- Przetestuj nowe przedłużki w izolacji przed dodaniem ich do lufy, aby zapewnić kompatybilność z istniejącym zestawem przedłużającym.

## Powiązane moduły

- [Wzorce komponentów](/template/architecture/component-patterns) — Komponenty edytora korzystające z tych rozszerzeń
