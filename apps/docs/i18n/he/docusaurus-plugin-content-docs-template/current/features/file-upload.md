---
id: file-upload
title: העלאת קובץ
sidebar_label: העלאת קובץ
sidebar_position: 23
---

# העלאת קובץ

התבנית מספקת יכולות העלאת קבצים באמצעות מערכת העלאת התמונות של עורך הטקסט העשיר ושיטת `upload` של לקוח ה-API בצד השרת. העלאות תמונות משתלבות עם עורך TipTap, בעוד שלקוח השרת תומך בהעלאות קבצים למטרות כלליות עם טיפול ב-FormData.

## סקירה כללית של אדריכלות

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

## העלאת תמונה בעורך

### useImageUpload Hook

הוו `use-image-upload.ts` ב- `lib/editor/components/ui/image-upload-button/` מספק את היגיון ההעלאה הליבה עבור עורך TipTap:

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

### פונקציות עוזר

הקרס מסתמך על פונקציות עוזר טהורות עבור בדיקות מדינה:

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

### רכיב ImageUploadButton

הרכיב `ImageUploadButton` מספק לחצן סרגל כלים מוכן לשימוש:

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

### שימוש בסרגל הכלים של העורך

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

קיצור המקשים `Ctrl+Shift+I` (או `Cmd+Shift+I` ב-macOS) מפעיל העלאת תמונה כאשר העורך ממוקד.

## העלאת קבצים בצד השרת

המחלקה `ServerClient` מספקת שיטה גנרית `upload` להעלאות קבצים בצד השרת:

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

### טיפול בסוג תוכן

פרט קריטי: הכותרת `Content-Type` מוסרת בכוונה בעת העלאת FormData. זה מאפשר לדפדפן (או Node.js `fetch` ) להגדיר את הגבול הנכון `multipart/form-data` באופן אוטומטי. שיטת הבסיס `request` מטפלת גם בזה:

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

### נתוני טופס מקודדים בכתובת URL

עבור הגשת טפסים שאינם קבצים (לדוגמה, אימות reCAPTCHA), השיטה `postForm` זמינה:

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

## הרחבת צומת העלאת תמונה

התוסף TipTap `imageUpload` ב- `lib/editor/components/node/image-upload-node/` מגדיר סוג צומת מותאם אישית המציג ממשק משתמש להעלאה בתוך תוכן העורך. כאשר המשתמש בוחר קובץ, הוא מועלה דרך נקודת הקצה המוגדרת והצומת מוחלף בצומת תמונה רגילה המכיל את כתובת האתר המוחזרת.

## סיכום זרימת העלאה

1. המשתמש לוחץ על הלחצן **תמונה** בסרגל הכלים של העורך או לוחץ על `Ctrl+Shift+I` 2. הוו `useImageUpload` מכניס צומת `imageUpload` לתוך העורך
3. רכיב צומת ההעלאה יוצר בוחר קבצים או אזור שחרור
4. בבחירת הקובץ, הקובץ מועלה באמצעות `serverClient.upload()` 5. עם הצלחה, צומת ההעלאה מוחלף בצומת תמונה רגילה המפנה לכתובת האתר שהועלתה
6. בעת כשל, הודעת שגיאה מוצגת בתוך הצומת

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `lib/editor/components/ui/image-upload-button/use-image-upload.ts` | העלאה וו היגיון |
| `lib/editor/components/ui/image-upload-button/image-upload-button.tsx` | רכיב לחצן סרגל הכלים |
| `lib/editor/components/node/image-upload-node/image-upload-node-extension.ts` | תוסף TipTap |
| `lib/editor/components/node/image-upload-node/image-upload-node.tsx` | העלאת רכיב צומת |
| `lib/api/server-api-client.ts` | שיטות `ServerClient.upload()` ו `postForm()` |
