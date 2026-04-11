---
id: editor-system-deep-dive
title: نظام محرر النصوص المنسق العميق
sidebar_label: نظام المحرر
sidebar_position: 7
---

# الغوص العميق في نظام محرر النصوص الغني

يغطي هذا الدليل نظام محرر النصوص المنسق المستند إلى TipTap، بما في ذلك تكوين الامتدادات والعقد المخصصة وهندسة شريط الأدوات ومعالجة الصور ومزامنة النماذج.

## نظرة عامة على الهندسة المعمارية

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

## تكوين الامتداد

تم تكوين المحرر في `lib/editor/providers/editor-provider.tsx` مع مجموعة شاملة من الملحقات:

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

### مرجع الامتداد

| ملحق | المصدر | الغرض |
|-----------|-------|---------|
| `StarterKit` | `@tiptap/starter-kit` | القاعدة: الفقرات، العناوين، القوائم، الكود، غامق، مائل |
| `HorizontalRule` | `@tiptap/extension-horizontal-rule` | فواصل الخطوط الأفقية |
| 4ـ | 5 ــ | اليسار، الوسط، اليمين، تبرير المحاذاة |
| 6ـ | مخصص | تحميل الصور بالسحب والإفلات مع التقدم |
| `TaskList` / `TaskItem` | `@tiptap/extension-list` | قوائم مهام خانة الاختيار (متداخلة) |
| `Highlight` | `@tiptap/extension-highlight` | تسليط الضوء على النص متعدد الألوان |
| ‹‹١٢› | 13 ــ | عرض الصور المضمنة |
| 14 ــ | `@tiptap/extension-typography` | علامات الاقتباس الذكية، والشرطات، وعلامات الحذف |
| 16 ــ | `@tiptap/extension-superscript` | نص مرتفع |
| 18 ــ | 19 ــ | نص منخفض |
| 20 ــ | ‹٢١› | معالجة محسنة للاختيار |

## مزود المحرر

يتم إنشاء نسخة المحرر عبر سياق React للوصول إلى مستوى التطبيق:

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

### تحسينات الأداء

- ** `immediatelyRender: false` **: يمنع عدم تطابق الترطيب في SSR.
- ** `shouldRerenderOnTransaction: false` **: يقلل من إعادة عرض React عند كل ضغطة مفتاح. تؤدي التغييرات في حالة شريط الأدوات فقط إلى تشغيل عمليات إعادة العرض.

## خطافات مخصصة

### 2

يوفر الوصول إلى مثيل المحرر من السياق أو مباشرة:

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

### 0

ربط بسيط يعتمد على السياق:

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

## عقدة تحميل الصور

يعد `ImageUploadNode` امتداد TipTap مخصصًا لتحميلات الصور بالسحب والإسقاط:

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

### واجهة وظيفة التحميل

```typescript
export type UploadFunction = (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
) => Promise<string>;  // Returns the URL of the uploaded image
```

### معالج تحميل الصور

المعالج الافتراضي في `lib/editor/utils/utils.ts` :

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

### اختصارات لوحة المفاتيح

تسجل عقدة تحميل الصورة إدخال معالجة المفاتيح:

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

## تكوين شريط الأدوات

يتم تعريف شريط الأدوات في `lib/editor/contents/toolbar-content.tsx` كمكون معياري:

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

## مزامنة بيانات النموذج

### `useEditorSync` هوك

المزامنة ثنائية الاتجاه بين المحرر وحالة النموذج:

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

### `useEditorFieldSync` خطاف مريح

للتكامل المباشر مع بيانات النموذج المستندة إلى 1:

```typescript
// Usage in a form component
useEditorFieldSync(editor, formData, 'description', setFormData);
```

## وظائف المرافق

### التحقق من صحة المخطط

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

### تعقيم عنوان URL

```typescript
import { sanitizeUrl, isAllowedUri } from '@/lib/editor/utils';

// Validate link URLs before inserting
const safeUrl = sanitizeUrl(userInput, window.location.href);
// Returns the URL if safe, or "#" if not
```

## اعتبارات الأداء

1. ** `React.memo` على محتوى شريط الأدوات**: يمنع إعادة عرض شريط الأدوات عندما تتغير الحالة غير ذات الصلة.
2. **1**: تؤدي تغييرات الحالة الأساسية فقط إلى إعادة عرض React.
3. ** `useMemo` للامتدادات**: يتم حساب مصفوفة الامتدادات مرة واحدة وإعادة استخدامها.
4. **المزامنة المستندة إلى الحدث**: تستخدم مزامنة المحرر إلى النموذج أحداث TipTap ( `update` , `blur` ) بدلاً من الاستقصاء.
5. ** التحقق من الصحة 5 **: يمنع التحقق من حجم الملف من جانب العميل محاولات التحميل غير الضرورية.

## استكشاف الأخطاء وإصلاحها

### المحرر لا يعرض

1. تأكد من أن 6 يغلف شجرة المكونات.
2. تأكد من ضبط `immediatelyRender: false` (مطلوب لـ SSR).
3. تحقق من تثبيت كافة تبعيات TipTap.

### عدم مزامنة بيانات النموذج

1. تأكد من استدعاء 8 أو 9 باستخدام المعلمات الصحيحة.
2. تأكد من أن نسخة المحرر ليست فارغة عند تشغيل الخطاف.
3. تأكد من أن `onContentChange` يقوم بتحديث حالة النموذج بشكل صحيح.

### فشل تحميل الصورة

1. تأكد من أن معالج التحميل يُرجع سلسلة عنوان URL صالحة.
2. تحقق من أن `MAX_FILE_SIZE` يطابق حدود جانب الخادم لديك.
3. تحقق من وحدة تحكم المتصفح بحثًا عن أخطاء CORS في حالة التحميل إلى مجال مختلف.

## الوثائق ذات الصلة

- [بنية عميل API](./api-client-architecture.md)
- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
- [التعمق في بنية التخزين المؤقت](./caching-deep-dive.md)
