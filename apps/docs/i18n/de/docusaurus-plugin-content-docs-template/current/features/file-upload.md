---
id: file-upload
title: Datei-Upload
sidebar_label: Datei-Upload
sidebar_position: 23
---

# Datei-Upload

Die Vorlage bietet Datei-Upload-Funktionen über das Bild-Upload-System des Rich-Text-Editors und die `upload` -Methode des serverseitigen API-Clients. Bild-Uploads sind in den TipTap-Editor integriert, während der Server-Client allgemeine Datei-Uploads mit FormData-Verarbeitung unterstützt.

## Architekturübersicht

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

## Bild-Upload im Editor

### useImageUpload Hook

Der `use-image-upload.ts` -Hook bei `lib/editor/components/ui/image-upload-button/` stellt die Kern-Upload-Logik für den TipTap-Editor bereit:

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

### Hilfsfunktionen

Der Hook setzt bei Zustandsprüfungen auf reine Hilfsfunktionen:

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

### ImageUploadButton-Komponente

Die `ImageUploadButton` -Komponente bietet eine gebrauchsfertige Symbolleistenschaltfläche:

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

### Verwendung in der Editor-Symbolleiste

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

Die Tastenkombination `Ctrl+Shift+I` (oder `Cmd+Shift+I` unter macOS) löst das Hochladen von Bildern aus, wenn der Editor fokussiert ist.

## Serverseitiger Datei-Upload

Die `ServerClient` -Klasse bietet eine generische `upload` -Methode für serverseitige Datei-Uploads:

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

### Umgang mit Inhaltstypen

Ein kritisches Detail: Der `Content-Type` -Header wird beim Hochladen von FormData absichtlich entfernt. Dadurch kann der Browser (oder Node.js `fetch` ) automatisch die richtige `multipart/form-data` -Grenze festlegen. Die Basis- `request` -Methode erledigt dies auch:

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

### URL-kodierte Formulardaten

Für Nicht-Datei-Formularübermittlungen (z. B. reCAPTCHA-Verifizierung) ist die `postForm` -Methode verfügbar:

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

## Bild-Upload-Knotenerweiterung

Die TipTap `imageUpload` -Erweiterung bei `lib/editor/components/node/image-upload-node/` definiert einen benutzerdefinierten Knotentyp, der eine Upload-Benutzeroberfläche innerhalb des Editorinhalts rendert. Wenn der Benutzer eine Datei auswählt, wird diese über den konfigurierten Endpunkt hochgeladen und der Knoten wird durch einen Standardbildknoten ersetzt, der die zurückgegebene URL enthält.

## Flow-Zusammenfassung hochladen

1. Der Benutzer klickt auf die Schaltfläche **Bild** in der Editor-Symbolleiste oder drückt `Ctrl+Shift+I` 2. Der `useImageUpload` -Hook fügt einen `imageUpload` -Knoten in den Editor ein
3. Die Upload-Knotenkomponente rendert eine Dateiauswahl oder Drop-Zone
4. Bei der Dateiauswahl wird die Datei über `serverClient.upload()` hochgeladen
5. Bei Erfolg wird der Upload-Knoten durch einen regulären Bildknoten ersetzt, der auf die hochgeladene URL verweist
6. Bei einem Fehler wird im Knoten eine Fehlermeldung angezeigt

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Logik-Hook hochladen |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Symbolleisten-Schaltflächenkomponente |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | TipTap-Erweiterung |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Knotenkomponente hochladen |
| `lib/api/server-api-client.ts` | `ServerClient.upload()` und `postForm()` Methoden |
