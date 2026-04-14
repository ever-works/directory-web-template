---
id: editor-extensions
title: "Разширения на редактора"
sidebar_label: "Разширения на редактора"
sidebar_position: 49
---

# Разширения на редактора

## Преглед

Модулът Editor Extensions предоставя централизиран барел експорт на разширения за редактор на TipTap, използвани в редактора за форматиран текст на приложението. Той обединява разширения за форматиране, структура и взаимодействие от екосистемата TipTap в една точка за импортиране, осигурявайки последователни възможности за редактор във всички копия на редактора в приложението.

## Архитектура

Модулът (`lib/editor/extensions/index.tsx`) действа като агрегатор за реекспорт, който импортира индивидуални разширения на TipTap и ги експортира като обединен набор. Този модел позволява на екземплярите на редактора да импортират всички необходими разширения от едно място, вместо да разпръскват импортиранията на зависимост от TipTap между компонентите.

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

Тези разширения се използват от компонентите на редактора, които инициализират TipTap с конфигуриран списък с разширения.

## Справка за API

### Износ

Всички експорти са реекспорти на класове/обекти на разширение на TipTap. Всеки може да бъде предаден директно към `useEditor()` куката на TipTap или `Editor` конструктора.

#### `Selection`

От `@tiptap/extensions`. Осигурява обработка на избор на текст и визуални индикатори за избор в редактора.

#### `Highlight`

От `@tiptap/extension-highlight`. Позволява маркиране на текст с персонализирани цветове на фона. Поддържа множество цветове за подчертаване чрез маркировки.

#### `Superscript`

От `@tiptap/extension-superscript`. Добавя форматиране на горен индекс на текст (напр. x^2).

#### `Subscript`

От `@tiptap/extension-subscript`. Добавя форматиране на долен текст (напр. H~2~O).

#### `Typography`

От `@tiptap/extension-typography`. Осигурява автоматични типографски замествания като интелигентни кавички, EM тирета, елипси и други типографски знаци.

#### `HorizontalRule`

От `@tiptap/extension-horizontal-rule`. Добавя поддръжка на възел за хоризонтална линия (разделител), изобразен като `<hr>` в изхода.

#### `TextAlign`

От `@tiptap/extension-text-align`. Разрешава контрол на подравняването на текста (ляво, централно, дясно, подравняване) на възли на ниво блок.

#### `TaskItem`

От `@tiptap/extension-list`. Осигурява индивидуални възли на задача/отметка в полето за интерактивни списъци със задачи.

#### `TaskList`

От `@tiptap/extension-list`. Осигурява възела на контейнера за елементи на задача, изобразявайки се като интерактивен контролен списък.

## Подробности за изпълнението

**Барелен експортен модел**: Модулът използва наименувани реекспорти, за да поддържа импортираната повърхност чиста. Това позволява разклащането на дърво да работи правилно -- неизползваните разширения няма да бъдат включени в пакета, ако не са импортирани от консумиращия компонент.

**TSX файлово разширение**: Файлът използва `.tsx`, тъй като е част от екосистемата на компонента на редактора и може да бъде разширен с отмени на React компонент (изгледи по избор на възел) в бъдеще.

**Няма конфигурация в цевта**: Разширенията се експортират във формата им по подразбиране. Конфигурация (като `TextAlign.configure({ types: ['heading', 'paragraph'] })`) се прилага на ниво инстанция на редактора, а не в този модул.

## Конфигурация

Разширенията се конфигурират при инициализиране на редактора TipTap, а не в този модул. Общите конфигурации включват:

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

## Примери за използване

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

## Най-добри практики

- Винаги импортирайте разширения от `@/lib/editor/extensions`, а не директно от `@tiptap/*` пакети, за да поддържате един източник на истина за набора разширения на редактора.
- Конфигурирайте разширения на ниво екземпляр на редактора, а не в модула на варела, така че различните екземпляри на редактор да могат да използват различни конфигурации.
- Когато добавяте нови разширения на TipTap към проекта, добавете ги към този експорт на варел и ги документирайте тук.
- Поддържайте списъка с разширения минимален -- включете само разширения, които действително се използват в приложението, за да минимизирате размера на пакета.
- Тествайте новите разширения изолирано, преди да ги добавите към цевта, за да осигурите съвместимост със съществуващия комплект разширения.

## Свързани модули

- [Образци на компоненти](/template/architecture/component-patterns) -- Компоненти на редактора, които използват тези разширения
