---
id: editor-system-deep-dive
title: Подробное описание системы редактора форматированного текста
sidebar_label: Система редактора
sidebar_position: 7
---

# Глубокое погружение в систему редактора форматированного текста

В этом руководстве рассматривается система редактора форматированного текста на основе TipTap, включая настройку расширений, настраиваемые узлы, архитектуру панели инструментов, обработку изображений и синхронизацию форм.

## Обзор архитектуры

```
Editor System Architecture
============================

  EditorContextProvider
  |
  +-- useEditor() hook      <-- StarterKit + extensions
  |
  +-- EditorContent          <-- TipTap EditorContent wrapper
  |   |
  |   +-- ToolbarContent     <-- Modular toolbar components
  |   |   |
  |   |   +-- HeadingDropdownMenu
  |   |   +-- ListDropdownMenu
  |   |   +-- MarkButton (bold, italic, strike, etc.)
  |   |   +-- TextAlignButton
  |   |   +-- ImageUploadButton
  |   |   +-- LinkPopover
  |   |   +-- ColorHighlightPopover
  |   |   +-- UndoRedoButton
  |   |
  |   +-- ProseMirror (content area)
  |
  +-- useEditorSync()        <-- Bidirectional form sync
  |
  +-- Custom Node Extensions
      |
      +-- ImageUploadNode
      +-- HorizontalRuleNode
```

## Конфигурация расширения

Редактор настроен в `lib/editor/providers/editor-provider.tsx` с полным набором расширений:

```typescript
// lib/editor/providers/editor-provider.tsx
const extensions = useMemo(() => [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ImageUploadNode.configure({
    accept: 'image/*',
    maxSize: MAX_FILE_SIZE,   // 5MB
    limit: 3,
    upload: handleImageUpload,
    onError: (error) => console.error('Upload failed:', error),
  }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  Image,
  Typography,
  Superscript,
  Subscript,
  Selection,
], []);
```

### Справочник расширений

| Расширение | Источник | Цель |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | База: абзацы, заголовки, списки, код, жирный, курсив |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Горизонтальные разделители |
| `TextAlign` | `@tiptap/extension-text-align` | Слева, по центру, справа, выравнивание по ширине |
| `ImageUploadNode` | Пользовательский | Загрузка изображений с помощью перетаскивания |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Списки задач флажков (вложенные) |
| `Highlight` | `@tiptap/extension-highlight` | Многоцветная подсветка текста |
| `Image` | `@tiptap/extension-image` | Встроенное отображение изображений |
| `Typography` | `@tiptap/extension-typography` | Умные кавычки, тире, многоточие |
| `Superscript` | `@tiptap/extension-superscript` | Надстрочный текст |
| `Subscript` | `@tiptap/extension-subscript` | Подстрочный текст |
| `Selection` | `@tiptap/extensions` | Улучшенная обработка выбора |

## Поставщик редактора

Экземпляр редактора создается через контекст React для доступа ко всему приложению:

```typescript
// lib/editor/providers/editor-provider.tsx
export const EditorContext = createContext<Editor | null>(null);

export function EditorContextProvider({ children }) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: 'on',
        autocorrect: 'on',
        autocapitalize: 'off',
        'aria-label': 'Main content area, start typing to enter text.',
        class: cn('min-h-96'),
      },
    },
    extensions,
  });

  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
```

### Оптимизация производительности

- ** `immediatelyRender: false` **: Предотвращает несоответствие гидратации в SSR.
- ** `shouldRerenderOnTransaction: false` **: уменьшает количество повторных рендерингов React при каждом нажатии клавиши. Только изменения состояния панели инструментов вызывают повторную отрисовку.

## Пользовательские хуки

### `useTiptapEditor` Предоставляет доступ к экземпляру редактора из контекста или напрямую:

```typescript
// lib/editor/hooks/use-tiptap-editor.ts
export function useTiptapEditor(providedEditor?: Editor | null) {
  const { editor: coreEditor } = useCurrentEditor();
  const mainEditor = useMemo(
    () => providedEditor || coreEditor,
    [providedEditor, coreEditor]
  );

  const editorState = useEditorState({
    editor: mainEditor,
    selector(context) {
      return {
        editor: context.editor,
        editorState: context.editor?.state,
        canCommand: context.editor?.can,
      };
    },
  });

  return editorState || { editor: null };
}
```

### `useEditor` Простой контекстно-ориентированный крючок:

```typescript
// lib/editor/hooks/use-editor.ts
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within a EditorProvider");
  }
  return context;
}
```

## Узел загрузки изображений `ImageUploadNode` — это специальное расширение TipTap для загрузки изображений с помощью перетаскивания:

```typescript
// lib/editor/components/node/image-upload-node/image-upload-node-extension.ts
export const ImageUploadNode = Node.create<ImageUploadNodeOptions>({
  name: "imageUpload",
  group: "block",
  draggable: true,
  atom: true,

  addOptions() {
    return {
      type: "image",
      accept: "image/*",
      limit: 1,
      maxSize: 0,         // 0 = unlimited
      upload: undefined,
      onError: undefined,
      onSuccess: undefined,
      HTMLAttributes: {},
    };
  },
});
```

### Интерфейс функции загрузки

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Обработчик загрузки изображений

Обработчик по умолчанию в `lib/editor/utils/utils.ts` :

```typescript
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) throw new Error("No file provided");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE / (1024 * 1024)}MB)`);
  }

  // Replace with your upload implementation
  // e.g., upload to S3, Cloudflare R2, or your API
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const { url } = await response.json();
  return url;
};
```

### Сочетания клавиш

Регистры узла загрузки изображения. Введите обработку ключа:

```typescript
addKeyboardShortcuts() {
  return {
    Enter: ({ editor }) => {
      const { selection } = editor.state;
      const { nodeAfter } = selection.$from;
      if (nodeAfter?.type.name === "imageUpload" && editor.isActive("imageUpload")) {
        // Trigger file picker
        const nodeEl = editor.view.nodeDOM(selection.$from.pos);
        nodeEl?.firstChild?.click();
        return true;
      }
      return false;
    },
  };
}
```

## Конфигурация панели инструментов

Панель инструментов определена в `lib/editor/contents/toolbar-content.tsx` как модульный компонент:

```typescript
// lib/editor/contents/toolbar-content.tsx
export const ToolbarContent = React.memo(({ editor }) => (
  <>
    <ToolbarGroup>
      <UndoRedoButton action="undo" editor={editor} />
      <UndoRedoButton action="redo" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <HeadingDropdownMenu levels={[1, 2, 3, 4]} editor={editor} />
      <ListDropdownMenu types={['bulletList', 'orderedList', 'taskList']} editor={editor} />
      <BlockquoteButton editor={editor} />
      <CodeBlockButton editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <MarkButton type="bold" editor={editor} />
      <MarkButton type="italic" editor={editor} />
      <MarkButton type="strike" editor={editor} />
      <MarkButton type="code" editor={editor} />
      <MarkButton type="underline" editor={editor} />
      <ColorHighlightPopover editor={editor} />
      <LinkPopover editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <TextAlignButton align="left" editor={editor} />
      <TextAlignButton align="center" editor={editor} />
      <TextAlignButton align="right" editor={editor} />
      <TextAlignButton align="justify" editor={editor} />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ImageUploadButton text="Add" editor={editor} />
    </ToolbarGroup>
  </>
));
```

## Синхронизация данных формы

### `useEditorSync` Крючок

Двунаправленная синхронизация между редактором и состоянием формы:

```typescript
// lib/editor/hooks/use-editor-sync.ts
export function useEditorSync({
  editor, content, onContentChange, fieldName, enableLogging
}: UseEditorSyncOptions) {

  // Form -> Editor (initial load / reset)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML();
      if (currentContent !== content && (!currentContent.trim() || currentContent === '<p></p>')) {
        editor.commands.setContent(content || '');
      }
    }
  }, [editor, content]);

  // Editor -> Form (on change)
  useEffect(() => {
    if (!editor) return;
    const updateContent = () => onContentChange(editor.getHTML());
    editor.on('update', updateContent);
    editor.on('blur', updateContent);
    return () => {
      editor.off('update', updateContent);
      editor.off('blur', updateContent);
    };
  }, [editor, onContentChange]);
}
```

### `useEditorFieldSync` Удобный крючок

Для прямой интеграции с данными формы на основе `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Служебные функции

### Проверка схемы

```typescript
import { isMarkInSchema, isNodeInSchema, isExtensionAvailable } from '@/lib/editor/utils';

// Check if a mark exists before toggling
if (isMarkInSchema('highlight', editor)) {
  editor.chain().focus().toggleHighlight().run();
}

// Check if a node type is available
if (isNodeInSchema('taskList', editor)) {
  editor.chain().focus().toggleTaskList().run();
}

// Check extension availability (logs warning if not found)
if (isExtensionAvailable(editor, ['imageUpload', 'image'])) {
  editor.commands.setImageUploadNode();
}
```

### Обеззараживание URL-адресов

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Вопросы производительности

1. ** `React.memo` на ToolbarContent**: предотвращает повторную визуализацию панели инструментов при несвязанном изменении состояния.
2. ** `shouldRerenderOnTransaction: false` **: только существенные изменения состояния вызывают повторную отрисовку React.
3. ** `useMemo` для расширений**: массив расширений вычисляется один раз и используется повторно.
4. **Синхронизация на основе событий**: при синхронизации редактора с формой вместо опроса используются события TipTap ( `update` , `blur` ).
5. ** `MAX_FILE_SIZE` проверка**: проверка размера файла на стороне клиента предотвращает ненужные попытки загрузки.

## Устранение неполадок

### Редактор не отображает

1. Убедитесь, что `EditorContextProvider` оборачивает дерево компонентов.
2. Убедитесь, что установлено `immediatelyRender: false` (требуется для SSR).
3. Убедитесь, что все зависимости TipTap установлены.

### Данные формы не синхронизируются

1. Убедитесь, что `useEditorSync` или `useEditorFieldSync` вызывается с правильными параметрами.
2. Убедитесь, что экземпляр редактора не равен нулю при запуске перехватчика.
3. Убедитесь, что `onContentChange` правильно обновляет состояние формы.

### Не удалось загрузить изображение

1. Убедитесь, что обработчик загрузки возвращает действительную строку URL.
2. Убедитесь, что `MAX_FILE_SIZE` соответствует ограничениям на стороне вашего сервера.
3. Проверьте консоль браузера на наличие ошибок CORS при загрузке в другой домен.

## Сопутствующая документация

- [Архитектура клиента API](./api-client-architecture.md)
- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
- [Подробный обзор архитектуры кэширования](./caching-deep-dive.md)
