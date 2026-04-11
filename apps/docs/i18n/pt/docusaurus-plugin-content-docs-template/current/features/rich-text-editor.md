---
id: rich-text-editor
title: Editor de Rich Text
sidebar_label: Editor de Rich Text
sidebar_position: 12
---

# Editor de Rich Text

O modelo Ever Works inclui um editor de rich text totalmente integrado desenvolvido por [TipTap](https://tiptap.dev/), uma estrutura de editor headless construída sobre ProseMirror. O editor suporta formatação de conteúdo, upload de imagens, listas de tarefas e sincronização bidirecional com dados de formulário.

## Visão geral da arquitetura

O sistema editor está organizado em uma estrutura modular em `lib/editor/` :

| Diretório/Arquivo | Finalidade |
|---|---|
| `providers/editor-provider.tsx` | Provedor de contexto React que inicializa o editor TipTap com todas as extensões |
| `hooks/use-tiptap-editor.ts` | Gancho para acessar a instância do editor a partir do contexto ou prop direto |
| `hooks/use-editor.ts` | Gancho do consumidor de contexto simplificado |
| `hooks/use-editor-sync.ts` | Sincronização bidirecional entre editor e estado do formulário |
| `contents/editor-content.tsx` | Componente wrapper para renderizar a área de conteúdo do editor |
| `contents/use-editor-toolbar.ts` | Gancho para gerenciar o estado da barra de ferramentas (móvel/desktop, visualizações) |

## Extensões TipTap

O editor é configurado com um conjunto abrangente de extensões através do `EditorContextProvider` :

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

### Referência de extensão

| Extensão | Descrição |
|---|---|
| `StarterKit` | Formatação principal: negrito, itálico, títulos, listas, citações, blocos de código, links |
| `HorizontalRule` | Inserção de regra horizontal personalizada |
| `TextAlign` | Alinhamento do texto (esquerda, centro, direita, justificar) para títulos e parágrafos |
| `ImageUploadNode` | Carregamento de imagens com arrastar e soltar com limites de tamanho e restrições de contagem de arquivos |
| `TaskList` / `TaskItem` | Listas interativas de tarefas/caixas de seleção com suporte aninhado |
| `Highlight` | Destaque de texto com suporte multicolorido |
| `Image` | Incorporação de imagem padrão via `@tiptap/extension-image` |
| `Typography` | Substituições tipográficas automáticas (aspas inteligentes, travessões) |
| `Superscript` / `Subscript` | Formatação de texto sobrescrito e subscrito |
| `Selection` | Tratamento de seleção aprimorado |

## Provedor de Contexto do Editor

O editor é inicializado por meio de um provedor de contexto React. Envolva sua árvore de componentes com `EditorContextProvider` para disponibilizar o editor:

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

O provedor cria o editor com a seguinte configuração:

- ** `immediatelyRender: false` ** -- Evita incompatibilidades de hidratação SSR
- ** `shouldRerenderOnTransaction: false` ** -- Otimização de desempenho para reduzir novas renderizações desnecessárias
- **Atributos de acessibilidade** -- Os rótulos de preenchimento automático, correção automática e ARIA estão configurados
- **Altura mínima** -- `min-h-96` garante uma área de edição utilizável

## Acessando a Instância do Editor

### Usando `useTiptapEditor` O gancho principal para acessar o editor suporta injeção direta e fallback de contexto:

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

### Usando `useEditor` Um gancho mais simples que exige estritamente estar dentro do `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## Sincronização de conteúdo

O gancho `useEditorSync` lida com a sincronização bidirecional entre o editor TipTap e o estado do formulário. Isso é essencial para integrar o editor em formulários gerenciados pelo estado React ou bibliotecas de formulários.

### Sincronização Básica

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

### Sincronização de campos de formulário

Para formulários com múltiplos campos, `useEditorFieldSync` fornece um atalho:

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

### Comportamento de sincronização

| Direção | Gatilho | Condição |
|---|---|---|
| Formulário para Editor | `content` alterações de adereços | Somente quando o editor está vazio ou o conteúdo difere significativamente |
| Editor de Formulário | Eventos `update` e `blur` | Sempre propaga o HTML atual para o retorno de chamada do formulário |

O gancho evita loops infinitos de atualização, verificando se o conteúdo do editor está vazio ou substancialmente diferente antes de sobrescrever.

## Componente de conteúdo do editor

O wrapper `EditorContent` lida com quebra automática de palavras e estilo ProseMirror:

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

O componente aplica regras CSS para quebra automática de texto:
- `break-words` no contêiner ProseMirror
- `whitespace-pre-wrap` para preservar espaços em branco
- `overflow-wrap-anywhere` para evitar transbordamento horizontal

## Gerenciamento da barra de ferramentas

O gancho `useEditorToolbar` gerencia o estado da barra de ferramentas, incluindo a capacidade de resposta móvel:

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

A barra de ferramentas suporta três modos de visualização móvel: `"main"` , `"highlighter"` e `"link"` .

## Carregamento de imagem

O editor suporta upload de imagens através da extensão `ImageUploadNode` :

| Configuração | Valor |
|---|---|
| Tipos aceitos | `image/*` |
| Tamanho máximo do arquivo | Definido pela constante `MAX_FILE_SIZE` |
| Máximo de imagens por upload | 3 |
| Manipulador de upload | `handleImageUpload` função utilidade |

As imagens podem ser carregadas arrastando e soltando ou usando o botão de upload da barra de ferramentas.

## Arquivos principais

| Arquivo | Caminho |
|---|---|
| Fornecedor de editores | `lib/editor/providers/editor-provider.tsx` |
| Gancho do Editor TipTap | `lib/editor/hooks/use-tiptap-editor.ts` |
| Gancho de sincronização do editor | `lib/editor/hooks/use-editor-sync.ts` |
| Conteúdo do editor | `lib/editor/contents/editor-content.tsx` |
| Gancho da barra de ferramentas | `lib/editor/contents/use-editor-toolbar.ts` |
| Gancho de Contexto do Editor | `lib/editor/hooks/use-editor.ts` |
