---
id: file-upload
title: Загрузка файла
sidebar_label: Загрузка файла
sidebar_position: 23
---

# Загрузка файла

Шаблон предоставляет возможности загрузки файлов через систему загрузки изображений редактора форматированного текста и метод `upload` клиента API на стороне сервера. Загрузка изображений интегрируется с редактором TipTap, а серверный клиент поддерживает загрузку файлов общего назначения с обработкой FormData.

## Обзор архитектуры

```
lib/editor/components/
  node/image-upload-node/
    image-upload-node-extension.ts  -- TipTap extension definition
    image-upload-node.tsx           -- Upload node component
    image-upload-node.scss          -- Upload node styles
  ui/image-upload-button/
    image-upload-button.tsx         -- Toolbar button component
    use-image-upload.ts             -- Upload logic hook

lib/api/
  server-api-client.ts              -- ServerClient.upload() method
```

## Загрузка изображений в редакторе

### хук useImageUpload

Хук `use-image-upload.ts` в `lib/editor/components/ui/image-upload-button/` обеспечивает основную логику загрузки для редактора TipTap:

```tsx
// lib/editor/components/ui/image-upload-button/use-image-upload.ts
export const IMAGE_UPLOAD_SHORTCUT_KEY = "mod+shift+i";

export interface UseImageUploadConfig {
  editor?: Editor | null;
  hideWhenUnavailable?: boolean;
  onInserted?: () => void;
}

export function useImageUpload(config?: UseImageUploadConfig) {
  const { editor: providedEditor, hideWhenUnavailable = false, onInserted } = config || {};
  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsMobile();
  const canInsert = canInsertImage(editor);
  const isActive = isImageActive(editor);

  const handleImage = useCallback(() => {
    if (!editor) return false;
    const success = insertImage(editor);
    if (success) onInserted?.();
    return success;
  }, [editor, onInserted]);

  // Keyboard shortcut registration
  useHotkeys(IMAGE_UPLOAD_SHORTCUT_KEY, (event) => {
    event.preventDefault();
    handleImage();
  }, { enabled: isVisible && canInsert });

  return {
    isVisible,
    isActive,
    handleImage,
    canInsert,
    label: "Add image",
    shortcutKeys: IMAGE_UPLOAD_SHORTCUT_KEY,
    Icon: ImagePlusIcon,
  };
}
```

### Вспомогательные функции

Хук опирается на чистые вспомогательные функции для проверки состояния:

```tsx
// Check if image can be inserted at the current cursor position
export function canInsertImage(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, "imageUpload")) return false;
  if (isNodeTypeSelected(editor, ["image"])) return false;
  return editor.can().insertContent({ type: "imageUpload" });
}

// Check if the image upload node is currently active
export function isImageActive(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive("imageUpload");
}

// Insert an image upload node into the editor
export function insertImage(editor: Editor | null): boolean {
  if (!canInsertImage(editor)) return false;
  return editor.chain().focus().insertContent({ type: "imageUpload" }).run();
}

// Determine if the upload button should be shown
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, "imageUpload")) return false;
  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canInsertImage(editor);
  }
  return true;
}
```

### Компонент ImageUploadButton

Компонент `ImageUploadButton` предоставляет готовую к использованию кнопку на панели инструментов:

```tsx
// lib/editor/components/ui/image-upload-button/image-upload-button.tsx
export const ImageUploadButton = React.forwardRef<
  HTMLButtonElement,
  ImageUploadButtonProps
>(({ editor: providedEditor, text, hideWhenUnavailable, onInserted, showShortcut, onClick, children, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor);
  const { isVisible, canInsert, handleImage, label, isActive, shortcutKeys, Icon } =
    useImageUpload({ editor, hideWhenUnavailable, onInserted });

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      data-style="ghost"
      data-active-state={isActive ? "on" : "off"}
      disabled={!canInsert}
      aria-label={label}
      aria-pressed={isActive}
      onClick={(e) => { onClick?.(e); handleImage(); }}
      ref={ref}
    >
      {children ?? (
        <>
          <Icon className="tiptap-button-icon" />
          {text && <span className="tiptap-button-text">{text}</span>}
          {showShortcut && <ImageShortcutBadge shortcutKeys={shortcutKeys} />}
        </>
      )}
    </Button>
  );
});
```

### Использование на панели инструментов редактора

```tsx
// In the editor toolbar configuration
<ImageUploadButton
  editor={editor}
  hideWhenUnavailable={true}
  text="Image"
  showShortcut={true}
  onInserted={() => console.log('Image node inserted')}
/>
```

Сочетание клавиш `Ctrl+Shift+I` (или `Cmd+Shift+I` в macOS) запускает загрузку изображений, когда редактор находится в фокусе.

## Загрузка файла на стороне сервера

Класс `ServerClient` предоставляет общий метод `upload` для загрузки файлов на стороне сервера:

```tsx
// lib/api/server-api-client.ts
export class ServerClient {
  async upload<T>(
    endpoint: string,
    file: File | FormData,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const formData = file instanceof FormData ? file : new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    }

    // Remove Content-Type header to let the browser set the multipart boundary
    const filteredHeaders = options.headers
      ? Object.fromEntries(
          Object.entries(options.headers).filter(
            ([key]) => key.toLowerCase() !== 'content-type'
          )
        )
      : {};

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers: filteredHeaders,
    });
  }
}
```

### Обработка типов контента

Важная деталь: заголовок `Content-Type` намеренно удален при загрузке FormData. Это позволяет браузеру (или Node.js `fetch` ) автоматически устанавливать правильную границу `multipart/form-data` . Базовый метод `request` также обрабатывает это:

```tsx
// Remove Content-Type for FormData (case-insensitive check)
if (fetchOptions.body instanceof FormData) {
  const contentTypeKey = Object.keys(normalizedHeaders).find(
    (key) => key.toLowerCase() === 'content-type'
  );
  if (contentTypeKey) {
    delete normalizedHeaders[contentTypeKey];
  }
}
```

### Данные формы в URL-кодировке

Для отправки форм без файлов (например, проверка reCAPTCHA) доступен метод `postForm` :

```tsx
async postForm<T>(
  endpoint: string,
  data: Record<string, string>,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const formData = new URLSearchParams(data);
  return this.request<T>(endpoint, {
    ...options,
    method: 'POST',
    body: formData.toString(),
    headers: { ...options.headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}
```

## Расширение узла загрузки изображений

Расширение TipTap `imageUpload` в позиции `lib/editor/components/node/image-upload-node/` определяет пользовательский тип узла, который отображает пользовательский интерфейс загрузки в содержимом редактора. Когда пользователь выбирает файл, он загружается через настроенную конечную точку, а узел заменяется стандартным узлом изображения, содержащим возвращенный URL-адрес.

## Сводка процесса загрузки

1. Пользователь нажимает кнопку **Изображение** на панели инструментов редактора или нажимает `Ctrl+Shift+I` 2. Хук `useImageUpload` вставляет узел `imageUpload` в редактор.
3. Компонент узла загрузки отображает средство выбора файлов или зону перетаскивания.
4. При выборе файла файл загружается через `serverClient.upload()` 5. В случае успеха узел загрузки заменяется обычным узлом изображения, ссылающимся на загруженный URL-адрес.
6. В случае сбоя внутри узла отображается сообщение об ошибке.

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Загрузить логический крючок |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Компонент кнопки панели инструментов |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Расширение TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Загрузить компонент узла |
| `lib/api/server-api-client.ts` | `ServerClient.upload()` и `postForm()` методы |
