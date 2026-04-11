---
id: file-upload
title: Carga de archivos
sidebar_label: Carga de archivos
sidebar_position: 23
---

# Carga de archivos

La plantilla proporciona capacidades de carga de archivos a través del sistema de carga de imágenes del editor de texto enriquecido y el método `upload` del cliente API del lado del servidor. Las cargas de imágenes se integran con el editor TipTap, mientras que el cliente del servidor admite cargas de archivos de uso general con manejo de FormData.

## Descripción general de la arquitectura

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

## Subir imagen en el editor

### useImageUpload Hook

El enlace `use-image-upload.ts` en `lib/editor/components/ui/image-upload-button/` proporciona la lógica de carga principal para el editor TipTap:

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

### Funciones auxiliares

El gancho se basa en funciones auxiliares puras para las comprobaciones estatales:

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

El componente `ImageUploadButton` proporciona un botón de barra de herramientas listo para usar:

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

### Uso en la barra de herramientas del editor

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

El método abreviado de teclado `Ctrl+Shift+I` (o `Cmd+Shift+I` en macOS) activa la carga de imágenes cuando el editor está enfocado.

## Carga de archivos del lado del servidor

La clase `ServerClient` proporciona un método genérico `upload` para cargar archivos del lado del servidor:

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

### Manejo del tipo de contenido

Un detalle crítico: el encabezado `Content-Type` se elimina intencionalmente al cargar FormData. Esto permite que el navegador (o Node.js `fetch` ) establezca el límite `multipart/form-data` correcto automáticamente. El método base `request` también maneja esto:

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

### Datos de formulario codificados en URL

Para envíos de formularios sin archivos (por ejemplo, verificación reCAPTCHA), el método `postForm` está disponible:

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

## Extensión del nodo de carga de imágenes

La extensión TipTap `imageUpload` en `lib/editor/components/node/image-upload-node/` define un tipo de nodo personalizado que representa una interfaz de usuario de carga dentro del contenido del editor. Cuando el usuario selecciona un archivo, se carga a través del punto final configurado y el nodo se reemplaza con un nodo de imagen estándar que contiene la URL devuelta.

## Cargar resumen de flujo

1. El usuario hace clic en el botón **Imagen** en la barra de herramientas del editor o presiona `Ctrl+Shift+I` 2. El gancho `useImageUpload` inserta un nodo `imageUpload` en el editor.
3. El componente del nodo de carga representa un selector de archivos o una zona de colocación.
4. Al seleccionar el archivo, el archivo se carga a través de `serverClient.upload()` 5. En caso de éxito, el nodo de carga se reemplaza con un nodo de imagen normal que hace referencia a la URL cargada.
6. En caso de falla, se muestra un mensaje de error dentro del nodo.

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Cargar enlace lógico |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Componente del botón de la barra de herramientas |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Extensión TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Cargar componente de nodo |
| `lib/api/server-api-client.ts` | Métodos `ServerClient.upload()` y `postForm()` |
