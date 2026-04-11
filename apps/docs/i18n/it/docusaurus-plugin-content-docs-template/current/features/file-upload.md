---
id: file-upload
title: Caricamento file
sidebar_label: Caricamento file
sidebar_position: 23
---

# Caricamento file

Il modello fornisce funzionalità di caricamento file tramite il sistema di caricamento immagini dell'editor RTF e il metodo `upload` del client API lato server. I caricamenti di immagini si integrano con l'editor TipTap, mentre il client server supporta caricamenti di file per scopi generici con la gestione FormData.

## Panoramica dell'architettura

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

## Caricamento immagini nell'editor

### usaImageUploadHook

L'hook `use-image-upload.ts` in `lib/editor/components/ui/image-upload-button/` fornisce la logica di caricamento principale per l'editor TipTap:

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

### Funzioni di supporto

L'hook si basa su pure funzioni di supporto per i controlli di stato:

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

### Componente ImageUploadButton

Il componente `ImageUploadButton` fornisce un pulsante della barra degli strumenti pronto all'uso:

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

### Utilizzo nella barra degli strumenti dell'editor

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

La scorciatoia da tastiera `Ctrl+Shift+I` (o `Cmd+Shift+I` su macOS) attiva il caricamento dell'immagine quando l'editor è attivo.

## Caricamento file lato server

La classe `ServerClient` fornisce un metodo `upload` generico per i caricamenti di file lato server:

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

### Gestione del tipo di contenuto

Un dettaglio critico: l'intestazione `Content-Type` viene rimossa intenzionalmente durante il caricamento di FormData. Ciò consente al browser (o Node.js `fetch` ) di impostare automaticamente il limite `multipart/form-data` corretto. Il metodo base `request` gestisce anche questo:

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

### Dati del modulo con codifica URL

Per l'invio di moduli non file (ad esempio, verifica reCAPTCHA), è disponibile il metodo `postForm` :

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

## Estensione del nodo di caricamento immagini

L'estensione TipTap `imageUpload` in `lib/editor/components/node/image-upload-node/` definisce un tipo di nodo personalizzato che esegue il rendering di un'interfaccia utente di caricamento all'interno del contenuto dell'editor. Quando l'utente seleziona un file, questo viene caricato tramite l'endpoint configurato e il nodo viene sostituito con un nodo immagine standard contenente l'URL restituito.

## Carica riepilogo del flusso

1. L'utente fa clic sul pulsante **Immagine** nella barra degli strumenti dell'editor o preme `Ctrl+Shift+I` 2. L'hook `useImageUpload` inserisce un nodo `imageUpload` nell'editor
3. Il componente del nodo di caricamento esegue il rendering di un selettore di file o di una zona di rilascio
4. Alla selezione del file, il file viene caricato tramite `serverClient.upload()` 5. In caso di successo, il nodo di caricamento viene sostituito con un normale nodo immagine che fa riferimento all'URL caricato
6. In caso di errore, viene visualizzato un messaggio di errore all'interno del nodo

## Riferimento al file

| File | Scopo |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Carica hook logico |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Componente pulsante della barra degli strumenti |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Estensione TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Carica componente nodo |
| `lib/api/server-api-client.ts` | Metodi `ServerClient.upload()` e `postForm()` |
