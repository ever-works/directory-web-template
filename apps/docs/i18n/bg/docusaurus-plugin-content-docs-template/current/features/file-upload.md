---
id: file-upload
title: Качване на файл
sidebar_label: Качване на файл
sidebar_position: 23
---

# Качване на файл

Шаблонът предоставя възможности за качване на файлове чрез системата за качване на изображения на редактора на богат текст и метода `upload` на API клиента от страна на сървъра. Качването на изображения се интегрира с редактора TipTap, докато клиентът на сървъра поддържа качване на файлове с общо предназначение с обработка на FormData.

## Преглед на архитектурата

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

## Качване на изображение в редактора

### useImageUpload Hook

Куката `use-image-upload.ts` на `lib/editor/components/ui/image-upload-button/` предоставя основната логика за качване за редактора TipTap:

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

### Помощни функции

Куката разчита на чисти помощни функции за проверки на състоянието:

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

Компонентът `ImageUploadButton` предоставя готов за използване бутон на лентата с инструменти:

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

### Използване в лентата с инструменти на редактора

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

Клавишната комбинация `Ctrl+Shift+I` (или `Cmd+Shift+I` в macOS) задейства качване на изображение, когато редакторът е фокусиран.

## Качване на файл от страна на сървъра

Класът `ServerClient` предоставя общ метод `upload` за качване на файлове от страната на сървъра:

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

### Обработка на тип съдържание

Критична подробност: заглавката `Content-Type` е умишлено премахната при качване на FormData. Това позволява на браузъра (или Node.js `fetch` ) да зададе автоматично правилната граница `multipart/form-data` . Базовият метод `request` също се справя с това:

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

### URL-кодирани данни на формуляр

За изпращане на формуляр без файл (напр. проверка с reCAPTCHA) е наличен методът `postForm` :

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

## Разширение на възел за качване на изображения

Разширението TipTap `imageUpload` на `lib/editor/components/node/image-upload-node/` дефинира потребителски тип възел, който изобразява потребителски интерфейс за качване в съдържанието на редактора. Когато потребителят избере файл, той се качва през конфигурираната крайна точка и възелът се заменя със стандартен възел на изображение, съдържащ върнатия URL адрес.

## Резюме на потока на качване

1. Потребителят щраква върху бутона **Изображение** в лентата с инструменти на редактора или натиска `Ctrl+Shift+I` 2. Куката `useImageUpload` вмъква възел `imageUpload` в редактора
3. Компонентът на възела за качване изобразява инструмент за избор на файл или зона за изхвърляне
4. При избор на файл, файлът се качва чрез `serverClient.upload()` 5. При успех възелът за качване се заменя с обикновен възел на изображение, препращащ към качения URL адрес
6. При повреда се показва съобщение за грешка в рамките на възела

## Референтен файл

| Файл | Цел |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Качване на логическа кука |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Компонент на бутона на лентата с инструменти |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Разширение TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Качване на компонент на възел |
| `lib/api/server-api-client.ts` | Методи `ServerClient.upload()` и `postForm()` |
