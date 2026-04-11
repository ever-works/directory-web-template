---
id: rich-text-editor
title: 富文本编辑器
sidebar_label: 富文本编辑器
sidebar_position: 12
---

# 富文本编辑器

Ever Works 模板包括一个完全集成的富文本编辑器，由 [TipTap](https://tiptap.dev/) 提供支持，这是一个构建在 ProseMirror 之上的无头编辑器框架。该编辑器支持内容格式化、图像上传、任务列表以及与表单数据的双向同步。

## 架构概述

编辑器系统被组织成 0 下的模块化结构：

|目录/文件|目的|
|---|---|
| 1 | React 上下文提供程序使用所有扩展初始化 TipTap 编辑器 |
| 2 |用于从上下文或直接 prop 访问编辑器实例的钩子 |
| 3 |简化的上下文消费者钩子 |
| 4 |编辑器和表单状态之间的双向同步 |
| 5 |用于渲染编辑器内容区域的包装组件 |
| 6 |用于管理工具栏状态的挂钩（移动/桌面、视图）|

## TipTap 扩展

该编辑器通过 7 配置了一套全面的扩展：

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

### 扩展参考

|扩展|描述 |
|---|---|
| 0 |核心格式：粗体、斜体、标题、列表、块引用、代码块、链接 |
| 1 |自定义水平线插入|
| 2 |标题和段落的文本对齐（左、中、右、两端对齐）|
| 3 |拖放图像上传，具有大小限制和文件数量限制 |
| 4 / 5 |具有嵌套支持的交互式任务/复选框列表 |
| 6 |支持多色的文本突出显示 |
| 7 |通过 8 标准图像嵌入
| 9 |自动排版替换（智能引号、破折号）|
| 10 / 11 |上标和下标文本格式 |
| 12 |增强的选择处理 |

## 编辑器上下文提供者

编辑器是通过 React 上下文提供程序初始化的。用 13 包裹你的组件树以使编辑器可用：

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

提供者使用以下配置创建编辑器：

- **0** -- 防止 SSR 水合作用不匹配
- **1×** -- 性能优化以减少不必要的重新渲染
- **辅助功能属性** -- 配置自动完成、自动更正和 ARIA 标签
- **最小高度** -- 2 确保可用的编辑区域

## 访问编辑器实例

### 使用3

用于访问编辑器的主要钩子支持直接注入和上下文回退：

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

### 使用0

一个更简单的钩子，严格要求在 1 之内：

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## 内容同步

0 挂钩处理 TipTap 编辑器和表单状态之间的双向同步。这对于将编辑器集成到由 React 状态或表单库管理的表单中至关重要。

### 基本同步

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

### 表单字段同步

对于具有多个字段的表单，0 提供了简写：

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

### 同步行为

|方向 |触发|状况 |
|---|---|---|
|向编辑提交表格 | 0 道具变更 |仅当编辑器为空或内容显着不同时 |
|编辑器到表单 | 12 事件 |始终将当前 HTML 传播到表单回调 |

该钩子通过在覆盖之前检查编辑器内容是否为空或有很大不同来避免无限更新循环。

## 编辑器内容组件

3 包装器处理自动换行和 ProseMirror 样式：

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

该组件应用 CSS 规则来实现正确的文本换行：
- ProseMirror 容器上的0
- 1 用于保留空白
- 2 用于防止水平溢出

## 工具栏管理

3 挂钩管理工具栏状态，包括移动响应能力：

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

工具栏支持三种移动视图模式：0、1和2。

## 图片上传

编辑器支持通过3扩展上传图片：

|设置|价值|
|---|---|
|接受的类型 | 4 |
|最大文件大小 |由 5 常数定义 |
|每次上传的最大图片数 | 3 |
|上传处理程序 | 6实用功能|

可以通过拖放或工具栏上传按钮上传图像。

## 关键文件

|文件|路径|
|---|---|
|编辑提供者 | 7 |
| TipTap 编辑器挂钩 | 8 |
|编辑器同步挂钩 | 9 |
|编辑内容 | 10 |
|工具栏挂钩| 11 |
|编辑器上下文挂钩 | 12 |
