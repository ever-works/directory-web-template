---
id: file-upload
title: 文件上传
sidebar_label: 文件上传
sidebar_position: 23
---

# 文件上传

该模板通过富文本编辑器的图片上传系统和服务器端API客户端的0方法提供文件上传功能。图像上传与 TipTap 编辑器集成，而服务器客户端支持通过 FormData 处理进行通用文件上传。

## 架构概述

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

## 在编辑器中上传图像

### useImageUpload 挂钩

1处的0钩子为TipTap编辑器提供核心上传逻辑：

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

### 辅助函数

该钩子依赖于纯辅助函数来进行状态检查：

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

### ImageUploadButton 组件

0 组件提供了一个随时可用的工具栏按钮：

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

### 编辑器工具栏中的用法

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

当编辑器聚焦时，键盘快捷键 0（或 macOS 上的1）会触发图像上传。

## 服务器端文件上传

2类为服务器端文件上传提供了通用的3方法：

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

### 内容类型处理

一个关键细节：上传 FormData 时有意删除 0 标头。这允许浏览器（或 Node.js 1 ）自动设置正确的 2 边界。基本的 3 方法也可以处理这个问题：

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

### URL 编码的表单数据

对于非文件表单提交（例如，reCAPTCHA 验证），可以使用0方法：

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

## 图片上传节点扩展

1 处的 TipTap 0 扩展定义了一个自定义节点类型，该类型在编辑器内容中呈现上传 UI。当用户选择一个文件时，它会通过配置的端点上传，并且该节点将替换为包含返回 URL 的标准图像节点。

## 上传流程总结

1. 用户单击编辑器工具栏中的**图像**按钮或按2
2. `useImageUpload` 钩子将 `imageUpload` 节点插入到编辑器中
3.上传节点组件渲染文件选择器或拖放区域
4. 选择文件时，通过5上传文件
5. 成功后，上传节点将替换为引用上传 URL 的常规图像节点
6. 失败时，节点内会显示错误消息

## 文件参考

|文件|目的|
|------|---------|
| 6 |上传逻辑钩子 |
| 7 |工具栏按钮组件|
| 8 | TipTap 扩展 |
| 9 |上传节点组件 |
| 10 | 11和12方法|
