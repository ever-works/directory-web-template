---
id: rich-text-editor
title: محرر النص الغني
sidebar_label: محرر النص الغني
sidebar_position: 12
---

# محرر النصوص الغنية

يشتمل قالب Ever Works على محرر نص منسق متكامل تمامًا مدعوم من [TipTap](https://tiptap.dev/)، وهو إطار عمل محرر بدون رأس مبني على ProseMirror. يدعم المحرر تنسيق المحتوى وتحميل الصور وقوائم المهام والمزامنة ثنائية الاتجاه مع بيانات النموذج.

## نظرة عامة على الهندسة المعمارية

يتم تنظيم نظام المحرر في هيكل معياري تحت `lib/editor/` :

| الدليل / الملف | الغرض |
|---|---|
| `providers/editor-provider.tsx` | موفر سياق التفاعل الذي يقوم بتهيئة محرر TipTap بجميع الامتدادات |
| `hooks/use-tiptap-editor.ts` | خطاف للوصول إلى نسخة المحرر من السياق أو الدعامة المباشرة |
| `hooks/use-editor.ts` | ربط المستهلك السياق المبسط |
| 4ـ | مزامنة ثنائية الاتجاه بين المحرر وحالة النموذج |
| 5 ــ | مكون الغلاف لعرض منطقة محتوى المحرر |
| 6ـ | خطاف لإدارة حالة شريط الأدوات (الجوال/سطح المكتب، طرق العرض) |

## ملحقات TipTap

تم تكوين المحرر بمجموعة شاملة من الملحقات من خلال 7:

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

### مرجع الامتداد

| ملحق | الوصف |
|---|---|
| `StarterKit` | التنسيق الأساسي: غامق، مائل، عناوين، قوائم، علامات الاقتباس، كتل التعليمات البرمجية، الروابط |
| `HorizontalRule` | إدراج قاعدة أفقية مخصصة |
| `TextAlign` | محاذاة النص (يسار، وسط، يمين، ضبط) للعناوين والفقرات |
| `ImageUploadNode` | تحميل الصور بالسحب والإفلات مع حدود الحجم وقيود عدد الملفات |
| 4 / 5 | قوائم المهام/مربعات الاختيار التفاعلية مع دعم متداخل |
| 6ـ | تسليط الضوء على النص مع دعم متعدد الألوان |
| `Image` | تضمين الصور القياسية عبر `@tiptap/extension-image` |
| `Typography` | الاستبدالات المطبعية التلقائية (علامات الاقتباس الذكية والشرطات) |
| `Superscript` / `Subscript` | تنسيق النص المرتفع والمنخفض |
| ‹‹١٢› | معالجة محسنة للاختيار |

## مزود سياق المحرر

تتم تهيئة المحرر من خلال موفر سياق React. لف شجرة المكونات الخاصة بك بـ 13 لجعل المحرر متاحًا:

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

يقوم الموفر بإنشاء المحرر بالتكوين التالي:

- ** `immediatelyRender: false` ** -- يمنع عدم تطابق ترطيب SSR
- ** `shouldRerenderOnTransaction: false` ** -- تحسين الأداء لتقليل عمليات إعادة العرض غير الضرورية
- **سمات إمكانية الوصول** - تم تكوين تسميات الإكمال التلقائي والتصحيح التلقائي وARIA
- **الحد الأدنى للارتفاع** -- `min-h-96` يضمن وجود منطقة تحرير قابلة للاستخدام

## الوصول إلى مثيل المحرر

### استخدام `useTiptapEditor` يدعم الخطاف الأساسي للوصول إلى المحرر كلاً من الإدخال المباشر والسياق الاحتياطي:

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

### استخدام `useEditor` خطاف أبسط يتطلب بصرامة أن يكون ضمن `EditorContextProvider` :

```tsx
import { useEditor } from '@/lib/editor/hooks/use-editor';

function EditorStatus() {
  const editor = useEditor();
  // Throws if not inside EditorContextProvider
  return <span>{editor?.isFocused ? 'Editing' : 'Idle'}</span>;
}
```

## مزامنة المحتوى

يعالج الخطاف `useEditorSync` المزامنة ثنائية الاتجاه بين محرر TipTap وحالة النموذج. يعد هذا ضروريًا لدمج المحرر في النماذج التي تديرها حالة React أو مكتبات النماذج.

### المزامنة الأساسية

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

### مزامنة حقل النموذج

بالنسبة للنماذج ذات الحقول المتعددة، يوفر `useEditorFieldSync` اختصارًا:

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

### سلوك المزامنة

| الاتجاه | الزناد | الحالة |
|---|---|---|
| نموذج للمحرر | `content` تغييرات الدعامة | فقط عندما يكون المحرر فارغًا أو يختلف المحتوى بشكل كبير |
| محرر للنموذج | الأحداث 1 و 2 | يقوم دائمًا بنشر HTML الحالي إلى رد اتصال النموذج |

يتجنب الخطاف حلقات التحديث اللانهائية عن طريق التحقق مما إذا كان محتوى المحرر فارغًا أو مختلفًا بشكل كبير قبل الكتابة فوقه.

## مكون محتوى المحرر

يتعامل الغلاف 3 مع التفاف الكلمات وتصميم ProseMirror:

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

يطبق المكون قواعد CSS لتغليف النص بشكل صحيح:
- `break-words` على حاوية ProseMirror
- `whitespace-pre-wrap` للحفاظ على المسافة البيضاء
- 2 لمنع الفائض الأفقي

## إدارة شريط الأدوات

يدير الخطاف 3 حالة شريط الأدوات بما في ذلك استجابة الهاتف المحمول:

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

يدعم شريط الأدوات ثلاثة أوضاع عرض متنقلة: `"main"` , `"highlighter"` , و 2.

## تحميل الصورة

يدعم المحرر تحميل الصور من خلال الامتداد `ImageUploadNode` :

| الإعداد | القيمة |
|---|---|
| الأنواع المقبولة | 4ـ |
| الحد الأقصى لحجم الملف | تم تحديده بواسطة ثابت `MAX_FILE_SIZE` |
| الحد الأقصى للصور لكل تحميل | 3 |
| معالج التحميل | 6 وظيفة المرافق |

يمكن تحميل الصور عبر السحب والإفلات أو زر تحميل شريط الأدوات.

## الملفات الرئيسية

| ملف | المسار |
|---|---|
| مزود المحرر | `lib/editor/providers/editor-provider.tsx` |
| خطاف محرر TipTap | 8ـ |
| خطاف مزامنة المحرر | `lib/editor/hooks/use-editor-sync.ts` |
| محتوى المحرر | `lib/editor/contents/editor-content.tsx` |
| ربط شريط الأدوات | `lib/editor/contents/use-editor-toolbar.ts` |
| ربط سياق المحرر | ‹‹١٢› |
