---
id: file-upload
title: Upload de arquivo
sidebar_label: Upload de arquivo
sidebar_position: 23
---

# Carregamento de arquivo

O modelo fornece recursos de upload de arquivos por meio do sistema de upload de imagens do editor de rich text e do método `upload` do cliente API do lado do servidor. Os uploads de imagens integram-se ao editor TipTap, enquanto o cliente do servidor oferece suporte a uploads de arquivos de uso geral com manipulação de FormData.

## Visão geral da arquitetura

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

## Upload de imagem no editor

### gancho useImageUpload

O gancho `use-image-upload.ts` em `lib/editor/components/ui/image-upload-button/` fornece a lógica principal de upload para o editor TipTap:

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

### Funções auxiliares

O gancho depende de funções auxiliares puras para verificações de estado:

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

O componente `ImageUploadButton` fornece um botão da barra de ferramentas pronto para uso:

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

### Uso na barra de ferramentas do Editor

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

O atalho de teclado `Ctrl+Shift+I` (ou `Cmd+Shift+I` no macOS) aciona o upload da imagem quando o editor está focado.

## Upload de arquivo do lado do servidor

A classe `ServerClient` fornece um método `upload` genérico para uploads de arquivos no lado do servidor:

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

### Tratamento de tipo de conteúdo

Um detalhe crítico: o cabeçalho `Content-Type` é removido intencionalmente durante o upload do FormData. Isso permite que o navegador (ou Node.js `fetch` ) defina o limite `multipart/form-data` correto automaticamente. O método base `request` também lida com isso:

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

### Dados de formulário codificados em URL

Para envios de formulários que não sejam de arquivo (por exemplo, verificação reCAPTCHA), o método `postForm` está disponível:

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

## Extensão do nó de upload de imagem

A extensão TipTap `imageUpload` em `lib/editor/components/node/image-upload-node/` define um tipo de nó personalizado que renderiza uma UI de upload dentro do conteúdo do editor. Quando o usuário seleciona um arquivo, ele é carregado por meio do endpoint configurado e o nó é substituído por um nó de imagem padrão contendo o URL retornado.

## Resumo do fluxo de upload

1. O usuário clica no botão **Imagem** na barra de ferramentas do editor ou pressiona `Ctrl+Shift+I` 2. O gancho `useImageUpload` insere um nó `imageUpload` no editor
3. O componente do nó de upload renderiza um seletor de arquivos ou zona de recebimento
4. Na seleção do arquivo, o arquivo é carregado via `serverClient.upload()` 5. Em caso de sucesso, o nó de upload é substituído por um nó de imagem normal que faz referência ao URL carregado
6. Em caso de falha, uma mensagem de erro é exibida no nó

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | Carregar gancho lógico |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | Componente de botão da barra de ferramentas |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | Extensão TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | Carregar componente do nó |
| `lib/api/server-api-client.ts` | métodos `ServerClient.upload()` e `postForm()` |
