---
id: rich-text-editor
title: Редактор форматированного текста
sidebar_label: Редактор форматированного текста
sidebar_position: 12
---

# Редактор форматированного текста

Шаблон Ever Works включает в себя полностью интегрированный редактор форматированного текста на базе [TipTap](https://tiptap.dev/), платформы безголового редактора, созданной на основе ProseMirror. Редактор поддерживает форматирование контента, загрузку изображений, списки задач и двунаправленную синхронизацию с данными формы.

## Обзор архитектуры

Система редактора организована в модульную структуру под `lib/editor/` :

| Каталог/Файл | Цель |
|---|---|
| `providers/editor-provider.tsx` | Поставщик контекста React, который инициализирует редактор TipTap со всеми расширениями |
| `hooks/use-tiptap-editor.ts` | Хук для доступа к экземпляру редактора из контекста или прямого доступа |
| `hooks/use-editor.ts` | Упрощенный контекстный потребительский крючок |
| `hooks/use-editor-sync.ts` | Двунаправленная синхронизация между редактором и состоянием формы |
| `contents/editor-content.tsx` | Компонент-оболочка для рендеринга области содержимого редактора |
| `contents/use-editor-toolbar.ts` | Хук для управления состоянием панели инструментов (мобильный/настольный компьютер, представления) |

## Расширения TipTap

Редактор настраивается с помощью полного набора расширений через `EditorContextProvider` :

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

### Справочник расширений

| Расширение | Описание |
|---|---|
| `StarterKit` | Основное форматирование: жирный шрифт, курсив, заголовки, списки, кавычки, блоки кода, ссылки |
| `HorizontalRule` | Вставка пользовательской горизонтальной линейки |
| `TextAlign` | Выравнивание текста (слева, по центру, справа, по ширине) для заголовков и абзацев |
| `ImageUploadNode` | Загрузка изображений методом перетаскивания с ограничениями по размеру и количеству файлов |
| `TaskList` / `TaskItem` | Интерактивные списки задач/флажков с вложенной поддержкой |
| `Highlight` | Выделение текста с поддержкой многоцветности |
| `Image` | Стандартное встраивание изображений с помощью `@tiptap/extension-image` |
| `Typography` | Автоматические типографские замены (умные кавычки, тире) |
| `Superscript` / `Subscript` | Форматирование текста надстрочным и подстрочным индексом |
| `Selection` | Улучшенная обработка выбора |

## Поставщик контекста редактора

Редактор инициализируется через поставщика контекста React. Оберните дерево компонентов `EditorContextProvider` , чтобы сделать редактор доступным:

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

Провайдер создает редактор со следующей конфигурацией:

- ** `immediatelyRender: false` ** -- Предотвращает несоответствие гидратации SSR
- ** `shouldRerenderOnTransaction: false` ** -- Оптимизация производительности для уменьшения ненужных повторных рендерингов.
– **Атрибуты доступности** – настроены автозаполнение, автозамена и метки ARIA.
- **Минимальная высота** -- `min-h-96` обеспечивает удобную область редактирования.

## Доступ к экземпляру редактора

### Использование `useTiptapEditor` Основной хук для доступа к редактору поддерживает как прямое внедрение, так и откат контекста:

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

### Использование `useEditor` Более простой хук, который строго требует находиться внутри `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Синхронизация контента

Хук `useEditorSync` обеспечивает двунаправленную синхронизацию между редактором TipTap и состоянием формы. Это важно для интеграции редактора в формы, управляемые библиотеками состояний или форм React.

### Базовая синхронизация

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

### Синхронизация полей формы

Для форм с несколькими полями `useEditorFieldSync` представляет собой сокращение:

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

### Поведение синхронизации

| Направление | Триггер | Состояние |
|---|---|---|
| Форма для редактора | `content` изменения реквизита | Только когда редактор пуст или содержимое существенно отличается |
| Редактор формы | `update` и `blur` события | Всегда передает текущий HTML в обратный вызов формы |

Этот хук позволяет избежать бесконечных циклов обновления, проверяя, является ли содержимое редактора пустым или существенно отличается перед перезаписью.

## Компонент содержимого редактора

Обертка `EditorContent` обрабатывает перенос слов и стилизацию ProseMirror:

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

Компонент применяет правила CSS для правильного переноса текста:
- `break-words` в контейнере ProseMirror
- `whitespace-pre-wrap` для сохранения пробелов
- `overflow-wrap-anywhere` для предотвращения горизонтального перелива

## Управление панелью инструментов

Хук `useEditorToolbar` управляет состоянием панели инструментов, включая отзывчивость мобильных устройств:

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

Панель инструментов поддерживает три режима просмотра для мобильных устройств: `"main"` , `"highlighter"` и `"link"` .

## Загрузка изображения

Редактор поддерживает загрузку изображений через расширение `ImageUploadNode` :

| Настройка | Значение |
|---|---|
| Допустимые типы | `image/*` |
| Максимальный размер файла | Определяется константой `MAX_FILE_SIZE` |
| Максимальное количество изображений на загрузку | 3 |
| Обработчик загрузки | `handleImageUpload` служебная функция |

Изображения можно загружать с помощью перетаскивания или кнопки загрузки на панели инструментов.

## Ключевые файлы

| Файл | Путь |
|---|---|
| Поставщик редактора | `lib/editor/providers/editor-provider.tsx` |
| Крючок редактора TipTap | `lib/editor/hooks/use-tiptap-editor.ts` |
| Редактор синхронизации | `lib/editor/hooks/use-editor-sync.ts` |
| Редактор контента | `lib/editor/contents/editor-content.tsx` |
| Панель инструментов Крючок | `lib/editor/contents/use-editor-toolbar.ts` |
| Контекстный крючок редактора | `lib/editor/hooks/use-editor.ts` |
