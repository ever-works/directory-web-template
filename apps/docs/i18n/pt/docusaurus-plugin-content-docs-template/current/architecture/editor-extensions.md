---
id: editor-extensions
title: "Extensões de editor"
sidebar_label: "Extensões de editor"
sidebar_position: 49
---

# Extensões de editor

## Visão geral

O módulo Editor Extensions fornece uma exportação centralizada de extensões do editor TipTap usadas no editor de rich text do aplicativo. Ele agrupa extensões de formatação, estruturais e de interação do ecossistema TipTap em um único ponto de importação, garantindo recursos de editor consistentes em todas as instâncias de editor no aplicativo.

## Arquitetura

O módulo (`lib/editor/extensions/index.tsx`) atua como um agregador de reexportação que importa extensões TipTap individuais e as exporta como um conjunto unificado. Esse padrão permite que as instâncias do editor importem todas as extensões necessárias de um local, em vez de espalhar as importações de dependências do TipTap entre os componentes.

```
lib/editor/extensions/
  |-- index.tsx
      |-- TaskItem, TaskList     (from @tiptap/extension-list)
      |-- TextAlign              (from @tiptap/extension-text-align)
      |-- HorizontalRule         (from @tiptap/extension-horizontal-rule)
      |-- Typography             (from @tiptap/extension-typography)
      |-- Subscript              (from @tiptap/extension-subscript)
      |-- Superscript            (from @tiptap/extension-superscript)
      |-- Selection              (from @tiptap/extensions)
      |-- Highlight              (from @tiptap/extension-highlight)
```

Essas extensões são consumidas pelos componentes do editor que inicializam o TipTap com uma lista de extensões configurada.

## Referência de API

### Exportações

Todas as exportações são reexportações de classes/objetos de extensão TipTap. Cada um pode ser passado diretamente para o gancho `useEditor()` do TipTap ou para o construtor `Editor`.

#### `Selection`

De `@tiptap/extensions`. Fornece manipulação de seleção de texto e indicadores de seleção visual no editor.

#### `Highlight`

De `@tiptap/extension-highlight`. Permite realce de texto com cores de fundo personalizáveis. Suporta múltiplas cores de destaque por meio de marcas.

#### `Superscript`

De `@tiptap/extension-superscript`. Adiciona formatação de texto sobrescrito (por exemplo, x^2).

#### `Subscript`

De `@tiptap/extension-subscript`. Adiciona formatação de texto subscrito (por exemplo, H~2~O).

#### `Typography`

De `@tiptap/extension-typography`. Fornece substituições tipográficas automáticas, como aspas inteligentes, travessões, reticências e outros caracteres tipográficos.

#### `HorizontalRule`

De `@tiptap/extension-horizontal-rule`. Adiciona suporte a nó de regra horizontal (divisor), renderizado como `<hr>` na saída.

#### `TextAlign`

De `@tiptap/extension-text-align`. Ativa o controle de alinhamento de texto (esquerda, centro, direita, justificar) em nós em nível de bloco.

#### `TaskItem`

De `@tiptap/extension-list`. Fornece nós de item de tarefa/caixa de seleção individuais para listas de tarefas interativas.

#### `TaskList`

De `@tiptap/extension-list`. Fornece o nó do contêiner para itens de tarefa, renderizando como uma lista de verificação interativa.

## Detalhes de implementação

**Padrão de exportação em barril**: o módulo usa reexportações nomeadas para manter a superfície de importação limpa. Isso permite que a agitação da árvore funcione corretamente - extensões não utilizadas não serão incluídas no pacote se não forem importadas pelo componente de consumo.

**Extensão de arquivo TSX**: O arquivo usa `.tsx` porque faz parte do ecossistema de componentes do editor e pode ser estendido com substituições de componentes React (visualizações de nós personalizados) no futuro.

**Sem configuração no barril**: As extensões são exportadas em seu formato padrão. A configuração (como `TextAlign.configure({ types: ['heading', 'paragraph'] })`) é aplicada no nível da instância do editor, não neste módulo.

## Configuração

As extensões são configuradas ao inicializar o editor TipTap, não neste módulo. As configurações comuns incluem:

```typescript
TextAlign.configure({
  types: ['heading', 'paragraph'],
  alignments: ['left', 'center', 'right', 'justify'],
})

Highlight.configure({
  multicolor: true,
})

TaskItem.configure({
  nested: true,
})
```

## Exemplos de uso

```typescript
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Selection,
  Highlight,
  Superscript,
  Subscript,
  Typography,
  HorizontalRule,
  TextAlign,
  TaskItem,
  TaskList,
} from '@/lib/editor/extensions';

function RichTextEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Selection,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      Typography,
      HorizontalRule,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}

// Using individual extensions for a minimal editor
import { Typography, Highlight } from '@/lib/editor/extensions';

function SimpleEditor({ content }: { content: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Highlight,
    ],
    content,
  });

  return <EditorContent editor={editor} />;
}
```

## Melhores práticas

- Sempre importe extensões de `@/lib/editor/extensions` em vez de diretamente de pacotes `@tiptap/*` para manter uma única fonte de verdade para o conjunto de extensões do editor.
- Configure extensões no nível da instância do editor, não no módulo barril, para que diferentes instâncias do editor possam usar configurações diferentes.
- Ao adicionar novas extensões TipTap ao projeto, adicione-as a esta exportação barril e documente-as aqui.
- Mantenha a lista de extensões mínima – inclua apenas extensões que são realmente usadas no aplicativo para minimizar o tamanho do pacote.
- Teste novas extensões isoladamente antes de adicioná-las ao barril para garantir a compatibilidade com o conjunto de extensões existente.

## Módulos Relacionados

- [Padrões de componentes](/template/architecture/component-patterns) – Componentes do editor que consomem essas extensões
