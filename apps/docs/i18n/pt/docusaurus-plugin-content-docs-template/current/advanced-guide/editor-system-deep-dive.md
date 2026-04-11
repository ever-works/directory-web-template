---
id: editor-system-deep-dive
title: Aprofundamento do sistema de editor de rich text
sidebar_label: Sistema Editor
sidebar_position: 7
---

# Aprofundamento do sistema de editor de rich text

Este guia aborda o sistema editor de rich text baseado em TipTap, incluindo configuração de extensão, nós personalizados, arquitetura de barra de ferramentas, manipulação de imagens e sincronização de formulários.

## Visão geral da arquitetura

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

## Configuração de extensão

O editor está configurado em `lib/editor/providers/editor-provider.tsx` com um conjunto abrangente de extensões:

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

### Referência de extensão

| Extensão | Fonte | Finalidade |
|-----------|--------|--------|
| `StarterKit` | `@tiptap/starter-kit` | Base: parágrafos, títulos, listas, código, negrito, itálico |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | Divisórias de linhas horizontais |
| `TextAlign` | `@tiptap/extension-text-align` | Esquerda, centro, direita, alinhamento justificado |
| `ImageUploadNode` | Personalizado | Carregamento de imagem arrastar e soltar com progresso |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | Listas de tarefas de caixa de seleção (aninhadas) |
| `Highlight` | `@tiptap/extension-highlight` | Destaque de texto multicolorido |
| `Image` | `@tiptap/extension-image` | Exibição de imagem embutida |
| `Typography` | `@tiptap/extension-typography` | Citações inteligentes, travessões, reticências |
| `Superscript` | `@tiptap/extension-superscript` | Texto sobrescrito |
| `Subscript` | `@tiptap/extension-subscript` | Texto subscrito |
| `Selection` | `@tiptap/extensions` | Tratamento de seleção aprimorado |

## Provedor de editores

A instância do editor é criada via contexto React para acesso em todo o aplicativo:

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

### Otimizações de desempenho

- ** `immediatelyRender: false` **: Evita incompatibilidades de hidratação no SSR.
- ** `shouldRerenderOnTransaction: false` **: Reduz as novas renderizações do React a cada pressionamento de tecla. Somente alterações de estado da barra de ferramentas acionam novas renderizações.

## Ganchos personalizados

### `useTiptapEditor` Fornece acesso à instância do editor a partir do contexto ou diretamente:

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

### `useEditor` Gancho simples baseado em contexto:

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

## Nó de upload de imagem

O `ImageUploadNode` é uma extensão TipTap personalizada para uploads de imagens com arrastar e soltar:

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

### Interface de função de upload

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### Manipulador de upload de imagem

O manipulador padrão em `lib/editor/utils/utils.ts` :

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

### Atalhos de teclado

O nó de upload de imagem registra o manuseio da chave Enter:

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

## Configuração da barra de ferramentas

A barra de ferramentas é definida em `lib/editor/contents/toolbar-content.tsx` como um componente modular:

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

## Sincronização de dados de formulário

### `useEditorSync` Gancho

Sincronização bidirecional entre o editor e o estado do formulário:

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

### `useEditorFieldSync` Gancho de conveniência

Para integração direta com dados de formulário baseados em `useState` :

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## Funções utilitárias

### Validação de esquema

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

### Limpeza de URL

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## Considerações de desempenho

1. ** `React.memo` em ToolbarContent**: Impede a nova renderização da barra de ferramentas quando o estado não relacionado muda.
2. ** `shouldRerenderOnTransaction: false` **: Somente mudanças essenciais de estado acionam novas renderizações do React.
3. ** `useMemo` para extensões**: O array de extensões é computado uma vez e reutilizado.
4. **Sincronização baseada em eventos**: A sincronização do editor para o formulário usa eventos TipTap ( `update` , `blur` ) em vez de polling.
5. ** `MAX_FILE_SIZE` validação**: A verificação do tamanho do arquivo no lado do cliente evita tentativas desnecessárias de upload.

## Solução de problemas

### Editor não renderiza

1. Certifique-se de que `EditorContextProvider` envolva a árvore de componentes.
2. Verifique se `immediatelyRender: false` está definido (necessário para SSR).
3. Verifique se todas as dependências do TipTap estão instaladas.

### Dados do formulário não sincronizados

1. Certifique-se de que `useEditorSync` ou `useEditorFieldSync` seja chamado com os parâmetros corretos.
2. Verifique se a instância do editor não é nula quando o gancho é executado.
3. Verifique se `onContentChange` atualiza corretamente o estado do formulário.

### Falha no upload da imagem

1. Verifique se o manipulador de upload retorna uma string de URL válida.
2. Verifique se `MAX_FILE_SIZE` corresponde aos limites do servidor.
3. Verifique se há erros de CORS no console do navegador se estiver fazendo upload para um domínio diferente.

## Documentação Relacionada

- [Arquitetura de cliente API](./api-client-architecture.md)
- [Padrões de recuperação de erros](./error-recovery-patterns.md)
- [Aprofundamento da arquitetura de cache](./caching-deep-dive.md)
