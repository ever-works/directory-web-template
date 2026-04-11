---
id: file-upload
title: تحميل الملف
sidebar_label: تحميل الملف
sidebar_position: 23
---

#رفع الملف

يوفر القالب إمكانيات تحميل الملفات من خلال نظام تحميل الصور الخاص بمحرر النص المنسق وطريقة عميل واجهة برمجة التطبيقات (API) من جانب الخادم. تتكامل عمليات تحميل الصور مع محرر TipTap، بينما يدعم عميل الخادم عمليات تحميل الملفات للأغراض العامة من خلال معالجة FormData.

## نظرة عامة على الهندسة المعمارية

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

## تحميل الصورة في المحرر

### خطاف useImageUpload

يوفر الخطاف 0 عند 1 منطق التحميل الأساسي لمحرر TipTap:

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

### وظائف المساعدة

يعتمد الخطاف على وظائف مساعدة خالصة للتحقق من الحالة:

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

### مكون ImageUploadButton

يوفر المكون `ImageUploadButton` زر شريط أدوات جاهز للاستخدام:

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

### الاستخدام في شريط أدوات المحرر

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

يقوم اختصار لوحة المفاتيح `Ctrl+Shift+I` (أو `Cmd+Shift+I` في نظام التشغيل macOS) بتشغيل تحميل الصورة عند التركيز على المحرر.

## تحميل الملفات من جانب الخادم

توفر الفئة 2 طريقة عامة 3 لتحميل الملفات من جانب الخادم:

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

### التعامل مع نوع المحتوى

تفاصيل مهمة: تتم إزالة الرأس `Content-Type` عمدًا عند تحميل FormData. يسمح هذا للمتصفح (أو Node.js 1) بتعيين الحدود الصحيحة 2 تلقائيًا. تتعامل الطريقة الأساسية 3 أيضًا مع هذا:

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

### بيانات النموذج المرمزة بعنوان URL

بالنسبة لعمليات إرسال النماذج غير المتعلقة بالملفات (على سبيل المثال، التحقق من reCAPTCHA)، تتوفر الطريقة `postForm` :

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

## ملحق عقدة تحميل الصور

يحدد ملحق TipTap `imageUpload` عند `lib/editor/components/node/image-upload-node/` نوع عقدة مخصص يعرض واجهة مستخدم للتحميل داخل محتوى المحرر. عندما يحدد المستخدم ملفًا، يتم تحميله عبر نقطة النهاية التي تم تكوينها ويتم استبدال العقدة بعقدة صورة قياسية تحتوي على عنوان URL الذي تم إرجاعه.

## ملخص تدفق التحميل

1. ينقر المستخدم على زر **الصورة** في شريط أدوات المحرر أو يضغط على `Ctrl+Shift+I` 2. يقوم الخطاف "3" بإدخال العقدة "4" في المحرر
3. يعرض مكون عقدة التحميل منتقي الملفات أو منطقة الإسقاط
4. عند اختيار الملف، يتم تحميل الملف عبر `serverClient.upload()` 5. عند النجاح، يتم استبدال عقدة التحميل بعقدة صورة عادية تشير إلى عنوان URL الذي تم تحميله
6. في حالة الفشل، يتم عرض رسالة خطأ داخل العقدة

## مرجع الملف

| ملف | الغرض |
|------|---------|
| 6ـ | تحميل ربط المنطق |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | مكون زر شريط الأدوات |
| 8ـ | ملحق TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | تحميل مكون العقدة |
| `lib/api/server-api-client.ts` | طرق 11 و 12 |
