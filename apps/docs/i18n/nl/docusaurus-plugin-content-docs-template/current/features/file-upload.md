---
id: file-upload
title: Bestand uploaden
sidebar_label: Bestand uploaden
sidebar_position: 23
---

# Bestand uploaden

De sjabloon biedt mogelijkheden voor het uploaden van bestanden via het beelduploadsysteem van de rich text-editor en de `upload` -methode van de server-side API-client. Het uploaden van afbeeldingen kan worden geïntegreerd met de TipTap-editor, terwijl de serverclient algemene bestandsuploads ondersteunt met FormData-verwerking.

## Architectuuroverzicht

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

## Afbeelding uploaden in de editor

### gebruikImageUpload Hook

De `use-image-upload.ts` hook bij `lib/editor/components/ui/image-upload-button/` biedt de belangrijkste uploadlogica voor de TipTap-editor:

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

### Helperfuncties

De hook vertrouwt op pure helperfuncties voor staatscontroles:

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

### ImageUploadButton-component

De component `ImageUploadButton` biedt een kant-en-klare werkbalkknop:

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

### Gebruik in de Editor-werkbalk

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

De sneltoets `Ctrl+Shift+I` (of `Cmd+Shift+I` op macOS) activeert het uploaden van afbeeldingen wanneer de editor gefocust is.

## Bestanden uploaden op de server

De klasse `ServerClient` biedt een generieke `upload` -methode voor het uploaden van bestanden op de server:

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

### Behandeling van inhoudstypen

Een cruciaal detail: de header `Content-Type` is opzettelijk verwijderd bij het uploaden van FormData. Hierdoor kan de browser (of Node.js `fetch` ) automatisch de juiste `multipart/form-data` -grens instellen. De basis `request` -methode regelt dit ook:

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

### URL-gecodeerde formuliergegevens

Voor niet-bestandsformulierinzendingen (bijvoorbeeld reCAPTCHA-verificatie) is de `postForm` -methode beschikbaar:

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

## Knooppuntextensie voor het uploaden van afbeeldingen

De TipTap `imageUpload` -extensie bij `lib/editor/components/node/image-upload-node/` definieert een aangepast knooppunttype dat een upload-UI binnen de editorinhoud weergeeft. Wanneer de gebruiker een bestand selecteert, wordt dit geüpload via het geconfigureerde eindpunt en wordt het knooppunt vervangen door een standaard afbeeldingsknooppunt met de geretourneerde URL.

## Upload stroomsamenvatting

1. De gebruiker klikt op de knop **Afbeelding** in de editorwerkbalk of drukt op `Ctrl+Shift+I` 2. De `useImageUpload` hook voegt een `imageUpload` knooppunt in de editor in
3. De component voor het uploadknooppunt genereert een bestandskiezer of neerzetzone
4. Bij bestandsselectie wordt het bestand geüpload via `serverClient.upload()` 5. Bij succes wordt het uploadknooppunt vervangen door een normaal afbeeldingsknooppunt dat verwijst naar de geüploade URL
6. Bij een storing wordt er binnen het knooppunt een foutmelding weergegeven

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Logische hook uploaden |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Component werkbalkknop |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | TipTap-extensie |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Knooppuntcomponent uploaden |
| `lib/api/server-api-client.ts` | Methoden `ServerClient.upload()` en `postForm()` |
