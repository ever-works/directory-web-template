---
id: file-upload
title: Przesyłanie pliku
sidebar_label: Przesyłanie pliku
sidebar_position: 23
---

# Przesyłanie pliku

Szablon zapewnia możliwość przesyłania plików za pośrednictwem systemu przesyłania obrazów w edytorze tekstu sformatowanego i metody `upload` klienta API po stronie serwera. Przesyłanie obrazów integruje się z edytorem TipTap, podczas gdy klient serwera obsługuje przesyłanie plików ogólnego przeznaczenia z obsługą FormData.

## Przegląd architektury

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

## Prześlij obraz do edytora

### useImageUpload Hook

Zaczep `use-image-upload.ts` w `lib/editor/components/ui/image-upload-button/` zapewnia podstawową logikę przesyłania dla edytora TipTap:

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

### Funkcje pomocnicze

Hak opiera się na czystych funkcjach pomocniczych do kontroli stanu:

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

### Komponent ImageUploadButton

Komponent `ImageUploadButton` udostępnia gotowy do użycia przycisk paska narzędzi:

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

### Użycie na pasku narzędzi edytora

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

Skrót klawiaturowy `Ctrl+Shift+I` (lub `Cmd+Shift+I` w systemie macOS) uruchamia przesyłanie obrazu, gdy edytor jest aktywny.

## Przesyłanie plików po stronie serwera

Klasa `ServerClient` udostępnia ogólną metodę `upload` do przesyłania plików po stronie serwera:

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

### Obsługa typów zawartości

Istotny szczegół: nagłówek `Content-Type` jest celowo usuwany podczas przesyłania danych FormData. Dzięki temu przeglądarka (lub Node.js `fetch` ) automatycznie ustawia prawidłową granicę `multipart/form-data` . Podstawowa metoda `request` również sobie z tym radzi:

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

### Dane formularza zakodowane w adresie URL

W przypadku przesyłania formularzy innych niż plik (np. weryfikacja reCAPTCHA) dostępna jest metoda `postForm` :

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

## Rozszerzenie węzła przesyłania obrazu

Rozszerzenie TipTap `imageUpload` w `lib/editor/components/node/image-upload-node/` definiuje niestandardowy typ węzła, który renderuje interfejs przesyłania w treści edytora. Gdy użytkownik wybierze plik, zostanie on przesłany przez skonfigurowany punkt końcowy, a węzeł zostanie zastąpiony standardowym węzłem obrazu zawierającym zwrócony adres URL.

## Prześlij podsumowanie przepływu

1. Użytkownik klika przycisk **Obraz** na pasku narzędzi edytora lub naciska `Ctrl+Shift+I` 2. Hak `useImageUpload` wstawia węzeł `imageUpload` do edytora
3. Komponent węzła przesyłania renderuje selektor plików lub strefę upuszczania
4. Po wybraniu pliku plik zostanie przesłany przez `serverClient.upload()` 5. Po pomyślnym zakończeniu węzeł przesyłania zostaje zastąpiony zwykłym węzłem obrazu odwołującym się do przesłanego adresu URL
6. W przypadku awarii w węźle wyświetlany jest komunikat o błędzie

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Prześlij hak logiczny |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Komponent przycisku paska narzędzi |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Rozszerzenie TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Prześlij komponent węzła |
| `lib/api/server-api-client.ts` | Metody `ServerClient.upload()` i `postForm()` |
