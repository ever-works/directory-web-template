---
id: rich-text-editor
title: Обогатен текстов редактор
sidebar_label: Обогатен текстов редактор
sidebar_position: 12
---

# Обогатен текстов редактор

Шаблонът Ever Works включва напълно интегриран редактор на богат текст, захранван от [TipTap](https://tiptap.dev/), рамка за редактор без глава, изградена върху ProseMirror. Редакторът поддържа форматиране на съдържание, качване на изображения, списъци със задачи и двупосочна синхронизация с данни от формуляри.

## Преглед на архитектурата

Редакторската система е организирана в модулна структура под `lib/editor/` :

| Директория / Файл | Цел |
|---|---|
| `providers/editor-provider.tsx` | React доставчик на контекст, който инициализира редактора TipTap с всички разширения |
| `hooks/use-tiptap-editor.ts` | Кука за достъп до екземпляра на редактора от контекст или директен проп |
| `hooks/use-editor.ts` | Опростена потребителска кука |
| `hooks/use-editor-sync.ts` | Двупосочна синхронизация между редактор и състояние на формуляр |
| `contents/editor-content.tsx` | Компонент за обвивка за изобразяване на областта на съдържанието на редактора |
| `contents/use-editor-toolbar.ts` | Кука за управление на състоянието на лентата с инструменти (мобилен/десктоп, изгледи) |

## TipTap разширения

Редакторът е конфигуриран с изчерпателен набор от разширения чрез `EditorContextProvider` :

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

### Справка за разширение

| Разширение | Описание |
|---|---|
| `StarterKit` | Основно форматиране: получер, курсив, заглавия, списъци, кавички, кодови блокове, връзки |
| `HorizontalRule` | Персонализирано вмъкване на хоризонтална линия |
| `TextAlign` | Подравняване на текст (ляво, централно, дясно, оправдано) за заглавия и параграфи |
| `ImageUploadNode` | Качване на изображения с плъзгане и пускане с ограничения за размера и броя на файловете |
| `TaskList` / `TaskItem` | Интерактивни списъци със задачи/чекбоксове с вложена поддръжка |
| `Highlight` | Маркиране на текст с многоцветна поддръжка |
| `Image` | Стандартно вграждане на изображение чрез `@tiptap/extension-image` |
| `Typography` | Автоматични типографски замествания (интелигентни кавички, тирета) |
| `Superscript` / `Subscript` | Горен и долен индекс форматиране на текст |
| `Selection` | Подобрено управление на селекцията |

## Доставчик на контекст на редактора

Редакторът се инициализира чрез доставчик на контекст на React. Обвийте вашето дърво на компонентите с `EditorContextProvider` , за да направите редактора достъпен:

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

Доставчикът създава редактора със следната конфигурация:

- ** `immediatelyRender: false` ** -- Предотвратява несъответствия на SSR хидратация
- ** `shouldRerenderOnTransaction: false` ** -- Оптимизиране на производителността за намаляване на ненужните повторни изобразявания
- **Атрибути за достъпност** -- Автоматично довършване, автокорекция и ARIA етикети са конфигурирани
- **Минимална височина** -- `min-h-96` гарантира използваема площ за редактиране

## Достъп до екземпляра на редактора

### С помощта на `useTiptapEditor` Основната кука за достъп до редактора поддържа както директно инжектиране, така и резервен контекст:

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

### Използване на `useEditor` По-проста кука, която стриктно изисква да бъде в рамките на `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Синхронизиране на съдържание

Куката `useEditorSync` управлява двупосочна синхронизация между редактора TipTap и състоянието на формуляра. Това е от съществено значение за интегрирането на редактора във формуляри, управлявани от React състояние или библиотеки с формуляри.

### Основна синхронизация

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

### Синхронизиране на полето на формуляр

За формуляри с множество полета, `useEditorFieldSync` предоставя стенограма:

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

### Поведение при синхронизиране

| Посока | Тригер | Състояние |
|---|---|---|
| Формуляр към редактор | `content` промени в опорите | Само когато редакторът е празен или съдържанието се различава значително |
| Редактор към формуляр | `update` и `blur` събития | Винаги разпространява текущия HTML към формуляра за обратно извикване |

Куката избягва безкрайни цикли на актуализиране, като проверява дали съдържанието на редактора е празно или съществено различно преди презаписване.

## Съдържание на редактора

Обвивката `EditorContent` управлява обвиването на думи и стилизирането на ProseMirror:

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

Компонентът прилага CSS правила за правилно обвиване на текст:
- `break-words` на контейнера ProseMirror
- `whitespace-pre-wrap` за запазване на празно пространство
- `overflow-wrap-anywhere` за предотвратяване на хоризонтално преливане

## Управление на лентата с инструменти

Куката `useEditorToolbar` управлява състоянието на лентата с инструменти, включително мобилната реакция:

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

Лентата с инструменти поддържа три режима на мобилен изглед: `"main"` , `"highlighter"` и `"link"` .

## Качване на изображение

Редакторът поддържа качване на изображения чрез разширението `ImageUploadNode` :

| Настройка | Стойност |
|---|---|
| Приети типове | `image/*` |
| Максимален размер на файла | Дефиниран от `MAX_FILE_SIZE` константа |
| Макс. изображения за качване | 3 |
| Манипулатор на качване | `handleImageUpload` функция на полезност |

Изображенията могат да се качват чрез плъзгане и пускане или чрез бутона за качване на лентата с инструменти.

## Ключови файлове

| Файл | Път |
|---|---|
| Доставчик на редактор | `lib/editor/providers/editor-provider.tsx` |
| TipTap Editor Hook | `lib/editor/hooks/use-tiptap-editor.ts` |
| Кука за синхронизиране на редактор | `lib/editor/hooks/use-editor-sync.ts` |
| Съдържание на редактора | `lib/editor/contents/editor-content.tsx` |
| Кука на лентата с инструменти | `lib/editor/contents/use-editor-toolbar.ts` |
| Контекстна кука на редактора | `lib/editor/hooks/use-editor.ts` |
