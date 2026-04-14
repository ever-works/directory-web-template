---
id: editor-extensions
title: "Расширения редактора"
sidebar_label: "Расширения редактора"
sidebar_position: 49
---

# Расширения редактора

## Обзор

Модуль Editor Extensions обеспечивает централизованный экспорт расширений редактора TipTap, используемых в редакторе форматированного текста приложения. Он объединяет расширения форматирования, структуры и взаимодействия из экосистемы TipTap в единую точку импорта, обеспечивая согласованные возможности редактора во всех экземплярах редактора в приложении.

## Архитектура

Модуль (`lib/editor/extensions/index.tsx`) действует как агрегатор реэкспорта, который импортирует отдельные расширения TipTap и экспортирует их как единый набор. Этот шаблон позволяет экземплярам редактора импортировать все необходимые расширения из одного места, а не разбрасывать импорт зависимостей TipTap по компонентам.

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

Эти расширения используются компонентами редактора, которые инициализируют TipTap с настроенным списком расширений.

## Справочник по API

### Экспорт

Весь экспорт представляет собой реэкспорт классов/объектов расширения TipTap. Каждый из них можно передать непосредственно в перехватчик `useEditor()` TipTap или конструктор `Editor`.

#### `Selection`

От `@tiptap/extensions`. Обеспечивает обработку выделения текста и визуальные индикаторы выбора в редакторе.

#### `Highlight`

От `@tiptap/extension-highlight`. Включает выделение текста с помощью настраиваемых цветов фона. Поддерживает несколько цветов выделения с помощью меток.

#### `Superscript`

От `@tiptap/extension-superscript`. Добавляет форматирование текста надстрочным индексом (например, x^2).

#### `Subscript`

От `@tiptap/extension-subscript`. Добавляет форматирование текста с индексами (например, H~2~O).

#### `Typography`

От `@tiptap/extension-typography`. Обеспечивает автоматическую типографскую замену, например смарт-кавычки, длинное тире, многоточие и другие типографские символы.

#### `HorizontalRule`

От `@tiptap/extension-horizontal-rule`. Добавляет поддержку узла горизонтального правила (разделителя), отображаемого в выходных данных как `<hr>`.

#### `TextAlign`

От `@tiptap/extension-text-align`. Включает управление выравниванием текста (по левому краю, по центру, по правому краю, по ширине) на узлах уровня блока.

#### `TaskItem`

От `@tiptap/extension-list`. Предоставляет отдельные узлы элементов задач/флажков для интерактивных списков задач.

#### `TaskList`

От `@tiptap/extension-list`. Предоставляет узел контейнера для элементов задач, отображаемый в виде интерактивного контрольного списка.

## Детали реализации

**Шаблон экспорта стволов**: модуль использует именованный реэкспорт, чтобы поверхность импорта была чистой. Это позволяет корректной работе встряски деревьев — неиспользуемые расширения не будут включены в пакет, если они не импортированы потребляющим компонентом.

**Расширение файла TSX**: файл использует `.tsx`, поскольку он является частью экосистемы компонентов редактора и в будущем может быть расширен с помощью переопределений компонентов React (пользовательских представлений узлов).

**Без конфигурации**: расширения экспортируются в форме по умолчанию. Конфигурация (например, `TextAlign.configure({ types: ['heading', 'paragraph'] })`) применяется на уровне экземпляра редактора, а не в этом модуле.

## Конфигурация

Расширения настраиваются при инициализации редактора TipTap, а не в этом модуле. Общие конфигурации включают в себя:

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

## Примеры использования

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

## Лучшие практики

- Всегда импортируйте расширения из `@/lib/editor/extensions`, а не напрямую из пакетов `@tiptap/*`, чтобы поддерживать единый источник достоверной информации для набора расширений редактора.
- Настраивайте расширения на уровне экземпляра редактора, а не в модуле ствола, чтобы разные экземпляры редактора могли использовать разные конфигурации.
- При добавлении в проект новых расширений TipTap добавьте их в этот экспорт стволов и задокументируйте их здесь.
- Сохраняйте список расширений минимальным — включайте только те расширения, которые действительно используются в приложении, чтобы минимизировать размер пакета.
- Тестируйте новые расширения отдельно, прежде чем добавлять их в ствол, чтобы обеспечить совместимость с существующим набором расширений.

## Связанные модули

- [Шаблоны компонентов](/template/architecture/comComponent-patterns) — компоненты редактора, использующие эти расширения.
