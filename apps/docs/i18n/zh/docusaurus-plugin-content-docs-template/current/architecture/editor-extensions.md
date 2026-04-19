---
id: editor-extensions
title: "编辑器扩展"
sidebar_label: "编辑器扩展"
sidebar_position: 49
---

# 编辑器扩展

## 概述

编辑器扩展模块提供了应用程序的富文本编辑器中使用的 TipTap 编辑器扩展的集中式桶式导出。它将来自 TipTap 生态系统的格式化、结构和交互扩展捆绑到单个导入点中，确保应用程序中所有编辑器实例的编辑器功能保持一致。

## 建筑

该模块 (`lib/editor/extensions/index.tsx`) 充当重新导出聚合器，导入各个 TipTap 扩展并将它们作为统一集导出。这一模式允许编辑器实例从一个位置导入所有必需的扩展，而不是跨组件分散 TipTap 依赖项导入。

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

这些扩展由使用配置的扩展列表初始化 TipTap 的编辑器组件使用。

## API参考

### 出口

所有导出都是 TipTap 扩展类/对象的重新导出。每个都可以直接传递给 TipTap 的 `useEditor()` 挂钩或 `Editor` 构造函数。

#### `Selection`

来自`@tiptap/extensions`。在编辑器中提供文本选择处理和视觉选择指示器。

#### `Highlight`

来自`@tiptap/extension-highlight`。使用可自定义的背景颜色启用文本突出显示。通过标记支持多种突出显示颜色。

#### `Superscript`

来自`@tiptap/extension-superscript`。添加上标文本格式（例如 x^2）。

#### `Subscript`

来自`@tiptap/extension-subscript`。添加下标文本格式（例如，H~2~O）。

#### `Typography`

来自`@tiptap/extension-typography`。提供自动印刷替换，例如智能引号、破折号、省略号和其他印刷字符。

#### `HorizontalRule`

来自`@tiptap/extension-horizontal-rule`。添加水平线（分隔线）节点支持，在输出中呈现为`<hr>`。

#### `TextAlign`

来自`@tiptap/extension-text-align`。在块级节点上启用文本对齐控制（左、中、右、对齐）。

#### `TaskItem`

来自`@tiptap/extension-list`。为交互式任务列表提供单独的任务/复选框项节点。

#### `TaskList`

来自`@tiptap/extension-list`。提供任务项的容器节点，呈现为交互式清单。

## 实施细节

**桶式导出模式**：模块使用命名重新导出来保持导入表面清洁。这使得树摇动能够正常工作——如果使用组件未导入未使用的扩展，则它们不会包含在捆绑包中。

**TSX 文件扩展名**：该文件使用`.tsx`，因为它是编辑器组件生态系统的一部分，并且将来可能会通过 React 组件覆盖（自定义节点视图）进行扩展。

**桶中没有配置**：扩展以其默认形式导出。配置（例如`TextAlign.configure({ types: ['heading', 'paragraph'] })`）应用于编辑器实例级别，而不是在此模块中。

## 配置

扩展是在初始化 TipTap 编辑器时配置的，而不是在此模块中配置的。常见配置包括：

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

## 使用示例

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

## 最佳实践

- 始终从 `@/lib/editor/extensions` 导入扩展，而不是直接从 `@tiptap/*` 包导入，以维护编辑器扩展集的单一真实来源。
- 在编辑器实例级别配置扩展，而不是在桶模块中，以便不同的编辑器实例可以使用不同的配置。
- 向项目添加新的 TipTap 扩展时，请将它们添加到此桶导出并在此处记录它们。
- 保持扩展列表最少——仅包含应用程序中实际使用的扩展，以最小化包大小。
- 在将新扩展添加到桶中之前，请单独测试新扩展，以确保与现有扩展集的兼容性。

## 相关模块

- [Component Patterns](/template/architecture/component-patterns) -- 使用这些扩展的编辑器组件
