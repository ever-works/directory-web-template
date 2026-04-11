---
id: editor-system-deep-dive
title: Задълбочено потапяне в системата за обогатен текстов редактор
sidebar_label: Система за редактор
sidebar_position: 7
---

# Дълбоко потапяне в системата за редактор на богат текст

Това ръководство обхваща системата за редактор на богат текст, базирана на TipTap, включително конфигурация на разширение, персонализирани възли, архитектура на лентата с инструменти, обработка на изображения и синхронизиране на формуляри.

## Преглед на архитектурата

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

## Конфигурация на разширение

Редакторът е конфигуриран в `lib/editor/providers/editor-provider.tsx` с изчерпателен набор от разширения:

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

### Справка за разширение

| Разширение | Източник | Цел |
|-----------|--------|---------|
| `StarterKit` | `@tiptap/starter-kit` | Основа: параграфи, заглавия, списъци, код, получер, курсив |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Хоризонтални разделители |
| `TextAlign` | `@tiptap/extension-text-align` | Ляво, централно, дясно, подравняване |
| `ImageUploadNode` | Персонализирано | Качване на изображение с плъзгане и пускане с напредък |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Списъци със задачи в полето за отметка (вложени) |
| `Highlight` | `@tiptap/extension-highlight` | Многоцветно подчертаване на текст |
| `Image` | `@tiptap/extension-image` | Вграден дисплей на изображение |
| `Typography` | `@tiptap/extension-typography` | Интелигентни кавички, тирета, многоточие |
| `Superscript` | `@tiptap/extension-superscript` | Горен индекс |
| `Subscript` | `@tiptap/extension-subscript` | Долен текст |
| `Selection` | `@tiptap/extensions` | Подобрено управление на селекцията |

## Доставчик на редактор

Екземплярът на редактора се създава чрез React контекст за достъп до цялото приложение:

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

### Оптимизации на производителността

- ** `immediatelyRender: false` **: Предотвратява несъответствия на хидратация в SSR.
- ** `shouldRerenderOnTransaction: false` **: Намалява повторното изобразяване на React при всяко натискане на клавиш. Само промените в състоянието на лентата с инструменти задействат повторно изобразяване.

## Персонализирани куки

### `useTiptapEditor` Осигурява достъп до екземпляра на редактора от контекст или директно:

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

### `useEditor` Проста контекстно базирана кука:

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

## Възел за качване на изображения `ImageUploadNode` е персонализирано разширение TipTap за качване на изображения с плъзгане и пускане:

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

### Интерфейс на функцията за качване

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Манипулатор за качване на изображения

Манипулаторът по подразбиране в `lib/editor/utils/utils.ts` :

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

### Клавишни комбинации

Възелът за качване на изображения регистрира Въведете обработка на ключове:

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

## Конфигурация на лентата с инструменти

Лентата с инструменти е дефинирана в `lib/editor/contents/toolbar-content.tsx` като модулен компонент:

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

## Синхронизиране на данни от формуляри

### `useEditorSync` Кука

Двупосочна синхронизация между редактора и състоянието на формуляра:

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

### `useEditorFieldSync` Удобна кука

За директна интеграция с `useState` базирани данни на формуляр:

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Помощни функции

### Проверка на схемата

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

### Дезинфекция на URL адреси

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Съображения за производителност

1. ** `React.memo` на ToolbarContent**: Предотвратява повторно изобразяване на лентата с инструменти, когато несвързаното състояние се промени.
2. ** `shouldRerenderOnTransaction: false` **: Само съществени промени в състоянието задействат повторно изобразяване на React.
3. ** `useMemo` за разширения**: Масивът на разширенията се изчислява веднъж и се използва повторно.
4. **Синхронизиране въз основа на събития**: Синхронизирането от редактор към формуляр използва TipTap събития ( `update` , `blur` ) вместо анкета.
5. ** `MAX_FILE_SIZE` валидиране**: Проверката на размера на файла от страна на клиента предотвратява ненужни опити за качване.

## Отстраняване на неизправности

### Редакторът не изобразява

1. Уверете се, че `EditorContextProvider` обвива дървото на компонентите.
2. Проверете дали `immediatelyRender: false` е настроен (необходим за SSR).
3. Проверете дали всички зависимости на TipTap са инсталирани.

### Данните от формуляра не се синхронизират

1. Уверете се, че `useEditorSync` или `useEditorFieldSync` се извиква с правилните параметри.
2. Проверете дали екземплярът на редактора не е null, когато куката се изпълнява.
3. Проверете дали `onContentChange` правилно актуализира състоянието на формуляра.

### Качването на изображение е неуспешно

1. Проверете дали манипулаторът за качване връща валиден URL низ.
2. Уверете се, че `MAX_FILE_SIZE` отговаря на вашите ограничения от страна на сървъра.
3. Проверете конзолата на браузъра за CORS грешки, ако качвате в различен домейн.

## Свързана документация

- [API клиентска архитектура](./api-client-architecture.md)
- [Модели за възстановяване на грешки](./error-recovery-patterns.md)
- [Дълбоко потапяне в кеширащата архитектура](./caching-deep-dive.md)
